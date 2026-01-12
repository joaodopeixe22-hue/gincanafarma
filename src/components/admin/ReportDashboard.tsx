import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Target, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamBadge } from '@/components/TeamBadge';
import { WeeklyReportData } from '@/hooks/useWeeklyReport';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { KPI_LABELS } from '@/types/gincana';

interface ReportDashboardProps {
  data: WeeklyReportData;
}

const TEAM_COLORS = {
  dna: 'hsl(var(--chart-1))',
  elite: 'hsl(var(--chart-2))',
  alcateia: 'hsl(var(--chart-3))',
};

const TEAM_NAMES = {
  dna: 'DNA',
  elite: 'Elite',
  alcateia: 'Alcateia',
};

export const ReportDashboard = forwardRef<HTMLDivElement, ReportDashboardProps>(
  ({ data }, ref) => {
    const { weekLabel, teamRankings, memberPerformance, totals, dailyData } = data;

    // Prepare chart data
    const chartData = dailyData.map(day => ({
      date: format(new Date(day.date), 'EEE', { locale: ptBR }),
      fullDate: format(new Date(day.date), 'dd/MM'),
      dna: day.dna.ofex + day.dna.apoio + day.dna.soria + day.dna.cadastro,
      elite: day.elite.ofex + day.elite.apoio + day.elite.soria + day.elite.cadastro,
      alcateia: day.alcateia.ofex + day.alcateia.apoio + day.alcateia.soria + day.alcateia.cadastro,
    }));

    const top5Members = memberPerformance.slice(0, 5);

    return (
      <div
        ref={ref}
        className="p-6 space-y-6 bg-background rounded-2xl border border-border"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Relatório Semanal</h2>
          <p className="text-lg text-muted-foreground">{weekLabel}</p>
        </div>

        {/* Total Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: totals.total, icon: Trophy, color: 'bg-primary/10 text-primary' },
            { label: KPI_LABELS.ofex, value: totals.ofex, icon: Target, color: 'bg-blue-500/10 text-blue-500' },
            { label: KPI_LABELS.apoio, value: totals.apoio, icon: Target, color: 'bg-green-500/10 text-green-500' },
            { label: KPI_LABELS.soria, value: totals.soria, icon: Target, color: 'bg-amber-500/10 text-amber-500' },
            { label: KPI_LABELS.cadastro, value: totals.cadastro, icon: Target, color: 'bg-rose-500/10 text-rose-500' },
          ].map(stat => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className={`mx-auto w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Rankings */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-primary" />
              Ranking das Equipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamRankings.map((team, index) => (
                <div
                  key={team.team}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-amber-500 text-amber-950' : 
                      index === 1 ? 'bg-gray-400 text-gray-950' : 
                      'bg-amber-700 text-amber-50'}
                  `}>
                    {index + 1}º
                  </div>
                  <TeamBadge teamId={team.team as 'dna' | 'elite' | 'alcateia'} size="md" />
                  <div className="flex-1 text-right">
                    <p className="font-bold text-lg">{team.total} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="dna"
                    name="DNA"
                    stroke={TEAM_COLORS.dna}
                    fill={TEAM_COLORS.dna}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="elite"
                    name="Elite"
                    stroke={TEAM_COLORS.elite}
                    fill={TEAM_COLORS.elite}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="alcateia"
                    name="Alcateia"
                    stroke={TEAM_COLORS.alcateia}
                    fill={TEAM_COLORS.alcateia}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Members */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Top 5 Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top5Members.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-amber-500 text-amber-950' : 
                      index === 1 ? 'bg-gray-400 text-gray-950' : 
                      index === 2 ? 'bg-amber-700 text-amber-50' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {index + 1}
                  </span>
                  <span className="flex-1 font-medium truncate">{member.name}</span>
                  {member.team && <TeamBadge teamId={member.team as 'dna' | 'elite' | 'alcateia'} size="sm" />}
                  <span className="font-bold">{member.total} pts</span>
                </div>
              ))}
              {top5Members.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/50">
          Circuito Farma • Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </div>
      </div>
    );
  }
);

ReportDashboard.displayName = 'ReportDashboard';
