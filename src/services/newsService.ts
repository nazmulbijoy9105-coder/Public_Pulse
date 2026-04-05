import axios from "axios";
import { db } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export interface PendingQuestion {
  id?: string;
  headline: string;
  question: string;
  source: string;
  sourceUrl: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export const scrapeAndGenerateQuestions = async () => {
  try {
    const response = await axios.post("/api/ai/scrape");
    const data = response.data;
    const results: PendingQuestion[] = [];

    for (const item of data) {
      const pending: PendingQuestion = {
        headline: item.headline,
        question: item.question,
        source: item.source,
        sourceUrl: item.sourceUrl,
        category: item.category || 'National',
        status: 'pending',
        createdAt: Timestamp.now()
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'pending_questions'), pending);
      results.push(pending);
    }
    
    return results;
  } catch (error) {
    console.error("Scraping failed:", error);
    throw error;
  }
};
