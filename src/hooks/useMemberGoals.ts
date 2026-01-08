import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface MemberGoal {
  id: string;
  user_id: string;
  period_type: 'daily' | 'weekly';
  kpi_type: 'ofex' | 'apoio' | 'soria' | 'cadastro' | 'total';
  target_value: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface GoalsMap {
  daily: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  weekly: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
}

const emptyGoals: GoalsMap = {
  daily: { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 },
  weekly: { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 },
};

export function useMemberGoals(userId?: string) {
  const [goals, setGoals] = useState<MemberGoal[]>([]);
  const [goalsMap, setGoalsMap] = useState<GoalsMap>(emptyGoals);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      setGoalsMap(emptyGoals);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('member_goals')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching member goals:', error);
      setIsLoading(false);
      return;
    }

    const typedData = (data || []) as MemberGoal[];
    setGoals(typedData);

    // Build goals map
    const newMap: GoalsMap = {
      daily: { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 },
      weekly: { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 },
    };

    typedData.forEach((goal) => {
      if (goal.period_type === 'daily' || goal.period_type === 'weekly') {
        const kpi = goal.kpi_type as keyof typeof newMap.daily;
        newMap[goal.period_type][kpi] = goal.target_value;
      }
    });

    setGoalsMap(newMap);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const getGoal = useCallback(
    (periodType: 'daily' | 'weekly', kpiType: keyof typeof goalsMap.daily): number => {
      return goalsMap[periodType][kpiType];
    },
    [goalsMap]
  );

  const saveGoals = useCallback(
    async (newGoals: GoalsMap) => {
      if (!userId || !user) {
        toast.error('Usuário não autenticado');
        return false;
      }

      try {
        for (const periodType of ['daily', 'weekly'] as const) {
          for (const kpiType of ['ofex', 'apoio', 'soria', 'cadastro', 'total'] as const) {
            const targetValue = newGoals[periodType][kpiType];
            const existingGoal = goals.find(
              (g) => g.period_type === periodType && g.kpi_type === kpiType
            );

            if (existingGoal) {
              if (targetValue !== existingGoal.target_value) {
                await supabase
                  .from('member_goals')
                  .update({ target_value: targetValue })
                  .eq('id', existingGoal.id);
              }
            } else if (targetValue > 0) {
              await supabase.from('member_goals').insert({
                user_id: userId,
                period_type: periodType,
                kpi_type: kpiType,
                target_value: targetValue,
                created_by: user.id,
              });
            }
          }
        }

        await fetchGoals();
        toast.success('Metas salvas com sucesso!');
        return true;
      } catch (error) {
        console.error('Error saving goals:', error);
        toast.error('Erro ao salvar metas');
        return false;
      }
    },
    [userId, user, goals, fetchGoals]
  );

  return {
    goals,
    goalsMap,
    isLoading,
    getGoal,
    saveGoals,
    refetch: fetchGoals,
  };
}
