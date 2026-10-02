import { Award, Medal, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { TeamBadge } from './TeamBadge';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { cn } from '@/lib/utils';
import type { TeamRanking } from '@/types/gincana';
import type { KpiKey } from '@/types/db';

interface RankingPodiumProps {
  rankings: TeamRanking[];
  title: string;
  subtitle: string;
  unit?: string;
}

const positionConfig = [
  { icon: Trophy, color: 'text-warning' },
  { icon: Medal, color: 'text-muted-foreground' },
  { icon: Award, color: 'text-amber-700' },
];

export function RankingPodium({ rankings, title, subtitle, unit = 'pts' }: RankingPodiumProps) {
  const { teamById, kpis, kpiLabel } = useAppConfig();

  if (rankings.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const podiumOrder = rankings.length >= 3 ? [rankings[1], rankings[0], rankings[2]] : rankings;
  const podiumHeights = rankings.length >= 3 ? ['h-28', 'h-40', 'h-20'] : ['h-40', 'h-28'];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-glow sm:p-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="text-sm capitalize text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mb-6 flex items-end justify-center gap-3 sm:gap-4">
        {podiumOrder.map((team, displayIndex) => {
          const position = rankings.findIndex((r) => r.teamId === team.teamId);
          const cfg = positionConfig[position] ?? positionConfig[2];
          const Icon = cfg.icon;
          const color = teamById(team.teamId)?.color ?? '#888888';
          return (
            <motion.div
              key={team.teamId}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: displayIndex * 0.15, duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className={cn('mb-2 rounded-full p-2.5', position === 0 && 'animate-pulse bg-warning/20')}>
                <Icon className={cn('h-7 w-7', cfg.color)} />
              </div>
              <TeamBadge teamId={team.teamId} size="sm" />
              <div className={cn('mt-2 text-2xl font-bold tabular-nums sm:text-3xl', position === 0 && 'text-warning')}>{team.total}</div>
              <span className="text-xs text-muted-foreground">{unit}</span>
              <div
                className={cn('mt-3 flex w-20 items-end justify-center rounded-t-lg sm:w-24', podiumHeights[displayIndex])}
                style={{ backgroundColor: `${color}33` }}
              >
                <span className="mb-2 text-3xl font-bold text-foreground/20">{position + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2">
        {rankings.map((team, index) => (
          <div
            key={team.teamId}
            className={cn('rounded-xl border p-3', index === 0 ? 'border-warning/50 bg-warning/5' : 'border-border/50 bg-muted/20')}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground">#{index + 1}</span>
                <TeamBadge teamId={team.teamId} size="sm" full />
              </div>
              <span className="text-lg font-bold tabular-nums">
                {team.total} {unit}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {kpis.map((k) => (
                <div key={k.key} className="rounded-lg bg-background/60 p-1.5 text-center">
                  <div className="truncate text-[10px] uppercase text-muted-foreground">{kpiLabel(k.key)}</div>
                  <div className="font-semibold tabular-nums">{team.kpis[k.key as KpiKey]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
