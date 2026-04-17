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
  AlertCircle,
  BrainCircuit,
  Globe
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
  const [bulkRefining, setBulkRefining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    // Listen to system metadata
    const metaUnsub = onSnapshot(doc(db, 'system_meta', 'news_extraction'), (snapshot) => {
      if (snapshot.exists()) {
        setSystemHealth(snapshot.data());
      }
    });

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

    return () => {
      unsubscribe();
      metaUnsub();
    };
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

  const refineAll = async () => {
    const unrefined = pending.filter(q => q.status === 'pending' && q.question.endsWith('?'));
    if (unrefined.length === 0) return;
    
    setBulkRefining(true);
    try {
      for (const item of unrefined) {
        await handleRefine(item);
      }
    } finally {
      setBulkRefining(false);
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 font-medium">Automated news monitoring & question generation.</p>
            {systemHealth && (
              <div className="flex items-center gap-2 px-3 py-1 bg-bd-green/5 rounded-full border border-bd-green/10">
                <div className="w-1.5 h-1.5 bg-bd-green rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase text-bd-green tracking-widest">
                  Last Sync: {systemHealth.lastExtraction?.toDate().toLocaleTimeString()} • {systemHealth.itemsFound} Items
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={refineAll}
            disabled={bulkRefining || pending.filter(q => q.status === 'pending' && q.question.endsWith('?')).length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all duration-500 shadow-xl border",
              bulkRefining
                ? "bg-bd-green/10 text-bd-green border-bd-green/20"
                : "bg-white text-gray-900 border-gray-100 hover:border-bd-green hover:text-bd-green"
            )}
          >
            {bulkRefining ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Processing Bulk...
              </>
            ) : (
              <>
                <BrainCircuit size={16} />
                Bulk AI Refine ({pending.filter(q => q.status === 'pending' && q.question.endsWith('?')).length})
              </>
            )}
          </button>
          
          <button 
            onClick={handleScrape}
            disabled={scraping}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all duration-500 shadow-xl",
              scraping 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-gray-900 text-white hover:bg-bd-green shadow-gray-900/20"
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
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {pending.filter(q => q.status === 'pending').map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden group hover:shadow-bd-green/5 transition-all duration-700"
            >
              {/* Decorative Corner with Pattern */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-bd-green/[0.03] rounded-bl-[6rem] -mr-20 -mt-20 group-hover:bg-bd-green/[0.05] transition-colors duration-700 overflow-hidden pointer-events-none">
                 <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #006A4E 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              </div>
              
              <div className="p-8 md:p-10 flex flex-col lg:flex-row gap-10 items-stretch">
                <div className="flex-1 space-y-8 relative">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="px-5 py-2 bg-bd-green/10 text-bd-green rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border border-bd-green/5">
                      {item.category}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <Globe size={12} className="text-bd-green" />
                      {item.source}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">
                      <Clock size={12} />
                      {item.publishedDate}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Official Source Headline</span>
                      </div>
                      <p className="text-base text-gray-500 font-medium leading-relaxed italic border-l-4 border-gray-100 pl-6 py-1">
                        "{item.headline}"
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 bg-bd-green rounded-full shadow-[0_0_8px_rgba(0,106,78,0.5)]" />
                        <span className="text-[10px] font-black text-bd-green uppercase tracking-[0.3em]">AI Neutral Refinement</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-display font-black text-gray-900 leading-tight tracking-tight">
                        {item.question}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 w-full lg:w-72 pt-6 lg:pt-0">
                   <div className="h-full p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4">
                          <span>Moderation Flow</span>
                          <BrainCircuit size={14} className="text-bd-green" />
                        </div>
                        
                        <button 
                          onClick={() => handleRefine(item)}
                          disabled={!!refining}
                          className={cn(
                            "w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 text-gray-700 hover:border-bd-green hover:text-bd-green rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 group/refine mb-3",
                            refining === item.id && "animate-pulse"
                          )}
                        >
                          <RefreshCw size={14} className={cn("group-hover/refine:rotate-180 transition-transform duration-500", refining === item.id && "animate-spin")} />
                          Re-Refine with AI
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                           <button 
                              onClick={() => rejectQuestion(item.id!)}
                              className="flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-gray-400 hover:bg-bd-red/10 hover:text-bd-red hover:border-bd-red/30 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                            <a 
                              href={item.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-gray-400 hover:border-bd-green hover:text-bd-green rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300"
                            >
                              <ExternalLink size={14} />
                              View
                            </a>
                        </div>
                      </div>

                      <button 
                        onClick={() => approveQuestion(item)}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-gray-900 text-white hover:bg-bd-green rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-xl shadow-gray-200 hover:shadow-bd-green/30 mt-auto"
                      >
                        <CheckCircle2 size={16} />
                        Publish Poll
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
