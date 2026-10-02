import { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useInvalidateEntries } from '@/hooks/data/useEntries';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';

interface ResetTeamDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged: () => void;
}

const ALL = '__all__';

/** Novo circuito: zera o saldo de pontos (ajuste negativo registrado), sem apagar o histórico */
export function ResetTeamDataModal({ open, onOpenChange, onDataChanged }: ResetTeamDataModalProps) {
  const { teams } = useAppConfig();
  const { isRoot } = useAuth();
  const invalidate = useInvalidateEntries();
  const { toast } = useToast();
  const [scope, setScope] = useState<string>(ALL);
  const [reason, setReason] = useState('');
  const [alsoDelete, setAlsoDelete] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const team = scope === ALL ? null : scope;
      const { data, error } = await supabase.rpc('reset_points', { _team: team ?? undefined, _reason: reason });
      if (error) throw error;
      if (alsoDelete) {
        const d = await supabase.rpc('delete_entries', { _team: team ?? undefined });
        if (d.error) throw d.error;
      }
      toast({ title: `Pontos zerados de ${data} pessoa(s)`, description: alsoDelete ? 'Lançamentos também excluídos.' : 'O histórico continua no extrato.' });
      invalidate();
      onDataChanged();
      onOpenChange(false);
      setConfirm('');
      setReason('');
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" /> Zerar pontuação
          </DialogTitle>
          <DialogDescription>
            Use ao começar um novo circuito. O saldo vai a zero com um lançamento de ajuste; o histórico de cada pessoa continua no extrato.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>De quem</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Loja toda</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: início do Circuito 2027" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={alsoDelete} onCheckedChange={(v) => setAlsoDelete(!!v)} disabled={scope === ALL && !isRoot} />
            <span>
              Também excluir os lançamentos de KPI
              <span className="block text-xs text-muted-foreground">Irreversível. Para a loja toda, só o root.</span>
            </span>
          </label>
          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-4 w-4" /> Digite CONFIRMAR</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy || confirm !== 'CONFIRMAR' || !reason.trim()} onClick={submit}>
              Zerar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
