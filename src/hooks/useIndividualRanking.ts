import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface UserDailyDataRow {
  id: string;
  user_id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  team_id: string | null;
  avatar_url: string | null;
}

export interface IndividualRanking {
  user_id: string;
  full_name: string;
  team_id: string | null;
  avatar_url: string | null;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

export interface TeamContribution {
  team_id: string;
  team_name: string;
  members: IndividualRanking[];
  total: number;
}

export function useIndividualRanking() {
  const [allData, setAllData] = useState<UserDailyDataRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    const [dataResult, profilesResult] = await Promise.all([
      supabase.from('user_daily_data').select('*'),
      supabase.from('profiles').select('id, full_name, team_id, avatar_url'),
    ]);

    if (dataResult.data) {
      setAllData(dataResult.data as UserDailyDataRow[]);
    }
    if (profilesResult.data) {
      setProfiles(profilesResult.data as ProfileRow[]);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('individual-ranking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_daily_data' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const calculateRanking = useCallback((startDate: Date, endDate: Date): IndividualRanking[] => {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Filter data by date range
    const filteredData = allData.filter(d => d.date >= startStr && d.date <= endStr);

    // Aggregate by user
    const userTotals: Record<string, { ofex: number; apoio: number; soria: number; cadastro: number }> = {};
    
    filteredData.forEach(row => {
      if (!userTotals[row.user_id]) {
        userTotals[row.user_id] = { ofex: 0, apoio: 0, soria: 0, cadastro: 0 };
      }
      userTotals[row.user_id].ofex += row.ofex;
      userTotals[row.user_id].apoio += row.apoio;
      userTotals[row.user_id].soria += row.soria;
      userTotals[row.user_id].cadastro += row.cadastro;
    });

    // Build ranking with profile info
    const rankings: IndividualRanking[] = Object.entries(userTotals).map(([userId, totals]) => {
      const profile = profiles.find(p => p.id === userId);
      const total = totals.ofex + totals.apoio + totals.soria + totals.cadastro;
      
      return {
        user_id: userId,
        full_name: profile?.full_name || 'Usuário',
        team_id: profile?.team_id || null,
        avatar_url: profile?.avatar_url || null,
        ...totals,
        total,
      };
    });

    // Sort by total descending
    return rankings.sort((a, b) => b.total - a.total);
  }, [allData, profiles]);

  const getTeamContributions = useCallback((startDate: Date, endDate: Date): TeamContribution[] => {
    const rankings = calculateRanking(startDate, endDate);
    
    const teamMap: Record<string, IndividualRanking[]> = {
      dna: [],
      elite: [],
      alcateia: [],
    };

    rankings.forEach(r => {
      if (r.team_id && teamMap[r.team_id]) {
        teamMap[r.team_id].push(r);
      }
    });

    const teamNames: Record<string, string> = {
      dna: 'DNA',
      elite: 'Elite',
      alcateia: 'Alcateia',
    };

    return Object.entries(teamMap)
      .map(([teamId, members]) => ({
        team_id: teamId,
        team_name: teamNames[teamId] || teamId,
        members,
        total: members.reduce((sum, m) => sum + m.total, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [calculateRanking]);

  const getDailyRanking = useCallback((date: Date): IndividualRanking[] => {
    return calculateRanking(date, date);
  }, [calculateRanking]);

  const getWeeklyRanking = useCallback((date: Date): IndividualRanking[] => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return calculateRanking(start, end);
  }, [calculateRanking]);

  const getMonthlyRanking = useCallback((date: Date): IndividualRanking[] => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return calculateRanking(start, end);
  }, [calculateRanking]);

  const getDailyContributions = useCallback((date: Date): TeamContribution[] => {
    return getTeamContributions(date, date);
  }, [getTeamContributions]);

  const getWeeklyContributions = useCallback((date: Date): TeamContribution[] => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return getTeamContributions(start, end);
  }, [getTeamContributions]);

  const getMonthlyContributions = useCallback((date: Date): TeamContribution[] => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return getTeamContributions(start, end);
  }, [getTeamContributions]);

  return {
    isLoading,
    getDailyRanking,
    getWeeklyRanking,
    getMonthlyRanking,
    getDailyContributions,
    getWeeklyContributions,
    getMonthlyContributions,
    refetch: fetchData,
  };
}
