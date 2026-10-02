import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { KPI_KEYS, type DailyEntry, type KpiKey, type KpiValues } from '@/types/db';

const ENTRY_KEYS = ['my-entries', 'entries', 'engagement', 'kpi-ranking', 'team-kpis', 'points-ranking', 'level', 'ledger'];

export function useInvalidateEntries() {
  const qc = useQueryClient();
  return useCallback(() => {
    ENTRY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
}

/** Meus lançamentos (todos os status) */
export function useMyEntries() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['my-entries', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_daily_data')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(400);
      if (error) throw error;
      return data as DailyEntry[];
    },
  });
  const entries = useMemo(() => q.data ?? [], [q.data]);
  const byDate = useCallback((date: string) => entries.find((e) => e.date === date) ?? null, [entries]);
  return { entries, byDate, isLoading: q.isLoading };
}

/** Lançamentos de todos num intervalo (aprovações, relatórios) */
export function useEntriesInRange(startStr: string, endStr: string, enabled = true) {
  return useQuery({
    queryKey: ['entries', startStr, endStr],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_daily_data')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as DailyEntry[];
    },
  });
}

/** Pendências que eu posso aprovar (contagem para o selo da Liderança) */
export function usePendingCount(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['entries', 'pending-count', user?.id],
    enabled: enabled && !!user,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_daily_data')
        .select('id, user_id')
        .eq('status', 'pending')
        .neq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
  });
}

/** Colaborador envia/corrige o próprio dia (vira solicitação pendente) */
export function useSaveMyEntry() {
  const { user } = useAuth();
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: async ({ date, values, existing }: { date: string; values: KpiValues; existing: DailyEntry | null }) => {
      if (!user) throw new Error('Faça login novamente');
      if (existing) {
        const { error } = await supabase.from('user_daily_data').update({ ...values }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_daily_data').insert({ user_id: user.id, date, ...values });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useCancelMyEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_daily_data').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Líder: aprovar (opcionalmente ajustando), recusar ou reabrir */
export function useReviewEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: async (args: { id: string; decision: 'approve' | 'reject' | 'reopen'; note?: string; values?: Partial<KpiValues> }) => {
      const { error } = await supabase.rpc('review_daily_entry', {
        _id: args.id,
        _decision: args.decision,
        _note: args.note ?? undefined,
        _values: args.values ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCloseDay() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: async ({ date, team }: { date: string; team?: string | null }) => {
      const { data, error } = await supabase.rpc('close_day', { _date: date, _team: team ?? undefined });
      if (error) throw error;
      return data as number;
    },
    onSuccess: invalidate,
  });
}

export function useLeaderSaveEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: async (args: { userId: string; date: string; values: KpiValues; note?: string }) => {
      const { error } = await supabase.rpc('leader_save_entry', {
        _user: args.userId,
        _date: args.date,
        _ofex: args.values.ofex,
        _apoio: args.values.apoio,
        _soria: args.values.soria,
        _cadastro: args.values.cadastro,
        _note: args.note ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Meta diária efetiva por KPI (meta do líder ou padrão do KPI) */
export function useMyDailyGoals(userId?: string) {
  return useQuery({
    queryKey: ['member-goals', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('member_goals').select('*').eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
  });
}

/** Meta diária efetiva de cada KPI para uma pessoa */
export function useEffectiveGoals(userId?: string) {
  const { kpis } = useAppConfig();
  const q = useMyDailyGoals(userId);
  return useMemo(() => {
    const out = {} as Record<KpiKey, number>;
    KPI_KEYS.forEach((k) => {
      const custom = q.data?.find((g) => g.period_type === 'daily' && g.kpi_type === k && g.target_value > 0);
      out[k] = custom?.target_value ?? kpis.find((x) => x.key === k)?.default_daily_goal ?? 0;
    });
    return out;
  }, [q.data, kpis]);
}
