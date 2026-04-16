import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Plus,
  AlertCircle
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc, 
  deleteDoc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { scrapeAndGenerateQuestions, PendingQuestion } from '../services/newsService';
import { refineQuestion } from '../services/geminiService';
import { cn } from '../lib/utils';

export const AdminModeration: React.FC = () => {
  const [pending, setPending] = useState<PendingQuestion[]>([]);
  const [scraping, setScraping] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'pending_questions'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendingQuestion[];
      setPending(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pending_questions');
    });

    return unsubscribe;
  }, []);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await scrapeAndGenerateQuestions();
    } catch (error) {
      console.error('Scraping failed:', error);
    } finally {
      setScraping(false);
    }
  };

  const handleRefine = async (item: PendingQuestion) => {
    if (!item.id) return;
    setRefining(item.id);
    try {
      const refined = await refineQuestion(item.headline);
      await updateDoc(doc(db, 'pending_questions', item.id), {
        question: refined.question,
        category: refined.category
      });
    } catch (error) {
      console.error('Refinement failed:', error);
    } finally {
      setRefining(null);
    }
  };

  const approveQuestion = async (item: PendingQuestion) => {
    if (!item.id) return;
    try {
      // 1. Create the actual poll
      const pollId = doc(collection(db, 'polls')).id;
      await setDoc(doc(db, 'polls', pollId), {
        id: pollId,
        question: item.question,
        source: item.source,
        category: item.category,
        status: 'active',
        totalVotes: 0,
        yesVotes: 0,
        noVotes: 0,
        trending: false,
        publishedDate: item.publishedDate || '',
        createdAt: Timestamp.now(),
        createdBy: auth.currentUser?.uid
      });

      // 2. Update pending status
      await updateDoc(doc(db, 'pending_questions', item.id), {
        status: 'approved'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'polls');
    }
  };

  const rejectQuestion = async (id: string) => {
    try {
      await updateDoc(doc(db, 'pending_questions', id), {
        status: 'rejected'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'pending_questions');
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pending_questions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pending_questions');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-white rounded-[2.5rem] shadow-xl border border-gray-100">
        <div>
          <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight mb-2">AI Extraction Hub</h2>
          <p className="text-sm text-gray-500 font-medium">Automated news monitoring & question generation.</p>
        </div>
        <button 
          onClick={handleScrape}
          disabled={scraping}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all duration-500 shadow-xl",
            scraping 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-bd-green text-white hover:bg-bd-green-dark shadow-bd-green/20"
          )}
        >
          {scraping ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Scraping Portals...
            </>
          ) : (
            <>
              <Newspaper size={20} />
              Fetch Latest News
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {pending.filter(q => q.status === 'pending').map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-bd-green/5 rounded-bl-[5rem] -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="px-4 py-1.5 bg-bd-green/10 text-bd-green rounded-full text-[10px] font-black uppercase tracking-widest">
                    {item.category}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Clock size={12} />
                    {item.source} • {item.publishedDate}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Original Headline</div>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed italic mb-4">"{item.headline}"</p>
                  
                  <div className="text-[10px] font-black text-bd-green uppercase tracking-[0.2em] mb-2">AI Generated Question</div>
                  <h3 className="text-xl font-display font-black text-gray-900 leading-tight">
                    {item.question}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-gray-50">
                  <a 
                    href={item.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-bd-green transition-colors"
                  >
                    <ExternalLink size={14} />
                    Source Portal
                  </a>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleRefine(item)}
                      disabled={!!refining}
                      className={cn(
                        "p-4 bg-bd-green/5 text-bd-green hover:bg-bd-green hover:text-white rounded-2xl transition-all duration-300",
                        refining === item.id && "animate-pulse"
                      )}
                      title="AI Refine"
                    >
                      <RefreshCw size={24} className={cn(refining === item.id && "animate-spin")} />
                    </button>
                    <button 
                      onClick={() => rejectQuestion(item.id!)}
                      className="p-4 bg-gray-50 text-gray-400 hover:bg-bd-red/10 hover:text-bd-red rounded-2xl transition-all duration-300"
                      title="Reject"
                    >
                      <XCircle size={24} />
                    </button>
                    <button 
                      onClick={() => approveQuestion(item)}
                      className="flex items-center gap-3 px-8 py-4 bg-bd-green text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-bd-green-dark transition-all duration-500 shadow-lg shadow-bd-green/20"
                    >
                      <CheckCircle2 size={18} />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pending.filter(q => q.status === 'pending').length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100"
          >
            <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[2rem] flex items-center justify-center mb-6">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-display font-black text-gray-900 mb-2">Queue is Empty</h3>
            <p className="text-sm text-gray-400 font-medium">Fetch news to generate new questions for moderation.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
