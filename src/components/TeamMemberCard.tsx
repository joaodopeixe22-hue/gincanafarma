import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Eye, Trophy, Target, Check, Clock } from 'lucide-react';
import { MemberGoalsEditor } from '@/components/MemberGoalsEditor';

interface MemberTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

interface MemberGoals {
  daily: MemberTotals;
  weekly: MemberTotals;
}

interface TeamMemberCardProps {
  id: string;
  full_name: string | null;
  matricula: string | null;
  avatar_url: string | null;
  totals: MemberTotals;
  rank: number;
  goals?: MemberGoals;
  dailyTotals?: MemberTotals;
  showGoalsButton?: boolean;
}

const kpiLabels: Record<string, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
};

export function TeamMemberCard({
  id,
  full_name,
  matricula,
  avatar_url,
  totals,
  rank,
  goals,
  dailyTotals,
  showGoalsButton = false,
}: TeamMemberCardProps) {
  const [goalsEditorOpen, setGoalsEditorOpen] = useState(false);

  const initials = full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-white';
    if (rank === 2) return 'bg-slate-400 text-white';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-muted text-muted-foreground';
  };

  // Calcular progresso individual de cada KPI
  const calculateKpiProgress = (kpi: keyof MemberTotals) => {
    if (!goals || !dailyTotals || goals.daily[kpi] === 0) {
      return { progress: 0, achieved: false, current: 0, target: 0 };
    }
    const current = dailyTotals[kpi];
    const target = goals.daily[kpi];
    const progress = Math.min(100, Math.round((current / target) * 100));
    return { progress, achieved: current >= target, current, target };
  };

  // Cores baseadas no progresso
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-blue-500';
    return 'bg-red-400';
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-100';
    if (progress >= 70) return 'bg-yellow-100';
    if (progress >= 40) return 'bg-blue-100';
    return 'bg-red-100';
  };

  // Calcular progresso das metas diárias
  const hasGoals = goals && (
    goals.daily.ofex > 0 || goals.daily.apoio > 0 || 
    goals.daily.soria > 0 || goals.daily.cadastro > 0
  );

  const calculateGoalProgress = () => {
    if (!goals || !dailyTotals) return { achieved: 0, total: 0, percentage: 0 };
    
    const kpis = ['ofex', 'apoio', 'soria', 'cadastro'] as const;
    let achieved = 0;
    let totalGoals = 0;

    kpis.forEach((kpi) => {
      if (goals.daily[kpi] > 0) {
        totalGoals++;
        if (dailyTotals[kpi] >= goals.daily[kpi]) {
          achieved++;
        }
      }
    });

    return {
      achieved,
      total: totalGoals,
      percentage: totalGoals > 0 ? Math.round((achieved / totalGoals) * 100) : 0,
    };
  };

  const goalProgress = calculateGoalProgress();

  // Status geral para indicador visual
  const getOverallStatusColor = () => {
    if (goalProgress.total === 0) return '';
    if (goalProgress.percentage >= 100) return 'ring-2 ring-green-500';
    if (goalProgress.percentage >= 50) return 'ring-2 ring-yellow-500';
    return 'ring-2 ring-red-400';
  };

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${hasGoals ? getOverallStatusColor() : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Rank Badge */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(rank)}`}>
              {rank <= 3 ? <Trophy className="w-4 h-4" /> : rank}
            </div>

            {/* Avatar */}
            <Avatar className="w-12 h-12">
              <AvatarImage src={avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{full_name || 'Sem nome'}</p>
              {matricula && (
                <p className="text-xs text-muted-foreground">Mat: {matricula}</p>
              )}
            </div>

            {/* Score */}
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{totals.total}</p>
              <p className="text-xs text-muted-foreground">pontos</p>
            </div>
          </div>

          {/* KPIs com barras de progresso individuais */}
          {hasGoals && dailyTotals ? (
            <div className="mt-3 pt-3 border-t space-y-3">
              {/* Header com status geral */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Metas Diárias</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    goalProgress.percentage >= 100 ? 'border-green-500 text-green-600' :
                    goalProgress.percentage >= 50 ? 'border-yellow-500 text-yellow-600' :
                    'border-red-400 text-red-500'
                  }`}
                >
                  {goalProgress.achieved}/{goalProgress.total} atingidas
                </Badge>
              </div>

              {/* Barras de progresso individuais por KPI */}
              <div className="grid grid-cols-2 gap-2">
                {(['ofex', 'apoio', 'soria', 'cadastro'] as const).map((kpi) => {
                  const kpiProgress = calculateKpiProgress(kpi);
                  if (kpiProgress.target === 0) return null;
                  
                  return (
                    <div key={kpi} className={`p-2 rounded-lg ${getProgressBgColor(kpiProgress.progress)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{kpiLabels[kpi]}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold">
                            {kpiProgress.current}/{kpiProgress.target}
                          </span>
                          {kpiProgress.achieved && (
                            <Check className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${getProgressColor(kpiProgress.progress)}`}
                          style={{ width: `${kpiProgress.progress}%` }}
                        />
                      </div>
                      <div className="text-right mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{kpiProgress.progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de progresso geral */}
              <div className="pt-2 border-t border-dashed">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progresso Geral</span>
                  <span className="text-xs font-semibold">{goalProgress.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(goalProgress.percentage)}`}
                    style={{ width: `${goalProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* KPIs simples quando não há metas */
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              <Badge variant="secondary" className="text-xs">
                OFEX: {totals.ofex}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Apoio: {totals.apoio}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Sorria: {totals.soria}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Cadastro: {totals.cadastro}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to={`/profile/${id}`}>
                <Eye className="w-4 h-4 mr-1" />
                Ver Perfil
              </Link>
            </Button>
            {showGoalsButton && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setGoalsEditorOpen(true)}
              >
                <Target className="w-4 h-4 mr-1" />
                Metas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showGoalsButton && (
        <MemberGoalsEditor
          open={goalsEditorOpen}
          onOpenChange={setGoalsEditorOpen}
          userId={id}
          userName={full_name || 'Membro'}
        />
      )}
    </>
  );
}
