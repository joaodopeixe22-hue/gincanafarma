import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LevelProgressBar } from '@/components/LevelProgressBar';
import { LEVELS, LevelConfig } from '@/lib/levels';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn('bg-gradient-to-r', currentLevel.gradient)}>
        <CardTitle className="flex items-center gap-3 text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <CurrentIcon className="w-8 h-8" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span>Seu Nível</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{currentLevel.name}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <LevelProgressBar
          currentLevel={currentLevel}
          nextLevel={nextLevel}
          progress={progress}
          pointsToNext={pointsToNext}
          totalPoints={totalPoints}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Todos os Níveis</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => {
              const Icon = level.icon;
              const isUnlocked = totalPoints >= level.minPoints;
              const isCurrent = level.level === currentLevel.level;

              return (
                <motion.div
                  key={level.level}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: level.level * 0.1 }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    isUnlocked ? level.bgClass : 'bg-muted',
                    isUnlocked ? level.textClass : 'text-muted-foreground',
                    isCurrent && 'ring-2 ring-offset-2 ring-offset-background',
                    isCurrent && `ring-current`
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{level.name}</span>
                  {!isUnlocked && (
                    <span className="text-xs opacity-60">({level.minPoints} pts)</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
