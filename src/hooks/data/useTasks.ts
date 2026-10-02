import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types/db';

export const TASK_CATEGORIES: Record<string, { label: string; className: string }> = {
  rotina: { label: 'Rotina', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  operacional: { label: 'Operacional', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  campanha: { label: 'Campanha', className: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' },
  treinamento: { label: 'Treinamento', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  outro: { label: 'Outro', className: 'bg-muted text-muted-foreground' },
};

function useInvalidateTasks() {
  const qc = useQueryClient();
  return useCallback(() => {
    ['tasks', 'engagement', 'points-ranking', 'level', 'ledger', 'challenges'].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  }, [qc]);
}

export function useTasks(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['tasks', startStr, endStr],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('due_date')
        .order('due_time', { nullsFirst: true })
        .limit(2000);
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTasks() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      description?: string;
      category: string;
      assignees: string[];
      dates: string[];
      dueTime?: string | null;
      points: number;
    }) => {
      const { data, error } = await supabase.rpc('create_tasks', {
        _title: args.title,
        _description: args.description ?? '',
        _category: args.category,
        _assignees: args.assignees,
        _dates: args.dates,
        _due_time: args.dueTime || undefined,
        _points: args.points,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: invalidate,
  });
}

export function useTaskActions() {
  const invalidate = useInvalidateTasks();
  const complete = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc('complete_task', { _id: id, _note: note ?? undefined });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const reopen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('reopen_task', { _id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const review = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: 'recusar' | 'confirmar'; note?: string }) => {
      const { error } = await supabase.rpc('review_task', { _id: id, _decision: decision, _note: note ?? undefined });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async ({ id, group }: { id?: string; group?: string }) => {
      const { data, error } = await supabase.rpc('delete_tasks', { _id: id ?? undefined, _group: group ?? undefined });
      if (error) throw error;
      return data as number;
    },
    onSuccess: invalidate,
  });
  return { complete, reopen, review, remove };
}
