import { useMemo, useRef, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { AlertTriangle, CalendarClock, Copy, Download, FileJson, Save, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loading, PageHeader, PeriodNav } from '@/components/common';
import { TeamBadge } from '@/components/TeamBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory, type Person } from '@/hooks/data/useDirectory';
import { SHIFT_KINDS, hhmm, restHours, useSaveShifts, useShifts, type ShiftDraft, type ShiftKind } from '@/hooks/data/useShifts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { daysOf, periodLabel, periodRange, shiftPeriod, toISODate } from '@/lib/period';
import { addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const key = (u: string, d: string) => `${u}|${d}`;
interface Cell {
  kind: ShiftKind;
  start: string;
  end: string;
  note?: string | null;
}

function CellEditor({ value, onChange, presets }: { value: Cell | null; onChange: (v: Cell | null) => void; presets: string[] }) {
  const [kind, setKind] = useState<ShiftKind>(value?.kind ?? 'trabalho');
  const [start, setStart] = useState(value?.start ?? '13:00');
  const [end, setEnd] = useState(value?.end ?? '23:00');
  const needs = SHIFT_KINDS[kind].needsHours;
  return (
    <div className="w-64 space-y-3">
      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(SHIFT_KINDS) as ShiftKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn('rounded-md border px-1.5 py-1 text-xs', kind === k ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted')}
          >
            {SHIFT_KINDS[k].label}
          </button>
        ))}
      </div>
      {needs && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Entrada</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Saída</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted"
                  onClick={() => {
                    const [s, e] = p.split('–');
                    setStart(s);
                    setEnd(e);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(null)}>
          Limpar
        </Button>
        <Button size="sm" onClick={() => onChange({ kind, start: needs ? start : '', end: needs ? end : '' })}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}

export default function Escala() {
  const { user, isLider } = useAuth();
  const { weekStartsOn, teams, storeName } = useAppConfig();
  const { players, isLoading: peopleLoading } = useDirectory();
  const { toast } = useToast();
  const [ref, setRef] = useState(new Date());
  const [onlyMe, setOnlyMe] = useState(false);
  const [draft, setDraft] = useState<Record<string, Cell | null>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const range = periodRange('week', ref, weekStartsOn);
  const days = daysOf(range);
  const shiftsQ = useShifts(toISODate(addDays(range.start, -1)), range.endStr);
  const save = useSaveShifts();

  const saved = useMemo(() => {
    const m: Record<string, Cell> = {};
    (shiftsQ.data ?? []).forEach((s) => {
      m[key(s.user_id, s.date)] = { kind: s.kind as ShiftKind, start: hhmm(s.start_time), end: hhmm(s.end_time), note: s.note };
    });
    return m;
  }, [shiftsQ.data]);

  const cellOf = (u: string, d: string): Cell | null => (key(u, d) in draft ? draft[key(u, d)] : saved[key(u, d)] ?? null);
  const dirty = Object.keys(draft).length;

  const presets = useMemo(() => {
    const count = new Map<string, number>();
    Object.values(saved).forEach((c) => c.start && count.set(`${c.start}–${c.end}`, (count.get(`${c.start}–${c.end}`) ?? 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
  }, [saved]);

  const rows = useMemo(() => {
    const list = onlyMe ? players.filter((p) => p.id === user?.id) : players;
    const order = new Map(teams.map((t, i) => [t.id, i]));
    return [...list].sort((a, b) => (order.get(a.team_id ?? '') ?? 99) - (order.get(b.team_id ?? '') ?? 99) || a.full_name.localeCompare(b.full_name));
  }, [players, onlyMe, user?.id, teams]);

  // Checagem local de interjornada (o servidor confere de novo ao salvar)
  const shortRest = useMemo(() => {
    const flagged = new Set<string>();
    rows.forEach((p) => {
      const seq = [toISODate(addDays(range.start, -1)), ...days.map(toISODate)];
      for (let i = 1; i < seq.length; i++) {
        const a = cellOf(p.id, seq[i - 1]);
        const b = cellOf(p.id, seq[i]);
        if (a?.start && b?.start && restHours({ date: seq[i - 1], start: a.start, end: a.end }, { date: seq[i], start: b.start }) < 11) {
          flagged.add(key(p.id, seq[i]));
        }
      }
    });
    return flagged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, draft, saved, range.startStr]);

  const setCell = (u: string, d: string, v: Cell | null) => {
    setServerError(null);
    setDraft((prev) => ({ ...prev, [key(u, d)]: v }));
  };

  const commit = async () => {
    const payload: ShiftDraft[] = Object.entries(draft).map(([k, v]) => {
      const [user_id, date] = k.split('|');
      return v
        ? { user_id, date, kind: v.kind, start_time: v.start || null, end_time: v.end || null, note: v.note ?? null }
        : { user_id, date, kind: 'remover' };
    });
    try {
      const n = await save.mutateAsync(payload);
      setDraft({});
      toast({ title: 'Escala salva', description: `${n} dia(s) atualizado(s).` });
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  const copyPrevious = async () => {
    const prev = periodRange('week', shiftPeriod('week', ref, -1), weekStartsOn);
    const { data, error } = await supabase.from('shifts').select('*').gte('date', prev.startStr).lte('date', prev.endStr);
    if (error) return toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    const next: Record<string, Cell | null> = { ...draft };
    data.forEach((s) => {
      const d = toISODate(addDays(new Date(s.date + 'T12:00'), 7));
      next[key(s.user_id, d)] = { kind: s.kind as ShiftKind, start: hhmm(s.start_time), end: hhmm(s.end_time), note: s.note };
    });
    setDraft(next);
    toast({ title: `${data.length} turno(s) copiados`, description: 'Revise e clique em Salvar.' });
  };

  const findPerson = (raw: string): Person | undefined => {
    const v = raw.trim().toLowerCase();
    return players.find((p) => p.matricula?.toLowerCase() === v) ?? players.find((p) => p.full_name.toLowerCase().startsWith(v));
  };

  const runImport = () => {
    try {
      const arr = JSON.parse(importText) as Record<string, string>[];
      if (!Array.isArray(arr)) throw new Error('O JSON precisa ser uma lista [ ... ]');
      const next = { ...draft };
      const missing = new Set<string>();
      let n = 0;
      arr.forEach((r) => {
        const who = String(r.matricula ?? r.nome ?? r.name ?? '');
        const p = findPerson(who);
        if (!p) return missing.add(who);
        let date = String(r.data ?? r.date ?? '');
        const br = date.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
        if (br) date = `${br[3] ?? range.start.getFullYear()}-${br[2]}-${br[1]}`;
        const tipo = String(r.tipo ?? r.kind ?? (r.inicio || r.start ? 'trabalho' : 'folga')).toLowerCase().replace('é', 'e').replace(' ', '_') as ShiftKind;
        const kind: ShiftKind = tipo in SHIFT_KINDS ? tipo : 'trabalho';
        next[key(p.id, date)] = { kind, start: String(r.inicio ?? r.start ?? ''), end: String(r.fim ?? r.end ?? '') };
        n++;
      });
      setDraft(next);
      setImportOpen(false);
      toast({
        title: `${n} turno(s) carregados`,
        description: missing.size ? `Não encontrei: ${[...missing].join(', ')}` : 'Revise e clique em Salvar.',
        variant: missing.size ? 'destructive' : undefined,
      });
    } catch (e) {
      toast({ title: 'JSON inválido', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const exportPng = async () => {
    if (!gridRef.current) return;
    try {
      const url = await toPng(gridRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `escala-${range.startStr}.png`;
      a.click();
    } catch (e) {
      toast({ title: 'Não foi possível gerar a imagem', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const working = (d: string) => rows.filter((p) => cellOf(p.id, d)?.kind === 'trabalho').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Escala"
        icon={<CalendarClock className="h-6 w-6 text-primary" />}
        subtitle={isLider ? 'Toque num dia para editar. A interjornada de 11h é conferida ao salvar.' : 'Sua escala e a da loja'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportPng}>
              <Download className="mr-1.5 h-4 w-4" /> Imagem
            </Button>
            {isLider && (
              <>
                <Button variant="outline" size="sm" onClick={copyPrevious}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar semana anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <FileJson className="mr-1.5 h-4 w-4" /> Importar
                </Button>
              </>
            )}
          </>
        }
      />

      <PeriodNav
        period="week"
        label={periodLabel('week', range)}
        onPrev={() => setRef(shiftPeriod('week', ref, -1))}
        onNext={() => setRef(shiftPeriod('week', ref, 1))}
        onToday={() => setRef(new Date())}
      />

      <div className="flex items-center gap-2 text-sm">
        <Switch id="only-me" checked={onlyMe} onCheckedChange={setOnlyMe} />
        <Label htmlFor="only-me">Só a minha</Label>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {dirty > 0 && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-card p-2 shadow-lg">
          <span className="px-2 text-sm font-medium">{dirty} alteração(ões) não salvas</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft({}); setServerError(null); }}>
              <Undo2 className="mr-1 h-4 w-4" /> Desfazer
            </Button>
            <Button size="sm" onClick={commit} disabled={save.isPending}>
              <Save className="mr-1 h-4 w-4" /> {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      )}

      {shiftsQ.isLoading || peopleLoading ? (
        <Loading />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div ref={gridRef} className="w-max min-w-full bg-card p-3">
              <p className="mb-2 text-sm font-bold">
                {storeName} · Escala {periodLabel('week', range)}
              </p>
              <table className="w-full border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th className="w-44 text-left font-medium text-muted-foreground">Colaborador</th>
                    {days.map((d) => (
                      <th key={d.toISOString()} className={cn('rounded-md py-1 font-semibold first-letter:uppercase', isToday(d) && 'bg-primary/10 text-primary')}>
                        {format(d, 'EEE dd/MM', { locale: ptBR })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className={cn('truncate pr-2', p.id === user?.id && 'font-semibold text-primary')}>
                        <span className="flex items-center gap-1.5">
                          <TeamBadge teamId={p.team_id} size="sm" showName={false} />
                          <span className="truncate">{p.full_name}</span>
                        </span>
                      </td>
                      {days.map((d) => {
                        const iso = toISODate(d);
                        const c = cellOf(p.id, iso);
                        const changed = key(p.id, iso) in draft;
                        const warn = shortRest.has(key(p.id, iso));
                        const label = c ? (SHIFT_KINDS[c.kind].needsHours ? `${c.start}–${c.end}` : SHIFT_KINDS[c.kind].short) : '';
                        const box = (
                          <div
                            className={cn(
                              'flex h-9 min-w-[84px] items-center justify-center whitespace-nowrap rounded-md border px-1 text-center font-medium tabular-nums',
                              c ? SHIFT_KINDS[c.kind].className : 'border-dashed text-muted-foreground/50',
                              changed && 'ring-2 ring-primary',
                              warn && 'ring-2 ring-red-500',
                              isLider && 'cursor-pointer hover:brightness-95',
                            )}
                            title={warn ? 'Menos de 11h de descanso desde o turno anterior' : c?.note ?? undefined}
                          >
                            {label || (isLider ? '+' : '')}
                            {c?.kind === 'treinamento' && <span className="ml-1">🎓</span>}
                          </div>
                        );
                        return (
                          <td key={iso}>
                            {isLider ? (
                              <Popover>
                                <PopoverTrigger asChild>{box}</PopoverTrigger>
                                <PopoverContent className="w-auto">
                                  <p className="mb-2 text-sm font-semibold">
                                    {p.full_name} · {format(d, 'EEE dd/MM', { locale: ptBR })}
                                  </p>
                                  <CellEditor value={c} presets={presets} onChange={(v) => setCell(p.id, iso, v)} />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              box
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!onlyMe && (
                    <tr>
                      <td className="pt-2 text-right font-medium text-muted-foreground">Trabalhando</td>
                      {days.map((d) => (
                        <td key={d.toISOString()} className="pt-2 text-center font-bold tabular-nums">
                          {working(toISODate(d))}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar escala (JSON)</DialogTitle>
            <DialogDescription>
              Cole a lista gerada a partir da foto da escala. Aceita matrícula ou nome, data em yyyy-mm-dd ou dd/mm e tipo (trabalho, folga,
              ferias, atestado, treinamento, banco_horas).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={10}
            className="font-mono text-xs"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'[\n  {"matricula": "3001", "data": "05/10", "inicio": "13:00", "fim": "23:00"},\n  {"nome": "Ana C", "data": "06/10", "tipo": "folga"}\n]'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={runImport} disabled={!importText.trim()}>Carregar na grade</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
