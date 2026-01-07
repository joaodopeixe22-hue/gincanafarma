import { TeamRanking, KPI_LABELS, KPIS } from '@/types/gincana';
import { TeamBadge } from './TeamBadge';
import { Trophy, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RankingPodiumProps {
  rankings: TeamRanking[];
  title: string;
  subtitle: string;
}

const positionConfig = {
  0: { icon: Trophy, label: '1º Lugar', color: 'text-warning', bgGlow: 'shadow-glow-warning' },
  1: { icon: Medal, label: '2º Lugar', color: 'text-muted-foreground', bgGlow: '' },
  2: { icon: Award, label: '3º Lugar', color: 'text-amber-700', bgGlow: '' },
};

export function RankingPodium({ rankings, title, subtitle }: RankingPodiumProps) {
  if (rankings.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-border/50 text-center">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = rankings.length >= 3 
    ? [rankings[1], rankings[0], rankings[2]]
    : rankings;

  const podiumHeights = ['h-32', 'h-44', 'h-24'];
  const podiumDelays = [0.2, 0, 0.4];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-glow">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-8">
        {podiumOrder.map((team, displayIndex) => {
          const actualPosition = rankings.findIndex(r => r.teamId === team.teamId);
          const config = positionConfig[actualPosition as 0 | 1 | 2];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={team.teamId}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: podiumDelays[displayIndex], duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className={cn(
                'mb-2 p-3 rounded-full',
                actualPosition === 0 && 'bg-warning/20 animate-pulse'
              )}>
                <Icon className={cn('w-8 h-8', config.color)} />
              </div>
              
              <TeamBadge teamId={team.teamId} size="md" />
              
              <div className={cn(
                'mt-3 text-3xl font-bold',
                actualPosition === 0 && 'text-warning'
              )}>
                {team.total}
              </div>
              <span className="text-xs text-muted-foreground">pontos</span>
              
              <div className={cn(
                'mt-4 w-24 rounded-t-lg flex items-end justify-center',
                podiumHeights[displayIndex],
                `bg-team-${team.teamId}/20`,
                actualPosition === 0 && config.bgGlow
              )}>
                <span className="text-4xl font-bold text-foreground/20 mb-2">
                  {actualPosition + 1}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Stats */}
      <div className="space-y-3">
        {rankings.map((team, index) => {
          const config = positionConfig[index as 0 | 1 | 2];
          
          return (
            <motion.div
              key={team.teamId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className={cn(
                'p-4 rounded-xl border transition-all',
                index === 0 && 'border-warning/50 bg-warning/5',
                index !== 0 && 'border-border/50 bg-muted/20'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={cn('text-lg font-bold', config.color)}>
                    #{index + 1}
                  </span>
                  <TeamBadge teamId={team.teamId} size="sm" />
                </div>
                <span className="text-xl font-bold">{team.total} pts</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {KPIS.map(kpi => (
                  <div key={kpi} className="text-center p-2 rounded-lg bg-background/50">
                    <div className="text-xs text-muted-foreground uppercase">{KPI_LABELS[kpi]}</div>
                    <div className="text-lg font-semibold">{team.kpis[kpi]}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
