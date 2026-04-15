import axios from "axios";
import { Timestamp } from "firebase/firestore";

export interface PendingQuestion {
  id?: string;
  headline: string;
  question: string;
  source: string;
  sourceUrl: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  publishedDate?: string;
  createdAt: Timestamp;
}

export const scrapeAndGenerateQuestions = async () => {
  try {
    const response = await axios.post("/api/ai/scrape");
    return response.data;
  } catch (error) {
    console.error("Scraping failed:", error);
    throw error;
  }
};
