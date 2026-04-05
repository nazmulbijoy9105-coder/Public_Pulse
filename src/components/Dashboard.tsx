import React, { useMemo } from 'react';
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
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Map as MapIcon, 
  AlertTriangle, 
  Users, 
  Activity,
  PieChart as PieIcon
} from 'lucide-react';
import { Poll } from '../App';

interface DashboardProps {
  polls: Poll[];
}

const COLORS = ['#006A4E', '#F42A41', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC<DashboardProps> = ({ polls }) => {
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
    </div>
  );
};
