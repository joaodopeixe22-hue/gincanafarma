import { LevelConfig } from '@/lib/levels';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: LevelConfig;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 px-1.5 text-xs gap-1',
  md: 'h-6 px-2 text-sm gap-1.5',
  lg: 'h-8 px-3 text-base gap-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function LevelBadge({ level, size = 'md', showName = false, className }: LevelBadgeProps) {
  const Icon = level.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        level.bgClass,
        level.textClass,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showName && <span>{level.name}</span>}
    </div>
  );

  if (showName) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{level.name}</p>
          <p className="text-xs text-muted-foreground">Nível {level.level}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
