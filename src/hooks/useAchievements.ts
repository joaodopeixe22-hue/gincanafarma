import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Achievement, UserAchievement } from '@/types/profile';

export function useAchievements(userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAchievements = async () => {
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true })
      .order('points', { ascending: true });

    if (data) {
      setAchievements(data as Achievement[]);
    }
  };

  const fetchUserAchievements = async (id: string) => {
    const { data } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', id);

    if (data) {
      setUserAchievements(data as unknown as UserAchievement[]);
    }
  };

  const grantAchievement = async (targetUserId: string, achievementId: string) => {
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: targetUserId,
        achievement_id: achievementId,
      });

    if (!error && userId === targetUserId) {
      await fetchUserAchievements(targetUserId);
    }

    return { error };
  };

  const revokeAchievement = async (targetUserId: string, achievementId: string) => {
    const { error } = await supabase
      .from('user_achievements')
      .delete()
      .eq('user_id', targetUserId)
      .eq('achievement_id', achievementId);

    if (!error && userId === targetUserId) {
      await fetchUserAchievements(targetUserId);
    }

    return { error };
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchAchievements();
      if (userId) {
        await fetchUserAchievements(userId);
      }
      setIsLoading(false);
    };
    load();
  }, [userId]);

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const totalPoints = userAchievements.reduce((sum, ua) => {
    const achievement = achievements.find(a => a.id === ua.achievement_id);
    return sum + (achievement?.points || 0);
  }, 0);

  return {
    achievements,
    userAchievements,
    unlockedIds,
    totalPoints,
    isLoading,
    grantAchievement,
    revokeAchievement,
    refetch: async () => {
      await fetchAchievements();
      if (userId) await fetchUserAchievements(userId);
    },
  };
}
