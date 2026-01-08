import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  points: number | null;
}

export interface TeamMember {
  id: string;
  full_name: string | null;
  matricula: string | null;
  avatar_url: string | null;
}

export function useLeaderAchievements(teamId: string | null) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch challenge achievements only
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('id, name, description, icon, category, points')
        .eq('category', 'challenge')
        .order('name');

      // Fetch team members
      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, full_name, matricula, avatar_url')
        .eq('team_id', teamId)
        .order('full_name');

      setAchievements(achievementsData || []);
      setTeamMembers(membersData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [teamId]);

  const grantAchievement = async (userId: string, achievementId: string) => {
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
      });

    if (error) throw error;
  };

  return {
    achievements,
    teamMembers,
    isLoading,
    grantAchievement,
  };
}
