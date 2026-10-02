import type { KpiKey } from '@/types/db';

export interface TeamKPIs {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  total: number;
  kpis: TeamKPIs;
}

export const KPIS: KpiKey[] = ['ofex', 'apoio', 'soria', 'cadastro'];
export type KPIName = KpiKey;

/** Rótulos padrão; os nomes reais vêm de Admin › Configurações › KPIs */
export const KPI_LABELS: Record<KPIName, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
};
