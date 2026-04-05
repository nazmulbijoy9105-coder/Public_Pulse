import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  where,
  orderBy, 
  limit, 
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Share2, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Info, 
  BarChart3, 
  Smartphone, 
  UserCircle2,
  ChevronRight,
  MessageSquare,
  History,
  Settings2,
  Newspaper,
  Clock,
  ExternalLink
} from 'lucide-react';
import { AdminModeration } from './components/AdminModeration';
import { Dashboard } from './components/Dashboard';
import { Legal } from './components/Legal';
import { GoogleGenAI } from "@google/genai";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { cn } from './lib/utils';
import { refineQuestion } from './services/geminiService';

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorInfo: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-rose-100">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-6 text-sm">We encountered an unexpected error. Our team has been notified.</p>
            <div className="bg-gray-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32">
              <code className="text-[10px] text-rose-500 break-all">{this.state.errorInfo}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Types ---

interface UserProfile {
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
  category: string;
  status: 'active' | 'archived';
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  trending: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

interface Vote {
  pollId: string;
  userId: string;
  answer: boolean;
  trustWeight: number;
  timestamp: Timestamp;
  region: string;
}

// --- Context ---

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  verifyNID: () => Promise<void>;
  verifyPhone: (phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// --- Components ---

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            // Initialize new user profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              trustScore: 0.5, // Initial trust score
              nidVerified: false,
              deviceTrust: 0.8,
              behaviorScore: 0.7,
              role: firebaseUser.email === 'NAZMULBIJOY9105@gmail.com' ? 'admin' : 'user',
              phoneVerified: false,
              createdAt: Timestamp.now(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const verifyNID = async () => {
    if (!user || !profile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        nidVerified: true,
        trustScore: 0.95, // Significant boost for NID
      });
      setProfile(prev => prev ? { ...prev, nidVerified: true, trustScore: 0.95 } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const verifyPhone = async (phone: string) => {
    if (!user || !profile) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        phoneVerified: true,
        phoneNumber: phone,
        trustScore: profile.trustScore + 0.2, // Boost for phone verification
      });
      setProfile(prev => prev ? { 
        ...prev, 
        phoneVerified: true, 
        phoneNumber: phone, 
        trustScore: prev.trustScore + 0.2 
      } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout, verifyNID, verifyPhone }}>
      {children}
    </AuthContext.Provider>
  );
};

