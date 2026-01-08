import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLevelByPoints, getProgressToNextLevel, getPointsToNextLevel, LevelConfig, getNextLevel, LEVELS } from '@/lib/levels';

interface UserLevelData {
  id: string;
  user_id: string;
  level_number: number;
  level_name: string;
  total_points: number;
  updated_at: string;
}

export function useUserLevel(userId?: string, totalPoints: number = 0) {
  const [userLevelData, setUserLevelData] = useState<UserLevelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLeveledUp, setHasLeveledUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState<LevelConfig | null>(null);
  const lastSyncedPoints = useRef<number>(0);

  const currentLevel = getLevelByPoints(totalPoints);
  const nextLevel = getNextLevel(currentLevel);
  const progress = getProgressToNextLevel(totalPoints);
  const pointsToNext = getPointsToNextLevel(totalPoints);

  const fetchUserLevel = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user level:', error);
      setIsLoading(false);
      return;
    }

    if (data) {
      setUserLevelData(data);
    }
    setIsLoading(false);
  }, [userId]);

  const syncLevel = useCallback(async () => {
    if (!userId || totalPoints === lastSyncedPoints.current) return;

    const newLevel = getLevelByPoints(totalPoints);
    
    // Check for level up
    if (userLevelData && userLevelData.level_number < newLevel.level) {
      const oldLevel = LEVELS.find(l => l.level === userLevelData.level_number) || LEVELS[0];
      setPreviousLevel(oldLevel);
      setHasLeveledUp(true);
    }

    const { data, error } = await supabase
      .from('user_levels')
      .upsert({
        user_id: userId,
        level_number: newLevel.level,
        level_name: newLevel.name,
        total_points: totalPoints,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error syncing user level:', error);
      return;
    }

    if (data) {
      setUserLevelData(data);
      lastSyncedPoints.current = totalPoints;
    }
  }, [userId, totalPoints, userLevelData]);

  const clearLevelUp = useCallback(() => {
    setHasLeveledUp(false);
    setPreviousLevel(null);
  }, []);

  useEffect(() => {
    fetchUserLevel();
  }, [fetchUserLevel]);

  useEffect(() => {
    if (!isLoading && userId && totalPoints > 0) {
      syncLevel();
    }
  }, [isLoading, userId, totalPoints, syncLevel]);

  return {
    userLevelData,
    currentLevel,
    nextLevel,
    progress,
    pointsToNext,
    totalPoints,
    isLoading,
    hasLeveledUp,
    previousLevel,
    clearLevelUp,
  };
}
