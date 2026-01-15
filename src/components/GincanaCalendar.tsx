import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useViewMode } from '@/contexts/ViewModeContext';

interface GincanaCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  hasDataForDay: (date: Date) => boolean;
  isDateLocked?: (date: Date) => boolean;
  onDayClick: (date: Date) => void;
  canEdit?: boolean;
  canAdd?: boolean;
}

export function GincanaCalendar({ selectedDate, onSelectDate, hasDataForDay, isDateLocked, onDayClick, canEdit = false, canAdd = false }: GincanaCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { isMobile } = useViewMode();
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const weekDays = isMobile 
    ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border/50 shadow-glow",
      isMobile ? "p-4" : "p-6"
    )}>
      <div className={cn(
        "flex items-center justify-between",
        isMobile ? "mb-4" : "mb-6"
      )}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "rounded-lg bg-primary/10",
            isMobile ? "p-1.5" : "p-2"
          )}>
            <CalendarDays className={cn("text-primary", isMobile ? "w-4 h-4" : "w-5 h-5")} />
          </div>
          <h2 className={cn(
            "font-bold text-foreground capitalize",
            isMobile ? "text-base" : "text-xl"
          )}>
            {format(currentMonth, isMobile ? "MMM yyyy" : "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={cn(
              "hover:bg-primary/10 hover:border-primary/50",
              isMobile ? "h-8 w-8" : ""
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={cn(
              "hover:bg-primary/10 hover:border-primary/50",
              isMobile ? "h-8 w-8" : ""
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "grid grid-cols-7 mb-1 sm:mb-2",
        isMobile ? "gap-1" : "gap-2"
      )}>
        {weekDays.map((day, index) => (
          <div 
            key={`${day}-${index}`} 
            className={cn(
              "text-center font-medium text-muted-foreground py-1 sm:py-2",
              isMobile ? "text-[10px]" : "text-xs"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className={cn(
        "grid grid-cols-7",
        isMobile ? "gap-1" : "gap-2"
      )}>
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {days.map(day => {
          const hasData = hasDataForDay(day);
          const isLocked = isDateLocked?.(day) ?? false;
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          const isFutureDay = day > new Date();
          
          // Determinar se o dia é clicável:
          // - canEdit (admin) pode sempre clicar
          // - canAdd (member) pode clicar em dias passados/hoje que não estão bloqueados
          const isClickable = !isFutureDay && (canEdit || (canAdd && (!hasData || !isLocked)));
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              disabled={!isClickable && !hasData}
              className={cn(
                'aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center relative transition-all duration-200',
                isClickable && 'hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95',
                !isClickable && 'cursor-default',
                isFutureDay && 'opacity-40',
                isSelected && 'bg-primary text-primary-foreground shadow-glow-primary',
                !isSelected && isCurrentDay && 'bg-accent text-accent-foreground ring-2 ring-primary/50',
                !isSelected && !isCurrentDay && 'bg-muted/30',
                !isSelected && !isCurrentDay && isClickable && 'hover:bg-muted/50',
                hasData && !isSelected && !isLocked && 'ring-2 ring-success/50',
                hasData && isLocked && !isSelected && 'ring-2 ring-amber-500/50',
                // Touch-friendly sizing
                isMobile ? 'min-h-[40px]' : ''
              )}
            >
              <span className={cn(
                "font-semibold",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {format(day, 'd')}
              </span>
              {hasData && (
                <div className={cn(
                  "absolute rounded-full",
                  isMobile ? "bottom-0.5 w-1 h-1" : "bottom-1 w-1.5 h-1.5",
                  isLocked ? "bg-amber-500" : "bg-success"
                )} />
              )}
              {isLocked && hasData && (
                <div className={cn(
                  "absolute",
                  isMobile ? "top-0.5 right-0.5 text-[6px]" : "top-1 right-1 text-[8px]"
                )}>
                  🔒
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
