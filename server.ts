import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Initialize Firebase for server-side tasks
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const NEWS_SOURCES = [
    { name: "Prothom Alo", url: "https://www.prothomalo.com/bangladesh" },
    { name: "The Daily Star", url: "https://www.thedailystar.net/bangladesh" },
    { name: "BDNews24", url: "https://bdnews24.com/bangladesh" },
    { name: "Jugantor", url: "https://www.jugantor.com/national" },
    { name: "Kaler Kantho", url: "https://www.kalerkantho.com/online/national" }
  ];

  const refineWithAI = async (headline: string): Promise<{ question: string; category: string } | null> => {
    try {
      const prompt = `Convert this news headline into a neutral, unbiased YES/NO polling question for a national governance platform. 
      The question should be concise, high-end, and stimulate critical thinking.
      If the headline is not suitable for a governance poll (e.g., sports, celebrity gossip, duplicate triviality), return empty strings.
      
      Also provide a one-word category (National, Economy, Environment, Tech, or Crisis).
      
      Headline: "${headline}"`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
             question: { type: Type.STRING },
             category: { type: Type.STRING }
            },
            required: ["question", "category"]
          }
        }
      });

      const data = JSON.parse(result.text || "{}");
      
      if (!data.question || data.question.length < 15 || data.question.toLowerCase().includes("blank")) {
        console.warn(`[AI] Rejected low-quality generation for: ${headline}`);
        return null;
      }

      return {
        question: data.question,
        category: data.category || "National"
      };
    } catch (e) {
      console.error("AI Refinement on server failed:", e);
      return null;
    }
  };

  const autoCleanupData = async () => {
    console.log("[CLEANUP] Starting periodic data maintenance...");
    try {
      // Delete rejected questions older than 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const rejectedQ = query(
        collection(db, 'pending_questions'), 
        where('status', '==', 'rejected'),
        where('createdAt', '<', Timestamp.fromDate(threeDaysAgo))
      );
      const rejectedSnap = await getDocs(rejectedQ);
      let deletedCount = 0;
      for (const d of rejectedSnap.docs) {
        await deleteDoc(d.ref);
        deletedCount++;
      }

      // Delete pending questions older than 7 days (keep it fresh)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const pendingQ = query(
        collection(db, 'pending_questions'), 
        where('status', '==', 'pending'),
        where('createdAt', '<', Timestamp.fromDate(sevenDaysAgo))
      );
      const pendingSnap = await getDocs(pendingQ);
      for (const d of pendingSnap.docs) {
        await deleteDoc(d.ref);
        deletedCount++;
      }

      console.log(`[CLEANUP] Successfully purged ${deletedCount} old/low-value items.`);
    } catch (err) {
      console.error("[CLEANUP ERROR]", err);
    }
  };

  const performScrapeAndSave = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] CRON: Beginning News Extraction Cycle...`);
    
    let totalNewItems = 0;
    
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      },
      timeout: 20000,
      validateStatus: (status) => status < 500
    });

    for (const source of NEWS_SOURCES) {
      try {
        console.log(`[SCRAPE] Fetching ${source.name}...`);
        const response = await axiosInstance.get(source.url);
        
        if (response.status !== 200) {
          console.warn(`[SCRAPE] ${source.name} returned status ${response.status}. Skipping.`);
          continue;
        }

        const $ = cheerio.load(response.data);
        const candidates: { headline: string; time?: string }[] = [];

        // Advanced extraction logic
        $('h1, h2, h3, .title, .headline').each((_, el) => {
          const headline = $(el).text().trim().replace(/[\n\t\r]/g, " ");
          if (headline.length > 30 && headline.length < 300) {
            // Find context for metadata
            const context = $(el).closest('article, .story, .card, .content, .item, .news-block');
            const timeEl = context.find('time, .time, .date, .timestamp, .publish-time').first();
            const timeText = timeEl.attr('datetime') || timeEl.attr('data-time') || timeEl.text().trim();
            
            candidates.push({ headline, time: timeText || undefined });
          }
        });

        // Unique headlines only, limit to top 5 candidates per source to keep queue ultra-clean
        const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.headline.toLowerCase(), c])).values()).slice(0, 5);
        console.log(`[SCRAPE] Found ${uniqueCandidates.length} unique filtered candidates from ${source.name}`);

        for (const item of uniqueCandidates) {
          // Robust Deduplication
          const q = query(collection(db, 'pending_questions'), where('headline', '==', item.headline));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            // AI Question Generation (On-the-fly)
            console.log(`[AI] Refining: ${item.headline.substring(0, 50)}...`);
            const refined = await refineWithAI(item.headline);

            if (refined && refined.question) {
              await addDoc(collection(db, 'pending_questions'), {
                headline: item.headline,
                question: refined.question,
                category: refined.category,
                source: source.name,
                sourceUrl: source.url,
                publishedDate: item.time || new Date().toLocaleString(),
                status: 'pending',
                createdAt: Timestamp.now(),
                aiProcessed: true,
                engagement: 0
              });
              totalNewItems++;
              console.log(`[SAVED] ${source.name} item refined and queued.`);
            } else {
              console.log(`[SKIP] Question rejected or invalid for headline: ${item.headline.substring(0, 30)}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Full scrape fail for ${source.name}:`, err.message);
      }
      // Minimal sleep to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }

    // Run cleanup after every scrape to keep memory clear
    await autoCleanupData();

    // Record system health
    await setDoc(doc(db, 'system_meta', 'news_extraction'), {
      lastExtraction: Timestamp.now(),
      status: 'healthy',
      itemsFound: totalNewItems,
      version: '2.2.0-clean-memory'
    });

    console.log(`[SYNC COMPLETE] Extracted ${totalNewItems} new verified strategic items.`);
    return totalNewItems;
  };

  // Automated Schedule (6:00 AM Daily)
  cron.schedule('0 6 * * *', async () => {
    try {
      await performScrapeAndSave();
    } catch (e) {
      console.error("[CRON FATAL] Scheduled task crashed:", e);
    }
  });

  // Manual Trigger Endpoint (Admin Only)
  app.post("/api/ai/scrape", async (req, res) => {
    try {
      const count = await performScrapeAndSave();
      res.json({ success: true, count, message: `Successfully extracted and AI-refined ${count} items.` });
    } catch (err: any) {
      console.error("[API SCRAPE ERROR]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health Dashboard Data
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "operational", 
      timestamp: new Date().toISOString(),
      capabilities: ["AI_REFINEMENT", "CRON_EXTRACTION", "VITE_V5_MIDDLEWARE"]
    });
  });

  // Production/Dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] Bangladesh Digital Republic Engine running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[SHUTDOWN] Server failed to initialize:", err);
  process.exit(1);
});

