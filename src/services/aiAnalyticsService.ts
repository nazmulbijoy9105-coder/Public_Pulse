import { GoogleGenAI, Type } from "@google/genai";
import { Poll } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GovernanceInsight {
  summary: string;
  predictions: {
    topic: string;
    trend: 'rising' | 'falling' | 'stable';
    confidence: number;
    reasoning: string;
  }[];
  policySuggestions: {
    title: string;
    description: string;
    expectedSupport: number;
  }[];
  riskAlerts: string[];
}

export const generateGovernanceInsights = async (polls: Poll[]): Promise<GovernanceInsight> => {
  try {
    const pollsToAnalyze = polls.slice(0, 15);
    const pollContext = pollsToAnalyze.map((p: any) => ({
      question: p.question,
      category: p.category,
      yes: p.yesVotes,
      no: p.noVotes,
      total: p.totalVotes
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Analyze these public opinion polls from Bangladesh and provide predictive governance insights.
      
      Poll Data: ${JSON.stringify(pollContext)}` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  trend: { type: Type.STRING, enum: ['rising', 'falling', 'stable'] },
                  confidence: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                },
                required: ["topic", "trend", "confidence", "reasoning"]
              }
            },
            policySuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  expectedSupport: { type: Type.NUMBER }
                },
                required: ["title", "description", "expectedSupport"]
              }
            },
            riskAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "predictions", "policySuggestions", "riskAlerts"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Governance Insight generation failed:", error);
    throw error;
  }
};

export const simulatePolicyReaction = async (policy: string, historicalPolls: Poll[]): Promise<{
  predictedSupport: number;
  sentimentAnalysis: string;
  keyConcerns: string[];
  demographicImpact: string;
  riskIndex: number;
  unityImpact: 'positive' | 'negative' | 'neutral';
  reasoning: string;
}> => {
  try {
    const pollsToAnalyze = historicalPolls.slice(0, 15);
    const pollContext = pollsToAnalyze.map((p: any) => ({
      question: p.question,
      category: p.category,
      yes: p.yesVotes,
      no: p.noVotes
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `Predict the public reaction in Bangladesh to this hypothetical policy based on historical polling data.
      Analyze trends in existing data to identify potential friction points and support clusters.
      
      Hypothetical Policy: "${policy}"
      Historical Data Context: ${JSON.stringify(pollContext)}` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedSupport: { type: Type.NUMBER },
            sentimentAnalysis: { type: Type.STRING },
            keyConcerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            demographicImpact: { type: Type.STRING },
            riskIndex: { type: Type.NUMBER },
            unityImpact: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
            reasoning: { type: Type.STRING }
          },
          required: ["predictedSupport", "sentimentAnalysis", "keyConcerns", "demographicImpact", "riskIndex", "unityImpact", "reasoning"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Policy simulation failed:", error);
    throw error;
  }
};
