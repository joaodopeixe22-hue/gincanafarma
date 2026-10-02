import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];
type Functions = Database['public']['Functions'];

export type AppSettings = Tables['app_settings']['Row'];
export type Team = Tables['teams']['Row'];
export type KpiDefinition = Tables['kpi_definitions']['Row'];
export type DailyEntry = Tables['user_daily_data']['Row'];
export type EntryStatus = 'pending' | 'approved' | 'rejected';
export type Shift = Tables['shifts']['Row'];
export type Task = Tables['tasks']['Row'];
export type Challenge = Tables['challenges']['Row'];
export type ChallengeParticipant = Tables['challenge_participants']['Row'];
export type ActivityPost = Tables['activity_feed']['Row'];
export type Reaction = Tables['reactions']['Row'];
export type StoreResult = Tables['store_daily_results']['Row'];
export type LedgerRow = Tables['points_ledger']['Row'];
export type TeamDailyKpis = Views['team_daily_kpis']['Row'];

export type EngagementRow = Functions['engagement_index']['Returns'][number];
export type KpiRankingRow = Functions['kpi_ranking']['Returns'][number];
export type PointsRankingRow = Functions['points_ranking']['Returns'][number];
export type MyQuiz = Functions['list_my_quizzes']['Returns'][number];

export type KpiKey = 'ofex' | 'apoio' | 'soria' | 'cadastro';
export const KPI_KEYS: KpiKey[] = ['ofex', 'apoio', 'soria', 'cadastro'];

export type KpiValues = Record<KpiKey, number>;
export const emptyKpis = (): KpiValues => ({ ofex: 0, apoio: 0, soria: 0, cadastro: 0 });
export const sumKpis = (v: Partial<KpiValues>) => (v.ofex ?? 0) + (v.apoio ?? 0) + (v.soria ?? 0) + (v.cadastro ?? 0);

export const ENTRY_STATUS: Record<EntryStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando aprovação', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  approved: { label: 'Aprovado', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Recusado', className: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' },
};

export const PILLARS = [
  { key: 'execucao', label: 'Execução', weightKey: 'weight_execucao', hint: 'KPIs aprovados em % da sua meta diária, por dia trabalhado' },
  { key: 'compromissos', label: 'Compromissos', weightKey: 'weight_compromissos', hint: 'Tarefas da agenda concluídas no prazo' },
  { key: 'campanhas', label: 'Campanhas', weightKey: 'weight_campanhas', hint: 'Participação e conclusão das campanhas ativas' },
  { key: 'constancia', label: 'Constância', weightKey: 'weight_constancia', hint: 'Dias trabalhados com lançamento feito no próprio dia' },
  { key: 'desenvolvimento', label: 'Desenvolvimento', weightKey: 'weight_desenvolvimento', hint: 'Quizzes disponíveis em que você passou' },
  { key: 'reconhecimento', label: 'Reconhecimento', weightKey: 'weight_reconhecimento', hint: 'Reconhecimentos recebidos de colegas e liderança' },
] as const;

export type PillarKey = (typeof PILLARS)[number]['key'];
