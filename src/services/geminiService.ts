import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const refineQuestion = async (rawInput: string): Promise<{ question: string; category: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: `Convert this news headline or topic into a neutral, unbiased YES/NO question for a public polling platform. 
      The question should be concise, professional, and stimulate serious civic discourse.
      
      Also provide a one-word category (National, Economy, Environment, Tech, or Crisis).
      
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
    
    // Validation: Ensure we don't return "blank" or junk
    if (!result.question || result.question.length < 15) {
      throw new Error("AI generated insufficient quality content");
    }

    return {
      question: result.question,
      category: result.category || "General"
    };
  } catch (error) {
    console.error("AI Refinement failed:", error);
    // Return original input as a fallback if it looks like a question, otherwise provide a safe default
    return { 
      question: rawInput.endsWith('?') ? rawInput : `${rawInput}?`, 
      category: "General" 
    };
  }
};
