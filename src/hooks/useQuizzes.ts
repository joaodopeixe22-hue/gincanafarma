import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_option: number;
  order_index: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  bonus_points: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  questions?: QuizQuestion[];
}

export function useQuizzes(userId: string | undefined) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuizzes = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          question,
          options,
          correct_option,
          order_index
        )
      `)
      .order('created_at', { ascending: false });

    const quizzesWithQuestions = (data || []).map(quiz => ({
      ...quiz,
      questions: (quiz.quiz_questions || []).map((q: { id: string; question: string; options: Json; correct_option: number; order_index: number }) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : [],
      })).sort((a: QuizQuestion, b: QuizQuestion) => a.order_index - b.order_index),
    }));

    setQuizzes(quizzesWithQuestions);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [userId]);

  const createQuiz = async (
    title: string,
    description: string | null,
    timeLimitSeconds: number,
    bonusPoints: number,
    questions: Omit<QuizQuestion, 'id'>[]
  ) => {
    // Create quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title,
        description,
        time_limit_seconds: timeLimitSeconds,
        bonus_points: bonusPoints,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (quizError) throw quizError;

    // Create questions
    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quizData.id,
      question: q.question,
      options: q.options as unknown as Json,
      correct_option: q.correct_option,
      order_index: index,
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) throw questionsError;

    await fetchQuizzes();
    return quizData;
  };

  const toggleQuizActive = async (quizId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('quizzes')
      .update({ is_active: isActive })
      .eq('id', quizId);

    if (error) throw error;
    await fetchQuizzes();
  };

  const deleteQuiz = async (quizId: string) => {
    // Delete questions first
    await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
    
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
    await fetchQuizzes();
  };

  return {
    quizzes,
    isLoading,
    createQuiz,
    toggleQuizActive,
    deleteQuiz,
    refetch: fetchQuizzes,
  };
}
