import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GincanaCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  hasDataForDay: (date: Date) => boolean;
  onDayClick: (date: Date) => void;
  canEdit?: boolean;
  canAdd?: boolean;
}

export function GincanaCalendar({ selectedDate, onSelectDate, hasDataForDay, onDayClick, canEdit = false, canAdd = false }: GincanaCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-glow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="hover:bg-primary/10 hover:border-primary/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="hover:bg-primary/10 hover:border-primary/50"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {days.map(day => {
          const hasData = hasDataForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          
          // Determinar se o dia é clicável
          const isClickable = canEdit || (canAdd && !hasData);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              disabled={!isClickable && !hasData}
              className={cn(
                'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200',
                isClickable && 'hover:scale-105 hover:shadow-lg cursor-pointer',
                !isClickable && 'cursor-default',
                isSelected && 'bg-primary text-primary-foreground shadow-glow-primary',
                !isSelected && isCurrentDay && 'bg-accent text-accent-foreground ring-2 ring-primary/50',
                !isSelected && !isCurrentDay && 'bg-muted/30',
                !isSelected && !isCurrentDay && isClickable && 'hover:bg-muted/50',
                hasData && !isSelected && 'ring-2 ring-success/50'
              )}
            >
              <span className="text-sm font-semibold">{format(day, 'd')}</span>
              {hasData && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-success" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
