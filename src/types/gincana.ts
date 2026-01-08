export interface DailyData {
  date: string; // YYYY-MM-DD format
  teams: {
    dna: TeamKPIs;
    elite: TeamKPIs;
    alcateia: TeamKPIs;
  };
}

export interface TeamKPIs {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

export interface TeamRanking {
  teamId: 'dna' | 'elite' | 'alcateia';
  teamName: string;
  total: number;
  kpis: TeamKPIs;
}

export const TEAMS = {
  dna: { id: 'dna' as const, name: 'DNA de Campeões', shortName: 'DNA' },
  elite: { id: 'elite' as const, name: 'Elite do Cuidado', shortName: 'Elite' },
  alcateia: { id: 'alcateia' as const, name: 'Alcateia', shortName: 'Alcateia' },
} as const;

export const KPIS = ['ofex', 'apoio', 'soria', 'cadastro'] as const;
export type KPIName = typeof KPIS[number];

export const KPI_LABELS: Record<KPIName, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
};
