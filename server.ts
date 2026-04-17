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
import { getFirestore, collection, addDoc, Timestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
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

  const refineWithAI = async (headline: string): Promise<{ question: string; category: string }> => {
    try {
      const prompt = `Convert this news headline into a neutral, unbiased YES/NO polling question for a national governance platform. 
      Also provide a one-word category (National, Economy, Environment, Tech, or Crisis).
      
      Headline: "${headline}"`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
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
      return {
        question: data.question || `${headline}?`,
        category: data.category || "National"
      };
    } catch (e) {
      console.error("AI Refinement on server failed:", e);
      return { question: `${headline}?`, category: "National" };
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
          if (headline.length > 25 && headline.length < 250) {
            // Find context for metadata
            const context = $(el).closest('article, .story, .card, .content, .item, .news-block');
            const timeEl = context.find('time, .time, .date, .timestamp, .publish-time').first();
            const timeText = timeEl.attr('datetime') || timeEl.attr('data-time') || timeEl.text().trim();
            
            candidates.push({ headline, time: timeText || undefined });
          }
        });

        // Unique headlines only, limit to top 8 candidates per source to keep queue clean
        const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.headline.toLowerCase(), c])).values()).slice(0, 8);
        console.log(`[SCRAPE] Found ${uniqueCandidates.length} unique candidates from ${source.name}`);

        for (const item of uniqueCandidates) {
          // Robust Deduplication
          const q = query(collection(db, 'pending_questions'), where('headline', '==', item.headline));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            // AI Question Generation (On-the-fly)
            console.log(`[AI] Refining: ${item.headline.substring(0, 50)}...`);
            const refined = await refineWithAI(item.headline);

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
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Full scrape fail for ${source.name}:`, err.message);
      }
      // Minimal sleep to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }

    // Record system health
    await setDoc(doc(db, 'system_meta', 'news_extraction'), {
      lastExtraction: Timestamp.now(),
      status: 'healthy',
      itemsFound: totalNewItems,
      version: '2.1.0-fullstack'
    });

    console.log(`[SYNC COMPLETE] Extracted ${totalNewItems} new strategic items.`);
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

