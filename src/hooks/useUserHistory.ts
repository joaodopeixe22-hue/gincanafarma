import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserHistoryRecord {
  id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  status: string;
  review_note: string | null;
}

export interface UserHistoryTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

export function useUserHistory(userId?: string) {
  const [records, setRecords] = useState<UserHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_daily_data')
      .select('id, date, ofex, apoio, soria, cadastro, status, review_note')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching user history:', error);
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Totais consideram só dias aprovados
  const totals: UserHistoryTotals = records.filter((r) => r.status === 'approved').reduce(
    (acc, record) => ({
      ofex: acc.ofex + record.ofex,
      apoio: acc.apoio + record.apoio,
      soria: acc.soria + record.soria,
      cadastro: acc.cadastro + record.cadastro,
      total: acc.total + record.ofex + record.apoio + record.soria + record.cadastro,
    }),
    { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 }
  );

  return {
    records,
    totals,
    isLoading,
    refetch: fetchHistory,
  };
}
