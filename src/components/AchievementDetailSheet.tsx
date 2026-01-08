import { Achievement } from '@/types/profile';
import { 
  Trophy, Star, Medal, Crown, Award, Target, Sparkles,
  CalendarCheck, CalendarHeart, TrendingUp, Sunrise, Footprints,
  Circle, CircleDot, Lock,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

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
  'circle': Circle,
  'circle-dot': CircleDot,
};

const categoryLabels: Record<string, string> = {
  streak: 'Sequência',
  kpi: 'Pontuação',
  challenge: 'Desafios',
  milestone: 'Marcos',
};

const categoryColors: Record<string, string> = {
  streak: 'from-orange-500 to-amber-500',
  kpi: 'from-blue-500 to-cyan-500',
  challenge: 'from-purple-500 to-pink-500',
  milestone: 'from-emerald-500 to-green-500',
};

interface AchievementDetailSheetProps {
  achievement: Achievement | null;
  isUnlocked: boolean;
  achievedAt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementDetailSheet({ 
  achievement, 
  isUnlocked, 
  achievedAt,
  open,
  onOpenChange
}: AchievementDetailSheetProps) {
  if (!achievement) return null;

  const Icon = iconMap[achievement.icon] || Trophy;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{achievement.name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={cn(
              'relative flex items-center justify-center w-20 h-20 rounded-full',
              isUnlocked 
                ? `bg-gradient-to-br ${categoryColors[achievement.category]} shadow-lg` 
                : 'bg-muted/50 grayscale opacity-60',
              achievement.is_trophy && isUnlocked && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background'
            )}
          >
            {isUnlocked ? (
              <Icon className="w-10 h-10 text-white" />
            ) : (
              <Lock className="w-10 h-10 text-muted-foreground" />
            )}
            {achievement.is_trophy && isUnlocked && (
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400" />
            )}
          </motion.div>

          {/* Name */}
          <h3 className="text-xl font-bold text-foreground text-center">
            {achievement.name}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-center max-w-xs">
            {achievement.description}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {categoryLabels[achievement.category]}
            </Badge>
            <Badge variant="outline" className="text-primary">
              ⭐ {achievement.points} pontos
            </Badge>
            {achievement.is_trophy && (
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                🏆 Troféu
              </Badge>
            )}
          </div>

          {/* Status */}
          {isUnlocked && achievedAt ? (
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <Sparkles className="w-4 h-4" />
              <span>
                Desbloqueado em {new Date(achievedAt).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Ainda não desbloqueado</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
