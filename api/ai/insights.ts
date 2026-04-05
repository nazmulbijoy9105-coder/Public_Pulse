import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { polls } = req.body;
    if (!polls) {
      return res.status(400).json({ error: "polls are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
    }

    const ai = new GoogleGenAI({ apiKey });
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
}
