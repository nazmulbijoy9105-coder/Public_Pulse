import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const refineQuestion = async (rawInput: string): Promise<{ question: string; category: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Convert this news headline or topic into a neutral, unbiased YES/NO question for a public polling platform. 
      Also provide a one-word category (e.g., National, Economy, Environment, Tech).
      
      Input: "${rawInput}"` }] }],
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

    const result = JSON.parse(response.text || "{}");
    
    return {
      question: result.question || rawInput,
      category: result.category || "General"
    };
  } catch (error) {
    console.error("AI Refinement failed:", error);
    return { question: rawInput, category: "General" };
  }
};
