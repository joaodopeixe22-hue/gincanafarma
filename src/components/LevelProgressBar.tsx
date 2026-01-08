import { LevelConfig } from '@/lib/levels';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  progress: number;
  pointsToNext: number;
  totalPoints: number;
  className?: string;
  compact?: boolean;
}

export function LevelProgressBar({
  currentLevel,
  nextLevel,
  progress,
  pointsToNext,
  totalPoints,
  className,
  compact = false,
}: LevelProgressBarProps) {
  const CurrentIcon = currentLevel.icon;
  const NextIcon = nextLevel?.icon;

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', currentLevel.textClass)}>
            {totalPoints} pts
          </span>
          {nextLevel && (
            <span className="text-muted-foreground">
              {pointsToNext} pts para {nextLevel.name}
            </span>
          )}
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all duration-500',
              currentLevel.gradient
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-full', currentLevel.bgClass)}>
            <CurrentIcon className={cn('w-4 h-4', currentLevel.textClass)} />
          </div>
          <span className={cn('font-semibold', currentLevel.textClass)}>
            {currentLevel.name}
          </span>
        </div>
        {nextLevel && NextIcon && (
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', nextLevel.textClass)}>
              {nextLevel.name}
            </span>
            <div className={cn('p-1.5 rounded-full opacity-50', nextLevel.bgClass)}>
              <NextIcon className={cn('w-4 h-4', nextLevel.textClass)} />
            </div>
          </div>
        )}
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            currentLevel.gradient
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{totalPoints} pontos</span>
        {nextLevel ? (
          <span className="text-muted-foreground">
            Faltam <span className="font-semibold">{pointsToNext}</span> pts para {nextLevel.name}
          </span>
        ) : (
          <span className="text-muted-foreground">Nível máximo alcançado! 🎉</span>
        )}
      </div>
    </div>
  );
}
