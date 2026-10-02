import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loading } from '@/components/common';
import { useLedger } from '@/hooks/data/useRankings';
import { cn } from '@/lib/utils';

const SOURCE: Record<string, { label: string; emoji: string }> = {
  kpi: { label: 'KPIs', emoji: '📈' },
  achievement: { label: 'Conquista', emoji: '🏅' },
  quiz: { label: 'Quiz', emoji: '🎓' },
  challenge: { label: 'Campanha', emoji: '🚩' },
  task: { label: 'Tarefa', emoji: '✅' },
  recognition: { label: 'Reconhecimento', emoji: '💛' },
  adjustment: { label: 'Ajuste', emoji: '🧮' },
};

/** Extrato de pontos: cada ponto com origem, data e motivo (auditoria transparente) */
export function LedgerCard({ userId }: { userId?: string }) {
  const q = useLedger(userId, 150);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary" /> Extrato de pontos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Loading />
        ) : !q.data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum ponto ainda.</p>
        ) : (
          <ScrollArea className="h-80">
            <ul className="divide-y pr-3">
              {q.data.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="text-lg" aria-hidden>{SOURCE[l.source]?.emoji ?? '•'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{l.description ?? SOURCE[l.source]?.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {SOURCE[l.source]?.label} · ref. {format(new Date(l.ref_date + 'T12:00'), 'dd/MM')} · lançado {format(new Date(l.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <span className={cn('font-semibold tabular-nums', l.points >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {l.points > 0 ? '+' : ''}
                    {l.points}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
