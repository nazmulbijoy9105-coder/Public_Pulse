import axios from "axios";
import { Poll } from "../App";

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
    const response = await axios.post("/api/ai/insights", { polls });
    return response.data;
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
    const response = await axios.post("/api/ai/simulate", { policy, historicalPolls });
    return response.data;
  } catch (error) {
    console.error("Policy simulation failed:", error);
    throw error;
  }
};
