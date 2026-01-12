import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, endOfWeek, addDays, subWeeks, format, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TeamData {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

interface DailyTeamData {
  date: string;
  dna: TeamData;
  elite: TeamData;
  alcateia: TeamData;
}

interface TeamRanking {
  team: string;
  total: number;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

interface MemberPerformance {
  id: string;
  name: string;
  team: string;
  total: number;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

export interface WeeklyReportData {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  dailyData: DailyTeamData[];
  teamRankings: TeamRanking[];
  memberPerformance: MemberPerformance[];
  totals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  isLoading: boolean;
}

export function useWeeklyReport(weekOffset: number = 0) {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyTeamData[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [memberPerformance, setMemberPerformance] = useState<MemberPerformance[]>([]);
  const [totals, setTotals] = useState({
    ofex: 0,
    apoio: 0,
    soria: 0,
    cadastro: 0,
    total: 0,
  });

  const today = new Date();
  const weekStart = startOfWeek(subWeeks(today, Math.abs(weekOffset)), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekLabel = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`;

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      // Fetch team daily data
      const { data: gincanaData, error: gincanaError } = await supabase
        .from('gincana_daily_data')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (gincanaError) throw gincanaError;

      // Process daily data
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const processedDailyData: DailyTeamData[] = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayData = gincanaData?.find(d => d.date === dateStr);

        return {
          date: dateStr,
          dna: {
            ofex: dayData?.dna_ofex || 0,
            apoio: dayData?.dna_apoio || 0,
            soria: dayData?.dna_soria || 0,
            cadastro: dayData?.dna_cadastro || 0,
          },
          elite: {
            ofex: dayData?.elite_ofex || 0,
            apoio: dayData?.elite_apoio || 0,
            soria: dayData?.elite_soria || 0,
            cadastro: dayData?.elite_cadastro || 0,
          },
          alcateia: {
            ofex: dayData?.alcateia_ofex || 0,
            apoio: dayData?.alcateia_apoio || 0,
            soria: dayData?.alcateia_soria || 0,
            cadastro: dayData?.alcateia_cadastro || 0,
          },
        };
      });

      setDailyData(processedDailyData);

      // Calculate team totals
      const teamTotals = {
        dna: { ofex: 0, apoio: 0, soria: 0, cadastro: 0 },
        elite: { ofex: 0, apoio: 0, soria: 0, cadastro: 0 },
        alcateia: { ofex: 0, apoio: 0, soria: 0, cadastro: 0 },
      };

      processedDailyData.forEach(day => {
        (['dna', 'elite', 'alcateia'] as const).forEach(team => {
          teamTotals[team].ofex += day[team].ofex;
          teamTotals[team].apoio += day[team].apoio;
          teamTotals[team].soria += day[team].soria;
          teamTotals[team].cadastro += day[team].cadastro;
        });
      });

      const rankings: TeamRanking[] = (['dna', 'elite', 'alcateia'] as const)
        .map(team => ({
          team,
          ...teamTotals[team],
          total: teamTotals[team].ofex + teamTotals[team].apoio + teamTotals[team].soria + teamTotals[team].cadastro,
        }))
        .sort((a, b) => b.total - a.total);

      setTeamRankings(rankings);

      // Calculate overall totals
      const overallTotals = {
        ofex: rankings.reduce((sum, r) => sum + r.ofex, 0),
        apoio: rankings.reduce((sum, r) => sum + r.apoio, 0),
        soria: rankings.reduce((sum, r) => sum + r.soria, 0),
        cadastro: rankings.reduce((sum, r) => sum + r.cadastro, 0),
        total: rankings.reduce((sum, r) => sum + r.total, 0),
      };

      setTotals(overallTotals);

      // Fetch member performance
      const { data: userDailyData, error: userError } = await supabase
        .from('user_daily_data')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr);

      if (userError) throw userError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, team_id');

      if (profilesError) throw profilesError;

      // Aggregate member data
      const memberMap = new Map<string, MemberPerformance>();

      userDailyData?.forEach(row => {
        const profile = profiles?.find(p => p.id === row.user_id);
        if (!profile) return;

        if (!memberMap.has(row.user_id)) {
          memberMap.set(row.user_id, {
            id: row.user_id,
            name: profile.full_name || 'Sem nome',
            team: profile.team_id || '',
            total: 0,
            ofex: 0,
            apoio: 0,
            soria: 0,
            cadastro: 0,
          });
        }

        const member = memberMap.get(row.user_id)!;
        member.ofex += row.ofex || 0;
        member.apoio += row.apoio || 0;
        member.soria += row.soria || 0;
        member.cadastro += row.cadastro || 0;
        member.total = member.ofex + member.apoio + member.soria + member.cadastro;
      });

      const sortedMembers = Array.from(memberMap.values()).sort((a, b) => b.total - a.total);
      setMemberPerformance(sortedMembers);

    } catch (error) {
      console.error('Error fetching weekly report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    weekStart,
    weekEnd,
    weekLabel,
    dailyData,
    teamRankings,
    memberPerformance,
    totals,
    isLoading,
    refetch: fetchData,
  };
}
