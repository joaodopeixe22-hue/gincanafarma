import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Period = 'day' | 'week' | 'month';
export type WeekStart = 0 | 1;

export interface DateRange {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
}

/** Data no formato do banco (yyyy-MM-dd), no fuso do aparelho. */
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

/** Converte 'yyyy-MM-dd' para Date à meia-noite local (sem o bug do fuso UTC). */
export const fromISODate = (s: string) => parseISO(s);

export const todayISO = () => toISODate(new Date());

/** Início da semana segundo a configuração da loja (uma única regra no app inteiro). */
export function weekStartOf(ref: Date, weekStartsOn: WeekStart): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return subDays(d, diff);
}

export function periodRange(period: Period, ref: Date, weekStartsOn: WeekStart): DateRange {
  let start: Date;
  let end: Date;
  if (period === 'day') {
    start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    end = start;
  } else if (period === 'week') {
    start = weekStartOf(ref, weekStartsOn);
    end = addDays(start, 6);
  } else {
    start = startOfMonth(ref);
    end = endOfMonth(ref);
  }
  return { start, end, startStr: toISODate(start), endStr: toISODate(end) };
}

export function shiftPeriod(period: Period, ref: Date, steps: number): Date {
  if (period === 'day') return addDays(ref, steps);
  if (period === 'week') return addDays(ref, steps * 7);
  return steps >= 0 ? addMonths(ref, steps) : subMonths(ref, -steps);
}

export function periodLabel(period: Period, range: DateRange): string {
  if (period === 'day') return format(range.start, "EEEE, d 'de' MMMM", { locale: ptBR });
  if (period === 'week')
    return `${format(range.start, "d 'de' MMM", { locale: ptBR })} – ${format(range.end, "d 'de' MMM", { locale: ptBR })}`;
  return format(range.start, "MMMM 'de' yyyy", { locale: ptBR });
}

export const PERIOD_NAMES: Record<Period, string> = { day: 'Dia', week: 'Semana', month: 'Mês' };

export function daysOf(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);
  return days;
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
