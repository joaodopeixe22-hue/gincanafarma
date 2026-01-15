import { Monitor, Smartphone, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewMode, ViewMode } from '@/contexts/ViewModeContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const modes: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: 'auto', icon: Settings2, label: 'Automático' },
  { value: 'desktop', icon: Monitor, label: 'Desktop' },
  { value: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export function ViewModeToggle() {
  const { mode, setViewMode } = useViewMode();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
        {modes.map(({ value, icon: Icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-md transition-all',
                  mode === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => setViewMode(value)}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
