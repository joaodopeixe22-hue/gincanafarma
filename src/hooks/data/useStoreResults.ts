import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { StoreResult } from '@/types/db';

export function useStoreResults(startStr: string, endStr: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['store-results', startStr, endStr],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_daily_results')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date');
      if (error) throw error;
      return data as StoreResult[];
    },
  });
}

export type StoreResultInput = Pick<
  StoreResult,
  | 'date'
  | 'vendas'
  | 'meta_vendas'
  | 'clientes'
  | 'meta_clientes'
  | 'venda_simples_pct'
  | 'nss_otimo'
  | 'nss_bom'
  | 'nss_regular'
  | 'nss_ruim'
  | 'nss_pessimo'
  | 'observacao'
>;

export function useSaveStoreResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: StoreResultInput) => {
      const { error } = await supabase.from('store_daily_results').upsert(row, { onConflict: 'date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-results'] }),
  });
}

/** NSS = (Ótimo − Regular − Ruim − Péssimo) ÷ Total. "Bom" é neutro. */
export function nssOf(v: { otimo: number; bom: number; regular: number; ruim: number; pessimo: number }) {
  const total = v.otimo + v.bom + v.regular + v.ruim + v.pessimo;
  if (!total) return null;
  return Math.round((1000 * (v.otimo - v.regular - v.ruim - v.pessimo)) / total) / 10;
}

/** Acumulado do período (soma dos votos antes de calcular o NSS) */
export function summarize(rows: StoreResult[]) {
  const sum = (f: (r: StoreResult) => number | null | undefined) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);
  const vendas = sum((r) => r.vendas);
  const metaVendas = sum((r) => r.meta_vendas);
  const clientes = sum((r) => r.clientes);
  const metaClientes = sum((r) => r.meta_clientes);
  const vsRows = rows.filter((r) => r.venda_simples_pct != null);
  const votes = {
    otimo: sum((r) => r.nss_otimo),
    bom: sum((r) => r.nss_bom),
    regular: sum((r) => r.nss_regular),
    ruim: sum((r) => r.nss_ruim),
    pessimo: sum((r) => r.nss_pessimo),
  };
  return {
    vendas,
    metaVendas,
    vendasPct: metaVendas ? (100 * vendas) / metaVendas : null,
    clientes,
    metaClientes,
    clientesPct: metaClientes ? (100 * clientes) / metaClientes : null,
    ticket: clientes ? vendas / clientes : null,
    vendaSimples: vsRows.length ? vsRows.reduce((s, r) => s + Number(r.venda_simples_pct), 0) / vsRows.length : null,
    votes,
    totalVotes: votes.otimo + votes.bom + votes.regular + votes.ruim + votes.pessimo,
    nss: nssOf(votes),
  };
}

export const brl = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const pct = (v?: number | null, digits = 1) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`);
