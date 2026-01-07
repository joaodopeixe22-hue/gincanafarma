import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserDailyData {
  id?: string;
  user_id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

interface UserDailyDataRow {
  id: string;
  user_id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  created_at: string;
  updated_at: string;
}

export function useUserDailyData() {
  const { user } = useAuth();
  const [data, setData] = useState<UserDailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!user?.id) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data: rows, error } = await supabase
      .from('user_daily_data')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user daily data:', error);
      setData([]);
    } else {
      setData((rows as UserDailyDataRow[]).map(row => ({
        id: row.id,
        user_id: row.user_id,
        date: row.date,
        ofex: row.ofex,
        apoio: row.apoio,
        soria: row.soria,
        cadastro: row.cadastro,
      })));
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const getDataForDate = useCallback((date: Date): UserDailyData | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return data.find(d => d.date === dateStr) || null;
  }, [data]);

  const hasDataForDate = useCallback((date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return data.some(d => d.date === dateStr);
  }, [data]);

  const saveData = useCallback(async (date: Date, values: { ofex: number; apoio: number; soria: number; cadastro: number }) => {
    if (!user?.id) throw new Error('User not authenticated');

    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { error } = await supabase
      .from('user_daily_data')
      .upsert({
        user_id: user.id,
        date: dateStr,
        ofex: values.ofex,
        apoio: values.apoio,
        soria: values.soria,
        cadastro: values.cadastro,
      }, { onConflict: 'user_id,date' });

    if (error) {
      console.error('Error saving user daily data:', error);
      throw error;
    }

    await fetchUserData();
    
    // Trigger achievement check
    supabase.functions.invoke('check-achievements').catch(console.error);
  }, [user?.id, fetchUserData]);

  return {
    data,
    isLoading,
    getDataForDate,
    hasDataForDate,
    saveData,
    refetch: fetchUserData,
  };
}
