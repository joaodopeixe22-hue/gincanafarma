import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, isToday, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toISODate, WEEKDAY_SHORT } from '@/lib/period';
import type { EntryStatus } from '@/types/db';

interface GincanaCalendarProps {
  statusFor: (date: string) => EntryStatus | null;
  canOpen: (date: string) => boolean;
  onDayClick: (date: string) => void;
  weekStartsOn?: 0 | 1;
}

const STATUS_STYLE: Record<EntryStatus, string> = {
  approved: 'bg-emerald-500/15 ring-2 ring-emerald-500/50',
  pending: 'bg-amber-500/15 ring-2 ring-amber-500/50',
  rejected: 'bg-red-500/15 ring-2 ring-red-500/50',
};

/** Calendário dos meus lançamentos, colorido pelo status da aprovação */
export function GincanaCalendar({ statusFor, canOpen, onDayClick, weekStartsOn = 1 }: GincanaCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = (startOfMonth(month).getDay() - weekStartsOn + 7) % 7;
  const weekDays = [...WEEKDAY_SHORT.slice(weekStartsOn), ...WEEKDAY_SHORT.slice(0, weekStartsOn)];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-glow sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold first-letter:uppercase">{format(month, 'MMMM yyyy', { locale: ptBR })}</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(subMonths(month, 1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`e${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const iso = toISODate(day);
          const status = statusFor(iso);
          const clickable = canOpen(iso) || !!status;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => clickable && onDayClick(iso)}
              disabled={!clickable}
              className={cn(
                'relative flex aspect-square min-h-[38px] items-center justify-center rounded-lg text-sm font-semibold transition-all',
                clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-40',
                status ? STATUS_STYLE[status] : 'bg-muted/30',
                isToday(day) && 'outline outline-2 outline-primary',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500/60" /> aprovado</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500/60" /> aguardando</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/60" /> recusado</span>
      </div>
    </div>
  );
}
