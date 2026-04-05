import { GoogleGenAI } from "@google/genai";

const NEWS_SOURCES = [
  { name: "Prothom Alo", url: "https://www.prothomalo.com/bangladesh" },
  { name: "The Daily Star", url: "https://www.thedailystar.net/bangladesh" },
  { name: "BDNews24", url: "https://bdnews24.com/bangladesh" },
  { name: "Jugantor", url: "https://www.jugantor.com/national" },
  { name: "Kaler Kantho", url: "https://www.kalerkantho.com/online/national" }
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const allResults = [];

    for (const source of NEWS_SOURCES) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Extract the top 3 news headlines from ${source.url} and for each headline, generate a neutral YES/NO public opinion question. 
          
          Rules for questions:
          - Neutral tone
          - No bias
          - Max 20 words
          - Answer must be Yes/No
          - Focus on policy, governance, and public interest
          
          Return the result as a JSON array of objects with these fields:
          - headline: the original headline
          - question: the generated YES/NO question
          - category: one of ['National', 'Economy', 'Policy', 'Environment', 'Tech']
          `,
          config: {
            tools: [{ urlContext: {} }],
            responseMimeType: "application/json"
          }
        });

        const data = JSON.parse(response.text || "[]");
        const sourceResults = data.map((item: any) => ({
          ...item,
          source: source.name,
          sourceUrl: source.url,
          status: 'pending'
        }));
        allResults.push(...sourceResults);
      } catch (error) {
        console.error(`Failed to scrape ${source.name}:`, error);
      }
    }

    res.json(allResults);
  } catch (error) {
    console.error("Scraping Error:", error);
    res.status(500).json({ error: "Scraping failed" });
  }
}
