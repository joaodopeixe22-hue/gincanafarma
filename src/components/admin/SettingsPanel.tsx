import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/common';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { PILLARS, type AppSettings, type KpiDefinition, type Team } from '@/types/db';
import { cn } from '@/lib/utils';

function StoreSettings({ settings }: { settings: AppSettings }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const weightSum = PILLARS.reduce((sum, p) => sum + Number(s[p.weightKey] || 0), 0);
  const num = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  const txt = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value });

  const save = async () => {
    const { id: _id, updated_at: _u, ...patch } = s;
    const { error } = await supabase.from('app_settings').update(patch).eq('id', true);
    if (error) return toast({ title: 'Não foi possível salvar', description: errorMessage(error), variant: 'destructive' });
    toast({ title: 'Configurações salvas' });
    qc.invalidateQueries();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loja e regras</CardTitle>
        <CardDescription>Valem para todo o app assim que salvar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label>Nome da loja</Label><Input value={s.store_name} onChange={txt('store_name')} /></div>
          <div className="space-y-1"><Label>Filial</Label><Input value={s.store_code ?? ''} onChange={txt('store_code')} /></div>
          <div className="space-y-1"><Label>Nome do circuito</Label><Input value={s.circuit_name} onChange={txt('circuit_name')} /></div>
          <div className="space-y-1">
            <Label>Semana começa</Label>
            <Select value={String(s.week_starts_on)} onValueChange={(v) => setS({ ...s, week_starts_on: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Segunda-feira</SelectItem>
                <SelectItem value="0">Domingo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dias para lançar atrasado</Label>
            <Input type="number" min={0} max={7} value={s.entry_window_days} onChange={num('entry_window_days')} />
          </div>
          <div className="space-y-1"><Label>Nota mínima no quiz (%)</Label><Input type="number" min={1} max={100} value={s.quiz_pass_pct} onChange={num('quiz_pass_pct')} /></div>
          <div className="space-y-1"><Label>Meta de NSS</Label><Input type="number" value={s.nss_goal} onChange={num('nss_goal')} /></div>
          <div className="space-y-1"><Label>Meta de venda simples (%)</Label><Input type="number" value={s.venda_simples_goal} onChange={num('venda_simples_goal')} /></div>
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center justify-between text-sm font-semibold">
            Pesos do Índice de Engajamento
            <span className={cn('tabular-nums', weightSum === 100 ? 'text-emerald-600' : 'text-red-600')}>soma {weightSum}/100</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.key} className="space-y-1">
                <Label className="text-xs">{p.label} (%)</Label>
                <Input type="number" min={0} max={100} value={s[p.weightKey] as number} onChange={num(p.weightKey)} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-sm font-semibold">Reconhecimento</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1"><Label className="text-xs">Pts elogio de colega</Label><Input type="number" value={s.recognition_points_peer} onChange={num('recognition_points_peer')} /></div>
            <div className="space-y-1"><Label className="text-xs">Pts reconhecimento do líder</Label><Input type="number" value={s.recognition_points_leader} onChange={num('recognition_points_leader')} /></div>
            <div className="space-y-1"><Label className="text-xs">Elogios por semana (cada)</Label><Input type="number" value={s.peer_recognitions_per_week} onChange={num('peer_recognitions_per_week')} /></div>
            <div className="space-y-1"><Label className="text-xs">Meta recebida/semana (índice)</Label><Input type="number" value={s.recognition_target_per_week} onChange={num('recognition_target_per_week')} /></div>
          </div>
        </div>

        <Button onClick={save} disabled={weightSum !== 100}>
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamsSettings({ teams }: { teams: Team[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState(teams);
  const [newId, setNewId] = useState('');
  useEffect(() => setRows(teams), [teams]);

  const save = async (t: Team) => {
    const { error } = await supabase
      .from('teams')
      .update({ name: t.name, short_name: t.short_name, color: t.color, icon: t.icon, is_active: t.is_active, sort_order: t.sort_order })
      .eq('id', t.id);
    if (error) return toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    toast({ title: `Equipe ${t.short_name} salva` });
    qc.invalidateQueries({ queryKey: ['teams'] });
  };
  const add = async () => {
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const { error } = await supabase.from('teams').insert({ id, name: newId.trim(), short_name: newId.trim(), sort_order: teams.length + 1 });
    if (error) return toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    setNewId('');
    qc.invalidateQueries({ queryKey: ['teams'] });
  };
  const upd = (id: string, patch: Partial<Team>) => setRows((r) => r.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipes</CardTitle>
        <CardDescription>Para tirar uma equipe da disputa, desative (o histórico fica).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className="grid grid-cols-[48px_1fr_1fr_56px_auto_auto] items-center gap-2">
            <Input value={t.icon} onChange={(e) => upd(t.id, { icon: e.target.value })} className="text-center" aria-label="Ícone" />
            <Input value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} aria-label="Nome" />
            <Input value={t.short_name} onChange={(e) => upd(t.id, { short_name: e.target.value })} aria-label="Nome curto" />
            <Input type="color" value={t.color} onChange={(e) => upd(t.id, { color: e.target.value })} className="h-9 p-1" aria-label="Cor" />
            <Switch checked={t.is_active} onCheckedChange={(v) => upd(t.id, { is_active: v })} aria-label="Ativa" />
            <Button size="sm" variant="outline" onClick={() => save(t)}>Salvar</Button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Nova equipe (ex.: Guardiões)" />
          <Button variant="outline" onClick={add} disabled={newId.trim().length < 2}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSettings({ kpis }: { kpis: KpiDefinition[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState(kpis);
  useEffect(() => setRows(kpis), [kpis]);
  const upd = (key: string, patch: Partial<KpiDefinition>) => setRows((r) => r.map((k) => (k.key === key ? { ...k, ...patch } : k)));
  const save = async (k: KpiDefinition) => {
    const { error } = await supabase
      .from('kpi_definitions')
      .update({ label: k.label, description: k.description, daily_max: k.daily_max, points_per_unit: k.points_per_unit, default_daily_goal: k.default_daily_goal, is_active: k.is_active })
      .eq('key', k.key);
    if (error) return toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    toast({ title: `${k.label} salvo` });
    qc.invalidateQueries({ queryKey: ['kpi_definitions'] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPIs da gincana</CardTitle>
        <CardDescription>
          Limite diário barra erros de digitação. Meta padrão vale para quem não tem meta individual (o líder define em Liderança › Equipe).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((k) => (
          <div key={k.key} className="grid grid-cols-2 items-end gap-2 rounded-xl border p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={k.label} onChange={(e) => upd(k.key, { label: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Limite/dia</Label><Input type="number" value={k.daily_max} onChange={(e) => upd(k.key, { daily_max: +e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Pontos/unidade</Label><Input type="number" value={k.points_per_unit} onChange={(e) => upd(k.key, { points_per_unit: +e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Meta padrão/dia</Label><Input type="number" value={k.default_daily_goal} onChange={(e) => upd(k.key, { default_daily_goal: +e.target.value })} /></div>
            <label className="flex items-center gap-1.5 pb-2 text-xs"><Switch checked={k.is_active} onCheckedChange={(v) => upd(k.key, { is_active: v })} />Ativo</label>
            <Button size="sm" variant="outline" onClick={() => save(k)}>Salvar</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsPanel() {
  const { settings, allTeams, allKpis, isLoading } = useAppConfig();
  if (isLoading || !settings) return <Loading />;
  return (
    <div className="space-y-4">
      <StoreSettings settings={settings} />
      <TeamsSettings teams={allTeams} />
      <KpiSettings kpis={allKpis} />
    </div>
  );
}
