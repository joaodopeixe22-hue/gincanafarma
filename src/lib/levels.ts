import { Star, Award, Shield, Crown, Gem, Trophy, LucideIcon } from 'lucide-react';

export interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  gradient: string;
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Iniciante',
    minPoints: 0,
    maxPoints: 99,
    color: 'hsl(var(--muted-foreground))',
    gradient: 'from-gray-400 to-gray-600',
    icon: Star,
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
  },
  {
    level: 2,
    name: 'Bronze',
    minPoints: 100,
    maxPoints: 299,
    color: 'hsl(25, 70%, 45%)',
    gradient: 'from-amber-600 to-amber-800',
    icon: Award,
    bgClass: 'bg-amber-700/20',
    textClass: 'text-amber-700',
  },
  {
    level: 3,
    name: 'Prata',
    minPoints: 300,
    maxPoints: 599,
    color: 'hsl(210, 20%, 60%)',
    gradient: 'from-slate-300 to-slate-500',
    icon: Shield,
    bgClass: 'bg-slate-400/20',
    textClass: 'text-slate-500',
  },
  {
    level: 4,
    name: 'Ouro',
    minPoints: 600,
    maxPoints: 999,
    color: 'hsl(45, 90%, 50%)',
    gradient: 'from-yellow-400 to-amber-500',
    icon: Crown,
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-600',
  },
  {
    level: 5,
    name: 'Diamante',
    minPoints: 1000,
    maxPoints: 1999,
    color: 'hsl(190, 80%, 55%)',
    gradient: 'from-cyan-300 to-blue-500',
    icon: Gem,
    bgClass: 'bg-cyan-400/20',
    textClass: 'text-cyan-500',
  },
  {
    level: 6,
    name: 'Lenda',
    minPoints: 2000,
    maxPoints: Infinity,
    color: 'hsl(280, 70%, 55%)',
    gradient: 'from-purple-400 to-pink-600',
    icon: Trophy,
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-500',
  },
];

export function getLevelByPoints(points: number): LevelConfig {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevel(currentLevel: LevelConfig): LevelConfig | null {
  const index = LEVELS.findIndex(l => l.level === currentLevel.level);
  if (index < LEVELS.length - 1) {
    return LEVELS[index + 1];
  }
  return null;
}

export function getProgressToNextLevel(points: number): number {
  const currentLevel = getLevelByPoints(points);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 100;
  
  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  
  return Math.min(100, Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100));
}

export function getPointsToNextLevel(points: number): number {
  const currentLevel = getLevelByPoints(points);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 0;
  
  return nextLevel.minPoints - points;
}
