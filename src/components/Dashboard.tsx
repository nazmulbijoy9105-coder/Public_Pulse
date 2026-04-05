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
  Info
} from 'lucide-react';
import { Poll } from '../App';
import { generateGovernanceInsights, simulatePolicyReaction, GovernanceInsight } from '../services/aiAnalyticsService';
import { cn } from '../lib/utils';

interface DashboardProps {
  polls: Poll[];
}

const COLORS = ['#006A4E', '#F42A41', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC<DashboardProps> = ({ polls }) => {
  const [insights, setInsights] = useState<GovernanceInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'governance'>('analytics');
  
  // Policy Simulator State
  const [hypotheticalPolicy, setHypotheticalPolicy] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (polls.length === 0) return;
      setLoadingInsights(true);
      try {
        const data = await generateGovernanceInsights(polls);
        setInsights(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [polls]);

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

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((acc, p) => acc + p.totalVotes, 0);
    const totalYes = polls.reduce((acc, p) => acc + p.yesVotes, 0);
    const totalNo = polls.reduce((acc, p) => acc + p.noVotes, 0);
    
    const categoryData = polls.reduce((acc: any, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.totalVotes;
      return acc;
    }, {});

    const pieData = Object.keys(categoryData).map(key => ({
      name: key,
      value: categoryData[key]
    }));

    const trendData = polls.slice(0, 7).reverse().map(p => ({
      name: p.question.substring(0, 10) + '...',
      yes: Math.round((p.yesVotes / (p.totalVotes || 1)) * 100),
      no: Math.round((p.noVotes / (p.totalVotes || 1)) * 100)
    }));

    const topConcern = polls.sort((a, b) => b.totalVotes - a.totalVotes)[0];

    return { totalVotes, totalYes, totalNo, pieData, trendData, topConcern };
  }, [polls]);

  return (
    <div className="space-y-8 pb-20">
      {/* View Switcher */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'analytics' ? "bg-gray-900 text-white shadow-xl" : "bg-white text-gray-400 hover:text-gray-900"
          )}
        >
          <TrendingUp size={18} />
          Advanced Analytics
        </button>
        <button 
          onClick={() => setActiveTab('governance')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'governance' ? "bg-bd-green text-white shadow-xl shadow-bd-green/20" : "bg-white text-gray-400 hover:text-bd-green"
          )}
        >
          <BrainCircuit size={18} />
          Predictive Governance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'analytics' ? (
          <motion.div 
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-bd-green/10 text-bd-green rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Participation</p>
                    <h3 className="text-3xl font-display font-black text-gray-900">{stats.totalVotes.toLocaleString()}</h3>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-bd-green h-full" style={{ width: '70%' }} />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-bd-red/10 text-bd-red rounded-2xl flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Referendums</p>
                    <h3 className="text-3xl font-display font-black text-gray-900">{polls.length}</h3>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Continuous Feedback Loop</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Citizen Concern</p>
                    <h3 className="text-lg font-display font-black text-gray-900 leading-tight">
                      {stats.topConcern?.category || 'National Security'}
                    </h3>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                  {stats.topConcern?.question || 'Loading...'}
                </p>
              </motion.div>
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

            {/* Region Heatmap Placeholder */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 p-10 rounded-[3.5rem] text-white relative overflow-hidden"
            >
              <div className="relative z-10">
                <h4 className="text-2xl font-display font-black mb-4 flex items-center gap-3">
                  <MapIcon size={32} className="text-bd-red" />
                  Regional Sentiment Heatmap
                </h4>
                <p className="text-gray-400 text-sm max-w-md mb-8 font-medium">
                  Real-time visualization of public opinion across all 8 divisions of Bangladesh.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'].map(region => (
                    <div key={region} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{region}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black">{Math.floor(Math.random() * 40 + 60)}%</span>
                        <div className="w-2 h-2 bg-bd-green rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-bd-green/10 rounded-full blur-[100px]" />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="governance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-bd-green to-bd-green-dark p-10 rounded-[3.5rem] text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
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
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
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

                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
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
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-bd-green transition-all shadow-xl disabled:opacity-50"
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
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-between"
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
        )}
      </AnimatePresence>
    </div>
  );
};
