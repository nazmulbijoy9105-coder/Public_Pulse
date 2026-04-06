import React from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp, getDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface Poll {
  id: string;
  question: string;
  source?: string;
  category?: string;
  status: 'active' | 'archived';
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  trending: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

export function usePolls() {
  const [polls, setPolls] = React.useState<Poll[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const q = query(
        collection(db, 'polls'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pollsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            question: data.question || '',
            source: data.source || 'Unknown',
            category: data.category || 'Other',
            status: data.status || 'active',
            totalVotes: data.totalVotes || 0,
            yesVotes: data.yesVotes || 0,
            noVotes: data.noVotes || 0,
            trending: data.trending || false,
            createdAt: data.createdAt || Timestamp.now(),
            createdBy: data.createdBy || 'system',
          } as Poll;
        });
        setPolls(pollsData);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching polls:', err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, []);

  return { polls, loading, error };
}

export async function getPollById(pollId: string): Promise<Poll | null> {
  try {
    const docSnap = await getDoc(doc(db, 'polls', pollId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      question: data.question || '',
      source: data.source || 'Unknown',
      category: data.category || 'Other',
      status: data.status || 'active',
      totalVotes: data.totalVotes || 0,
      yesVotes: data.yesVotes || 0,
      noVotes: data.noVotes || 0,
      trending: data.trending || false,
      createdAt: data.createdAt || Timestamp.now(),
      createdBy: data.createdBy || 'system',
    } as Poll;
  } catch (error) {
    console.error('Error fetching poll:', error);
    return null;
  }
}

export async function createPoll(pollData: Omit<Poll, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'polls'), {
      ...pollData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    return null;
  }
}
