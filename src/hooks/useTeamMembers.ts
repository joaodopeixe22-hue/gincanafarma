import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, format } from 'date-fns';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { periodRange } from '@/lib/period';

interface TeamMember {
  id: string;
  full_name: string | null;
  matricula: string | null;
  avatar_url: string | null;
  team_id: string | null;
}

interface MemberData {
  user_id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

interface MemberGoals {
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

interface MemberWithData extends TeamMember {
  totals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  dailyTotals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  weeklyTotals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  dailyData: MemberData[];
  goals: MemberGoals;
}

interface TeamTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
  memberCount: number;
}

const emptyTotals = { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 };
const emptyGoals: MemberGoals = {
  daily: { ...emptyTotals },
  weekly: { ...emptyTotals },
};

export function useTeamMembers(teamId?: string | null) {
  const { weekStartsOn } = useAppConfig();
  const [members, setMembers] = useState<MemberWithData[]>([]);
  const [teamTotals, setTeamTotals] = useState<TeamTotals>({
    ...emptyTotals,
    memberCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setTeamTotals({ ...emptyTotals, memberCount: 0 });
      setIsLoading(false);
      return;
    }

    const fetchTeamData = async () => {
      setIsLoading(true);

      const today = new Date();
      const todayStr = format(startOfDay(today), 'yyyy-MM-dd');
      const { startStr: weekStart, endStr: weekEnd } = periodRange('week', today, weekStartsOn);

      // Buscar membros da equipe
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, matricula, avatar_url, team_id')
        .eq('team_id', teamId);

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        setTeamTotals({ ...emptyTotals, memberCount: 0 });
        setIsLoading(false);
        return;
      }

      const memberIds = profiles.map(p => p.id);

      // Buscar dados diários e metas em paralelo
      const [dailyDataResult, goalsResult] = await Promise.all([
        supabase
          .from('user_daily_data')
          .select('*')
          .in('user_id', memberIds)
          .eq('status', 'approved')
          .order('date', { ascending: false }),
        supabase
          .from('member_goals')
          .select('*')
          .in('user_id', memberIds),
      ]);

      const dailyData = dailyDataResult.data || [];
      const goalsData = goalsResult.data || [];

      // Agregar dados por membro
      const membersWithData: MemberWithData[] = profiles.map(profile => {
        const memberDailyData = dailyData.filter(d => d.user_id === profile.id);
        
        // Totais gerais (all time)
        const totals = memberDailyData.reduce(
          (acc, record) => ({
            ofex: acc.ofex + record.ofex,
            apoio: acc.apoio + record.apoio,
            soria: acc.soria + record.soria,
            cadastro: acc.cadastro + record.cadastro,
            total: acc.total + record.ofex + record.apoio + record.soria + record.cadastro,
          }),
          { ...emptyTotals }
        );

        // Totais do dia
        const todayData = memberDailyData.filter(d => d.date === todayStr);
        const dailyTotals = todayData.reduce(
          (acc, record) => ({
            ofex: acc.ofex + record.ofex,
            apoio: acc.apoio + record.apoio,
            soria: acc.soria + record.soria,
            cadastro: acc.cadastro + record.cadastro,
            total: acc.total + record.ofex + record.apoio + record.soria + record.cadastro,
          }),
          { ...emptyTotals }
        );

        // Totais da semana
        const weekData = memberDailyData.filter(d => d.date >= weekStart && d.date <= weekEnd);
        const weeklyTotals = weekData.reduce(
          (acc, record) => ({
            ofex: acc.ofex + record.ofex,
            apoio: acc.apoio + record.apoio,
            soria: acc.soria + record.soria,
            cadastro: acc.cadastro + record.cadastro,
            total: acc.total + record.ofex + record.apoio + record.soria + record.cadastro,
          }),
          { ...emptyTotals }
        );

        // Metas do membro
        const memberGoals = goalsData.filter(g => g.user_id === profile.id);
        const goals: MemberGoals = {
          daily: { ...emptyTotals },
          weekly: { ...emptyTotals },
        };

        memberGoals.forEach(goal => {
          const period = goal.period_type as 'daily' | 'weekly';
          const kpi = goal.kpi_type as keyof typeof emptyTotals;
          if (goals[period] && kpi in goals[period]) {
            goals[period][kpi] = goal.target_value;
          }
        });

        return {
          ...profile,
          totals,
          dailyTotals,
          weeklyTotals,
          dailyData: memberDailyData.map(d => ({
            ...d,
            total: d.ofex + d.apoio + d.soria + d.cadastro,
          })),
          goals,
        };
      });

      // Ordenar por total (ranking)
      membersWithData.sort((a, b) => b.totals.total - a.totals.total);

      // Calcular totais da equipe
      const teamTotal = membersWithData.reduce(
        (acc, member) => ({
          ofex: acc.ofex + member.totals.ofex,
          apoio: acc.apoio + member.totals.apoio,
          soria: acc.soria + member.totals.soria,
          cadastro: acc.cadastro + member.totals.cadastro,
          total: acc.total + member.totals.total,
          memberCount: acc.memberCount + 1,
        }),
        { ...emptyTotals, memberCount: 0 }
      );

      setMembers(membersWithData);
      setTeamTotals(teamTotal);
      setIsLoading(false);
    };

    fetchTeamData();
  }, [teamId, weekStartsOn]);

  return {
    members,
    teamTotals,
    isLoading,
  };
}
