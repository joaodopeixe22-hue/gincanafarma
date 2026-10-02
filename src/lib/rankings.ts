import type { EngagementRow, Team, TeamDailyKpis } from '@/types/db';
import type { TeamRanking } from '@/types/gincana';

/** Soma o placar diário (aprovado) por equipe no período */
export function teamRankingsFrom(rows: TeamDailyKpis[], teams: Team[]): TeamRanking[] {
  return teams
    .map((t) => {
      const mine = rows.filter((r) => r.team_id === t.id);
      const kpis = {
        ofex: mine.reduce((s, r) => s + (r.ofex ?? 0), 0),
        apoio: mine.reduce((s, r) => s + (r.apoio ?? 0), 0),
        soria: mine.reduce((s, r) => s + (r.soria ?? 0), 0),
        cadastro: mine.reduce((s, r) => s + (r.cadastro ?? 0), 0),
      };
      return { teamId: t.id, teamName: t.name, kpis, total: kpis.ofex + kpis.apoio + kpis.soria + kpis.cadastro };
    })
    .sort((a, b) => b.total - a.total);
}

export interface TeamEngagement {
  team: Team;
  indice: number | null;
  members: EngagementRow[];
}

/** Índice da equipe = média do índice de quem trabalhou no período */
export function teamEngagementFrom(rows: EngagementRow[], teams: Team[]): TeamEngagement[] {
  return teams
    .map((team) => {
      const members = rows.filter((r) => r.team_id === team.id);
      const scored = members.filter((m) => m.indice != null);
      const indice = scored.length ? Math.round((10 * scored.reduce((s, m) => s + Number(m.indice), 0)) / scored.length) / 10 : null;
      return { team, indice, members };
    })
    .sort((a, b) => (b.indice ?? -1) - (a.indice ?? -1));
}
