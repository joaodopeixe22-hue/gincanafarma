import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AppSettings, KpiDefinition, KpiKey, Team } from '@/types/db';
import type { WeekStart } from '@/lib/period';

const FIVE_MIN = 5 * 60 * 1000;

/**
 * Configuração da loja vinda do banco: nome, circuito, semana, equipes e KPIs.
 * Substitui os valores que antes estavam fixos no código.
 */
export function useAppConfig() {
  const { isAuthenticated } = useAuth();

  const settingsQ = useQuery({
    queryKey: ['app_settings'],
    enabled: isAuthenticated,
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error) throw error;
      return data as AppSettings;
    },
  });

  const teamsQ = useQuery({
    queryKey: ['teams'],
    enabled: isAuthenticated,
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('sort_order');
      if (error) throw error;
      return data as Team[];
    },
  });

  const kpisQ = useQuery({
    queryKey: ['kpi_definitions'],
    enabled: isAuthenticated,
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await supabase.from('kpi_definitions').select('*').order('sort_order');
      if (error) throw error;
      return data as KpiDefinition[];
    },
  });

  const allTeams = useMemo(() => teamsQ.data ?? [], [teamsQ.data]);
  const teams = useMemo(() => allTeams.filter((t) => t.is_active), [allTeams]);
  const allKpis = useMemo(() => kpisQ.data ?? [], [kpisQ.data]);
  const kpis = useMemo(() => allKpis.filter((k) => k.is_active), [allKpis]);

  const teamById = useCallback((id?: string | null) => allTeams.find((t) => t.id === id) ?? null, [allTeams]);
  const kpiLabel = useCallback(
    (key: KpiKey | string) => allKpis.find((k) => k.key === key)?.label ?? key.toUpperCase(),
    [allKpis],
  );

  return {
    settings: settingsQ.data ?? null,
    teams,
    allTeams,
    kpis,
    allKpis,
    teamById,
    kpiLabel,
    weekStartsOn: ((settingsQ.data?.week_starts_on ?? 1) as WeekStart),
    storeName: settingsQ.data?.store_name ?? 'Gincana Farma',
    circuitName: settingsQ.data?.circuit_name ?? '',
    isLoading: settingsQ.isLoading || teamsQ.isLoading || kpisQ.isLoading,
  };
}
