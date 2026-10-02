import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MyQuiz } from '@/types/db';

export interface PlayableQuiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  bonus_points: number | null;
  pass_pct: number;
  questions: { id: string; question: string; options: string[] }[];
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  pass_pct: number;
  points_earned: number;
  already_passed: boolean;
  review: { question: string; options: string[]; chosen: number | null; correct_option: number; is_correct: boolean }[];
}

/** Quizzes ativos com meu status (sem gabarito) */
export function useMyQuizzes() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['my-quizzes'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_quizzes');
      if (error) throw error;
      return (data ?? []) as MyQuiz[];
    },
  });
}

export function usePlayableQuiz(quizId?: string) {
  return useQuery({
    queryKey: ['quiz-play', quizId],
    enabled: !!quizId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_quiz_for_attempt', { _quiz: quizId! });
      if (error) throw error;
      return (data as unknown as PlayableQuiz) ?? null;
    },
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { quizId: string; answers: (number | null)[]; timeTaken: number }) => {
      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        _quiz: args.quizId,
        _answers: args.answers.map((a) => (a == null ? -1 : a)),
        _time_taken: args.timeTaken,
      });
      if (error) throw error;
      return data as unknown as QuizResult;
    },
    onSuccess: () => {
      ['my-quizzes', 'engagement', 'points-ranking', 'level', 'ledger', 'feed'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
  });
}
