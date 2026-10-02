import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Quando algo muda no banco, atualiza as telas que dependem daquilo. */
const TABLE_TO_KEYS: Record<string, string[]> = {
  user_daily_data: ['my-entries', 'entries', 'engagement', 'kpi-ranking', 'team-kpis'],
  points_ledger: ['points-ranking', 'level', 'ledger', 'engagement'],
  tasks: ['tasks', 'engagement'],
  activity_feed: ['feed'],
  reactions: ['feed'],
  challenge_participants: ['challenges', 'engagement'],
  store_daily_results: ['store-results'],
  app_settings: ['app_settings'],
};

export function useRealtimeSync() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<string>();

    // agrupa várias mudanças seguidas (ex.: "fechar o dia") numa atualização só
    const schedule = (keys: string[]) => {
      keys.forEach((k) => pending.add(k));
      clearTimeout(timer);
      timer = setTimeout(() => {
        pending.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        pending.clear();
      }, 400);
    };

    const channel = supabase.channel('app-sync');
    Object.entries(TABLE_TO_KEYS).forEach(([table, keys]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(keys));
    });
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc, isAuthenticated]);
}
