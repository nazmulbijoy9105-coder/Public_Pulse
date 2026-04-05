import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rawInput } = req.body;
    if (!rawInput) {
      return res.status(400).json({ error: "rawInput is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
    }

    const ai = new GoogleGenAI({ apiKey });
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
}
