import React from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp, getDoc, doc, addDoc } from 'firebase/firestore';
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

function safePollTransform(doc: any): Poll {
  const data = doc.data();
  
  return {
    id: doc.id || '',
    question: String(data?.question || ''),
    source: String(data?.source || 'Unknown'),
    category: String(data?.category || 'Other'),
    status: (data?.status === 'archived' ? 'archived' : 'active') as 'active' | 'archived',
    totalVotes: Number(data?.totalVotes || 0),
    yesVotes: Number(data?.yesVotes || 0),
    noVotes: Number(data?.noVotes || 0),
    trending: Boolean(data?.trending || false),
    createdAt: data?.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    createdBy: String(data?.createdBy || 'system'),
  };
}

export function usePolls() {
  const [polls, setPolls] = React.useState<Poll[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribe: any;
    
    try {
      const q = query(
        collection(db, 'polls'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const pollsData = snapshot.docs
              .map((doc) => {
                try {
                  return safePollTransform(doc);
                } catch (err) {
                  console.warn('Error transforming poll:', doc.id, err);
                  return null;
                }
              })
              .filter((poll): poll is Poll => poll !== null);
            
            setPolls(pollsData);
            setError(null);
            setLoading(false);
          } catch (err) {
            console.error('Error processing snapshot:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch polls');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Setup failed');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { polls, loading, error };
}

export async function getPollById(pollId: string): Promise<Poll | null> {
  try {
    if (!pollId || typeof pollId !== 'string') {
      console.error('Invalid poll ID:', pollId);
      return null;
    }

    const docSnap = await getDoc(doc(db, 'polls', pollId));
    if (!docSnap.exists()) {
      console.warn('Poll not found:', pollId);
      return null;
    }

    return safePollTransform(docSnap);
  } catch (error) {
    console.error('Error fetching poll:', error);
    return null;
  }
}

export async function createPoll(
  pollData: Omit<Poll, 'id' | 'createdAt'>
): Promise<string | null> {
  try {
    if (!pollData.question || typeof pollData.question !== 'string') {
      throw new Error('Question is required and must be a string');
    }
    if (!pollData.createdBy || typeof pollData.createdBy !== 'string') {
      throw new Error('createdBy is required');
    }

    const safeData = {
      question: String(pollData.question),
      source: String(pollData.source || 'Unknown'),
      category: String(pollData.category || 'Other'),
      status: pollData.status || 'active',
      totalVotes: Number(pollData.totalVotes || 0),
      yesVotes: Number(pollData.yesVotes || 0),
      noVotes: Number(pollData.noVotes || 0),
      trending: Boolean(pollData.trending || false),
      createdBy: String(pollData.createdBy),
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'polls'), safeData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    return null;
  }
}
