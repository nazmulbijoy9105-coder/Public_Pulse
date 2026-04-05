import axios from "axios";

export const refineQuestion = async (rawInput: string): Promise<{ question: string; category: string }> => {
  try {
    const response = await axios.post("/api/ai/refine", { rawInput });
    const result = response.data;
    
    return {
      question: result.question || rawInput,
      category: result.category || "General"
    };
  } catch (error) {
    console.error("AI Refinement failed:", error);
    return { question: rawInput, category: "General" };
  }
};
