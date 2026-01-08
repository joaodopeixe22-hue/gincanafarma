import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyComparison } from '@/hooks/useTeamReports';

interface TeamReportCardProps {
  teamName: string;
  teamColor: string;
  weeklyComparison: WeeklyComparison | null;
  memberCount: number;
}

export function TeamReportCard({
  teamName,
  teamColor,
  weeklyComparison,
  memberCount,
}: TeamReportCardProps) {
  if (!weeklyComparison) return null;

  const { currentWeek, lastWeek, percentChange } = weeklyComparison;
  const isPositive = percentChange > 0;
  const isNeutral = percentChange === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: teamColor }}
          />
          Resumo Semanal - {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{currentWeek.total}</p>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">{lastWeek.total}</p>
            <p className="text-xs text-muted-foreground">Semana passada</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              {isNeutral ? (
                <Minus className="w-4 h-4 text-muted-foreground" />
              ) : isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-lg font-bold ${
                isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {isPositive ? '+' : ''}{percentChange.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Variação</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{memberCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Membros</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">
              {memberCount > 0 ? Math.round(currentWeek.total / memberCount) : 0}
            </p>
            <p className="text-xs text-muted-foreground">Média/membro</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded bg-blue-500/10">
            <p className="font-semibold">{currentWeek.ofex}</p>
            <p className="text-xs text-muted-foreground">OFEX</p>
          </div>
          <div className="text-center p-2 rounded bg-green-500/10">
            <p className="font-semibold">{currentWeek.apoio}</p>
            <p className="text-xs text-muted-foreground">Apoio</p>
          </div>
          <div className="text-center p-2 rounded bg-yellow-500/10">
            <p className="font-semibold">{currentWeek.soria}</p>
            <p className="text-xs text-muted-foreground">Sorria</p>
          </div>
          <div className="text-center p-2 rounded bg-purple-500/10">
            <p className="font-semibold">{currentWeek.cadastro}</p>
            <p className="text-xs text-muted-foreground">Cadastro</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
