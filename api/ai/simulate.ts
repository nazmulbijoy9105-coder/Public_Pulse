import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { policy, historicalPolls } = req.body;
    if (!policy || !historicalPolls) {
      return res.status(400).json({ error: "policy and historicalPolls are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
    }

    const ai = new GoogleGenAI({ apiKey });
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
}
