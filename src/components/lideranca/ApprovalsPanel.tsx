import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, RotateCcw, UserPlus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loading, PeriodNav, PersonAvatar, StatusBadge } from '@/components/common';
import { TeamBadge } from '@/components/TeamBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory, type Person } from '@/hooks/data/useDirectory';
import { useCloseDay, useEntriesInRange, useLeaderSaveEntry, useReviewEntry } from '@/hooks/data/useEntries';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { fromISODate, periodLabel, periodRange, shiftPeriod, toISODate } from '@/lib/period';
import { cn } from '@/lib/utils';
import { emptyKpis, sumKpis, type DailyEntry, type KpiKey, type KpiValues } from '@/types/db';

function Row({ person, entry, date }: { person: Person; entry: DailyEntry | null; date: string }) {
  const { user, isRoot } = useAuth();
  const { kpis, kpiLabel } = useAppConfig();
  const review = useReviewEntry();
  const leaderSave = useLeaderSaveEntry();
  const { toast } = useToast();
  const initial: KpiValues = entry ? { ofex: entry.ofex, apoio: entry.apoio, soria: entry.soria, cadastro: entry.cadastro } : emptyKpis();
  const [values, setValues] = useState<KpiValues>(initial);
  const [mode, setMode] = useState<'idle' | 'reject' | 'create'>('idle');
  const [note, setNote] = useState('');
  const self = person.id === user?.id && !isRoot;
  const changed = entry && kpis.some((k) => values[k.key as KpiKey] !== entry[k.key as KpiKey]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ title: ok });
      setMode('idle');
      setNote('');
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className={cn('rounded-xl border p-3', entry?.status === 'pending' && 'border-amber-500/40 bg-amber-500/5')}>
      <div className="flex flex-wrap items-center gap-2">
        <PersonAvatar name={person.full_name} url={person.avatar_url} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{person.full_name}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <TeamBadge teamId={person.team_id} size="sm" showName={false} />
            {entry ? (
              <>
                <StatusBadge status={entry.status} />
                enviado {format(new Date(entry.submitted_at), "dd/MM 'às' HH:mm")}
                {entry.original_values && <span>· ajustado (enviou {sumKpis(entry.original_values as Partial<KpiValues>)})</span>}
              </>
            ) : (
              <span>não lançou</span>
            )}
          </div>
        </div>
        {entry && <span className="text-lg font-bold tabular-nums">{sumKpis(values)}</span>}
      </div>

      {entry && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {kpis.map((k) => (
            <div key={k.key}>
              <Label className="text-[10px] uppercase text-muted-foreground">{kpiLabel(k.key)}</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={k.daily_max}
                value={values[k.key as KpiKey]}
                disabled={entry.status === 'approved' || self}
                onChange={(e) => setValues((v) => ({ ...v, [k.key]: Math.max(0, +e.target.value || 0) }))}
                className="h-9 text-center tabular-nums"
              />
            </div>
          ))}
        </div>
      )}

      {entry?.review_note && entry.status !== 'pending' && <p className="mt-2 text-xs text-muted-foreground">Obs.: {entry.review_note}</p>}

      {mode === 'reject' && (
        <div className="mt-2 space-y-2">
          <Textarea autoFocus rows={2} placeholder="Motivo (a pessoa vai ver). Ex.: OFEX diferente do relatório do sistema." value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('idle')}>Cancelar</Button>
            <Button variant="destructive" size="sm" disabled={!note.trim()} onClick={() => act(() => review.mutateAsync({ id: entry!.id, decision: 'reject', note }), 'Lançamento recusado')}>
              Recusar
            </Button>
          </div>
        </div>
      )}

      {mode === 'idle' && !self && (
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {!entry && (
            <Button variant="outline" size="sm" onClick={() => setMode('create')}>
              <UserPlus className="mr-1 h-4 w-4" /> Lançar por {person.full_name.split(' ')[0]}
            </Button>
          )}
          {entry && entry.status !== 'approved' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode('reject')}>
                <X className="mr-1 h-4 w-4" /> Recusar
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  act(
                    () => review.mutateAsync({ id: entry.id, decision: 'approve', values: changed ? values : undefined, note: changed ? 'Valores ajustados conforme relatório' : undefined }),
                    changed ? 'Aprovado com ajuste' : 'Aprovado',
                  )
                }
              >
                <Check className="mr-1 h-4 w-4" /> {changed ? 'Aprovar com ajuste' : 'Aprovar'}
              </Button>
            </>
          )}
          {entry?.status === 'approved' && (
            <Button variant="ghost" size="sm" onClick={() => act(() => review.mutateAsync({ id: entry.id, decision: 'reopen' }), 'Reaberto — os pontos foram estornados')}>
              <RotateCcw className="mr-1 h-4 w-4" /> Reabrir
            </Button>
          )}
        </div>
      )}
      {self && entry?.status === 'pending' && <p className="mt-2 text-right text-xs text-muted-foreground">Seu lançamento: outro líder ou o admin aprova.</p>}

      <Dialog open={mode === 'create'} onOpenChange={(o) => !o && setMode('idle')}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Lançar por {person.full_name}</DialogTitle>
            <DialogDescription>{format(fromISODate(date), "EEEE, dd/MM", { locale: ptBR })} · já entra aprovado.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {kpis.map((k) => (
              <div key={k.key}>
                <Label className="text-xs">{kpiLabel(k.key)}</Label>
                <Input type="number" min={0} max={k.daily_max} value={values[k.key as KpiKey] || ''} onChange={(e) => setValues((v) => ({ ...v, [k.key]: Math.max(0, +e.target.value || 0) }))} />
              </div>
            ))}
          </div>
          <Textarea rows={2} placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button disabled={leaderSave.isPending} onClick={() => act(() => leaderSave.mutateAsync({ userId: person.id, date, values, note }), 'Registrado e aprovado')}>
            Salvar e aprovar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Fila de aprovação: o líder confere os lançamentos contra o relatório do sistema e fecha o dia */
