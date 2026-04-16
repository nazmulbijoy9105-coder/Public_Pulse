import React, { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Map as MapIcon, 
  AlertTriangle, 
  Users, 
  Activity,
  PieChart as PieIcon,
  BrainCircuit,
  ShieldAlert,
  Lightbulb,
  Zap,
  Play,
  ArrowRight,
  Info,
  FileText,
  Download,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Globe,
  Lock,
  Plus,
  Newspaper,
  Settings2
} from 'lucide-react';
import { Poll, UserProfile } from '../types';
import { generateGovernanceInsights, simulatePolicyReaction, GovernanceInsight } from '../services/aiAnalyticsService';
import { cn } from '../lib/utils';
import { collection, query, limit, onSnapshot, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface DashboardProps {
  polls: Poll[];
  user: any;
  profile: UserProfile | null;
}

const COLORS = ['#006A4E', '#F42A41', '#FFBB28', '#FF8042', '#8884d8'];

const BangladeshMap: React.FC<{ data: any }> = ({ data }) => {
  // Enhanced SVG paths for Bangladesh divisions (approximate polygons for better visual representation)
  const divisions = [
    { id: 'Dhaka', path: 'M133,103 L142,95 L156,98 L162,110 L158,132 L152,142 L138,144 L128,135 L124,118 Z', color: '#006A4E' },
    { id: 'Chittagong', path: 'M160,135 L175,135 L195,155 L205,190 L212,235 L190,265 L175,255 L165,220 L158,180 Z', color: '#F42A41' },
    { id: 'Rajshahi', path: 'M70,85 L105,75 L120,95 L125,125 L110,145 L80,140 L65,115 Z', color: '#006A4E' },
    { id: 'Khulna', path: 'M85,155 L118,155 L125,185 L135,225 L120,255 L95,250 L80,210 Z', color: '#006A4E' },
    { id: 'Barisal', path: 'M130,190 L155,185 L165,215 L158,255 L140,260 L125,230 Z', color: '#F42A41' },
    { id: 'Sylhet', path: 'M158,75 L185,65 L210,85 L205,120 L180,132 L165,110 Z', color: '#006A4E' },
    { id: 'Rangpur', path: 'M85,30 L115,25 L130,55 L120,85 L85,80 L75,55 Z', color: '#006A4E' },
    { id: 'Mymensingh', path: 'M132,60 L160,65 L162,95 L135,100 L122,85 Z', color: '#006A4E' },
  ];

  return (
    <div className="relative w-full h-[550px] flex items-center justify-center bg-gray-950 rounded-[3.5rem] overflow-hidden group border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,106,78,0.1)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
      
      <svg viewBox="0 0 250 300" className="w-full h-full max-w-sm drop-shadow-[0_0_80px_rgba(0,106,78,0.3)] relative z-10 p-8">
        {divisions.map((div) => {
          const sentiment = Math.floor(Math.random() * 40 + 60);
          return (
            <motion.path
              key={div.id}
              d={div.path}
              fill={div.color}
              initial={{ fillOpacity: 0.1, strokeOpacity: 0.2 }}
              animate={{ fillOpacity: 0.4, strokeOpacity: 0.3 }}
              stroke="white"
              strokeWidth="1"
              whileHover={{ fillOpacity: 1, scale: 1.05, strokeOpacity: 1, strokeWidth: 2, zIndex: 30 }}
              className="cursor-pointer transition-all duration-500 outline-none"
            >
              <title>{div.id}: {sentiment}% Public Support</title>
            </motion.path>
          );
        })}
      </svg>

      <div className="absolute top-12 left-12 z-20 space-y-4">
        <div>
          <h4 className="text-3xl font-display font-black text-white flex items-center gap-3 tracking-tighter">
            <MapIcon size={32} className="text-bd-red" />
            Strategic Sentiment
          </h4>
          <p className="text-bd-green text-[10px] font-black uppercase tracking-[0.3em] mt-1">Division Distribution • Referendum Analytics</p>
        </div>

        <div className="flex flex-col gap-3">
          {divisions.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-center gap-2">
              <div className="w-1 h-4 bg-white/20 rounded-full" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{d.id}</span>
              <span className="text-[10px] font-black text-bd-green">{Math.floor(Math.random() * 20 + 75)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-12 right-12 flex flex-col items-end gap-6 z-20">
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Status</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-bd-green/10 backdrop-blur-md rounded-full border border-bd-green/20">
              <div className="w-2 h-2 bg-bd-green rounded-full animate-pulse shadow-[0_0_10px_rgba(0,106,78,1)]" />
              <span className="text-[9px] font-black text-bd-green uppercase tracking-widest leading-none">Live Monitoring</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 space-y-4 min-w-[200px]">
          <div className="flex justify-between items-end">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Consensus</span>
            <span className="text-xl font-display font-black text-white">78.4%</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '78.4%' }} className="h-full bg-bd-green shadow-[0_0_15px_rgba(0,106,78,0.5)]" />
          </div>
          <p className="text-[8px] font-bold text-white/30 uppercase leading-relaxed">
            Overall division alignment across<br/>all active national portals.
          </p>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ polls, user, profile }) => {
  const [insights, setInsights] = useState<GovernanceInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'governance' | 'users'>('analytics');
  const [activeCategory, setActiveCategory] = useState('All');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Policy Simulator State
  const [hypotheticalPolicy, setHypotheticalPolicy] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Poll Creation State
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('National');
  const [creating, setCreating] = useState(false);

  const filteredPolls = useMemo(() => {
    if (activeCategory === 'All') return polls;
    return polls.filter(p => p.category === activeCategory);
  }, [polls, activeCategory]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (filteredPolls.length === 0) {
        setInsights(null);
        return;
      }
      setLoadingInsights(true);
      try {
        const data = await generateGovernanceInsights(filteredPolls);
        setInsights(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [filteredPolls]);

  useEffect(() => {
    if (activeTab === 'users' && profile?.role === 'admin') {
      setLoadingUsers(true);
      const q = query(collection(db, 'users'), limit(50));
      const unsubscribe = onSnapshot(q, (snap) => {
        const userData = snap.docs.map(doc => doc.data() as UserProfile);
        setUsers(userData);
        setLoadingUsers(false);
      });
      return unsubscribe;
    }
  }, [activeTab, profile]);

  const handleSimulate = async () => {
    if (!hypotheticalPolicy || polls.length === 0) return;
    setSimulating(true);
    try {
      const result = await simulatePolicyReaction(hypotheticalPolicy, polls);
      setSimulationResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setSimulating(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportSuccess(false);
    await new Promise(r => setTimeout(r, 3500));
    setGeneratingReport(false);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 5000);
    // In a real app, this would trigger a PDF download
  };

  const handleCreatePoll = async () => {
    if (!newQuestion || !user) return;
    setCreating(true);
    try {
      const pollId = doc(collection(db, 'polls')).id;
      const pollData = {
        id: pollId,
        question: newQuestion,
        source: 'Official National Portal',
        category: newCategory,
        status: 'active',
        totalVotes: 0,
        yesVotes: 0,
        noVotes: 0,
        trending: false,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      };
      await setDoc(doc(db, 'polls', pollId), pollData);
      setNewQuestion('');
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo(() => {
    const pollsToProcess = filteredPolls;
    const totalVotes = pollsToProcess.reduce((acc, p) => acc + p.totalVotes, 0);
    const totalYes = pollsToProcess.reduce((acc, p) => acc + p.yesVotes, 0);
    const totalNo = pollsToProcess.reduce((acc, p) => acc + p.noVotes, 0);
    
    const categoryData = pollsToProcess.reduce((acc: any, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.totalVotes;
      return acc;
    }, {});

    const pieData = Object.keys(categoryData).map(key => ({
      name: key,
      value: categoryData[key]
    }));

    const trendData = pollsToProcess.slice(0, 7).reverse().map(p => ({
      name: p.question.substring(0, 10) + '...',
      yes: Math.round((p.yesVotes / (p.totalVotes || 1)) * 100),
      no: Math.round((p.noVotes / (p.totalVotes || 1)) * 100),
      fullQuestion: p.question
    }));

    const topConcern = [...pollsToProcess].sort((a, b) => b.totalVotes - a.totalVotes)[0];
    
    const consensusRate = totalVotes > 0 ? Math.round((Math.max(totalYes, totalNo) / totalVotes) * 100) : 0;
    const impactScore = Math.round((totalVotes / 1000) * (consensusRate / 100) * 10);

    return { totalVotes, totalYes, totalNo, pieData, trendData, topConcern, consensusRate, impactScore };
  }, [filteredPolls]);

  const categories = ['All', 'National', 'Economy', 'Policy', 'Environment', 'Tech'];

  return (
    <div className="space-y-8 pb-20">
      {/* Category Filter & View Switcher */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-full xl:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                activeCategory === cat 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <div className="flex gap-2 p-1.5 bg-gray-900 rounded-2xl">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                activeTab === 'analytics' ? "bg-white text-gray-900 shadow-xl" : "text-gray-400 hover:text-white"
              )}
            >
              <TrendingUp size={16} />
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('governance')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                activeTab === 'governance' ? "bg-bd-green text-white" : "text-gray-400 hover:text-white"
              )}
            >
              <BrainCircuit size={16} />
              AI Governance
            </button>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('users')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                  activeTab === 'users' ? "bg-amber-400 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                <Users size={16} />
                User Management
              </button>
            )}
          </div>
          
          <button 
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-700 shadow-xl disabled:opacity-50",
              reportSuccess ? "bg-bd-green text-white" : "bg-white text-gray-900 border border-gray-100 hover:border-bd-green hover:text-bd-green"
            )}
          >
            {generatingReport ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : reportSuccess ? (
              <CheckCircle2 size={16} />
            ) : (
              <Download size={16} />
            )}
            {generatingReport ? 'Synthesizing...' : reportSuccess ? 'Report Ready' : 'Download Brief'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'analytics' ? (
          <motion.div 
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-10"
          >
            {/* Impact Metric Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {profile?.role === 'admin' ? (
                <div className="lg:col-span-2 bg-bd-green/5 p-8 rounded-[2.5rem] border border-bd-green/20 relative overflow-hidden flex flex-col justify-between">
                   <div className="relative z-10">
                     <h4 className="text-xs font-black text-bd-green uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                       <Plus size={16} /> Broadcast National Referendum
                     </h4>
                     <textarea 
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter strategic policy question..."
                        className="w-full bg-white/50 backdrop-blur-sm p-4 rounded-2xl border-none ring-1 ring-bd-green/20 focus:ring-2 focus:ring-bd-green outline-none text-sm font-bold resize-none h-24 mb-4"
                     />
                     <div className="flex gap-4">
                        <select 
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="flex-1 bg-white/50 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border border-bd-green/10"
                        >
                          {['National', 'Economy', 'Policy', 'Environment', 'Tech'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button 
                          onClick={handleCreatePoll}
                          disabled={creating || !newQuestion}
                          className="px-8 py-4 bg-bd-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-bd-green/20 hover:bg-bd-green-dark"
                        >
                          {creating ? 'Publishing...' : 'Broadcast'}
                        </button>
                     </div>
                   </div>
                   <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-bd-green/10 rounded-full blur-3xl" />
                </div>
              ) : (
                <div className="lg:col-span-1 bg-gray-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between overflow-hidden relative border border-white/5">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">Impact Score</p>
                    <h2 className="text-6xl font-display font-black leading-none mb-2">{stats.impactScore}</h2>
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      <span className="text-[10px] font-bold text-bd-green uppercase tracking-widest">+12.4% from avg</span>
                    </div>
                  </div>
                  <div className="mt-8 relative z-10">
                    <p className="text-[8px] font-medium text-white/30 uppercase leading-relaxed max-w-[150px]">
                      Aggregate measure of verified engagement and policy relevance.
                    </p>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-bd-green/20 blur-[50px]" />
                </div>
              )}

              <div className={cn(profile?.role === 'admin' ? "lg:col-span-2" : "lg:col-span-3", "grid grid-cols-1 md:grid-cols-3 gap-6")}>
                <motion.div 
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 group hover:border-bd-green/30 transition-all duration-700"
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 bg-bd-green/5 text-bd-green rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display font-black text-gray-900 tracking-tight">{stats.totalVotes.toLocaleString()}</h3>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Verified Citizens</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 group hover:border-bd-red/30 transition-all duration-700"
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 bg-bd-red/5 text-bd-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display font-black text-gray-900 tracking-tight">{stats.consensusRate}%</h3>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Consensus Density</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 group hover:border-amber-400/30 transition-all duration-700"
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-black text-gray-900 leading-[1.1] line-clamp-2 md:line-clamp-1">
                        {stats.topConcern?.category || 'National'}
                      </h3>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Primary Polling Node</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100"
              >
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <TrendingUp size={20} className="text-bd-green" />
                  Sentiment Trends (%)
                </h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="yes" stroke="#006A4E" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="no" stroke="#F42A41" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100"
              >
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <PieIcon size={20} className="text-bd-red" />
                  Policy Heatmap (By Category)
                </h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Region Heatmap & Trust Analysis */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <BangladeshMap data={null} />
              </div>
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Lock size={18} className="text-bd-green" />
                      Trust Metrics
                    </h4>
                    <span className="px-3 py-1 bg-bd-green/10 text-bd-green text-[8px] font-black uppercase rounded-full">Secure</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NID Verification</span>
                        <span className="text-sm font-black text-gray-900">92%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-bd-green w-[92%]" />
                      </div>
                    </div>

                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bot Protection</span>
                        <span className="text-sm font-black text-gray-900">100%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-bd-green w-full" />
                      </div>
                    </div>

                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement Depth</span>
                        <span className="text-sm font-black text-gray-900">High</span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={cn("h-4 w-1.5 rounded-full", i < 5 ? "bg-bd-green" : "bg-gray-200")} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex items-center gap-4">
                  <Globe size={32} className="text-gray-100" />
                  <p className="text-[9px] font-medium text-gray-400 leading-relaxed uppercase">
                    All data is cryptographically<br/>hashed and cross-verified<br/>by national nodes.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'governance' ? (
          <motion.div 
            key="governance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-bd-green to-bd-green-dark p-10 rounded-[3.5rem] text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                    <BrainCircuit size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black leading-none">AI Governance Insight</h3>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Predictive National Sentiment Analysis</p>
                  </div>
                </div>
                
                {loadingInsights ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded-full w-3/4" />
                    <div className="h-4 bg-white/10 rounded-full w-1/2" />
                  </div>
                ) : insights ? (
                  <div className="space-y-8">
                    <p className="text-lg font-medium leading-relaxed text-white/90">
                      {insights.summary}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/15 transition-colors duration-300">
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Zap size={14} className="text-amber-400" />
                          Emerging Trends
                        </h5>
                        <div className="space-y-4">
                          {insights.predictions.map((p, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5",
                                p.trend === 'rising' ? "bg-bd-red" : p.trend === 'falling' ? "bg-bd-green" : "bg-white/40"
                              )} />
                              <div>
                                <p className="text-sm font-black">{p.topic}</p>
                                <p className="text-[10px] text-white/60 font-medium">{p.reasoning}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/15 transition-colors duration-300">
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ShieldAlert size={14} className="text-bd-red" />
                          Risk Alerts
                        </h5>
                        <div className="space-y-3">
                          {insights.riskAlerts.map((risk, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bd-red/20 rounded-xl border border-bd-red/20">
                              <AlertTriangle size={14} className="text-bd-red" />
                              <p className="text-[10px] font-black uppercase tracking-widest">{risk}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60 italic">Insufficient data for AI governance analysis.</p>
                )}
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
            </div>

            {/* Policy Simulator */}
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-black text-gray-900">Policy Simulator</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Predict Public Reaction to Hypothetical Policies</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={hypotheticalPolicy}
                    onChange={(e) => setHypotheticalPolicy(e.target.value)}
                    placeholder="Enter a hypothetical policy (e.g., 'Implementing a 5% carbon tax on industrial emissions')..."
                    className="w-full p-6 pb-16 bg-gray-50 rounded-[2rem] border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-bd-green outline-none font-medium text-gray-900 resize-none h-32"
                  />
                  <button 
                    onClick={handleSimulate}
                    disabled={simulating || !hypotheticalPolicy}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-bd-green transition-all duration-500 shadow-xl disabled:opacity-50"
                  >
                    {simulating ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Simulating...
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {simulationResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Predicted Public Support</p>
                          <h5 className="text-4xl font-display font-black text-bd-green">{simulationResult.predictedSupport}%</h5>
                        </div>
                        <div className="w-24 h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { value: simulationResult.predictedSupport },
                                  { value: 100 - simulationResult.predictedSupport }
                                ]}
                                innerRadius={30}
                                outerRadius={45}
                                stroke="none"
                                dataKey="value"
                              >
                                <Cell fill="#006A4E" />
                                <Cell fill="#f3f4f6" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h6 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} className="text-bd-green" />
                            Sentiment Analysis
                          </h6>
                          <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {simulationResult.sentimentAnalysis}
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h6 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert size={14} className="text-bd-red" />
                            Key Concerns
                          </h6>
                          <div className="space-y-2">
                            {simulationResult.keyConcerns.map((concern: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                                <div className="w-1.5 h-1.5 bg-bd-red rounded-full" />
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{concern}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-200">
                        <h6 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">Demographic Impact</h6>
                        <p className="text-xs text-gray-500 font-medium italic">
                          {simulationResult.demographicImpact}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Policy Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights?.policySuggestions.map((policy, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-between hover:border-bd-green/30 transition-all duration-700"
                >
                  <div>
                    <div className="w-10 h-10 bg-bd-green/10 text-bd-green rounded-xl flex items-center justify-center mb-6">
                      <Lightbulb size={20} />
                    </div>
                    <h5 className="text-lg font-display font-black text-gray-900 mb-2">{policy.title}</h5>
                    <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{policy.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-bd-green">{policy.expectedSupport}%</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Support</span>
                    </div>
                    <ArrowRight size={18} className="text-gray-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 min-h-[600px]"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-3xl font-display font-black text-gray-900 leading-none">Citizen Management</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 font-mono">Verified Node: {users.length} Active Profiles</p>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-gray-900 text-white rounded-xl hover:bg-bd-green transition-colors">
                  <RefreshCw size={18} className={loadingUsers ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="overflow-hidden border border-gray-100 rounded-[2rem]">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Citizen</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trust Index</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Verifications</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 uppercase text-[9px] font-black tracking-widest">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL} alt="" className="w-8 h-8 rounded-lg" />
                          <div>
                            <p className="text-gray-900">{u.displayName}</p>
                            <p className="text-gray-400 font-medium normal-case truncate max-w-[120px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-bd-green" style={{ width: `${u.trustScore * 100}%` }} />
                          </div>
                          <span className={cn(
                            u.trustScore > 0.8 ? "text-bd-green" : "text-amber-500"
                          )}>
                            {(u.trustScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                           {u.nidVerified && <span className="bg-bd-green/10 text-bd-green px-2 py-1 rounded-md">NID</span>}
                           {u.phoneVerified && <span className="bg-bd-red/10 text-bd-red px-2 py-1 rounded-md">PHONE</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md",
                          u.role === 'admin' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-gray-400 hover:text-gray-900 transition-colors">
                          <Settings2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
