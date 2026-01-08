import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { LEVELS, LevelConfig } from '@/lib/levels';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LevelCardProps {
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  progress: number;
  pointsToNext: number;
  totalPoints: number;
}

export function LevelCard({
  currentLevel,
  nextLevel,
  progress,
  pointsToNext,
  totalPoints,
}: LevelCardProps) {
  const CurrentIcon = currentLevel.icon;
  const isMobile = useIsMobile();

  const LevelBadge = ({ level }: { level: typeof LEVELS[number] }) => {
    const Icon = level.icon;
    const isUnlocked = totalPoints >= level.minPoints;
    const isCurrent = level.level === currentLevel.level;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: level.level * 0.1 }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
          isUnlocked ? level.bgClass : 'bg-muted',
          isUnlocked ? level.textClass : 'text-muted-foreground',
          isCurrent && 'ring-2 ring-offset-2 ring-offset-background ring-current'
        )}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span>{level.name}</span>
        {!isUnlocked && !isMobile && (
          <span className="text-[10px] sm:text-xs opacity-60">({level.minPoints})</span>
        )}
      </motion.div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn('bg-gradient-to-r py-4 sm:py-6', currentLevel.gradient)}>
        <CardTitle className="flex items-center gap-3 text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <CurrentIcon className="w-6 h-6 sm:w-8 sm:h-8" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <span>Seu Nível</span>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <p className="text-base sm:text-lg font-bold">{currentLevel.name}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        <LevelProgressBar
          currentLevel={currentLevel}
          nextLevel={nextLevel}
          progress={progress}
          pointsToNext={pointsToNext}
          totalPoints={totalPoints}
        />

        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">Todos os Níveis</p>
          
          {isMobile ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {LEVELS.map((level) => (
                  <LevelBadge key={level.level} level={level} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((level) => (
                <LevelBadge key={level.level} level={level} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
