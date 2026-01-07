import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnlockedAchievement {
  id: string;
  name: string;
  points: number;
}

interface CheckResult {
  success: boolean;
  newlyUnlocked: UnlockedAchievement[];
  totalChecked: number;
}

export function useAchievementChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkAchievements = async (): Promise<UnlockedAchievement[]> => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke<CheckResult>('check-achievements');

      if (error) {
        console.error('Error checking achievements:', error);
        return [];
      }

      if (data?.newlyUnlocked && data.newlyUnlocked.length > 0) {
        // Show toast for each new achievement
        data.newlyUnlocked.forEach(achievement => {
          toast({
            title: '🏆 Nova Conquista!',
            description: `Você desbloqueou: ${achievement.name} (+${achievement.points} pts)`,
          });
        });
      }

      return data?.newlyUnlocked || [];
    } catch (err) {
      console.error('Error invoking check-achievements:', err);
      return [];
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkAchievements,
    isChecking,
  };
}
