import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  trustScore: number;
  nidVerified: boolean;
  deviceTrust: number;
  behaviorScore: number;
  role: 'admin' | 'user';
  phoneVerified: boolean;
  phoneNumber?: string;
  createdAt: Timestamp;
}

export interface Poll {
  id: string;
  question: string;
  source: string;
  publishedDate?: string;
  category: string;
  status: 'active' | 'archived';
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  trending: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

export interface Vote {
  pollId: string;
  userId: string;
  answer: boolean;
  trustWeight: number;
  timestamp: Timestamp;
  region: string;
}
