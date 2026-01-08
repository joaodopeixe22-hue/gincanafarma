import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 'announcement' | 'goal_reminder' | 'celebration' | 'urgent';

export const NOTIFICATION_TYPES: Record<NotificationType, { label: string; icon: string; color: string }> = {
  announcement: { label: 'Comunicado', icon: '📢', color: 'bg-blue-500' },
  goal_reminder: { label: 'Lembrete de Meta', icon: '🎯', color: 'bg-yellow-500' },
  celebration: { label: 'Celebração', icon: '🎉', color: 'bg-green-500' },
  urgent: { label: 'Urgente', icon: '⚠️', color: 'bg-red-500' },
};

export function useTeamNotifications(teamId: string | null) {
  const [isLoading, setIsLoading] = useState(false);

  const sendNotification = async (
    type: NotificationType,
    title: string,
    message: string,
    targetUserId?: string // If undefined, send to all team members
  ) => {
    if (!teamId) return;
    
    setIsLoading(true);

    try {
      let userIds: string[] = [];

      if (targetUserId) {
        userIds = [targetUserId];
      } else {
        // Get all team members
        const { data: members } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId);

        userIds = members?.map(m => m.id) || [];
      }

      // Insert notifications for each user
      const notifications = userIds.map(userId => ({
        user_id: userId,
        notification_type: type,
        title,
        message,
        is_read: false,
        metadata: { team_id: teamId },
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendNotification,
    isLoading,
    notificationTypes: NOTIFICATION_TYPES,
  };
}
