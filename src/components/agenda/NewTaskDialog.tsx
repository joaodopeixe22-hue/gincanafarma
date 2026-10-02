import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamBadge } from '@/components/TeamBadge';
import { useDirectory } from '@/hooks/data/useDirectory';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { TASK_CATEGORIES, useCreateTasks } from '@/hooks/data/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { fromISODate, toISODate, WEEKDAY_SHORT } from '@/lib/period';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate: string;
}

/** Líder cria tarefa única ou rotina (dias da semana até uma data) para várias pessoas */
export function NewTaskDialog({ open, onOpenChange, defaultDate }: Props) {
  const { managed } = useDirectory();
  const { teams } = useAppConfig();
  const create = useCreateTasks();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('rotina');
  const [points, setPoints] = useState(5);
  const [dueTime, setDueTime] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [until, setUntil] = useState(toISODate(addDays(fromISODate(defaultDate), 6)));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [onlyWorkDays, setOnlyWorkDays] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setAssignees([]);
      setDate(defaultDate);
      setUntil(toISODate(addDays(fromISODate(defaultDate), 6)));
    }
  }, [open, defaultDate]);

  const dates = useMemo(() => {
    if (!repeat) return [date];
    const out: string[] = [];
    const end = fromISODate(until);
    for (let d = fromISODate(date); d <= end && out.length < 62; d = addDays(d, 1)) {
      if (weekdays.includes(d.getDay())) out.push(toISODate(d));
    }
    return out;
  }, [repeat, date, until, weekdays]);

  const toggle = (id: string) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const submit = async () => {
    setBusy(true);
    try {
      let created = 0;
      const base = { title: title.trim(), description, category, dueTime: dueTime || null, points };
      if (onlyWorkDays) {
        // só nos dias em que cada pessoa está escalada (sem escala no dia = cria mesmo assim)
        const { data: shifts, error } = await supabase
          .from('shifts')
          .select('user_id, date, kind')
          .in('user_id', assignees)
          .gte('date', dates[0])
          .lte('date', dates[dates.length - 1]);
        if (error) throw error;
        for (const id of assignees) {
          const off = new Set((shifts ?? []).filter((s) => s.user_id === id && s.kind !== 'trabalho').map((s) => s.date));
          const personDates = dates.filter((d) => !off.has(d));
          if (personDates.length) created += await create.mutateAsync({ ...base, assignees: [id], dates: personDates });
        }
      } else {
        created = await create.mutateAsync({ ...base, assignees, dates });
      }
      toast({ title: `${created} tarefa(s) criada(s)`, description: 'As pessoas foram avisadas.' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Não foi possível criar', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Concluir no prazo vale os pontos cheios; atrasada vale metade.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Título</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex.: Conferir PVPS do corredor 3" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Detalhes (opcional)</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pts">Pontos</Label>
              <Input id="t-pts" type="number" min={0} max={100} value={points} onChange={(e) => setPoints(Math.max(0, Math.min(100, +e.target.value || 0)))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time">Até (hora)</Label>
              <Input id="t-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="t-rep">Repetir (rotina)</Label>
              <Switch id="t-rep" checked={repeat} onCheckedChange={setRepeat} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{repeat ? 'De' : 'Data'}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {repeat && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} />
                </div>
              )}
            </div>
            {repeat && (
              <div className="flex flex-wrap gap-1">
                {WEEKDAY_SHORT.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i]))}
                    className={cn('rounded-full border px-2.5 py-1 text-xs', weekdays.includes(i) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={onlyWorkDays} onCheckedChange={(v) => setOnlyWorkDays(!!v)} />
              Pular dias de folga/férias da escala
            </label>
            <p className="text-xs text-muted-foreground">
              {dates.length} data(s){dates.length ? `: ${dates.slice(0, 6).map((d) => format(fromISODate(d), 'dd/MM')).join(', ')}${dates.length > 6 ? '…' : ''}` : ''}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Label className="mr-auto">Para quem ({assignees.length})</Label>
              {teams.map((t) => {
                const ids = managed.filter((p) => p.team_id === t.id).map((p) => p.id);
                if (!ids.length) return null;
                return (
                  <button key={t.id} type="button" onClick={() => setAssignees((a) => Array.from(new Set([...a, ...ids])))}>
                    <TeamBadge teamId={t.id} size="sm" />
                  </button>
                );
              })}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAssignees(managed.map((p) => p.id))}>
                Todos
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAssignees([])}>
                Limpar
              </Button>
            </div>
            <ScrollArea className="h-40 rounded-xl border">
              <div className="p-2">
                {managed.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={assignees.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                    <span className="flex-1 truncate">{p.full_name}</span>
                    <TeamBadge teamId={p.team_id} size="sm" showName={false} />
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={busy || title.trim().length < 2 || !assignees.length || !dates.length}>
              {busy ? 'Criando…' : `Criar ${assignees.length * dates.length > 1 ? `(${assignees.length * dates.length})` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
