import { Achievement } from '@/types/profile';
import { 
  Trophy, Star, Medal, Crown, Award, Target, Sparkles,
  CalendarCheck, CalendarHeart, TrendingUp, Sunrise, Footprints,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const iconMap: Record<string, LucideIcon> = {
  'trophy': Trophy,
  'star': Star,
  'medal': Medal,
  'crown': Crown,
  'award': Award,
  'target': Target,
  'sparkles': Sparkles,
  'calendar-check': CalendarCheck,
  'calendar-heart': CalendarHeart,
  'trending-up': TrendingUp,
  'sunrise': Sunrise,
  'footprints': Footprints,
};

interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  achievedAt?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ 
  achievement, 
  isUnlocked, 
  achievedAt,
  size = 'md' 
}: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon] || Trophy;
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const categoryColors = {
    streak: 'from-orange-500 to-amber-500',
    kpi: 'from-blue-500 to-cyan-500',
    challenge: 'from-purple-500 to-pink-500',
    milestone: 'from-emerald-500 to-green-500',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            'relative flex items-center justify-center rounded-full transition-all duration-300',
            sizeClasses[size],
            isUnlocked 
              ? `bg-gradient-to-br ${categoryColors[achievement.category]} shadow-lg hover:scale-110 cursor-pointer` 
              : 'bg-muted/50 grayscale opacity-40 cursor-default',
            achievement.is_trophy && isUnlocked && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
          )}
        >
          <Icon className={cn(
            iconSizes[size],
            isUnlocked ? 'text-white' : 'text-muted-foreground'
          )} />
          {achievement.is_trophy && isUnlocked && (
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
          )}
        </div>
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
