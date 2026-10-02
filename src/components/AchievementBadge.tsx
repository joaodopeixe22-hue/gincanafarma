import { useState } from 'react';
import { Achievement } from '@/types/profile';
import { Trophy, Lock, Sparkles } from 'lucide-react';
import { ACHIEVEMENT_ICONS as iconMap, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { AchievementDetailSheet } from './AchievementDetailSheet';


interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  achievedAt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ 
  achievement, 
  isUnlocked, 
  achievedAt,
  size = 'md' 
}: AchievementBadgeProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const Icon = iconMap[achievement.icon] || Trophy;
  
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-5 h-5 sm:w-6 sm:h-6',
    lg: 'w-6 h-6 sm:w-7 sm:h-7',
  };

  const categoryColors = CATEGORY_COLORS;

  const badgeElement = (
    <div 
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-95',
        sizeClasses[size],
        isUnlocked 
          ? `bg-gradient-to-br ${categoryColors[achievement.category]} shadow-lg hover:scale-110 cursor-pointer` 
          : 'bg-muted/50 grayscale opacity-40 cursor-default',
        achievement.is_trophy && isUnlocked && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
      )}
      onClick={isMobile ? () => setSheetOpen(true) : undefined}
    >
      <Icon className={cn(
        iconSizes[size],
        isUnlocked ? 'text-white' : 'text-muted-foreground'
      )} />
      {achievement.is_trophy && isUnlocked && size !== 'xs' && (
        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
      )}
    </div>
  );

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <>
        {badgeElement}
        <AchievementDetailSheet
          achievement={achievement}
          isUnlocked={isUnlocked}
          achievedAt={achievedAt}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </>
    );
  }

  // Desktop: use Tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeElement}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
          <p className="text-xs">
            <span className="text-primary font-medium">{achievement.points} pontos</span>
            {achievement.is_trophy && (
              <span className="ml-2 text-yellow-500">🏆 Troféu</span>
            )}
          </p>
          {isUnlocked && achievedAt && (
            <p className="text-xs text-muted-foreground">
              Desbloqueado em {new Date(achievedAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
