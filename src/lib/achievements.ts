import {
  AlarmClockCheck, Award, BadgeCheck, BookOpen, CalendarCheck, CalendarHeart, Circle, CircleDot, Crown, Flag, Flame, Footprints,
  Gem, GraduationCap, HandHeart, Handshake, Heart, ListChecks, Medal, ShieldCheck, Smile, Sparkles, Star, Sunrise, Target,
  TrendingUp, Trophy, Zap, type LucideIcon,
} from 'lucide-react';

/** Ícone de cada conquista (campo "icon" no banco) */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy, star: Star, medal: Medal, crown: Crown, award: Award, target: Target, sparkles: Sparkles,
  'calendar-check': CalendarCheck, 'calendar-heart': CalendarHeart, 'trending-up': TrendingUp, sunrise: Sunrise,
  footprints: Footprints, circle: Circle, 'circle-dot': CircleDot, flame: Flame, 'book-open': BookOpen,
  'graduation-cap': GraduationCap, 'badge-check': BadgeCheck, 'list-checks': ListChecks, 'alarm-clock-check': AlarmClockCheck,
  flag: Flag, heart: Heart, 'hand-heart': HandHeart, zap: Zap, gem: Gem, smile: Smile, handshake: Handshake,
  'shield-check': ShieldCheck,
};

export const CATEGORY_LABELS: Record<string, string> = {
  streak: 'Sequência',
  kpi: 'Pontuação',
  challenge: 'Desafios e campanhas',
  milestone: 'Marcos',
  learning: 'Aprendizado',
  social: 'Reconhecimento',
  tasks: 'Agenda',
  engagement: 'Engajamento',
  special: 'Especiais (do líder)',
};

export const CATEGORY_COLORS: Record<string, string> = {
  streak: 'from-orange-500 to-amber-500',
  kpi: 'from-blue-500 to-cyan-500',
  challenge: 'from-purple-500 to-pink-500',
  milestone: 'from-emerald-500 to-green-500',
  learning: 'from-indigo-500 to-violet-500',
  social: 'from-pink-500 to-rose-500',
  tasks: 'from-sky-500 to-teal-500',
  engagement: 'from-yellow-500 to-orange-500',
  special: 'from-amber-400 to-yellow-600',
};
