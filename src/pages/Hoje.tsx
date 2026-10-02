import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardEdit,
  Flame,
  Gauge,
  ListChecks,
  Star,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PillarBars, ScoreRing, StatusBadge } from '@/components/common';
import { EntryDialog } from '@/components/hoje/EntryDialog';
import { ChallengeCard } from '@/components/hoje/ChallengeCard';
import { LevelBadge } from '@/components/LevelBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { useEffectiveGoals, useMyEntries, usePendingCount } from '@/hooks/data/useEntries';
import { useEngagement, useLevelAndStreak } from '@/hooks/data/useRankings';
import { useShifts, SHIFT_KINDS, hhmm, type ShiftKind } from '@/hooks/data/useShifts';
import { useTasks, useTaskActions } from '@/hooks/data/useTasks';
import { useChallenges } from '@/hooks/data/useChallenges';
import { useMyQuizzes } from '@/hooks/data/useQuizPlay';
import { useToast } from '@/hooks/use-toast';
import { errorMessage, firstName } from '@/lib/errors';
import { getLevelByPoints } from '@/lib/levels';
import { periodRange, toISODate } from '@/lib/period';
import { cn } from '@/lib/utils';
import type { KpiKey } from '@/types/db';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Hoje() {
  const { user, isLider } = useAuth();
  const { me, canManage } = useDirectory();
  const { settings, kpis, kpiLabel, weekStartsOn } = useAppConfig();
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const todayStr = toISODate(today);
  const week = periodRange('week', today, weekStartsOn);

  const { byDate } = useMyEntries();
  const goals = useEffectiveGoals(user?.id);
  const engagement = useEngagement(week.startStr, week.endStr);
  const levelQ = useLevelAndStreak(user?.id);
  const shiftsQ = useShifts(todayStr, todayStr);
  const tasksQ = useTasks(todayStr, todayStr);
  const challengesQ = useChallenges();
  const quizzesQ = useMyQuizzes();
  const pendingQ = usePendingCount(isLider);
  const { complete, reopen } = useTaskActions();

  const [entryDate, setEntryDate] = useState<string | null>(null);

  const myShift = shiftsQ.data?.find((s) => s.user_id === user?.id);
  const todayEntry = byDate(todayStr);
  const windowDays = settings?.entry_window_days ?? 1;
  const missingPast = useMemo(() => {
    const out: string[] = [];
    for (let i = 1; i <= windowDays; i++) {
      const d = toISODate(subDays(today, i));
      if (!byDate(d)) out.push(d);
    }
    return out;
  }, [windowDays, byDate, today]);
  const rejected = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= windowDays; i++) {
      const d = toISODate(subDays(today, i));
      if (byDate(d)?.status === 'rejected') out.push(d);
    }
    return out;
  }, [windowDays, byDate, today]);

  const ranking = useMemo(() => (engagement.data ?? []).filter((r) => r.indice != null), [engagement.data]);
  const myRow = engagement.data?.find((r) => r.user_id === user?.id) ?? null;
  const myRank = ranking.findIndex((r) => r.user_id === user?.id) + 1;

  const myTasks = (tasksQ.data ?? []).filter((t) => t.assigned_to === user?.id);
  const activeChallenges = (challengesQ.data ?? []).filter(
    (c) => c.is_active && new Date(c.end_time) > new Date() && (!c.team_id || c.team_id === me?.team_id),
  );
  const openQuizzes = (quizzesQ.data ?? []).filter((q) => !q.passed);
  const pendingToReview = (pendingQ.data ?? []).filter((p) => canManage(p.user_id)).length;
  const points = levelQ.data?.totalPoints ?? 0;
  const level = getLevelByPoints(points);
  const isPlayer = me?.role === 'member' || me?.role === 'lider';

  const toggleTask = async (id: string, done: boolean) => {
    try {
      if (done) await reopen.mutateAsync(id);
      else await complete.mutateAsync({ id });
      if (!done) toast({ title: 'Tarefa concluída ✅' });
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const shiftKind = myShift?.kind as ShiftKind | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName(me?.full_name)}!
        </h1>
        <p className="text-sm first-letter:uppercase text-muted-foreground">{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      {isLider && pendingToReview > 0 && (
        <Link
          to="/lideranca"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <ClipboardEdit className="h-4 w-4 text-amber-600" />
            {pendingToReview} lançamento{pendingToReview > 1 ? 's' : ''} aguardando sua aprovação
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {rejected.length > 0 && (
        <button
          type="button"
          onClick={() => setEntryDate(rejected[0])}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-left text-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Seu lançamento de {format(new Date(rejected[0] + 'T12:00'), 'dd/MM')} foi recusado. Toque para ver o motivo e corrigir.
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Turno */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Meu turno hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myShift ? (
              <div>
                <p className="text-2xl font-bold">
                  {SHIFT_KINDS[shiftKind!]?.needsHours ? `${hhmm(myShift.start_time)} – ${hhmm(myShift.end_time)}` : SHIFT_KINDS[shiftKind!]?.label}
                </p>
                {shiftKind === 'treinamento' && <p className="text-sm text-muted-foreground">Treinamento</p>}
                {myShift.note && <p className="text-sm text-muted-foreground">{myShift.note}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escala de hoje não cadastrada.</p>
            )}
            <Button asChild variant="link" className="h-auto px-0 text-xs">
              <Link to="/escala">Ver escala da semana</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Nível e sequência */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-warning" /> Meus pontos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">{points.toLocaleString('pt-BR')}</p>
              <LevelBadge level={level} size="sm" />
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-2xl font-bold text-orange-500">
                <Flame className="h-6 w-6" />
                {levelQ.data?.currentStreak ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground">dias seguidos</p>
            </div>
          </CardContent>
        </Card>

        {/* Índice resumido */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-primary" /> Engajamento da semana
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ScoreRing value={myRow?.indice} size={84} />
            <div className="text-sm">
              {!isPlayer ? (
                <p className="text-muted-foreground">Administradores não entram no ranking.</p>
              ) : myRow?.indice == null ? (
                <p className="text-muted-foreground">Sem dias trabalhados nesta semana ainda.</p>
              ) : (
                <>
                  <p className="font-semibold">
                    {myRank}º de {ranking.length}
                  </p>
                  <p className="text-xs text-muted-foreground">na loja</p>
                </>
              )}
              {!!myRow?.pendentes && (
                <p className="mt-1 text-xs text-amber-600">{myRow.pendentes} dia(s) aguardando aprovação</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lançamento do dia */}
      {isPlayer && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardEdit className="h-4 w-4 text-primary" /> Meu lançamento de hoje
            </CardTitle>
            {todayEntry && <StatusBadge status={todayEntry.status} />}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((k) => {
                const key = k.key as KpiKey;
                const v = todayEntry ? todayEntry[key] : 0;
                const g = goals[key];
                return (
                  <div key={k.key} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold uppercase text-muted-foreground">{kpiLabel(k.key)}</span>
                      <span className="tabular-nums">
                        <strong>{v}</strong>
                        {g ? <span className="text-muted-foreground"> / {g}</span> : null}
                      </span>
                    </div>
                    <Progress value={g ? Math.min(100, (100 * v) / g) : 0} className="h-2" />
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setEntryDate(todayStr)}>
                {todayEntry ? (todayEntry.status === 'approved' ? 'Ver lançamento' : 'Corrigir lançamento') : 'Lançar meu dia'}
              </Button>
              {missingPast.map((d) => (
                <Button key={d} variant="outline" onClick={() => setEntryDate(d)}>
                  Lançar {format(new Date(d + 'T12:00'), "EEE dd/MM", { locale: ptBR })}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tarefas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" /> Minhas tarefas de hoje
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/agenda">Agenda</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma tarefa para hoje.</p>
            ) : (
              <ul className="space-y-1">
                {myTasks.map((t) => {
                  const done = t.status === 'concluida';
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id, done)}
                        className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-muted/60"
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-sm font-medium', done && 'text-muted-foreground line-through')}>{t.title}</span>
                          {t.status === 'recusada' && <span className="block text-xs text-red-600">Devolvida: {t.review_note}</span>}
                          {t.due_time && <span className="block text-xs text-muted-foreground">até {hhmm(t.due_time)}</span>}
                        </span>
                        <Badge variant="secondary" className="shrink-0">+{t.points}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Índice detalhado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-primary" /> O que compõe meu índice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PillarBars row={myRow} settings={settings} compact />
            {myRow && !myRow.escala_cadastrada && (
              <p className="mt-3 text-xs text-muted-foreground">
                Sua escala desta semana não está cadastrada: o índice usa só os dias em que você lançou.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🚩 Campanhas ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeChallenges.length === 0 ? (
              <EmptyState title="Nenhuma campanha ativa">Quando a liderança lançar uma campanha, ela aparece aqui.</EmptyState>
            ) : (
              activeChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" /> Quizzes para fazer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openQuizzes.length === 0 ? (
              <EmptyState title="Tudo em dia 🎓">Você já passou em todos os quizzes disponíveis.</EmptyState>
            ) : (
              openQuizzes.map((q) => (
                <Link key={q.id} to={`/quiz/${q.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{q.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.question_count} perguntas · {q.attempts ? `melhor nota ${q.best_score}%` : 'ainda não tentou'}
                    </p>
                  </div>
                  <Badge>+{q.bonus_points} pts</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {entryDate && (
        <EntryDialog
          open={!!entryDate}
          onOpenChange={(o) => !o && setEntryDate(null)}
          date={entryDate}
          entry={byDate(entryDate)}
          goals={goals}
        />
      )}
    </div>
  );
}
