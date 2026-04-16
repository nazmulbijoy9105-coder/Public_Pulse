import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
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

  // Gemini AI Setup (Server-side)
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    return new GoogleGenAI({ apiKey });
  };

  const NEWS_SOURCES = [
    { name: "Prothom Alo", url: "https://www.prothomalo.com/bangladesh" },
    { name: "The Daily Star", url: "https://www.thedailystar.net/bangladesh" },
    { name: "BDNews24", url: "https://bdnews24.com/bangladesh" },
    { name: "Jugantor", url: "https://www.jugantor.com/national" },
    { name: "Kaler Kantho", url: "https://www.kalerkantho.com/online/national" }
  ];

  const performScrapeAndSave = async () => {
    console.log(`[${new Date().toISOString()}] Starting automated news scrape...`);
    const ai = getAiClient();
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
            // Many BD news sites use <time> tags or specific classes for timestamps
            const context = $(el).closest('article, .story-element, .card, .content, .item');
            const timeElement = context.find('time').first().length ? context.find('time').first() :
                               context.find('.time, .date, .timestamp, .publish-time, .story-time').first().length ? context.find('.time, .date, .timestamp, .publish-time, .story-time').first() :
                               $(el).parent().find('time, .time').first();
            
            const timeText = timeElement.attr('datetime') || timeElement.attr('data-time') || timeElement.text().trim();
            newsItems.push({ headline, time: timeText || undefined });
          }
        });

        if (newsItems.length === 0) continue;

        // Try to get a page-level 'last modified' if individual times aren't found
        const pageTime = $('meta[property="article:modified_time"]').attr('content') || 
                        $('meta[name="last-modified"]').attr('content') ||
                        new Date().toISOString();

        const newsContext = newsItems.slice(0, 15).map(item => 
          `- Headline: ${item.headline}${item.time ? ` [Published: ${item.time}]` : ''}`
        ).join("\n");

        const currentDate = new Date().toLocaleString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze these news items from ${source.name} (${source.url}) as of ${currentDate}.
          Select the top 3 most priority ones for public polling in Bangladesh.
          
          News Items:
          ${newsContext}
          
          Rules:
          1. Generate a neutral YES/NO question for each.
          2. STRICTLY preservation: Use the EXACT date and time extracted from the news source if provided in the brackets [Published: ...]. 
          3. Format date strings clearly like "April 16, 2026, 11:30 AM". 
          4. If no specific time was found for a headline, use the page-level timestamp or current time: ${currentDate}.
          
          Return JSON array of objects:
          - headline: original headline
          - question: generated YES/NO question
          - category: one of ['National', 'Economy', 'Policy', 'Environment', 'Tech']
          - publishedDate: THE EXACT DATE AND TIME FROM SOURCE (REQUIRED)
          `,
          config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || "[]");
        
        for (const item of data) {
          // Check for duplicates
          const q = query(collection(db, 'pending_questions'), where('headline', '==', item.headline));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            await addDoc(collection(db, 'pending_questions'), {
              ...item,
              source: source.name,
              sourceUrl: source.url,
              status: 'pending',
              createdAt: Timestamp.now()
            });
            console.log(`Saved new question from ${source.name}: ${item.headline}`);
          } else {
            console.log(`Skipped duplicate headline from ${source.name}: ${item.headline}`);
          }
        }
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error);
      }
    }
    console.log(`[${new Date().toISOString()}] Automated news scrape completed.`);
  };

  // Schedule daily scrape at 6:00 AM
  cron.schedule('0 6 * * *', () => {
    performScrapeAndSave();
  });

  // API Routes
  app.post("/api/ai/refine", async (req, res) => {
    try {
      const { rawInput } = req.body;
      if (!rawInput) {
        return res.status(400).json({ error: "rawInput is required" });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Convert this news headline or topic into a neutral, unbiased YES/NO question for a public polling platform. 
        Also provide a one-word category (e.g., National, Economy, Environment, Tech).
        
        Input: "${rawInput}"
        
        Return JSON format:
        {
          "question": "...",
          "category": "..."
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error) {
      console.error("AI Refinement Error:", error);
      res.status(500).json({ error: "AI refinement failed" });
    }
  });

  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { polls } = req.body;
      if (!polls) {
        return res.status(400).json({ error: "polls are required" });
      }

      const ai = getAiClient();
      const pollContext = polls.map((p: any) => ({
        question: p.question,
        category: p.category,
        yes: p.yesVotes,
        no: p.noVotes,
        total: p.totalVotes
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these public opinion polls from Bangladesh and provide predictive governance insights.
        
        Poll Data: ${JSON.stringify(pollContext)}
        
        Return JSON format:
        {
          "summary": "Overall national sentiment summary...",
          "predictions": [
            {
              "topic": "...",
              "trend": "rising|falling|stable",
              "confidence": 0.85,
              "reasoning": "..."
            }
          ],
          "policySuggestions": [
            {
              "title": "...",
              "description": "...",
              "expectedSupport": 75
            }
          ],
          "riskAlerts": ["Alert 1", "Alert 2"]
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error) {
      console.error("Governance Insight Error:", error);
      res.status(500).json({ error: "Governance insight generation failed" });
    }
  });

  app.post("/api/ai/simulate", async (req, res) => {
    try {
      const { policy, historicalPolls } = req.body;
      if (!policy || !historicalPolls) {
        return res.status(400).json({ error: "policy and historicalPolls are required" });
      }

      const ai = getAiClient();
      const pollContext = historicalPolls.map((p: any) => ({
        question: p.question,
        category: p.category,
        yes: p.yesVotes,
        no: p.noVotes
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Predict the public reaction in Bangladesh to this hypothetical policy based on historical polling data.
        
        Hypothetical Policy: "${policy}"
        Historical Data: ${JSON.stringify(pollContext)}
        
        Return JSON format:
        {
          "predictedSupport": 65,
          "sentimentAnalysis": "...",
          "keyConcerns": ["Concern 1", "Concern 2"],
          "demographicImpact": "..."
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error) {
      console.error("Policy Simulation Error:", error);
      res.status(500).json({ error: "Policy simulation failed" });
    }
  });

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
