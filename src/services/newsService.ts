import { GoogleGenAI } from "@google/genai";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const NEWS_SOURCES = [
  { name: "Prothom Alo", url: "https://www.prothomalo.com/bangladesh" },
  { name: "The Daily Star", url: "https://www.thedailystar.net/bangladesh" },
  { name: "BDNews24", url: "https://bdnews24.com/bangladesh" },
  { name: "Jugantor", url: "https://www.jugantor.com/national" },
  { name: "Kaler Kantho", url: "https://www.kalerkantho.com/online/national" }
];

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
  const results: PendingQuestion[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      // Use Gemini with urlContext to extract headlines and generate questions
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract the top 3 news headlines from ${source.url} and for each headline, generate a neutral YES/NO public opinion question. 
        
        Rules for questions:
        - Neutral tone
        - No bias
        - Max 20 words
        - Answer must be Yes/No
        - Focus on policy, governance, and public interest
        
        Return the result as a JSON array of objects with these fields:
        - headline: the original headline
        - question: the generated YES/NO question
        - category: one of ['National', 'Economy', 'Policy', 'Environment', 'Tech']
        `,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || "[]");
      
      for (const item of data) {
        const pending: PendingQuestion = {
          headline: item.headline,
          question: item.question,
          source: source.name,
          sourceUrl: source.url,
          category: item.category || 'National',
          status: 'pending',
          createdAt: Timestamp.now()
        };
        
        // Save to Firestore
        await addDoc(collection(db, 'pending_questions'), pending);
        results.push(pending);
      }
    } catch (error) {
      console.error(`Failed to scrape ${source.name}:`, error);
    }
  }
  
  return results;
};
