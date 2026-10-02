import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subDays } from 'date-fns';
import { ChevronDown, Gauge, Medal, Trophy, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Loading, PageHeader, PeriodNav, PersonAvatar, PillarBars, RankMedal, scoreColor } from '@/components/common';
import { TeamBadge } from '@/components/TeamBadge';
import { RankingPodium } from '@/components/RankingPodium';
import { StatsOverview } from '@/components/StatsOverview';
import { GoalsProgress } from '@/components/GoalsProgress';
import { GincanaCalendar } from '@/components/GincanaCalendar';
import { EntryDialog } from '@/components/hoje/EntryDialog';
import { LevelBadge } from '@/components/LevelBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useEffectiveGoals, useMyEntries } from '@/hooks/data/useEntries';
import { useEngagement, useKpiRanking, usePointsRanking, useTeamKpis } from '@/hooks/data/useRankings';
import { getLevelByNumber } from '@/lib/levels';
import { periodLabel, periodRange, shiftPeriod, toISODate, type Period } from '@/lib/period';
import { teamEngagementFrom, teamRankingsFrom } from '@/lib/rankings';
import { cn } from '@/lib/utils';
import type { EntryStatus, KpiKey } from '@/types/db';

export default function Gincana() {
  const { user, isAdmin } = useAuth();
  const { teams, settings, kpis, kpiLabel, weekStartsOn } = useAppConfig();
  const [period, setPeriod] = useState<Period>('week');
  const [ref, setRef] = useState(new Date());
  const [tab, setTab] = useState('engajamento');
  const [entryDate, setEntryDate] = useState<string | null>(null);

  const range = periodRange(period, ref, weekStartsOn);
  const dayRange = periodRange('day', ref, weekStartsOn);
  const weekRange = periodRange('week', ref, weekStartsOn);

  const engagement = useEngagement(range.startStr, range.endStr);
  const teamKpis = useTeamKpis(range.startStr, range.endStr);
  const dayKpis = useTeamKpis(dayRange.startStr, dayRange.endStr);
  const weekKpis = useTeamKpis(weekRange.startStr, weekRange.endStr);
  const kpiRanking = useKpiRanking(range.startStr, range.endStr);
  const pointsRanking = usePointsRanking(range.startStr, range.endStr);
  const { byDate } = useMyEntries();
  const goals = useEffectiveGoals(user?.id);

  const engagementRows = useMemo(() => (engagement.data ?? []).filter((r) => r.indice != null), [engagement.data]);
  const teamEng = useMemo(() => teamEngagementFrom(engagement.data ?? [], teams), [engagement.data, teams]);
  const teamRank = useMemo(() => teamRankingsFrom(teamKpis.data ?? [], teams), [teamKpis.data, teams]);
  const dayRank = useMemo(() => teamRankingsFrom(dayKpis.data ?? [], teams), [dayKpis.data, teams]);
  const weekRank = useMemo(() => teamRankingsFrom(weekKpis.data ?? [], teams), [weekKpis.data, teams]);

  const windowDays = settings?.entry_window_days ?? 1;
  const minOpen = toISODate(subDays(new Date(), windowDays));
  const todayStr = toISODate(new Date());

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Gincana" icon={<Trophy className="h-6 w-6 text-warning" />} subtitle="Rankings contam só lançamentos aprovados pela liderança" />

      <PeriodNav
        period={period}
        onPeriod={setPeriod}
        label={periodLabel(period, range)}
        onPrev={() => setRef(shiftPeriod(period, ref, -1))}
        onNext={() => setRef(shiftPeriod(period, ref, 1))}
        onToday={() => setRef(new Date())}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="engajamento"><Gauge className="mr-1.5 h-4 w-4" />Engajamento</TabsTrigger>
            <TabsTrigger value="equipes"><Trophy className="mr-1.5 h-4 w-4" />Equipes</TabsTrigger>
            <TabsTrigger value="individual"><Users className="mr-1.5 h-4 w-4" />KPIs individuais</TabsTrigger>
            <TabsTrigger value="pontos"><Medal className="mr-1.5 h-4 w-4" />Pontos</TabsTrigger>
            <TabsTrigger value="calendario">Meu calendário</TabsTrigger>
          </TabsList>
        </div>

        {/* ENGAJAMENTO */}
        <TabsContent value="engajamento" className="space-y-4">
          {engagement.isLoading ? (
            <Loading />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {teamEng.map((t, i) => (
                  <Card key={t.team.id} className={cn(i === 0 && t.indice != null && 'border-warning/50')}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <TeamBadge teamId={t.team.id} full />
                        <p className="text-xs text-muted-foreground">
                          {t.members.filter((m) => m.indice != null).length} de {t.members.length} pessoas com dias trabalhados
                        </p>
                      </div>
                      <span className={cn('text-3xl font-bold tabular-nums', scoreColor(t.indice))}>
                        {t.indice == null ? '—' : Math.round(t.indice)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ranking de engajamento</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Execução {settings?.weight_execucao}% · Compromissos {settings?.weight_compromissos}% · Campanhas {settings?.weight_campanhas}% ·
                    Constância {settings?.weight_constancia}% · Desenvolvimento {settings?.weight_desenvolvimento}% · Reconhecimento{' '}
                    {settings?.weight_reconhecimento}%. Toque numa pessoa para ver os pilares.
                  </p>
                </CardHeader>
                <CardContent className="space-y-1">
                  {engagementRows.length === 0 ? (
                    <EmptyState title="Sem dados no período">O índice aparece para quem teve dias de trabalho no período.</EmptyState>
                  ) : (
                    engagementRows.map((r, i) => (
                      <Collapsible key={r.user_id}>
                        <CollapsibleTrigger
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/60',
                            r.user_id === user?.id && 'bg-primary/5 ring-1 ring-primary/30',
                          )}
                        >
                          <RankMedal rank={i + 1} />
                          <PersonAvatar name={r.full_name} url={r.avatar_url} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{r.full_name}</p>
                            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                              <TeamBadge teamId={r.team_id} size="sm" showName={false} />
                              <span className="whitespace-nowrap">
                                {r.dias_trabalhados} {r.dias_trabalhados === 1 ? 'dia' : 'dias'}
                                {!r.escala_cadastrada && ' · sem escala'}
                              </span>
                              {!!r.pendentes && <span className="whitespace-nowrap text-amber-600">· {r.pendentes} aguardando</span>}
                            </div>
                          </div>
                          <span className={cn('text-xl font-bold tabular-nums', scoreColor(r.indice))}>{Math.round(Number(r.indice))}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-2 pb-3 pt-1">
                          <PillarBars row={r} settings={settings} />
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                  {(engagement.data ?? []).some((r) => r.indice == null) && (
                    <p className="pt-2 text-xs text-muted-foreground">
                      Sem índice no período (folga/férias):{' '}
                      {(engagement.data ?? []).filter((r) => r.indice == null).map((r) => r.full_name).join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* EQUIPES (KPIs) */}
        <TabsContent value="equipes" className="space-y-4">
          <GoalsProgress dailyRanking={dayRank} weeklyRanking={weekRank} isAdmin={isAdmin} />
          <StatsOverview rankings={teamRank} />
          <RankingPodium rankings={teamRank} title="Placar das equipes (KPIs)" subtitle={periodLabel(period, range)} unit="" />
        </TabsContent>

        {/* INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-3">
          {kpiRanking.isLoading ? (
            <Loading />
          ) : (kpiRanking.data ?? []).length === 0 ? (
            <EmptyState title="Nenhum lançamento aprovado no período" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {teams.map((t) => {
                const members = (kpiRanking.data ?? []).filter((r) => r.team_id === t.id);
                const total = members.reduce((s, m) => s + m.total, 0);
                return (
                  <Card key={t.id} className="border-l-4" style={{ borderLeftColor: t.color }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <TeamBadge teamId={t.id} full />
                      <span className="text-xl font-bold tabular-nums">{total}</span>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {members.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">Sem lançamentos aprovados</p>}
                      {members.map((m, i) => (
                        <div key={m.user_id} className={cn('flex items-center gap-2 rounded-lg p-1.5', m.user_id === user?.id && 'bg-primary/5')}>
                          <RankMedal rank={i + 1} />
                          <PersonAvatar name={m.full_name} url={m.avatar_url} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.full_name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {kpis.map((k) => `${kpiLabel(k.key)} ${m[k.key as KpiKey]}`).join(' · ')}
                            </p>
                          </div>
                          <span className="font-bold tabular-nums">{m.total}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PONTOS (livro de pontos: KPIs + conquistas + quizzes + campanhas + tarefas + reconhecimentos) */}
        <TabsContent value="pontos" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pontos ganhos no período</CardTitle>
              <p className="text-xs text-muted-foreground">
                Soma de tudo: KPIs aprovados, conquistas, quizzes, campanhas, tarefas e reconhecimentos. Cada ponto tem origem no{' '}
                <Link to="/profile" className="underline">extrato</Link>.
              </p>
            </CardHeader>
            <CardContent className="space-y-1">
              {pointsRanking.isLoading ? (
                <Loading />
              ) : (
                (pointsRanking.data ?? [])
                  .filter((r) => r.points !== 0)
                  .map((r, i) => (
                    <Link
                      to={`/profile/${r.user_id}`}
                      key={r.user_id}
                      className={cn('flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60', r.user_id === user?.id && 'bg-primary/5')}
                    >
                      <RankMedal rank={i + 1} />
                      <PersonAvatar name={r.full_name} url={r.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.full_name}</p>
                        <div className="flex items-center gap-1.5">
                          <LevelBadge level={getLevelByNumber(r.level_number)} size="sm" showName />
                          <span className="text-[11px] text-muted-foreground">
                            {r.achievements} conquistas{r.trophies ? ` · ${r.trophies} 🏆` : ''}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="tabular-nums">{r.points} pts</Badge>
                    </Link>
                  ))
              )}
              {!pointsRanking.isLoading && !(pointsRanking.data ?? []).some((r) => r.points !== 0) && (
                <EmptyState title="Ninguém pontuou neste período ainda" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEU CALENDÁRIO */}
        <TabsContent value="calendario">
          <div className="mx-auto max-w-lg">
            <GincanaCalendar
              weekStartsOn={weekStartsOn}
              statusFor={(d) => (byDate(d)?.status as EntryStatus) ?? null}
              canOpen={(d) => d >= minOpen && d <= todayStr}
              onDayClick={setEntryDate}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Você pode lançar até {windowDays} dia(s) para trás. Dias mais antigos: peça ao seu líder.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {entryDate && (
        <EntryDialog open onOpenChange={(o) => !o && setEntryDate(null)} date={entryDate} entry={byDate(entryDate)} goals={goals} />
      )}
    </div>
  );
}
