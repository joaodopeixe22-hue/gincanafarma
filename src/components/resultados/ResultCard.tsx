import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { brl, pct, summarize } from '@/hooks/data/useStoreResults';
import { fromISODate } from '@/lib/period';
import type { StoreResult } from '@/types/db';

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Paleta RD Saúde / Drogasil
const RD = {
  verde: '#00754B',
  verdeEscuro: '#0A4A31',
  creme: '#EFEDE3',
  ambar: '#BD7A18',
  ouro: '#F4C86A',
  cinza: '#5B6670',
};

interface Props {
  storeName: string;
  day: StoreResult;
  month: StoreResult[];
  nssGoal?: number | null;
  vsGoal?: number | null;
}

/** Card 1080×1080 para postar no Teams (exportado como PNG) */
export const ResultCard = forwardRef<HTMLDivElement, Props>(({ storeName, day, month, nssGoal, vsGoal }, ref) => {
  const d = summarize([day]);
  const m = summarize(month);
  const falta = day.meta_vendas != null && day.vendas != null ? Number(day.meta_vendas) - Number(day.vendas) : null;
  const headline =
    d.vendasPct == null
      ? 'Resultado do dia'
      : d.vendasPct >= 100
        ? 'Meta de vendas batida! 🎯'
        : `Faltaram ${brl(falta)} para a meta`;

  const tile = (label: string, value: string, sub?: string, good?: boolean | null) => (
    <div style={{ background: '#fff', borderRadius: 26, padding: '22px 28px', boxShadow: '0 2px 0 rgba(0,0,0,.04)' }}>
      <div style={{ fontSize: 22, color: RD.cinza, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 54, fontWeight: 800, color: good == null ? RD.verdeEscuro : good ? RD.verde : RD.ambar, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 22, color: RD.cinza, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        background: RD.creme,
        fontFamily: 'Nunito, "Varela Round", Inter, system-ui, sans-serif',
        padding: 52,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ background: RD.verde, color: '#fff', borderRadius: 30, padding: '28px 40px' }}>
        <div style={{ fontSize: 26, opacity: 0.9, fontWeight: 700 }}>
          {storeName} · {cap(format(fromISODate(day.date), "EEEE, dd/MM", { locale: ptBR }))}
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, marginTop: 2 }}>Acompanhamento do dia</div>
        <div style={{ fontSize: 30, color: RD.ouro, fontWeight: 800, marginTop: 6 }}>{headline}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {tile('Vendas', pct(d.vendasPct, 0), `${brl(d.vendas)} de ${brl(d.metaVendas)}`, d.vendasPct == null ? null : d.vendasPct >= 100)}
        {tile('Clientes', pct(d.clientesPct, 0), `${d.clientes} de ${d.metaClientes || '—'}`, d.clientesPct == null ? null : d.clientesPct >= 100)}
        {tile('Ticket médio', brl(d.ticket))}
        {tile('Venda simples', pct(day.venda_simples_pct), vsGoal ? `meta ${pct(vsGoal, 0)}` : undefined, day.venda_simples_pct == null || !vsGoal ? null : Number(day.venda_simples_pct) >= vsGoal)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        {tile('Encantômetro', d.nss == null ? '—' : d.nss.toLocaleString('pt-BR'), `${d.totalVotes} votos${nssGoal ? ` · meta ${nssGoal}` : ''}`, d.nss == null || !nssGoal ? null : d.nss >= nssGoal)}
        <div style={{ background: RD.verdeEscuro, color: '#fff', borderRadius: 26, padding: '22px 28px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>Acumulado do mês</div>
          <div style={{ fontSize: 27, marginTop: 8, lineHeight: 1.55 }}>
            Vendas <b style={{ color: RD.ouro }}>{pct(m.vendasPct, 1)}</b> da meta
            <br />
            Ticket <b style={{ color: RD.ouro }}>{brl(m.ticket)}</b> · VS <b style={{ color: RD.ouro }}>{pct(m.vendaSimples)}</b>
            <br />
            NSS <b style={{ color: RD.ouro }}>{m.nss == null ? '—' : m.nss.toLocaleString('pt-BR')}</b> ({m.totalVotes.toLocaleString('pt-BR')} votos)
          </div>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 22, color: RD.cinza, fontWeight: 700 }}>
        <span>Encantar é o nosso jeito de vender 💚</span>
        <span>Gincana Farma</span>
      </div>
    </div>
  );
});
ResultCard.displayName = 'ResultCard';
