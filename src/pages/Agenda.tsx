import { useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Circle, ListChecks, MoreVertical, Plus, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, Loading, PageHeader, PeriodNav, PersonAvatar } from '@/components/common';
import { NewTaskDialog } from '@/components/agenda/NewTaskDialog';
import { ConfirmDialog, ReasonDialog } from '@/components/common/dialogs';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { TASK_CATEGORIES, useTaskActions, useTasks } from '@/hooks/data/useTasks';
import { hhmm } from '@/hooks/data/useShifts';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { daysOf, periodLabel, periodRange, shiftPeriod, toISODate, todayISO, type Period } from '@/lib/period';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/db';

type Scope = 'minhas' | 'equipe' | 'loja';

function TaskRow({ task, showOwner }: { task: Task; showOwner: boolean }) {
  const { user } = useAuth();
  const { byId, canManage } = useDirectory();
  const { complete, reopen, review, remove } = useTaskActions();
  const { toast } = useToast();
  const mine = task.assigned_to === user?.id;
  const manager = canManage(task.assigned_to) && !mine;
  const done = task.status === 'concluida';
  const late = !done && task.due_date < todayISO();
  const owner = byId(task.assigned_to);
  const [askReason, setAskReason] = useState(false);
  const [askDeleteGroup, setAskDeleteGroup] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast({ title: ok });
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className={cn('flex items-start gap-2 rounded-lg p-2', mine ? 'hover:bg-muted/60' : '')}>
      <button
        type="button"
        disabled={!mine}
        onClick={() => run(() => (done ? reopen.mutateAsync(task.id) : complete.mutateAsync({ id: task.id })), done ? undefined : 'Tarefa concluída ✅')}
        className="mt-0.5 disabled:cursor-default"
        aria-label={done ? 'Desmarcar' : 'Concluir'}
      >
        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className={cn('h-5 w-5', mine ? 'text-muted-foreground' : 'text-muted-foreground/40')} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn('rounded px-1.5 py-0.5', TASK_CATEGORIES[task.category]?.className)}>{TASK_CATEGORIES[task.category]?.label}</span>
          {task.due_time && <span className="text-muted-foreground">até {hhmm(task.due_time)}</span>}
          {late && <span className="font-medium text-red-600">atrasada</span>}
          {task.status === 'recusada' && <span className="font-medium text-red-600">devolvida: {task.review_note}</span>}
          {done && task.reviewed_at && <span className="text-emerald-600">conferida</span>}
          {showOwner && owner && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <PersonAvatar name={owner.full_name} url={owner.avatar_url} size={16} /> {owner.full_name}
            </span>
          )}
        </div>
      </div>
      <Badge variant="secondary" className="shrink-0">+{task.points}</Badge>
      {manager && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {done && (
              <DropdownMenuItem onClick={() => run(() => review.mutateAsync({ id: task.id, decision: 'confirmar' }), 'Conferida')}>
                Marcar como conferida
              </DropdownMenuItem>
            )}
            {done && (
              <DropdownMenuItem onClick={() => setAskReason(true)}>
                <Undo2 className="mr-2 h-4 w-4" /> Devolver (não foi feita)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => run(() => remove.mutateAsync({ id: task.id }), 'Tarefa excluída')}>
              Excluir esta
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setAskDeleteGroup(true)}
            >
              Excluir rotina inteira
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ReasonDialog
        open={askReason}
        onOpenChange={setAskReason}
        title="Devolver tarefa"
        label="Por que está devolvendo? A pessoa verá a mensagem."
        placeholder="Ex.: faltou conferir a gôndola 3"
        confirmLabel="Devolver"
        onConfirm={(note) => run(() => review.mutateAsync({ id: task.id, decision: 'recusar', note }), 'Tarefa devolvida')}
      />
      <ConfirmDialog
        open={askDeleteGroup}
        onOpenChange={setAskDeleteGroup}
        title="Excluir a rotina inteira?"
        description="Todas as tarefas criadas junto com esta serão excluídas, e os pontos já ganhos com elas serão estornados."
        confirmLabel="Excluir rotina"
        destructive
        onConfirm={() => run(() => remove.mutateAsync({ group: task.group_id }), 'Rotina excluída')}
      />
    </div>
  );
}

export default function Agenda() {
  const { user, isLider, isAdmin } = useAuth();
  const { weekStartsOn } = useAppConfig();
  const { canManage } = useDirectory();
  const [period, setPeriod] = useState<Period>('day');
  const [ref, setRef] = useState(new Date());
  const [scope, setScope] = useState<Scope>('minhas');
  const [newOpen, setNewOpen] = useState(false);
  const range = periodRange(period, ref, weekStartsOn);
  const tasksQ = useTasks(range.startStr, range.endStr);

  const tasks = useMemo(() => {
    const all = tasksQ.data ?? [];
    if (scope === 'minhas') return all.filter((t) => t.assigned_to === user?.id);
    if (scope === 'equipe') return all.filter((t) => canManage(t.assigned_to) || t.assigned_to === user?.id);
    return all;
  }, [tasksQ.data, scope, user?.id, canManage]);

  const done = tasks.filter((t) => t.status === 'concluida').length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Agenda"
        icon={<ListChecks className="h-6 w-6 text-primary" />}
        subtitle="Tarefas e rotinas da loja"
        actions={
          isLider && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova tarefa
            </Button>
          )
        }
      />

      <PeriodNav
        period={period}
        onPeriod={setPeriod}
        periods={['day', 'week']}
        label={periodLabel(period, range)}
        onPrev={() => setRef(shiftPeriod(period, ref, -1))}
        onNext={() => setRef(shiftPeriod(period, ref, 1))}
        onToday={() => setRef(new Date())}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList>
            <TabsTrigger value="minhas">Minhas</TabsTrigger>
            {isLider && <TabsTrigger value="equipe">{isAdmin ? 'Que eu gerencio' : 'Minha equipe'}</TabsTrigger>}
            <TabsTrigger value="loja">Loja toda</TabsTrigger>
          </TabsList>
        </Tabs>
        {tasks.length > 0 && (
          <div className="flex min-w-[180px] items-center gap-2 text-sm">
            <Progress value={(100 * done) / tasks.length} className="h-2 flex-1" />
            <span className="tabular-nums text-muted-foreground">
              {done}/{tasks.length}
            </span>
          </div>
        )}
      </div>

      {tasksQ.isLoading ? (
        <Loading />
      ) : period === 'day' ? (
        <Card>
          <CardContent className="space-y-1 p-3">
            {tasks.length === 0 ? (
              <EmptyState title="Nada na agenda deste dia" />
            ) : (
              tasks.map((t) => <TaskRow key={t.id} task={t} showOwner={scope !== 'minhas'} />)
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {daysOf(range).map((d) => {
            const iso = toISODate(d);
            const list = tasks.filter((t) => t.due_date === iso);
            return (
              <Card key={iso} className={cn(isToday(d) && 'border-primary/50')}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="flex items-center justify-between text-sm first-letter:uppercase">
                    {format(d, "EEE dd/MM", { locale: ptBR })}
                    <span className="text-xs font-normal text-muted-foreground">
                      {list.filter((t) => t.status === 'concluida').length}/{list.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5 p-2">
                  {list.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">—</p>
                  ) : (
                    list.map((t) => <TaskRow key={t.id} task={t} showOwner={scope !== 'minhas'} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isLider && <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} defaultDate={range.startStr} />}
    </div>
  );
}
