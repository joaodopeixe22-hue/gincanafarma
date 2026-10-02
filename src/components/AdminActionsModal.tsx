import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calculator, RotateCcw, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loading, StatusBadge } from '@/components/common';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReviewEntry, useInvalidateEntries } from '@/hooks/data/useEntries';
import { useLevelAndStreak } from '@/hooks/data/useRankings';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { fromISODate } from '@/lib/period';
import { sumKpis, type DailyEntry } from '@/types/db';

interface AdminActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onDataChanged: () => void;
}

/** Ações do admin sobre uma pessoa. Tudo fica registrado no livro de pontos (nada some sem rastro). */
export function AdminActionsModal({ open, onOpenChange, userId, userName, onDataChanged }: AdminActionsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const review = useReviewEntry();
  const invalidate = useInvalidateEntries();
  const levelQ = useLevelAndStreak(open ? userId : undefined);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const entriesQ = useQuery({
    queryKey: ['entries', 'admin-user', userId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_daily_data')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return data as DailyEntry[];
    },
  });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: ok });
      invalidate();
      levelQ.refetch();
      entriesQ.refetch();
      onDataChanged();
      setPoints('');
      setReason('');
      setConfirm('');
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await supabase.rpc(fn as never, args as never);
    if (error) throw error;
  };

  const self = userId === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ações · {userName}</DialogTitle>
          <DialogDescription>Saldo atual: {levelQ.data?.totalPoints ?? '…'} pts</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="entries">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entries">Lançamentos</TabsTrigger>
            <TabsTrigger value="points">Pontos</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-2">
            <p className="text-xs text-muted-foreground">Reabrir um dia aprovado estorna os pontos e devolve o lançamento para aprovação.</p>
            {entriesQ.isLoading ? (
              <Loading />
            ) : (
              <ScrollArea className="h-72 rounded-lg border">
                <div className="divide-y">
                  {(entriesQ.data ?? []).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 p-2 text-sm">
                      <span className="w-20 capitalize">{format(fromISODate(e.date), 'EEE dd/MM', { locale: ptBR })}</span>
                      <StatusBadge status={e.status} />
                      <span className="ml-auto font-semibold tabular-nums">{sumKpis(e)}</span>
                      {e.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || self}
                          onClick={() => run(() => review.mutateAsync({ id: e.id, decision: 'reopen', note: 'Reaberto pelo admin' }), 'Reaberto')}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reabrir
                        </Button>
                      )}
                    </div>
                  ))}
                  {!entriesQ.data?.length && <p className="p-4 text-center text-sm text-muted-foreground">Sem lançamentos</p>}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            {self && (
              <Alert>
                <AlertDescription>Você não pode ajustar os próprios pontos.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 rounded-xl border p-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4" /> Ajuste manual</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Pontos (+/−)</Label>
                  <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="-20" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Motivo (fica no extrato)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: correção de lançamento duplicado" />
                </div>
              </div>
              <Button
                size="sm"
                disabled={busy || self || !+points || !reason.trim()}
                onClick={() => run(() => rpc('adjust_points', { _user: userId, _points: +points, _reason: reason }), 'Ajuste registrado')}
              >
                Registrar ajuste
              </Button>
            </div>

            <div className="space-y-2 rounded-xl border border-destructive/40 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Zona de risco</p>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Digite CONFIRMAR" />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || self || confirm !== 'CONFIRMAR' || !reason.trim()}
                  onClick={() => run(() => rpc('reset_points', { _user: userId, _reason: reason }), 'Pontos zerados (histórico mantido)')}
                >
                  <RotateCcw className="mr-1 h-4 w-4" /> Zerar pontos
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || self || confirm !== 'CONFIRMAR'}
                  onClick={() => run(() => rpc('delete_entries', { _user: userId }), 'Lançamentos excluídos')}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir todos os lançamentos
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
