import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gauge, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamBadge } from '@/components/TeamBadge';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import type { WeeklyReportData } from '@/hooks/useWeeklyReport';
import { fromISODate } from '@/lib/period';
import type { KpiKey } from '@/types/db';

const medal = (i: number) =>
  i === 0 ? 'bg-amber-500 text-amber-950' : i === 1 ? 'bg-gray-400 text-gray-950' : i === 2 ? 'bg-amber-700 text-amber-50' : 'bg-muted text-muted-foreground';

export const ReportDashboard = forwardRef<HTMLDivElement, { data: WeeklyReportData }>(({ data }, ref) => {
  const { teams, kpis, kpiLabel, storeName } = useAppConfig();
  const { weekLabel, teamRankings, teamEngagement, memberPerformance, engagement, totals, dailyData } = data;
  const chartData = dailyData.map((d) => ({
    ...d,
    label: format(fromISODate(String(d.date)), 'EEE', { locale: ptBR }),
    fullDate: format(fromISODate(String(d.date)), 'dd/MM'),
  }));

  return (
    <div ref={ref} className="space-y-6 rounded-2xl border border-border bg-background p-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold">Relatório Semanal</h2>
        <p className="text-lg text-muted-foreground">{weekLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[{ label: 'Total', value: totals.total }, ...kpis.map((k) => ({ label: kpiLabel(k.key), value: totals[k.key as KpiKey] }))].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5 text-primary" />Engajamento por equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamEngagement.map((t, i) => (
              <div key={t.team.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${medal(i)}`}>{i + 1}º</span>
                <TeamBadge teamId={t.team.id} />
                <span className="ml-auto text-lg font-bold">{t.indice == null ? '—' : Math.round(t.indice)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-primary" />KPIs por equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamRankings.map((t, i) => (
              <div key={t.teamId} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${medal(i)}`}>{i + 1}º</span>
                <TeamBadge teamId={t.teamId} />
                <span className="ml-auto text-lg font-bold">{t.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" />Evolução diária (aprovado)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  labelFormatter={(_, p) => p[0]?.payload?.fullDate || ''}
                />
                {teams.map((t) => (
                  <Area key={t.id} type="monotone" dataKey={t.id} name={t.short_name} stroke={t.color} fill={t.color} fillOpacity={0.25} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Gauge className="h-5 w-5 text-primary" />Top 5 engajamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {engagement.slice(0, 5).map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${medal(i)}`}>{i + 1}</span>
                <span className="flex-1 truncate font-medium">{m.full_name}</span>
                <TeamBadge teamId={m.team_id} size="sm" showName={false} />
                <span className="font-bold">{Math.round(Number(m.indice))}</span>
              </div>
            ))}
            {!engagement.length && <p className="py-4 text-center text-muted-foreground">Nenhum dado</p>}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" />Top 5 KPIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberPerformance.slice(0, 5).map((m, i) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${medal(i)}`}>{i + 1}</span>
                <span className="flex-1 truncate font-medium">{m.full_name}</span>
                <TeamBadge teamId={m.team_id} size="sm" showName={false} />
                <span className="font-bold">{m.total}</span>
              </div>
            ))}
            {!memberPerformance.length && <p className="py-4 text-center text-muted-foreground">Nenhum dado</p>}
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-border/50 pt-4 text-center text-xs text-muted-foreground">
        {storeName} • Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
      </div>
    </div>
  );
});
ReportDashboard.displayName = 'ReportDashboard';
