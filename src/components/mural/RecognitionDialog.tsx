import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useDirectory } from '@/hooks/data/useDirectory';
import { RECOGNITION_TYPES, useRecognitionsLeft, useSendRecognition } from '@/hooks/data/useFeed';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toUserId?: string;
  teamId?: string | null;
}

/** Reconhecer um colega. Entre colegas há limite semanal; líder reconhece a equipe sem limite. */
export function RecognitionDialog({ open, onOpenChange, toUserId, teamId }: Props) {
  const { user } = useAuth();
  const { players, canManage } = useDirectory();
  const { settings } = useAppConfig();
  const left = useRecognitionsLeft();
  const send = useSendRecognition();
  const { toast } = useToast();
  const [to, setTo] = useState(toUserId ?? '');
  const [type, setType] = useState('helping_hand');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setTo(toUserId ?? '');
      setMessage('');
      setType('helping_hand');
    }
  }, [open, toUserId]);

  const options = useMemo(
    () => players.filter((p) => p.id !== user?.id && (!teamId || p.team_id === teamId)),
    [players, user?.id, teamId],
  );
  const asLeader = !!to && canManage(to);
  const pts = asLeader ? settings?.recognition_points_leader : settings?.recognition_points_peer;
  const blocked = !asLeader && left.data === 0;

  const submit = async () => {
    try {
      await send.mutateAsync({ toUserId: to, type, message: message.trim() });
      toast({ title: 'Reconhecimento enviado 💛', description: 'Já está no mural.' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Não foi possível enviar', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" /> Reconhecer alguém
          </DialogTitle>
          <DialogDescription>
            Conte o que a pessoa fez. Aparece no mural e vale +{pts ?? 0} pts para ela.
            {!asLeader && left.data != null && ` Você ainda tem ${left.data} elogio(s) nesta semana.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Para quem</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um colega" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RECOGNITION_TYPES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={cn('rounded-lg border p-2 text-left text-sm transition-colors', type === key ? 'border-primary bg-primary/10' : 'hover:bg-muted')}
                >
                  <span className="mr-1">{t.emoji}</span>
                  <span className="font-medium">{t.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rec-msg">Mensagem</Label>
            <Textarea
              id="rec-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              placeholder="Ex.: Segurou a fila do PBM sozinha no pico das 18h e ainda encantou o cliente."
            />
            <p className="text-right text-[11px] text-muted-foreground">{message.trim().length}/280 · mínimo 10</p>
          </div>

          {blocked && <p className="text-sm text-amber-600">Você já usou seus elogios desta semana. Na próxima tem mais!</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!to || message.trim().length < 10 || send.isPending || blocked}>
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
