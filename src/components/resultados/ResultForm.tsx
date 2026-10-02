import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { nssOf, useSaveStoreResult, type StoreResultInput } from '@/hooks/data/useStoreResults';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import type { StoreResult } from '@/types/db';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string;
  existing: StoreResult | null;
  /** usado para sugerir a meta do dia a partir do último dia lançado */
  lastGoals?: { meta_vendas: number | null; meta_clientes: number | null } | null;
}

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export function ResultForm({ open, onOpenChange, date, existing, lastGoals }: Props) {
  const save = useSaveStoreResult();
  const { toast } = useToast();
  const [d, setD] = useState(date);
  const [f, setF] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setD(date);
    const src = existing ?? {
      meta_vendas: lastGoals?.meta_vendas ?? null,
      meta_clientes: lastGoals?.meta_clientes ?? null,
    };
    const pick = (k: string) => {
      const v = (src as Record<string, unknown>)[k];
      return v == null ? '' : String(v);
    };
    setF({
      vendas: pick('vendas'),
      meta_vendas: pick('meta_vendas'),
      clientes: pick('clientes'),
      meta_clientes: pick('meta_clientes'),
      venda_simples_pct: pick('venda_simples_pct'),
      nss_otimo: pick('nss_otimo') || '0',
      nss_bom: pick('nss_bom') || '0',
      nss_regular: pick('nss_regular') || '0',
      nss_ruim: pick('nss_ruim') || '0',
      nss_pessimo: pick('nss_pessimo') || '0',
      observacao: pick('observacao'),
    });
  }, [open, date, existing, lastGoals]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const votes = {
    otimo: +f.nss_otimo || 0,
    bom: +f.nss_bom || 0,
    regular: +f.nss_regular || 0,
    ruim: +f.nss_ruim || 0,
    pessimo: +f.nss_pessimo || 0,
  };
  const preview = nssOf(votes);

  const submit = async () => {
    const row: StoreResultInput = {
      date: d,
      vendas: num(f.vendas),
      meta_vendas: num(f.meta_vendas),
      clientes: num(f.clientes),
      meta_clientes: num(f.meta_clientes),
      venda_simples_pct: num(f.venda_simples_pct),
      nss_otimo: votes.otimo,
      nss_bom: votes.bom,
      nss_regular: votes.regular,
      nss_ruim: votes.ruim,
      nss_pessimo: votes.pessimo,
      observacao: f.observacao?.trim() || null,
    };
    try {
      await save.mutateAsync(row);
      toast({ title: 'Resultado salvo' });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: errorMessage(e), variant: 'destructive' });
    }
  };

  const field = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`r-${k}`} className="text-xs">{label}</Label>
      <Input id={`r-${k}`} inputMode="decimal" value={f[k] ?? ''} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resultado do dia</DialogTitle>
          <DialogDescription>Lançado 1x por dia pela liderança. Todos veem em Resultados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="r-date" className="text-xs">Data</Label>
            <Input id="r-date" type="date" value={d} onChange={(e) => setD(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('vendas', 'Vendas (R$)')}
            {field('meta_vendas', 'Meta de vendas (R$)')}
            {field('clientes', 'Clientes')}
            {field('meta_clientes', 'Meta de clientes')}
            {field('venda_simples_pct', 'Venda simples (%)')}
          </div>
          <div className="space-y-2 rounded-xl border p-3">
            <p className="flex items-center justify-between text-sm font-semibold">
              Encantômetro (votos do dia)
              <span className="text-primary">NSS {preview == null ? '—' : preview}</span>
            </p>
            <div className="grid grid-cols-5 gap-2">
              {field('nss_otimo', 'Ótimo')}
              {field('nss_bom', 'Bom')}
              {field('nss_regular', 'Regular')}
              {field('nss_ruim', 'Ruim')}
              {field('nss_pessimo', 'Péssimo')}
            </div>
            <p className="text-[11px] text-muted-foreground">NSS = (Ótimo − Regular − Ruim − Péssimo) ÷ total de votos. "Bom" é neutro.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="r-obs" className="text-xs">Observação (opcional)</Label>
            <Textarea id="r-obs" rows={2} value={f.observacao ?? ''} onChange={set('observacao')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
