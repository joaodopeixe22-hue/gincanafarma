import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Check, Clock } from 'lucide-react';

interface MemberGoalsProgressProps {
  goals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  actuals: {
    ofex: number;
    apoio: number;
    soria: number;
    cadastro: number;
    total: number;
  };
  periodType: 'daily' | 'weekly';
  compact?: boolean;
}

const kpiLabels: Record<string, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
  total: 'Total',
};

export function MemberGoalsProgress({
  goals,
  actuals,
  periodType,
  compact = false,
}: MemberGoalsProgressProps) {
  const kpis = ['ofex', 'apoio', 'soria', 'cadastro', 'total'] as const;
  
  const hasGoals = kpis.some((kpi) => goals[kpi] > 0);
  
  if (!hasGoals) {
    return null;
  }

  const calculateProgress = (actual: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min(100, Math.round((actual / goal) * 100));
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const totalGoalKpis = kpis.filter((kpi) => goals[kpi] > 0).length;
  const achievedGoals = kpis.filter((kpi) => goals[kpi] > 0 && actuals[kpi] >= goals[kpi]).length;
  const overallProgress = totalGoalKpis > 0 ? Math.round((achievedGoals / totalGoalKpis) * 100) : 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Metas {periodType === 'daily' ? 'Diárias' : 'Semanais'}:
          </span>
          <span className="font-medium">{achievedGoals}/{totalGoalKpis}</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="flex flex-wrap gap-1">
          {kpis.map((kpi) => {
            if (goals[kpi] === 0) return null;
            const achieved = actuals[kpi] >= goals[kpi];
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
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Metas {periodType === 'daily' ? 'Diárias' : 'Semanais'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kpis.map((kpi) => {
          if (goals[kpi] === 0) return null;
          const actual = actuals[kpi];
          const goal = goals[kpi];
          const progress = calculateProgress(actual, goal);
          const achieved = actual >= goal;

          return (
            <div key={kpi} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  {achieved && <Check className="w-3 h-3 text-green-500" />}
                  {kpiLabels[kpi]}
                </span>
                <span className="text-muted-foreground">
                  {actual}/{goal} ({progress}%)
                </span>
              </div>
              <div className="relative">
                <Progress value={progress} className="h-2" />
                <div
                  className={`absolute inset-0 h-2 rounded-full ${getProgressColor(progress)} opacity-80`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
