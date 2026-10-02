import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Shift } from '@/types/db';

export type ShiftKind = 'trabalho' | 'folga' | 'ferias' | 'atestado' | 'treinamento' | 'banco_horas';

export const SHIFT_KINDS: Record<ShiftKind, { label: string; short: string; className: string; needsHours: boolean }> = {
  trabalho: { label: 'Trabalho', short: '', className: 'bg-primary/10 text-foreground border-primary/30', needsHours: true },
  folga: { label: 'Folga', short: 'Folga', className: 'bg-muted text-muted-foreground border-border', needsHours: false },
  ferias: { label: 'Férias', short: 'Férias', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30', needsHours: false },
  atestado: { label: 'Atestado', short: 'Atestado', className: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30', needsHours: false },
  treinamento: { label: 'Treinamento', short: 'Trein.', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', needsHours: true },
  banco_horas: { label: 'Banco de horas', short: 'BH', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', needsHours: false },
};

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export interface ShiftDraft {
  user_id: string;
  date: string;
  kind: ShiftKind | 'remover';
  start_time?: string | null;
  end_time?: string | null;
  note?: string | null;
}

export function useShifts(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['shifts', startStr, endStr],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .limit(3000);
      if (error) throw error;
      return data as Shift[];
    },
  });
}

export function useSaveShifts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ShiftDraft[]) => {
      const { data, error } = await supabase.rpc('save_shifts', { _rows: rows as never });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      ['shifts', 'engagement', 'level'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/** Horas de descanso entre o fim de um turno e o início do próximo */
export function restHours(prev: { date: string; end: string; start: string }, next: { date: string; start: string }) {
  const prevEnd = new Date(`${prev.date}T${prev.end}`);
  if (prev.end <= prev.start) prevEnd.setDate(prevEnd.getDate() + 1);
  const nextStart = new Date(`${next.date}T${next.start}`);
  return (nextStart.getTime() - prevEnd.getTime()) / 36e5;
}
