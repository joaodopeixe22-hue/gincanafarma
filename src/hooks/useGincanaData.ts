import { useState, useEffect, useCallback } from 'react';
import { DailyData, TeamKPIs, TeamRanking, TEAMS } from '@/types/gincana';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const emptyKPIs: TeamKPIs = { ofex: 0, apoio: 0, soria: 0, cadastro: 0 };

interface DbRow {
  id: string;
  date: string;
  dna_ofex: number;
  dna_apoio: number;
  dna_soria: number;
  dna_cadastro: number;
  elite_ofex: number;
  elite_apoio: number;
  elite_soria: number;
  elite_cadastro: number;
  alcateia_ofex: number;
  alcateia_apoio: number;
  alcateia_soria: number;
  alcateia_cadastro: number;
}

const dbRowToDailyData = (row: DbRow): DailyData => ({
  date: row.date,
  teams: {
    dna: { ofex: row.dna_ofex, apoio: row.dna_apoio, soria: row.dna_soria, cadastro: row.dna_cadastro },
    elite: { ofex: row.elite_ofex, apoio: row.elite_apoio, soria: row.elite_soria, cadastro: row.elite_cadastro },
    alcateia: { ofex: row.alcateia_ofex, apoio: row.alcateia_apoio, soria: row.alcateia_soria, cadastro: row.alcateia_cadastro },
  },
});

export function useGincanaData() {
  const [data, setData] = useState<Record<string, DailyData>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data from database
  const fetchData = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('gincana_daily_data')
      .select('*');

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    const newData: Record<string, DailyData> = {};
    rows?.forEach((row) => {
      newData[row.date] = dbRowToDailyData(row as DbRow);
    });
    setData(newData);
    setIsLoading(false);
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('gincana-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gincana_daily_data',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          if (payload.eventType === 'DELETE') {
            setData((prev) => {
              const newData = { ...prev };
              const oldRow = payload.old as DbRow;
              delete newData[oldRow.date];
              return newData;
            });
          } else {
            const row = payload.new as DbRow;
            setData((prev) => ({
              ...prev,
              [row.date]: dbRowToDailyData(row),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const getDayData = useCallback((date: Date): DailyData => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return data[dateKey] || {
      date: dateKey,
      teams: {
        dna: { ...emptyKPIs },
        elite: { ...emptyKPIs },
        alcateia: { ...emptyKPIs },
      },
    };
  }, [data]);

  const setDayData = useCallback(async (date: Date, dayData: DailyData) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    const dbData = {
      date: dateKey,
      dna_ofex: dayData.teams.dna.ofex,
      dna_apoio: dayData.teams.dna.apoio,
      dna_soria: dayData.teams.dna.soria,
      dna_cadastro: dayData.teams.dna.cadastro,
      elite_ofex: dayData.teams.elite.ofex,
      elite_apoio: dayData.teams.elite.apoio,
      elite_soria: dayData.teams.elite.soria,
      elite_cadastro: dayData.teams.elite.cadastro,
      alcateia_ofex: dayData.teams.alcateia.ofex,
      alcateia_apoio: dayData.teams.alcateia.apoio,
      alcateia_soria: dayData.teams.alcateia.soria,
      alcateia_cadastro: dayData.teams.alcateia.cadastro,
    };

    const { error } = await supabase
      .from('gincana_daily_data')
      .upsert(dbData, { onConflict: 'date' });

    if (error) {
      console.error('Error saving data:', error);
      throw error;
    }

    // Trigger achievement check (fire and forget - errors handled internally)
    supabase.functions.invoke('check-achievements').catch(console.error);
  }, []);

  const calculateRanking = useCallback((dates: Date[]): TeamRanking[] => {
    const totals = {
      dna: { ...emptyKPIs },
      elite: { ...emptyKPIs },
      alcateia: { ...emptyKPIs },
    };

    dates.forEach(date => {
      const dayData = getDayData(date);
      (['dna', 'elite', 'alcateia'] as const).forEach(teamId => {
        totals[teamId].ofex += dayData.teams[teamId].ofex;
        totals[teamId].apoio += dayData.teams[teamId].apoio;
        totals[teamId].soria += dayData.teams[teamId].soria;
        totals[teamId].cadastro += dayData.teams[teamId].cadastro;
      });
    });

    const rankings: TeamRanking[] = (['dna', 'elite', 'alcateia'] as const).map(teamId => ({
      teamId,
      teamName: TEAMS[teamId].name,
      total: totals[teamId].ofex + totals[teamId].apoio + totals[teamId].soria + totals[teamId].cadastro,
      kpis: totals[teamId],
    }));

    return rankings.sort((a, b) => b.total - a.total);
  }, [getDayData]);

  const getDailyRanking = useCallback((date: Date): TeamRanking[] => {
    return calculateRanking([date]);
  }, [calculateRanking]);

  const getWeeklyRanking = useCallback((date: Date): TeamRanking[] => {
    const start = startOfWeek(date, { locale: ptBR });
    const end = endOfWeek(date, { locale: ptBR });
    const days = eachDayOfInterval({ start, end });
    return calculateRanking(days);
  }, [calculateRanking]);

  const getMonthlyRanking = useCallback((date: Date): TeamRanking[] => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    return calculateRanking(days);
  }, [calculateRanking]);

  const hasDataForDay = useCallback((date: Date): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = data[dateKey];
    if (!dayData) return false;
    
    return Object.values(dayData.teams).some(team => 
      team.ofex > 0 || team.apoio > 0 || team.soria > 0 || team.cadastro > 0
    );
  }, [data]);

  return {
    selectedDate,
    setSelectedDate,
    getDayData,
    setDayData,
    getDailyRanking,
    getWeeklyRanking,
    getMonthlyRanking,
    hasDataForDay,
    isLoading,
  };
}
