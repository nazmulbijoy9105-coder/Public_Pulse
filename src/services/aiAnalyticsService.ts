import { GoogleGenAI, Type } from "@google/genai";
import { Poll } from "../App";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
    const pollContext = polls.map(p => ({
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
                required: ['topic', 'trend', 'confidence', 'reasoning']
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
                required: ['title', 'description', 'expectedSupport']
              }
            },
            riskAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['summary', 'predictions', 'policySuggestions', 'riskAlerts']
        }
      }
    });

    return JSON.parse(response.text);
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
}> => {
  try {
    const pollContext = historicalPolls.map(p => ({
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
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedSupport: { type: Type.NUMBER },
            sentimentAnalysis: { type: Type.STRING },
            keyConcerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            demographicImpact: { type: Type.STRING }
          },
          required: ['predictedSupport', 'sentimentAnalysis', 'keyConcerns', 'demographicImpact']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Policy simulation failed:", error);
    throw error;
  }
};
