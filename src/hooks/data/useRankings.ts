import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { EngagementRow, KpiRankingRow, PointsRankingRow, TeamDailyKpis, LedgerRow } from '@/types/db';

/** Índice de Engajamento (0–100) de todos no período */
export function useEngagement(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['engagement', startStr, endStr],
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('engagement_index', { _start: startStr, _end: endStr });
      if (error) throw error;
      return (data ?? []) as EngagementRow[];
    },
  });
}

/** Soma de KPIs aprovados por pessoa */
export function useKpiRanking(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['kpi-ranking', startStr, endStr],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('kpi_ranking', { _start: startStr, _end: endStr });
      if (error) throw error;
      return (data ?? []) as KpiRankingRow[];
    },
  });
}

/** Pontos do livro (todas as origens) por pessoa; sem datas = acumulado */
export function usePointsRanking(startStr?: string, endStr?: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['points-ranking', startStr ?? 'all', endStr ?? 'all'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('points_ranking', { _start: startStr, _end: endStr });
      if (error) throw error;
      return (data ?? []) as PointsRankingRow[];
    },
  });
}

/** Placar das equipes por dia (somente lançamentos aprovados + histórico legado) */
export function useTeamKpis(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['team-kpis', startStr, endStr],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_daily_kpis')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);
      if (error) throw error;
      return (data ?? []) as TeamDailyKpis[];
    },
  });
}

/** Extrato de pontos de uma pessoa */
export function useLedger(userId?: string, limit = 100) {
  return useQuery({
    queryKey: ['ledger', userId, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as LedgerRow[];
    },
  });
}

/** Nível e sequência (calculados no servidor) */
export function useLevelAndStreak(userId?: string) {
  return useQuery({
    queryKey: ['level', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [lvl, streak] = await Promise.all([
        supabase.from('user_levels').select('*').eq('user_id', userId!).maybeSingle(),
        supabase.from('user_streaks').select('*').eq('user_id', userId!).maybeSingle(),
      ]);
      if (lvl.error) throw lvl.error;
      if (streak.error) throw streak.error;
      return {
        totalPoints: lvl.data?.total_points ?? 0,
        levelNumber: lvl.data?.level_number ?? 1,
        currentStreak: streak.data?.current_streak ?? 0,
        longestStreak: streak.data?.longest_streak ?? 0,
      };
    },
  });
}
