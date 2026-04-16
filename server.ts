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
import { getFirestore, collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const performScrapeAndSave = async () => {
    console.log(`[${new Date().toISOString()}] Starting automated news scrape...`);
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    for (const source of NEWS_SOURCES) {
      try {
        console.log(`Scraping ${source.name}...`);
        const htmlResponse = await axiosInstance.get(source.url);
        const $ = cheerio.load(htmlResponse.data);
        
        const newsItems: { headline: string; time?: string }[] = [];
        $('h1, h2, h3').each((_, el) => {
          const headline = $(el).text().trim();
          if (headline.length > 20 && headline.length < 200) {
            // Attempt to find the closest timestamp associated with this headline
            const context = $(el).closest('article, .story-element, .card, .content, .item');
            const timeElement = context.find('time').first().length ? context.find('time').first() :
                               context.find('.time, .date, .timestamp, .publish-time, .story-time').first().length ? context.find('.time, .date, .timestamp, .publish-time, .story-time').first() :
                               $(el).parent().find('time, .time').first();
            
            const timeText = timeElement.attr('datetime') || timeElement.attr('data-time') || timeElement.text().trim();
            newsItems.push({ headline, time: timeText || undefined });
          }
        });

        if (newsItems.length === 0) continue;

        for (const item of newsItems) {
          // Check for duplicates
          const q = query(collection(db, 'pending_questions'), where('headline', '==', item.headline));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            await addDoc(collection(db, 'pending_questions'), {
              headline: item.headline,
              question: item.headline + "?", // Placeholder until refined locally
              category: 'National', // Default
              source: source.name,
              sourceUrl: source.url,
              publishedDate: item.time || new Date().toLocaleString(),
              status: 'pending',
              createdAt: Timestamp.now()
            });
            console.log(`Saved new raw headline from ${source.name}: ${item.headline}`);
          }
        }
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error);
      }
    }
  };

  // Schedule daily scrape at 6:00 AM
  cron.schedule('0 6 * * *', () => {
    performScrapeAndSave();
  });

  // API Routes
  app.post("/api/ai/scrape", async (req, res) => {
    try {
      await performScrapeAndSave();
      res.json({ status: "success", message: "Scrape triggered successfully" });
    } catch (error) {
      console.error("Scraping Error:", error);
      res.status(500).json({ error: "Scraping failed" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
