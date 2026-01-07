import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Goal {
  id: string;
  period_type: 'daily' | 'weekly';
  kpi_type: 'ofex' | 'apoio' | 'soria' | 'cadastro' | 'total';
  target_value: number;
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('gincana_goals')
      .select('*');

    if (error) {
      console.error('Error fetching goals:', error);
      return;
    }

    setGoals(data as Goal[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchGoals();

    const channel = supabase
      .channel('goals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gincana_goals',
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGoals]);

  const getGoal = useCallback((periodType: 'daily' | 'weekly', kpiType: string): number => {
    const goal = goals.find(g => g.period_type === periodType && g.kpi_type === kpiType);
    return goal?.target_value || 0;
  }, [goals]);

  const updateGoal = useCallback(async (periodType: 'daily' | 'weekly', kpiType: string, targetValue: number) => {
    const { error } = await supabase
      .from('gincana_goals')
      .update({ target_value: targetValue })
      .eq('period_type', periodType)
      .eq('kpi_type', kpiType);

    if (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }, []);

  return {
    goals,
    isLoading,
    getGoal,
    updateGoal,
  };
}
