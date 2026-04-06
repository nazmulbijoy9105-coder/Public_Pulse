import { Poll } from './pollService';
import { Timestamp } from 'firebase/firestore';

export interface DashboardStats {
  totalPolls: number;
  totalVotes: number;
  activePolls: number;
  avgYesRate: number;
  trendData: Array<{ name: string; yes: number; no: number }>;
  categoryData: Array<{ category: string; value: number }>;
}

export function useDashboardStats(polls: Poll[]): DashboardStats {
  const stats = {
    totalPolls: polls.length,
    totalVotes: polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0),
    activePolls: polls.filter(p => p.status === 'active').length,
    avgYesRate: 0,
    trendData: [] as Array<{ name: string; yes: number; no: number }>,
    categoryData: [] as Array<{ category: string; value: number }>,
  };

  if (stats.totalVotes > 0) {
    const totalYes = polls.reduce((sum, p) => sum + (p.yesVotes || 0), 0);
    stats.avgYesRate = (totalYes / stats.totalVotes) * 100;
  }

  const trendMap = new Map<string, { yes: number; no: number }>();
  polls.forEach(poll => {
    if (poll.createdAt instanceof Timestamp) {
      const date = poll.createdAt.toDate();
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, { yes: 0, no: 0 });
      }
      
      const trend = trendMap.get(dateStr)!;
      trend.yes += poll.yesVotes || 0;
      trend.no += poll.noVotes || 0;
    }
  });

  stats.trendData = Array.from(trendMap.entries()).map(([name, values]) => ({
    name,
    ...values,
  }));

  const categoryMap = new Map<string, number>();
  polls.forEach(poll => {
    const category = poll.category || 'Other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  stats.categoryData = Array.from(categoryMap.entries()).map(([category, value]) => ({
    category,
    value,
  }));

  return stats;
}
