import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/errors';
import { PERIOD_NAMES, type Period } from '@/lib/period';
import { ENTRY_STATUS, PILLARS, type EngagementRow, type EntryStatus, type AppSettings } from '@/types/db';

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PersonAvatar({ name, url, size = 36, className }: { name?: string | null; url?: string | null; size?: number; className?: string }) {
  return (
    <Avatar className={cn('shrink-0', className)} style={{ width: size, height: size }}>
      <AvatarImage src={url || undefined} alt={name || ''} />
      <AvatarFallback className="text-xs font-semibold">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: EntryStatus | string }) {
  const s = ENTRY_STATUS[status as EntryStatus];
  if (!s) return null;
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', s.className)}>{s.label}</span>;
}

/** Seletor Dia/Semana/Mês + navegação ‹ › */
export function PeriodNav({
  period,
  onPeriod,
  label,
  onPrev,
  onNext,
  onToday,
  periods = ['day', 'week', 'month'],
}: {
  period: Period;
  onPeriod?: (p: Period) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  periods?: Period[];
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onPrev} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onToday}
          className="min-w-0 flex-1 truncate rounded-md px-3 py-1.5 text-center text-sm font-semibold first-letter:uppercase hover:bg-muted sm:flex-none"
          title="Voltar para hoje"
        >
          {label}
        </button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onNext} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {onPeriod && periods.length > 1 && (
        <Tabs value={period} onValueChange={(v) => onPeriod(v as Period)}>
          <TabsList>
            {periods.map((p) => (
              <TabsTrigger key={p} value={p}>
                {PERIOD_NAMES[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}

export function scoreColor(v?: number | null) {
  if (v == null) return 'text-muted-foreground';
  if (v >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (v >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/** Anel com o Índice de Engajamento */
export function ScoreRing({ value, size = 112, label = 'Índice' }: { value?: number | null; size?: number; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const stroke = value == null ? 'hsl(var(--muted))' : v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold leading-none', scoreColor(value))}>{value == null ? '—' : Math.round(v)}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Barras dos 6 pilares do índice, com peso e explicação */
export function PillarBars({ row, settings, compact = false }: { row?: EngagementRow | null; settings?: AppSettings | null; compact?: boolean }) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
      {PILLARS.map((p) => {
        const v = row ? (row[p.key] as number | null) : null;
        const w = settings ? (settings[p.weightKey] as number) : null;
        return (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {p.label}
                    {w != null && <span className="ml-1 text-muted-foreground">· {w}%</span>}
                  </span>
                  <span className={cn('font-semibold tabular-nums', scoreColor(v))}>{v == null ? 'sem dado' : Math.round(v)}</span>
                </div>
                <Progress value={v ?? 0} className={cn('h-2', v == null && 'opacity-40')} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {p.hint}
              {v == null && '. Sem dado no período: o peso vai para os outros pilares.'}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg" aria-label="1º">🥇</span>;
  if (rank === 2) return <span className="text-lg" aria-label="2º">🥈</span>;
  if (rank === 3) return <span className="text-lg" aria-label="3º">🥉</span>;
  return <span className="w-6 text-center text-sm font-semibold text-muted-foreground tabular-nums">{rank}º</span>;
}
