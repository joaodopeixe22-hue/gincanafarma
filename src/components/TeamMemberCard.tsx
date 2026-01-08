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

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
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

          {/* KPIs */}
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

          {/* Goals Progress */}
          {hasGoals && dailyTotals && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Metas Diárias:</span>
                <span className="font-medium">{goalProgress.achieved}/{goalProgress.total}</span>
              </div>
              <Progress value={goalProgress.percentage} className="h-2" />
              <div className="flex flex-wrap gap-1">
                {(['ofex', 'apoio', 'soria', 'cadastro'] as const).map((kpi) => {
                  if (!goals || goals.daily[kpi] === 0) return null;
                  const achieved = dailyTotals[kpi] >= goals.daily[kpi];
                  return (
                    <Badge
                      key={kpi}
                      variant={achieved ? 'default' : 'secondary'}
                      className={`text-xs ${achieved ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    >
                      {achieved ? <Check className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {kpiLabels[kpi]}
                    </Badge>
                  );
                })}
              </div>
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
