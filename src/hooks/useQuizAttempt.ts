import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Quiz, QuizQuestion } from './useQuizzes';

export interface QuizAttemptResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  passed: boolean;
}

export function useQuizAttempt(userId: string | undefined) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAttempt = async (
    quiz: Quiz,
    answers: number[],
    timeTakenSeconds: number
  ): Promise<QuizAttemptResult> => {
    if (!userId || !quiz.questions) throw new Error('Invalid quiz or user');

    setIsSubmitting(true);

    try {
      const questions = quiz.questions;
      let correctAnswers = 0;

      questions.forEach((q: QuizQuestion, index: number) => {
        if (answers[index] === q.correct_option) {
          correctAnswers++;
        }
      });

      const scorePercentage = Math.round((correctAnswers / questions.length) * 100);
      const passed = scorePercentage >= 70;
      const pointsEarned = passed ? (quiz.bonus_points || 10) : 0;

      // Record attempt
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: userId,
          score: scorePercentage,
          correct_answers: correctAnswers,
          total_questions: questions.length,
          time_taken_seconds: timeTakenSeconds,
        });

      if (attemptError) throw attemptError;

      // If passed, add points to user level
      if (passed) {
        const { data: levelData } = await supabase
          .from('user_levels')
          .select('total_points')
          .eq('user_id', userId)
          .single();

        if (levelData) {
          await supabase
            .from('user_levels')
            .update({ total_points: (levelData.total_points || 0) + pointsEarned })
            .eq('user_id', userId);
        }

        // Add to activity feed
        await supabase.from('activity_feed').insert({
          user_id: userId,
          activity_type: 'quiz_completed',
          title: `Completou quiz: ${quiz.title}`,
          description: `Acertou ${correctAnswers}/${questions.length} questões`,
          points_earned: pointsEarned,
        });
      }

      return {
        score: scorePercentage,
        correctAnswers,
        totalQuestions: questions.length,
        timeTakenSeconds,
        passed,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitAttempt,
    isSubmitting,
  };
}
