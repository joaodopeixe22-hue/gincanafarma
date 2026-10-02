import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock, MessageSquareWarning, Send, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/common';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useCancelMyEntry, useSaveMyEntry } from '@/hooks/data/useEntries';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { fromISODate } from '@/lib/period';
import { cn } from '@/lib/utils';
import { emptyKpis, KPI_KEYS, sumKpis, type DailyEntry, type KpiKey, type KpiValues } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  entry: DailyEntry | null;
  goals?: Partial<Record<KpiKey, number>>;
}

/** Colaborador registra o dia. O envio vira solicitação para o líder aprovar. */
export function EntryDialog({ open, onOpenChange, date, entry, goals }: Props) {
  const { isMobile } = useViewMode();
  const { kpis, kpiLabel } = useAppConfig();
  const { toast } = useToast();
  const save = useSaveMyEntry();
  const cancel = useCancelMyEntry();
  const [values, setValues] = useState<KpiValues>(emptyKpis());

  useEffect(() => {
    if (open) setValues(entry ? { ofex: entry.ofex, apoio: entry.apoio, soria: entry.soria, cadastro: entry.cadastro } : emptyKpis());
  }, [open, entry]);

  const locked = entry?.status === 'approved';
  const keys = (kpis.length ? kpis.map((k) => k.key as KpiKey) : KPI_KEYS);
  const maxOf = (k: KpiKey) => kpis.find((x) => x.key === k)?.daily_max ?? 999;

  const submit = async () => {
    try {
      await save.mutateAsync({ date, values, existing: entry });
      toast({ title: 'Enviado para aprovação', description: 'Seu líder vai conferir e aprovar. Você recebe um aviso.' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Não foi possível enviar', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!entry) return;
    try {
      await cancel.mutateAsync(entry.id);
      toast({ title: 'Lançamento cancelado' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Não foi possível cancelar', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const title = locked ? 'Dia aprovado' : entry ? 'Corrigir lançamento' : 'Lançar meu dia';
  const dateLabel = format(fromISODate(date), "EEEE, d 'de' MMMM", { locale: ptBR });

  const body = (
    <div className="space-y-4">
      {entry && (
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={entry.status} />
          {entry.original_values && <span className="text-xs text-muted-foreground">valores ajustados pelo líder</span>}
        </div>
      )}
      {entry?.status === 'rejected' && entry.review_note && (
        <Alert variant="destructive">
          <MessageSquareWarning className="h-4 w-4" />
          <AlertDescription>
            <strong>Motivo da recusa:</strong> {entry.review_note}. Corrija e envie de novo.
          </AlertDescription>
        </Alert>
      )}
      {locked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>Dia aprovado e fechado. Se algo estiver errado, fale com seu líder.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        {keys.map((k) => {
          const goal = goals?.[k];
          const v = values[k];
          return (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`kpi-${k}`} className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {kpiLabel(k)}
                {goal ? <span className={cn('normal-case', v >= goal ? 'text-emerald-600' : '')}>meta {goal}</span> : null}
              </Label>
              <Input
                id={`kpi-${k}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={maxOf(k)}
                value={v || ''}
                placeholder="0"
                disabled={locked}
                onChange={(e) => setValues((p) => ({ ...p, [k]: Math.max(0, Math.min(maxOf(k), parseInt(e.target.value) || 0)) }))}
                className="h-12 text-center text-lg font-semibold"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
        <span className="text-muted-foreground">Total do dia</span>
        <span className="text-lg font-bold text-primary">{sumKpis(values)}</span>
      </div>

      {!locked && (
        <p className="text-xs text-muted-foreground">
          Os pontos entram depois que o líder aprovar. Confira com o relatório do sistema antes de enviar.
        </p>
      )}

      <div className={cn('flex gap-2', isMobile ? 'flex-col-reverse' : 'justify-between')}>
        <div>
          {entry?.status === 'pending' && (
            <Button variant="ghost" className="w-full text-destructive" onClick={remove} disabled={cancel.isPending}>
              <Trash2 className="mr-2 h-4 w-4" /> Cancelar envio
            </Button>
          )}
        </div>
        <div className={cn('flex gap-2', isMobile && 'flex-col-reverse')}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {!locked && (
            <Button onClick={submit} disabled={save.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {save.isPending ? 'Enviando…' : entry ? 'Reenviar para aprovação' : 'Enviar para aprovação'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="first-letter:uppercase">{dateLabel}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">{dateLabel}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
