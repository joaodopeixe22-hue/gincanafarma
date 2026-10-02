import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Challenge, ChallengeParticipant } from '@/types/db';

export const CHALLENGE_METRICS: Record<string, string> = {
  total: 'Soma dos KPIs',
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
  tasks: 'Tarefas no prazo',
  manual: 'Validação do líder',
};

export interface ChallengeWithParticipants extends Challenge {
  participants: ChallengeParticipant[];
}

function useInvalidate() {
  const qc = useQueryClient();
  return useCallback(() => {
    ['challenges', 'engagement', 'points-ranking', 'level', 'ledger'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
}

/** Campanhas recentes (ativas e encerradas há até 30 dias) com participantes */
export function useChallenges() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['challenges'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [c, p] = await Promise.all([
        supabase.from('challenges').select('*').gte('end_time', since).order('end_time'),
        supabase.from('challenge_participants').select('*'),
      ]);
      if (c.error) throw c.error;
      if (p.error) throw p.error;
      return (c.data as Challenge[]).map<ChallengeWithParticipants>((ch) => ({
        ...ch,
        participants: (p.data as ChallengeParticipant[]).filter((x) => x.challenge_id === ch.id),
      }));
    },
  });
}

export function useChallengeActions() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  const join = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const leave = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const create = useMutation({
    mutationFn: async (c: {
      title: string;
      description?: string;
      kpi_type: string;
      target_value: number | null;
      bonus_points: number;
      start_time: string;
      end_time: string;
      team_id: string | null;
    }) => {
      const { error } = await supabase.from('challenges').insert({ ...c, challenge_type: 'individual' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Challenge> & { id: string }) => {
      const { error } = await supabase.from('challenges').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const setCompletion = useMutation({
    mutationFn: async (args: { challengeId: string; userId: string; completed: boolean }) => {
      const { error } = await supabase.rpc('set_challenge_completion', {
        _challenge: args.challengeId,
        _user: args.userId,
        _completed: args.completed,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { join, leave, create, update, remove, setCompletion };
}