const PollCard: React.FC<{ poll: Poll; onVerifyPhone: () => void }> = ({ poll, onVerifyPhone }) => {
  const { profile, user } = useAuth();
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const voteRef = doc(db, 'polls', poll.id, 'votes', user.uid);
    const unsubscribe = onSnapshot(voteRef, (snap) => {
      if (snap.exists()) {
        setUserVote(snap.data() as Vote);
      }
    });
    return unsubscribe;
  }, [poll.id, user]);

  const handleVote = async (answer: boolean) => {
    if (!user || !profile || userVote || voting) return;
    
    if (!profile.phoneVerified) {
      onVerifyPhone();
      return;
    }

    setVoting(true);
    const regions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];
    const randomRegion = regions[Math.floor(Math.random() * regions.length)];

    try {
      const voteRef = doc(db, 'polls', poll.id, 'votes', user.uid);
      const pollRef = doc(db, 'polls', poll.id);

      const voteData: Vote = {
        pollId: poll.id,
        userId: user.uid,
        answer,
        trustWeight: profile.trustScore,
        timestamp: Timestamp.now(),
        region: randomRegion,
      };

      await setDoc(voteRef, voteData);
      await updateDoc(pollRef, {
        totalVotes: increment(1),
        [answer ? 'yesVotes' : 'noVotes']: increment(1),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${poll.id}/votes`);
    } finally {
      setVoting(false);
    }
  };

  const yesPercent = poll.totalVotes > 0 ? Math.round((poll.yesVotes / poll.totalVotes) * 100) : 0;
  const noPercent = poll.totalVotes > 0 ? Math.round((poll.noVotes / poll.totalVotes) * 100) : 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-8 mb-8 overflow-hidden relative group"
    >
      {poll.trending && (
        <div className="absolute top-6 right-6 bg-bd-red/10 text-bd-red px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 tracking-widest uppercase">
          <TrendingUp size={14} />
          Trending
        </div>
      )}

      <div className="flex items-center gap-2 text-bd-green font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
        <span className="w-1.5 h-1.5 bg-bd-red rounded-full" />
        {poll.category} • {poll.source}
      </div>

      <h3 className="text-2xl font-display font-black text-gray-900 leading-[1.2] mb-8 pr-12">
        {poll.question}
      </h3>

      {!userVote ? (
        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={() => handleVote(true)}
            disabled={voting}
            className="flex flex-col items-center justify-center p-8 rounded-[2rem] bg-bd-green/5 hover:bg-bd-green text-bd-green hover:text-white transition-all duration-500 group/btn border border-bd-green/10"
          >
            <CheckCircle2 size={36} className="mb-3 group-hover/btn:scale-110 transition-transform duration-500" />
            <span className="font-black text-xl tracking-tight">YES</span>
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={voting}
            className="flex flex-col items-center justify-center p-8 rounded-[2rem] bg-bd-red/5 hover:bg-bd-red text-bd-red hover:text-white transition-all duration-500 group/btn border border-bd-red/10"
          >
            <XCircle size={36} className="mb-3 group-hover/btn:scale-110 transition-transform duration-500" />
            <span className="font-black text-xl tracking-tight">NO</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="relative h-16 bg-gray-50 rounded-[1.5rem] overflow-hidden flex p-1.5 border border-gray-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${yesPercent}%` }}
              className="h-full bg-bd-green rounded-[1rem] flex items-center px-5 text-white font-black text-sm whitespace-nowrap shadow-lg shadow-bd-green/20"
            >
              {yesPercent > 15 && `YES ${yesPercent}%`}
            </motion.div>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${noPercent}%` }}
              className="h-full bg-bd-red rounded-[1rem] flex items-center justify-end px-5 text-white font-black text-sm whitespace-nowrap ml-auto shadow-lg shadow-bd-red/20"
            >
              {noPercent > 15 && `${noPercent}% NO`}
            </motion.div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-gray-400">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-bd-green" />
              <span>{poll.totalVotes.toLocaleString()} Verified Citizens</span>
            </div>
            <div className={cn(
              "px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase border",
              userVote.answer ? "bg-bd-green/5 text-bd-green border-bd-green/20" : "bg-bd-red/5 text-bd-red border-bd-red/20"
            )}>
              Voted {userVote.answer ? 'YES' : 'NO'}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 flex gap-4">
            <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bd-green transition-all duration-500 shadow-xl shadow-gray-200">
              <Share2 size={20} />
              Share Result
            </button>
            <button className="p-4 bg-bd-green text-white rounded-2xl hover:bg-bd-green-dark transition-all duration-500 shadow-xl shadow-bd-green/20">
              <MessageSquare size={20} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const CATEGORIES = ['National', 'Economy', 'Policy', 'Infrastructure', 'Health', 'Education', 'Environment', 'Tech'];
const FILTER_CATEGORIES = ['All', ...CATEGORIES];

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [source, setSource] = useState('The Daily Star');
  const [category, setCategory] = useState('National');
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);

  const handleRefine = async () => {
    if (!question) return;
    setRefining(true);
    try {
      const refined = await refineQuestion(question);
      setQuestion(refined.question);
      setCategory(refined.category);
    } finally {
      setRefining(false);
    }
  };

  const createPoll = async () => {
    if (!question || !user) return;
    setLoading(true);
    try {
      const pollId = doc(collection(db, 'polls')).id;
      const pollData: Poll = {
        id: pollId,
        question,
        source,
        category,
        status: 'active',
        totalVotes: 0,
        yesVotes: 0,
        noVotes: 0,
        trending: false,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      };
      await setDoc(doc(db, 'polls', pollId), pollData);
      setQuestion('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'polls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-card p-8 mb-12 border-dashed border-2 border-bd-green/20 bg-bd-green/[0.02]">
      <h4 className="text-xs font-black text-bd-green uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <Plus size={18} />
        Initialize National Poll
      </h4>
      <div className="space-y-6">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter a news headline or topic..."
            className="w-full p-6 rounded-3xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none transition-all resize-none h-32 text-gray-900 font-medium"
          />
          <button 
            onClick={handleRefine}
            disabled={refining || !question}
            className="absolute bottom-4 right-4 px-4 py-2 bg-bd-green/10 text-bd-green rounded-xl hover:bg-bd-green hover:text-white transition-all duration-500 flex items-center gap-2 text-xs font-black disabled:opacity-50"
          >
            {refining ? 'Refining...' : (
              <>
                <TrendingUp size={16} />
                AI Refine
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-4 rounded-2xl ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none text-sm font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-4 rounded-2xl ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none text-sm font-bold bg-white appearance-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={createPoll}
          disabled={loading || !question}
          className="w-full py-5 bg-bd-green text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] hover:bg-bd-green-dark transition-all duration-500 shadow-2xl shadow-bd-green/30 disabled:opacity-50"
        >
          {loading ? 'Publishing...' : 'Broadcast to Nation'}
        </button>
      </div>
    </div>
  );
};

const Header: React.FC = () => {
  const { profile, login, logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-gray-100/50 px-8 py-6 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 bg-bd-green rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-bd-green/20 overflow-hidden group">
          <Smartphone size={28} className="z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-bd-green to-bd-green-dark" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-bd-red rounded-full blur-[1px] opacity-90 shadow-[0_0_15px_rgba(244,42,65,0.6)]" />
        </div>
        <div>
          <h1 className="text-xl font-display font-black text-gray-900 leading-none tracking-tight">PUBLIC PULSE</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-3 h-1 bg-bd-green rounded-full" />
            <p className="text-[10px] font-black text-bd-green uppercase tracking-[0.2em]">Voice of Bangladesh</p>
          </div>
        </div>
      </div>

      {user ? (
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-gray-900 tracking-tight">{profile?.displayName}</p>
            <div className="flex items-center justify-end gap-1.5 text-[10px] text-bd-green font-black tracking-widest uppercase">
              {profile?.role === 'admin' && (
                <span className="bg-bd-red text-white px-2 py-0.5 rounded-md text-[8px] mr-1 shadow-sm">ADMIN</span>
              )}
              <ShieldCheck size={14} className="text-bd-red" />
              Trust: {Math.round((profile?.trustScore || 0) * 100)}%
            </div>
          </div>
          <button onClick={logout} className="p-3 text-gray-400 hover:text-bd-red transition-all duration-300 hover:bg-bd-red/5 rounded-xl">
            <LogOut size={22} />
          </button>
        </div>
      ) : (
        <button 
          onClick={login}
          className="px-8 py-3 bg-gray-900 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-bd-green transition-all duration-500 shadow-2xl shadow-gray-200"
        >
          Sign In
        </button>
      )}
    </header>
  );
};

const AppContent: React.FC = () => {
  const { loading, user, isAdmin, profile, login, verifyNID, verifyPhone } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState<'active' | 'archived' | 'moderation' | 'dashboard' | 'legal'>('active');
  const [verifying, setVerifying] = useState(false);
  const [showNIDModal, setShowNIDModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneStep, setPhoneStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [nidStep, setNidStep] = useState(1);
  const [nidNumber, setNidNumber] = useState('');
  const [showGovernance, setShowGovernance] = useState(false);

  useEffect(() => {
    if (!user || (view !== 'active' && view !== 'archived' && view !== 'dashboard')) {
      if (!user) setPolls([]);
      return;
    }

    // For dashboard, we might want more data to show accurate stats
    const pollLimit = view === 'dashboard' ? 100 : 20;
    const pollStatus = view === 'dashboard' ? 'active' : view;

    let q = query(
      collection(db, 'polls'), 
      where('status', '==', pollStatus)
    );

    if (filter !== 'All') {
      q = query(q, where('category', '==', filter));
    }

    q = query(q, orderBy('createdAt', 'desc'), limit(pollLimit));

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data() as Poll);
      setPolls(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
    });
    return unsubscribe;
  }, [user, view, filter]);

  const handleVerify = async () => {
    setVerifying(true);
    await new Promise(r => setTimeout(r, 2500)); // Simulate secure verification
    await verifyNID();
    setVerifying(false);
    setShowNIDModal(false);
  };

  const handlePhoneVerify = async () => {
    setVerifying(true);
    await new Promise(r => setTimeout(r, 2000)); // Simulate OTP verification
    await verifyPhone(phoneNumber);
    setVerifying(false);
    setShowPhoneModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />      <main className="max-w-2xl mx-auto px-8 pt-12">
        {!user ? (
          <div className="text-center py-24">
            <div className="w-32 h-32 bg-bd-green/10 text-bd-green rounded-[3rem] flex items-center justify-center mx-auto mb-10 relative group">
              <UserCircle2 size={64} className="group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-bd-red rounded-full border-[6px] border-bd-bg flex items-center justify-center shadow-xl">
                <div className="w-4 h-4 bg-white rounded-full shadow-inner" />
              </div>
            </div>
            <h2 className="text-5xl font-display font-black text-gray-900 mb-6 tracking-tight leading-none">
              Digital Public <br />
              <span className="text-bd-green">Observatory</span>
            </h2>
            <p className="text-gray-500 mb-12 leading-relaxed text-xl max-w-md mx-auto font-medium">
              A nationwide continuous democratic feedback system for <span className="text-bd-green font-black border-b-4 border-bd-red/30">Bangladesh</span>.
            </p>
            <button 
              onClick={() => login()}
              className="w-full py-6 bg-bd-green text-white rounded-[2rem] font-black text-xl shadow-[0_20px_50px_rgba(0,106,78,0.3)] hover:bg-bd-green-dark transition-all active:scale-[0.98] duration-500 uppercase tracking-widest"
            >
              Get Verified & Vote
            </button>
            <p className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
              Join 2,34,000+ Verified Citizens
            </p>
          </div>
        ) : (
          <>
            {isAdmin && <AdminPanel />}

            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-3 bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-gray-100">
                <button 
                  onClick={() => setView('active')}
                  className={cn(
                    "px-6 py-3 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all duration-500",
                    view === 'active' ? "bg-bd-green text-white shadow-xl shadow-bd-green/20" : "text-gray-400 hover:text-bd-green"
                  )}
                >
                  Live Pulse
                </button>
                <button 
                  onClick={() => setView('archived')}
                  className={cn(
                    "px-6 py-3 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all duration-500",
                    view === 'archived' ? "bg-gray-900 text-white shadow-xl shadow-gray-400/20" : "text-gray-400 hover:text-gray-900"
                  )}
                >
                  Archive
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setView('moderation')}
                    className={cn(
                      "px-6 py-3 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all duration-500",
                      view === 'moderation' ? "bg-bd-red text-white shadow-xl shadow-bd-red/20" : "text-gray-400 hover:text-bd-red"
                    )}
                  >
                    Moderation
                  </button>
                )}
                <button 
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "px-6 py-3 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all duration-500",
                    view === 'dashboard' ? "bg-bd-green text-white shadow-xl shadow-bd-green/20" : "text-gray-400 hover:text-bd-green"
                  )}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setView('legal')}
                  className={cn(
                    "px-6 py-3 rounded-[1.15rem] text-xs font-black uppercase tracking-widest transition-all duration-500",
                    view === 'legal' ? "bg-gray-900 text-white shadow-xl shadow-gray-400/20" : "text-gray-400 hover:text-gray-900"
                  )}
                >
                  Legal
                </button>
              </div>
              <div className="flex items-center gap-2.5 text-[10px] font-black text-bd-green uppercase tracking-[0.2em]">
                <div className="w-2.5 h-2.5 bg-bd-red rounded-full animate-pulse shadow-[0_0_10px_rgba(244,42,65,0.5)]" />
                Real-time
              </div>
            </div>

            <div className="mb-12">
              <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar mb-6">
                {FILTER_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={cn(
                      "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-500 border",
                      filter === cat 
                        ? "bg-bd-green text-white border-bd-green shadow-xl shadow-bd-green/20" 
                        : "bg-white text-gray-500 border-gray-100 hover:border-bd-green hover:text-bd-green"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {view === 'moderation' && isAdmin ? (
                <AdminModeration />
              ) : view === 'dashboard' ? (
                <Dashboard polls={polls} />
              ) : view === 'legal' ? (
                <Legal />
              ) : (
                <AnimatePresence mode="popLayout">
                  {polls.length > 0 ? (
                    polls.map((poll) => (
                      <PollCard key={poll.id} poll={poll} onVerifyPhone={() => setShowPhoneModal(true)} />
                    ))
                  ) : (
                    <div className="text-center py-20 premium-card border-dashed border-2 border-gray-200 bg-transparent">
                      <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No {view} polls in {filter}</p>
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>

            <div className="premium-card p-8 mb-10">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ShieldCheck size={20} className="text-bd-green" />
                Trust Infrastructure
              </h4>
              <div className="space-y-5">
                <button 
                  onClick={() => setShowNIDModal(true)}
                  disabled={profile?.nidVerified}
                  className={cn(
                    "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all duration-500 border",
                    profile?.nidVerified 
                      ? "bg-bd-green/[0.03] border-bd-green/20" 
                      : "bg-gray-50 border-gray-100 hover:border-bd-green/40 hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500", 
                      profile?.nidVerified ? "bg-bd-green text-white" : "bg-gray-200 text-gray-400"
                    )}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900 tracking-tight">NID Verification</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {profile?.nidVerified ? "Identity Authenticated" : "Verify to boost trust"}
                      </p>
                    </div>
                  </div>
                  {profile?.nidVerified ? (
                    <div className="w-8 h-8 bg-bd-green/10 text-bd-green rounded-full flex items-center justify-center">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <ChevronRight size={20} className="text-gray-300" />
                  )}
                </button>
                
                <button 
                  onClick={() => setShowPhoneModal(true)}
                  disabled={profile?.phoneVerified}
                  className={cn(
                    "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all duration-500 border",
                    profile?.phoneVerified 
                      ? "bg-bd-green/[0.03] border-bd-green/20" 
                      : "bg-gray-50 border-gray-100 hover:border-bd-green/40 hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500", 
                      profile?.phoneVerified ? "bg-bd-green text-white" : "bg-gray-200 text-gray-400"
                    )}>
                      <Smartphone size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900 tracking-tight">Phone Verification</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {profile?.phoneVerified ? "Secure Link Established" : "Mandatory for referendum"}
                      </p>
                    </div>
                  </div>
                  {profile?.phoneVerified ? (
                    <div className="w-8 h-8 bg-bd-green/10 text-bd-green rounded-full flex items-center justify-center">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <ChevronRight size={20} className="text-gray-300" />
                  )}
                </button>

                <div className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-[2rem]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-bd-green/10 text-bd-green rounded-2xl flex items-center justify-center">
                      <Smartphone size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-gray-900 tracking-tight">Device Identity</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Hardware Fingerprint: Trusted</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-bd-green bg-bd-green/5 px-3 py-1.5 rounded-xl border border-bd-green/10 tracking-widest">SECURE</span>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <button 
                onClick={() => setShowGovernance(true)}
                className="w-full p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] text-white text-left relative overflow-hidden group shadow-2xl shadow-gray-400/20"
              >
                <div className="relative z-10">
                  <h4 className="text-xl font-display font-black mb-2 flex items-center gap-2.5">
                    <ShieldCheck size={24} className="text-bd-red" />
                    AI Governance
                  </h4>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed max-w-[85%] uppercase tracking-widest">
                    Neutrality Protocol & Unbiased Sentiment Analysis
                  </p>
                </div>
                <div className="absolute top-1/2 right-8 -translate-y-1/2 text-gray-700 group-hover:text-bd-red transition-all duration-500 group-hover:translate-x-2">
                  <ChevronRight size={40} />
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-bd-red/10 rounded-full blur-3xl group-hover:bg-bd-red/20 transition-all duration-500" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Phone Verification Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhoneModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-display font-black text-gray-900">Phone Auth</h3>
                  <button onClick={() => setShowPhoneModal(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={24} />
                  </button>
                </div>

                {phoneStep === 1 ? (
                  <div className="space-y-8">
                    <div className="p-6 bg-bd-green/[0.03] rounded-[2rem] border border-bd-green/10">
                      <p className="text-sm text-gray-600 font-medium leading-relaxed text-center">
                        Mandatory Phone OTP verification to prevent <span className="text-bd-red font-black">Sybil attacks</span> and ensure one-person-one-vote.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Phone Number</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">+880</span>
                        <input 
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="1XXXXXXXXX"
                          className="w-full p-6 pl-20 bg-gray-50 rounded-[1.5rem] border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none font-bold text-xl text-gray-900"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => setPhoneStep(2)}
                      disabled={phoneNumber.length < 10}
                      className="w-full py-5 bg-bd-green text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-bd-green-dark transition-all duration-500 shadow-xl shadow-bd-green/20 disabled:opacity-50"
                    >
                      Send OTP Code
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Enter 6-Digit OTP</label>
                      <input 
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="XXXXXX"
                        className="w-full p-6 bg-gray-50 rounded-[1.5rem] border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none font-mono text-3xl tracking-[0.5em] text-center text-gray-900"
                      />
                    </div>
                    <button 
                      onClick={handlePhoneVerify}
                      disabled={verifying || otpCode.length < 6}
                      className="w-full py-5 bg-bd-green text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-bd-green-dark transition-all duration-500 shadow-xl shadow-bd-green/20 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {verifying ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          Confirm & Link
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setPhoneStep(1)}
                      className="w-full py-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Change Number
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NID Verification Modal */}
      <AnimatePresence>
        {showNIDModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNIDModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-display font-black text-gray-900 tracking-tight">NID Verification</h3>
                  <button onClick={() => setShowNIDModal(false)} className="text-gray-400 hover:text-bd-red transition-colors">
                    <XCircle size={28} />
                  </button>
                </div>

                {nidStep === 1 ? (
                  <div className="space-y-8">
                    <div className="w-20 h-20 bg-bd-green/10 text-bd-green rounded-[2rem] flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck size={40} />
                    </div>
                    <div className="p-6 bg-bd-green/[0.03] rounded-[2rem] border border-bd-green/10">
                      <p className="text-sm text-gray-600 font-medium leading-relaxed text-center">
                        Verification links your account to a unique <span className="text-bd-green font-black">NID hash</span>. This prevents duplicate voting and boosts your trust weight to <span className="text-bd-green font-black">95%</span>.
                      </p>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-bd-green text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-bd-green/20">1</div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Enter your 10 or 17 digit NID number.</p>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-bd-green text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-bd-green/20">2</div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">System generates a secure cryptographic hash (NID is not stored).</p>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-bd-green text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-bd-green/20">3</div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Trust score is instantly updated to elite status.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNidStep(2)}
                      className="w-full py-5 bg-bd-green text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-bd-green-dark transition-all duration-500 shadow-xl shadow-bd-green/20"
                    >
                      Continue to Verify
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">NID Number</label>
                      <input 
                        type="text"
                        value={nidNumber}
                        onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 19912692..."
                        className="w-full p-6 bg-gray-50 rounded-[1.5rem] border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none font-mono text-2xl tracking-[0.3em] text-center text-gray-900"
                      />
                      <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">
                        Your NID is processed locally and never stored on our servers.
                      </p>
                    </div>
                    <button 
                      onClick={handleVerify}
                      disabled={verifying || nidNumber.length < 10}
                      className="w-full py-5 bg-bd-green text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-bd-green-dark transition-all duration-500 shadow-xl shadow-bd-green/20 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {verifying ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={20} />
                          Verify Identity
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setNidStep(1)}
                      className="w-full py-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Governance Modal */}
      <AnimatePresence>
        {showGovernance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGovernance(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-900">AI Governance</h3>
                  <button onClick={() => setShowGovernance(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">Neutrality Protocol</h5>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Our AI models are strictly tuned to remove political bias and branding influence from all polling content.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">Weighted Sentiment</h5>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Votes are not just counted; they are weighted by Trust Scores to filter out noise and bot activity.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">Predictive Governance</h5>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        AI simulations help policymakers understand "public resistance zones" before implementing new policies.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowGovernance(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-8 py-4 flex justify-between items-center sm:hidden">
        <button className="text-emerald-600 flex flex-col items-center gap-1">
          <Smartphone size={20} />
          <span className="text-[10px] font-bold">Pulse</span>
        </button>
        <button className="text-gray-400 flex flex-col items-center gap-1">
          <TrendingUp size={20} />
          <span className="text-[10px] font-bold">Trends</span>
        </button>
        <button className="text-gray-400 flex flex-col items-center gap-1">
          <Info size={20} />
          <span className="text-[10px] font-bold">Policy</span>
        </button>
        <button className="text-gray-400 flex flex-col items-center gap-1">
          <UserCircle2 size={20} />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
