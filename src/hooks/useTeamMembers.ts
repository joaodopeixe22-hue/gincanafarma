import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface MemberWithData extends TeamMember {
  totals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  dailyData: MemberData[];
}

interface TeamTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
  memberCount: number;
}

export function useTeamMembers(teamId?: string | null) {
  const [members, setMembers] = useState<MemberWithData[]>([]);
  const [teamTotals, setTeamTotals] = useState<TeamTotals>({
    ofex: 0,
    apoio: 0,
    soria: 0,
    cadastro: 0,
    total: 0,
    memberCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setTeamTotals({
        ofex: 0,
        apoio: 0,
        soria: 0,
        cadastro: 0,
        total: 0,
        memberCount: 0,
      });
      setIsLoading(false);
      return;
    }

    const fetchTeamData = async () => {
      setIsLoading(true);

      // Buscar membros da equipe
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, matricula, avatar_url, team_id')
        .eq('team_id', teamId);

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        setTeamTotals({
          ofex: 0,
          apoio: 0,
          soria: 0,
          cadastro: 0,
          total: 0,
          memberCount: 0,
        });
        setIsLoading(false);
        return;
      }

      const memberIds = profiles.map(p => p.id);

      // Buscar dados diários de todos os membros
      const { data: dailyData } = await supabase
        .from('user_daily_data')
        .select('*')
        .in('user_id', memberIds)
        .order('date', { ascending: false });

      // Agregar dados por membro
      const membersWithData: MemberWithData[] = profiles.map(profile => {
        const memberDailyData = dailyData?.filter(d => d.user_id === profile.id) || [];
        
        const totals = memberDailyData.reduce(
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
          ...profile,
          totals,
          dailyData: memberDailyData.map(d => ({
            ...d,
            total: d.ofex + d.apoio + d.soria + d.cadastro,
          })),
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
        { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0, memberCount: 0 }
      );

      setMembers(membersWithData);
      setTeamTotals(teamTotal);
      setIsLoading(false);
    };

    fetchTeamData();
  }, [teamId]);

  return {
    members,
    teamTotals,
    isLoading,
  };
}
