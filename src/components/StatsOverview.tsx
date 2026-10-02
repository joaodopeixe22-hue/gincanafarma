import { TrendingUp, Target, Zap, Users, type LucideIcon } from 'lucide-react';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import type { TeamRanking } from '@/types/gincana';
import type { KpiKey } from '@/types/db';

const kpiIcons: Record<KpiKey, LucideIcon> = { ofex: Target, apoio: Users, soria: Zap, cadastro: TrendingUp };

export function StatsOverview({ rankings }: { rankings: TeamRanking[] }) {
  const { kpis, kpiLabel } = useAppConfig();
  const totals = kpis.map((k) => ({ key: k.key as KpiKey, value: rankings.reduce((s, t) => s + t.kpis[k.key as KpiKey], 0) }));
  const grand = totals.reduce((s, t) => s + t.value, 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {totals.map(({ key, value }) => {
        const Icon = kpiIcons[key];
        return (
          <div key={key} className="rounded-xl border border-border/50 bg-card p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpiLabel(key)}</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{grand ? Math.round((100 * value) / grand) : 0}% do total</div>
          </div>
        );
      })}
    </div>
  );
}
