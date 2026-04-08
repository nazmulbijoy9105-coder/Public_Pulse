import React from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface Poll {
  id: string;
  question: string;
  source: string;
  category: string;
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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, 'polls'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pollsData: Poll[] = [];
        snapshot.docs.forEach((doc) => {
          try {
            const data = doc.data();
            if (data && typeof data === 'object' && data.question) {
              pollsData.push({
                id: doc.id,
                question: String(data.question),
                source: String(data.source || 'Unknown'),
                category: String(data.category || 'Other'),
                status: data.status || 'active',
                totalVotes: Number(data.totalVotes) || 0,
                yesVotes: Number(data.yesVotes) || 0,
                noVotes: Number(data.noVotes) || 0,
                trending: Boolean(data.trending),
                createdAt: data.createdAt || Timestamp.now(),
                createdBy: String(data.createdBy) || 'system',
              });
            }
          } catch (e) {
            console.warn('Skipping malformed poll:', doc.id);
          }
        });
        setPolls(pollsData);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Polls error:', e);
      setError('Failed to load polls');
      setLoading(false);
    }
  }, []);

  return { polls, loading, error };
}
