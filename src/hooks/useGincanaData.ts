import { useState, useEffect, useCallback } from 'react';
import { DailyData, TeamKPIs, TeamRanking, TEAMS } from '@/types/gincana';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STORAGE_KEY = 'gincana_data';

const emptyKPIs: TeamKPIs = { ofex: 0, apoio: 0, soria: 0, cadastro: 0 };

export function useGincanaData() {
  const [data, setData] = useState<Record<string, DailyData>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  const saveData = useCallback((newData: Record<string, DailyData>) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

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

  const setDayData = useCallback((date: Date, dayData: DailyData) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const newData = { ...data, [dateKey]: dayData };
    saveData(newData);
  }, [data, saveData]);

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
  };
}
