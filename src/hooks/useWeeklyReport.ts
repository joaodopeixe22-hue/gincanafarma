import { useMemo } from 'react';
import { format, subWeeks } from 'date-fns';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useEngagement, useKpiRanking, useTeamKpis } from '@/hooks/data/useRankings';
import { daysOf, periodRange, toISODate } from '@/lib/period';
import { teamEngagementFrom, teamRankingsFrom, type TeamEngagement } from '@/lib/rankings';
import type { EngagementRow, KpiRankingRow } from '@/types/db';
import type { TeamRanking } from '@/types/gincana';

export interface WeeklyReportData {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  /** total aprovado por equipe em cada dia: { date, [teamId]: total } */
  dailyData: Array<Record<string, number | string>>;
  teamRankings: TeamRanking[];
  teamEngagement: TeamEngagement[];
  memberPerformance: KpiRankingRow[];
  engagement: EngagementRow[];
  totals: { ofex: number; apoio: number; soria: number; cadastro: number; total: number };
  isLoading: boolean;
}

/** Relatório da semana (mesma regra de semana do app inteiro; só dados aprovados) */
export function useWeeklyReport(weekOffset = 0): WeeklyReportData {
  const { teams, weekStartsOn } = useAppConfig();
  const range = periodRange('week', subWeeks(new Date(), Math.abs(weekOffset)), weekStartsOn);
  const teamQ = useTeamKpis(range.startStr, range.endStr);
  const kpiQ = useKpiRanking(range.startStr, range.endStr);
  const engQ = useEngagement(range.startStr, range.endStr);

  return useMemo(() => {
    const rows = teamQ.data ?? [];
    const teamRankings = teamRankingsFrom(rows, teams);
    const dailyData = daysOf(range).map((d) => {
      const iso = toISODate(d);
      const point: Record<string, number | string> = { date: iso };
      teams.forEach((t) => {
        point[t.id] = rows.filter((r) => r.date === iso && r.team_id === t.id).reduce((s, r) => s + (r.total ?? 0), 0);
      });
      return point;
    });
    const totals = teamRankings.reduce(
      (acc, t) => ({
        ofex: acc.ofex + t.kpis.ofex,
        apoio: acc.apoio + t.kpis.apoio,
        soria: acc.soria + t.kpis.soria,
        cadastro: acc.cadastro + t.kpis.cadastro,
        total: acc.total + t.total,
      }),
      { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 },
    );
    return {
      weekStart: range.start,
      weekEnd: range.end,
      weekLabel: `${format(range.start, 'dd/MM')} - ${format(range.end, 'dd/MM/yyyy')}`,
      dailyData,
      teamRankings,
      teamEngagement: teamEngagementFrom(engQ.data ?? [], teams),
      memberPerformance: kpiQ.data ?? [],
      engagement: (engQ.data ?? []).filter((r) => r.indice != null),
      totals,
      isLoading: teamQ.isLoading || kpiQ.isLoading || engQ.isLoading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamQ.data, kpiQ.data, engQ.data, teams, range.startStr, teamQ.isLoading, kpiQ.isLoading, engQ.isLoading]);
}
