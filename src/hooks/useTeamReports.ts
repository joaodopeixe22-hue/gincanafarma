import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, format, subDays } from 'date-fns';

export interface DailyData {
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

export interface WeeklyComparison {
  currentWeek: { ofex: number; apoio: number; soria: number; cadastro: number; total: number };
  lastWeek: { ofex: number; apoio: number; soria: number; cadastro: number; total: number };
  percentChange: number;
}

export interface MemberPerformance {
  id: string;
  name: string;
  avatar_url: string | null;
  thisWeek: number;
  lastWeek: number;
  total: number;
  trend: 'up' | 'down' | 'same';
}

export function useTeamReports(teamId: string | null) {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison | null>(null);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    const fetchReports = async () => {
      setIsLoading(true);

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

      // Get team members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('team_id', teamId);

      if (!members?.length) {
        setIsLoading(false);
        return;
      }

      const memberIds = members.map(m => m.id);

      // Fetch daily data for last 30 days
      const { data: rawDailyData } = await supabase
        .from('user_daily_data')
        .select('date, ofex, apoio, soria, cadastro, user_id')
        .in('user_id', memberIds)
        .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('date');

      // Aggregate daily data by date
      const dailyMap = new Map<string, DailyData>();
      rawDailyData?.forEach(row => {
        const existing = dailyMap.get(row.date) || { date: row.date, ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 };
        existing.ofex += row.ofex;
        existing.apoio += row.apoio;
        existing.soria += row.soria;
        existing.cadastro += row.cadastro;
        existing.total += row.ofex + row.apoio + row.soria + row.cadastro;
        dailyMap.set(row.date, existing);
      });
      setDailyData(Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

      // Calculate weekly comparison
      const currentWeekData = rawDailyData?.filter(
        row => row.date >= format(currentWeekStart, 'yyyy-MM-dd') && row.date <= format(currentWeekEnd, 'yyyy-MM-dd')
      ) || [];
      const lastWeekData = rawDailyData?.filter(
        row => row.date >= format(lastWeekStart, 'yyyy-MM-dd') && row.date <= format(lastWeekEnd, 'yyyy-MM-dd')
      ) || [];

      const sumData = (data: typeof rawDailyData) => {
        const result = { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 };
        data?.forEach(row => {
          result.ofex += row.ofex;
          result.apoio += row.apoio;
          result.soria += row.soria;
          result.cadastro += row.cadastro;
          result.total += row.ofex + row.apoio + row.soria + row.cadastro;
        });
        return result;
      };

      const currentSum = sumData(currentWeekData);
      const lastSum = sumData(lastWeekData);
      const percentChange = lastSum.total > 0 
        ? ((currentSum.total - lastSum.total) / lastSum.total) * 100 
        : currentSum.total > 0 ? 100 : 0;

      setWeeklyComparison({
        currentWeek: currentSum,
        lastWeek: lastSum,
        percentChange,
      });

      // Calculate member performance
      const memberPerfMap = new Map<string, { thisWeek: number; lastWeek: number; total: number }>();
      members.forEach(m => memberPerfMap.set(m.id, { thisWeek: 0, lastWeek: 0, total: 0 }));

      rawDailyData?.forEach(row => {
        const perf = memberPerfMap.get(row.user_id);
        if (!perf) return;
        const rowTotal = row.ofex + row.apoio + row.soria + row.cadastro;
        perf.total += rowTotal;
        if (row.date >= format(currentWeekStart, 'yyyy-MM-dd') && row.date <= format(currentWeekEnd, 'yyyy-MM-dd')) {
          perf.thisWeek += rowTotal;
        }
        if (row.date >= format(lastWeekStart, 'yyyy-MM-dd') && row.date <= format(lastWeekEnd, 'yyyy-MM-dd')) {
          perf.lastWeek += rowTotal;
        }
      });

      const memberPerfs: MemberPerformance[] = members.map(m => {
        const perf = memberPerfMap.get(m.id)!;
        const trend: 'up' | 'down' | 'same' = perf.thisWeek > perf.lastWeek ? 'up' : perf.thisWeek < perf.lastWeek ? 'down' : 'same';
        return {
          id: m.id,
          name: m.full_name || 'Sem nome',
          avatar_url: m.avatar_url,
          thisWeek: perf.thisWeek,
          lastWeek: perf.lastWeek,
          total: perf.total,
          trend,
        };
      }).sort((a, b) => b.total - a.total);

      setMemberPerformance(memberPerfs);
      setIsLoading(false);
    };

    fetchReports();
  }, [teamId]);

  return {
    dailyData,
    weeklyComparison,
    memberPerformance,
    isLoading,
  };
}
