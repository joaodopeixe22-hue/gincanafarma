import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AchievementRankingUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  team_id: 'dna' | 'elite' | 'alcateia' | null;
  total_achievements: number;
  total_trophies: number;
  total_points: number;
}

export function useAchievementRanking(limit: number = 10) {
  const [ranking, setRanking] = useState<AchievementRankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRanking = async () => {
    setIsLoading(true);
    
    // Fetch all user achievements with profile and achievement info
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        user_id,
        achieved_at,
        achievements!inner (
          id,
          points,
          is_trophy
        )
      `);

    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, team_id');

    if (!userAchievements || !profiles) {
      setRanking([]);
      setIsLoading(false);
      return;
    }

    // Create profile map
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Aggregate by user
    const userStats = new Map<string, {
      total_achievements: number;
      total_trophies: number;
      total_points: number;
      latest_achievement: string | null;
    }>();

    userAchievements.forEach((ua: any) => {
      const userId = ua.user_id;
      const achievement = ua.achievements;
      
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          total_achievements: 0,
          total_trophies: 0,
          total_points: 0,
          latest_achievement: null,
        });
      }

      const stats = userStats.get(userId)!;
      stats.total_achievements += 1;
      stats.total_points += achievement.points || 0;
      if (achievement.is_trophy) {
        stats.total_trophies += 1;
      }
      // Track latest achievement for tie-breaking
      if (!stats.latest_achievement || ua.achieved_at > stats.latest_achievement) {
        stats.latest_achievement = ua.achieved_at;
      }
    });

    // Build ranking array
    const rankingArray: AchievementRankingUser[] = [];
    
    userStats.forEach((stats, userId) => {
      const profile = profileMap.get(userId);
      if (profile) {
        rankingArray.push({
          user_id: userId,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          team_id: profile.team_id as 'dna' | 'elite' | 'alcateia' | null,
          total_achievements: stats.total_achievements,
          total_trophies: stats.total_trophies,
          total_points: stats.total_points,
        });
      }
    });

    // Sort by points (descending), then by trophies, then by achievements
    rankingArray.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.total_trophies !== a.total_trophies) return b.total_trophies - a.total_trophies;
      return b.total_achievements - a.total_achievements;
    });

    setRanking(rankingArray.slice(0, limit));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRanking();
  }, [limit]);

  return {
    ranking,
    isLoading,
    refetch: fetchRanking,
  };
}
