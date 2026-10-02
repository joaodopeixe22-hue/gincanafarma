import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { BarChart3, Download, Pencil, Plus, Smile } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Loading, PageHeader, PeriodNav } from '@/components/common';
import { ResultForm } from '@/components/resultados/ResultForm';
import { ResultCard } from '@/components/resultados/ResultCard';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { brl, pct, summarize, useStoreResults } from '@/hooks/data/useStoreResults';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { fromISODate, periodLabel, periodRange, shiftPeriod, todayISO } from '@/lib/period';
import { cn } from '@/lib/utils';
import type { StoreResult } from '@/types/db';

function Kpi({ title, value, sub, progress, good }: { title: string; value: string; sub?: string; progress?: number | null; good?: boolean | null }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={cn('text-2xl font-bold tabular-nums', good === true && 'text-emerald-600', good === false && 'text-amber-600')}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {progress != null && <Progress value={Math.min(100, progress)} className="h-1.5" />}
      </CardContent>
    </Card>
  );
}

export default function Resultados() {
  const { isLider } = useAuth();
  const { settings, storeName, weekStartsOn } = useAppConfig();
  const { toast } = useToast();
  const [ref, setRef] = useState(new Date());
  const [formDate, setFormDate] = useState<string | null>(null);
  const [cardDay, setCardDay] = useState<StoreResult | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const range = periodRange('month', ref, weekStartsOn);
  const q = useStoreResults(range.startStr, range.endStr);
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const m = summarize(rows);
  const last = rows[rows.length - 1] ?? null;
  const nssGoal = settings?.nss_goal != null ? Number(settings.nss_goal) : null;
  const vsGoal = settings?.venda_simples_goal != null ? Number(settings.venda_simples_goal) : null;

  const downloadCard = async () => {
    if (!cardRef.current || !cardDay) return;
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 1, width: 1080, height: 1080 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `acompanhamento-${cardDay.date}.png`;
      a.click();
    } catch (e) {
      toast({ title: 'Não foi possível gerar a imagem', description: errorMessage(e), variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Resultados da loja"
        icon={<BarChart3 className="h-6 w-6 text-primary" />}
        subtitle="Metas de venda e Encantômetro"
        actions={
          isLider && (
            <Button onClick={() => setFormDate(todayISO())}>
              <Plus className="mr-2 h-4 w-4" /> Lançar dia
            </Button>
          )
        }
      />
      <PeriodNav
        period="month"
        label={periodLabel('month', range)}
        onPrev={() => setRef(shiftPeriod('month', ref, -1))}
        onNext={() => setRef(shiftPeriod('month', ref, 1))}
        onToday={() => setRef(new Date())}
      />

      {q.isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Nenhum resultado lançado neste mês">
          {isLider ? 'Use "Lançar dia" para registrar vendas, clientes e o Encantômetro.' : 'A liderança lança os resultados diariamente.'}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi title="Vendas no mês" value={pct(m.vendasPct)} sub={`${brl(m.vendas)} de ${brl(m.metaVendas)}`} progress={m.vendasPct} good={m.vendasPct == null ? null : m.vendasPct >= 100} />
            <Kpi title="Clientes" value={pct(m.clientesPct)} sub={`${m.clientes.toLocaleString('pt-BR')} de ${m.metaClientes.toLocaleString('pt-BR')}`} progress={m.clientesPct} good={m.clientesPct == null ? null : m.clientesPct >= 100} />
            <Kpi title="Ticket médio" value={brl(m.ticket)} />
            <Kpi title="Venda simples" value={pct(m.vendaSimples)} sub={vsGoal ? `meta ${pct(vsGoal, 0)}` : undefined} good={m.vendaSimples == null || !vsGoal ? null : m.vendaSimples >= vsGoal} />
            <Kpi title="Encantômetro (NSS)" value={m.nss == null ? '—' : m.nss.toLocaleString('pt-BR')} sub={`${m.totalVotes} votos${nssGoal ? ` · meta ${nssGoal}` : ''}`} good={m.nss == null || !nssGoal ? null : m.nss >= nssGoal} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smile className="h-4 w-4 text-primary" /> Votos do Encantômetro no mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-6 overflow-hidden rounded-full">
                {[
                  ['Ótimo', m.votes.otimo, 'bg-emerald-500'],
                  ['Bom', m.votes.bom, 'bg-sky-400'],
                  ['Regular', m.votes.regular, 'bg-amber-400'],
                  ['Ruim', m.votes.ruim, 'bg-orange-500'],
                  ['Péssimo', m.votes.pessimo, 'bg-red-600'],
                ].map(([l, v, c]) =>
                  Number(v) > 0 ? (
                    <div key={String(l)} className={cn(String(c))} style={{ width: `${(100 * Number(v)) / (m.totalVotes || 1)}%` }} title={`${l}: ${v}`} />
                  ) : null,
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Ótimo {m.votes.otimo} · Bom {m.votes.bom} · Regular {m.votes.regular} · Ruim {m.votes.ruim} · Péssimo {m.votes.pessimo}. Cada voto
                Regular/Ruim/Péssimo anula um Ótimo — converter Bom em Ótimo é o caminho mais rápido para subir o NSS.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">% meta</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Ticket</TableHead>
                    <TableHead className="text-right">VS</TableHead>
                    <TableHead className="text-right">NSS</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].reverse().map((r) => {
                    const p = r.meta_vendas ? (100 * Number(r.vendas)) / Number(r.meta_vendas) : null;
                    return (
                      <TableRow key={r.date}>
                        <TableCell className="whitespace-nowrap first-letter:uppercase">{format(fromISODate(r.date), 'EEE dd/MM', { locale: ptBR })}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.vendas)}</TableCell>
                        <TableCell className={cn('text-right tabular-nums', p != null && (p >= 100 ? 'text-emerald-600' : 'text-amber-600'))}>{pct(p, 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.clientes ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{brl(r.ticket_medio)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(r.venda_simples_pct)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.nss == null ? '—' : Number(r.nss).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Card para o Teams" onClick={() => setCardDay(r)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {isLider && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => setFormDate(r.date)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {formDate && (
        <ResultForm
          open
          onOpenChange={(o) => !o && setFormDate(null)}
          date={formDate}
          existing={rows.find((r) => r.date === formDate) ?? null}
          lastGoals={last}
        />
      )}

      <Dialog open={!!cardDay} onOpenChange={(o) => !o && setCardDay(null)}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Card para o Teams</DialogTitle>
          </DialogHeader>
          {cardDay && (
            <>
              <div className="mx-auto overflow-hidden rounded-xl border" style={{ width: 540, height: 540, maxWidth: '100%' }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  <ResultCard ref={cardRef} storeName={storeName} day={cardDay} month={rows.filter((r) => r.date <= cardDay.date)} nssGoal={nssGoal} vsGoal={vsGoal} />
                </div>
              </div>
              <Button onClick={downloadCard} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Baixar PNG (1080×1080)
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