export function ApprovalsPanel({ teamId }: { teamId: string | null }) {
  const { weekStartsOn } = useAppConfig();
  const { user, isRoot } = useAuth();
  const { managed } = useDirectory();
  const closeDay = useCloseDay();
  const { toast } = useToast();
  const [ref, setRef] = useState(new Date());
  const [showAll, setShowAll] = useState(false);
  const range = periodRange('day', ref, weekStartsOn);
  const date = range.startStr;
  const dayQ = useEntriesInRange(date, date);
  const recentStart = toISODate(subDays(new Date(), 21));
  const recentQ = useEntriesInRange(recentStart, toISODate(new Date()));

  const people = useMemo(() => managed.filter((p) => !teamId || p.team_id === teamId), [managed, teamId]);
  const ids = new Set(people.map((p) => p.id));
  const entries = (dayQ.data ?? []).filter((e) => ids.has(e.user_id));
  const byUser = new Map(entries.map((e) => [e.user_id, e]));
  const pending = entries.filter((e) => e.status === 'pending');
  const approvable = pending.filter((e) => isRoot || e.user_id !== user?.id);
  const pendingDays = useMemo(() => {
    const map = new Map<string, number>();
    (recentQ.data ?? []).filter((e) => e.status === 'pending' && ids.has(e.user_id)).forEach((e) => map.set(e.date, (map.get(e.date) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentQ.data, people]);

  const order = { pending: 0, rejected: 1, none: 2, approved: 3 } as const;
  const sorted = [...people].sort((a, b) => {
    const sa = byUser.get(a.id)?.status ?? 'none';
    const sb = byUser.get(b.id)?.status ?? 'none';
    return order[sa as keyof typeof order] - order[sb as keyof typeof order] || a.full_name.localeCompare(b.full_name);
  });
  const visible = showAll ? sorted : sorted.filter((p) => byUser.get(p.id)?.status !== 'approved');
  const approvedCount = entries.filter((e) => e.status === 'approved').length;

  const approveAll = async () => {
    try {
      const n = await closeDay.mutateAsync({ date, team: teamId });
      toast({ title: n ? `${n} lançamento(s) aprovado(s)` : 'Nada pendente', description: 'Dia fechado.' });
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {pendingDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Dias com pendência:</span>
          {pendingDays.map(([d, n]) => (
            <button key={d} type="button" onClick={() => setRef(fromISODate(d))}>
              <Badge variant={d === date ? 'default' : 'outline'}>
                {format(fromISODate(d), 'dd/MM')} · {n}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <PeriodNav
        period="day"
        label={periodLabel('day', range)}
        onPrev={() => setRef(shiftPeriod('day', ref, -1))}
        onNext={() => setRef(shiftPeriod('day', ref, 1))}
        onToday={() => setRef(new Date())}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">
            {pending.length} pendente(s) · {approvedCount} aprovado(s) · {people.length - entries.length} sem lançamento
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Ocultar aprovados' : 'Mostrar aprovados'}
            </Button>
            <Button size="sm" onClick={approveAll} disabled={!approvable.length || closeDay.isPending}>
              <CheckCheck className="mr-1 h-4 w-4" /> Aprovar todos ({approvable.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Confira com o relatório do sistema. Se um número estiver errado, corrija no campo e use "Aprovar com ajuste" — o original fica registrado.
          </p>
          {dayQ.isLoading ? (
            <Loading />
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tudo aprovado neste dia ✅</p>
          ) : (
            visible.map((p) => <Row key={`${p.id}-${date}-${byUser.get(p.id)?.updated_at ?? ''}`} person={p} entry={byUser.get(p.id) ?? null} date={date} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
