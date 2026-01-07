import { TeamRanking, KPIS, KPI_LABELS } from '@/types/gincana';
import { TrendingUp, Target, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsOverviewProps {
  rankings: TeamRanking[];
  period: string;
}

const kpiIcons = {
  ofex: Target,
  apoio: Users,
  soria: Zap,
  cadastro: TrendingUp,
};

export function StatsOverview({ rankings, period }: StatsOverviewProps) {
  const totalByKpi = KPIS.reduce((acc, kpi) => {
    acc[kpi] = rankings.reduce((sum, team) => sum + team.kpis[kpi], 0);
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(totalByKpi).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {KPIS.map((kpi, index) => {
        const Icon = kpiIcons[kpi];
        const value = totalByKpi[kpi];
        const percentage = grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(0) : 0;
        
        return (
          <div
            key={kpi}
            className={cn(
              'p-4 rounded-xl bg-card border border-border/50',
              'hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {KPI_LABELS[kpi]}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{percentage}% do total</div>
          </div>
        );
      })}
    </div>
  );
}
