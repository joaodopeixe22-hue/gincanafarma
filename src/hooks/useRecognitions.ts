import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RecognitionType = 
  | 'congratulations' 
  | 'highlight' 
  | 'extra_effort' 
  | 'team_player' 
  | 'improvement';

export const RECOGNITION_TYPES: Record<RecognitionType, { label: string; emoji: string; color: string }> = {
  congratulations: { label: 'Parabéns!', emoji: '🎉', color: 'bg-green-500' },
  highlight: { label: 'Destaque da Semana', emoji: '⭐', color: 'bg-yellow-500' },
  extra_effort: { label: 'Esforço Extra', emoji: '💪', color: 'bg-blue-500' },
  team_player: { label: 'Jogador de Equipe', emoji: '🤝', color: 'bg-purple-500' },
  improvement: { label: 'Evolução Notável', emoji: '📈', color: 'bg-orange-500' },
};

export function useRecognitions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendRecognition = async (
    fromUserId: string,
    toUserId: string,
    recognitionType: RecognitionType,
    message: string | null,
    teamId: string | null
  ) => {
    setIsLoading(true);

    try {
      // Insert recognition
      const { error: recognitionError } = await supabase
        .from('recognitions')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          recognition_type: recognitionType,
          message,
          is_public: true,
        });

      if (recognitionError) throw recognitionError;

      // Get recipient name for activity feed
      const { data: recipientData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', toUserId)
        .single();

      // Insert into activity feed
      const { error: activityError } = await supabase
        .from('activity_feed')
        .insert({
          user_id: toUserId,
          team_id: teamId,
          activity_type: 'recognition',
          title: RECOGNITION_TYPES[recognitionType].label,
          description: message || `${recipientData?.full_name || 'Membro'} recebeu um reconhecimento!`,
          points_earned: 5,
          metadata: {
            recognition_type: recognitionType,
            from_user_id: fromUserId,
          },
        });

      if (activityError) throw activityError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendRecognition,
    isLoading,
    recognitionTypes: RECOGNITION_TYPES,
  };
}
