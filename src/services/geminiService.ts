import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const refineQuestion = async (rawInput: string): Promise<{ question: string; category: string }> => {
  try {
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
    return {
      question: result.question || rawInput,
      category: result.category || "General"
    };
  } catch (error) {
    console.error("AI Refinement failed:", error);
    return { question: rawInput, category: "General" };
  }
};
