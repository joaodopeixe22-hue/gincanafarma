import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Flag, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TeamBadge } from '@/components/TeamBadge';
import { CHALLENGE_METRICS, useChallengeActions, type ChallengeWithParticipants } from '@/hooks/data/useChallenges';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

/** Cartão de campanha para o colaborador: progresso e botão de participar */
export function ChallengeCard({ challenge }: { challenge: ChallengeWithParticipants }) {
  const { user } = useAuth();
  const { join, leave } = useChallengeActions();
  const { toast } = useToast();
  const mine = challenge.participants.find((p) => p.user_id === user?.id);
  const target = challenge.target_value ?? 0;
  const score = mine?.score ?? 0;
  const progress = mine?.completed ? 100 : target > 0 ? Math.min(100, (100 * score) / target) : 0;
  const ended = new Date(challenge.end_time) < new Date();
  const notStarted = new Date(challenge.start_time) > new Date();

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast({ title: ok });
    } catch (e) {
      toast({ title: 'Não foi possível', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className={cn('space-y-2 rounded-xl border p-3', mine?.completed && 'border-emerald-500/40 bg-emerald-500/5')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            {mine?.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Flag className="h-4 w-4 text-primary" />}
            <span className="truncate">{challenge.title}</span>
          </p>
          {challenge.description && <p className="line-clamp-2 text-xs text-muted-foreground">{challenge.description}</p>}
        </div>
        <Badge variant="secondary" className="shrink-0">+{challenge.bonus_points} pts</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {challenge.team_id ? <TeamBadge teamId={challenge.team_id} size="sm" /> : <span>Loja toda</span>}
        <span>·</span>
        <span>
          {CHALLENGE_METRICS[challenge.kpi_type] ?? challenge.kpi_type}
          {target > 0 && challenge.kpi_type !== 'manual' ? `: meta ${target}` : ''}
        </span>
        <span>·</span>
        <span>até {format(new Date(challenge.end_time), "dd/MM HH'h'", { locale: ptBR })}</span>
      </div>
      {mine ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {mine.completed
                ? 'Concluída! Bônus creditado.'
                : challenge.kpi_type === 'manual'
                  ? 'Aguardando validação do líder'
                  : `${score} de ${target}`}
            </span>
            {!mine.completed && !ended && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => act(() => leave.mutateAsync(challenge.id), 'Você saiu da campanha')}>
                <LogOut className="mr-1 h-3 w-3" /> Sair
              </Button>
            )}
          </div>
        </div>
      ) : ended ? (
        <p className="text-xs text-muted-foreground">Encerrada</p>
      ) : (
        <Button size="sm" className="w-full" disabled={join.isPending} onClick={() => act(() => join.mutateAsync(challenge.id), 'Você está participando! 🚩')}>
          {notStarted ? 'Garantir participação' : 'Participar'}
        </Button>
      )}
    </div>
  );
}
