import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flag, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, Loading, PersonAvatar } from '@/components/common';
import { ConfirmDialog } from '@/components/common/dialogs';
import { TeamBadge } from '@/components/TeamBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { CHALLENGE_METRICS, useChallengeActions, useChallenges } from '@/hooks/data/useChallenges';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';

const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

function NewChallengeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { isAdmin } = useAuth();
  const { me } = useDirectory();
  const { teams } = useAppConfig();
  const { create } = useChallengeActions();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('total');
  const [target, setTarget] = useState(50);
  const [bonus, setBonus] = useState(50);
  const [start, setStart] = useState(local(new Date()));
  const [end, setEnd] = useState(local(addDays(new Date(), 7)));
  const [team, setTeam] = useState<string>(isAdmin ? 'all' : me?.team_id ?? '');

  const submit = async () => {
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        kpi_type: metric,
        target_value: metric === 'manual' ? null : target,
        bonus_points: bonus,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        team_id: team === 'all' ? null : team,
      });
      toast({ title: 'Campanha criada 🚩', description: 'A equipe foi avisada.' });
      onOpenChange(false);
      setTitle('');
      setDescription('');
    } catch (e) {
      toast({ title: 'Não foi possível criar', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>O progresso é calculado sozinho a partir dos lançamentos aprovados (ou das tarefas no prazo).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Semana do Cadastro" />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Regra, por que importa, prêmio…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mede</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHALLENGE_METRICS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {metric !== 'manual' && (
              <div className="space-y-1">
                <Label>Meta por pessoa</Label>
                <Input type="number" min={1} value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value || 1))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Bônus (pts)</Label>
              <Input type="number" min={0} max={1000} value={bonus} onChange={(e) => setBonus(Math.max(0, +e.target.value || 0))} />
            </div>
            <div className="space-y-1">
              <Label>Para</Label>
              <Select value={team} onValueChange={setTeam} disabled={!isAdmin}>
                <SelectTrigger><SelectValue placeholder="Equipe" /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="all">Loja toda</SelectItem>}
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Início</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {metric === 'manual' && <p className="text-xs text-muted-foreground">Campanha manual: você marca quem cumpriu (ex.: vitrine, PVPS, organização).</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending || title.trim().length < 3 || !team}>Criar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ChallengesPanel() {
  const { user, isAdmin } = useAuth();
  const { players, byId, me } = useDirectory();
  const q = useChallenges();
  const { update, remove, setCompletion } = useChallengeActions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const list = useMemo(
    () => (q.data ?? []).filter((c) => isAdmin || c.team_id === me?.team_id).sort((a, b) => b.end_time.localeCompare(a.end_time)),
    [q.data, isAdmin, me?.team_id],
  );

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ title: ok });
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campanhas</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova campanha
        </Button>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon={<Flag className="h-8 w-8" />} title="Nenhuma campanha recente">
          Crie uma campanha com meta e bônus. Participar e concluir campanhas conta 20% do Índice de Engajamento.
        </EmptyState>
      ) : (
        list.map((c) => {
          const eligible = players.filter((p) => !c.team_id || p.team_id === c.team_id);
          const ended = new Date(c.end_time) < new Date();
          return (
            <Card key={c.id} className={!c.is_active || ended ? 'opacity-75' : ''}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {c.title}
                    <Badge variant="secondary">+{c.bonus_points} pts</Badge>
                    {ended && <Badge variant="outline">encerrada</Badge>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {c.team_id ? <TeamBadge teamId={c.team_id} size="sm" /> : 'Loja toda'} · {CHALLENGE_METRICS[c.kpi_type]}
                    {c.target_value ? ` ≥ ${c.target_value}` : ''} · {format(new Date(c.start_time), 'dd/MM', { locale: ptBR })} a{' '}
                    {format(new Date(c.end_time), "dd/MM HH'h'", { locale: ptBR })} · {c.participants.length}/{eligible.length} participando ·{' '}
                    {c.participants.filter((p) => p.completed).length} concluíram
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={!!c.is_active} onCheckedChange={(v) => run(() => update.mutateAsync({ id: c.id, is_active: v }), v ? 'Ativada' : 'Pausada')} />
                    Ativa
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setToDelete(c.id)}
                    aria-label="Excluir campanha"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-1.5 sm:grid-cols-2">
                {c.participants.length === 0 && <p className="text-sm text-muted-foreground">Ninguém entrou ainda.</p>}
                {c.participants
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                  .map((p) => {
                    const person = byId(p.user_id);
                    const pctDone = p.completed ? 100 : c.target_value ? Math.min(100, (100 * (p.score ?? 0)) / c.target_value) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                        <PersonAvatar name={person?.full_name} url={person?.avatar_url} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{person?.full_name}</p>
                          {c.kpi_type !== 'manual' && <Progress value={pctDone} className="h-1.5" />}
                        </div>
                        {c.kpi_type === 'manual' ? (
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={!!p.completed}
                              disabled={p.user_id === user?.id}
                              onCheckedChange={(v) => run(() => setCompletion.mutateAsync({ challengeId: c.id, userId: p.user_id, completed: !!v }), v ? 'Validado' : 'Desmarcado')}
                            />
                            cumpriu
                          </label>
                        ) : (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {p.completed ? '✅' : `${p.score ?? 0}/${c.target_value}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          );
        })
      )}
      <NewChallengeDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir campanha?"
        description="Os bônus já creditados aos participantes serão estornados."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => toDelete && run(() => remove.mutateAsync(toDelete), 'Campanha excluída')}
      />
    </div>
  );
}
