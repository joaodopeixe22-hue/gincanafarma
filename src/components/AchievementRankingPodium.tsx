import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamBadge } from '@/components/TeamBadge';
import { AchievementRankingCard } from '@/components/AchievementRankingCard';
import { useAchievementRanking, AchievementRankingUser } from '@/hooks/useAchievementRanking';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const positionConfig: Record<number, { icon: React.ElementType; label: string; color: string; height: string; mobileHeight: string }> = {
  0: { icon: Crown, label: '1º Lugar', color: 'text-warning', height: 'h-32', mobileHeight: 'h-20' },
  1: { icon: Award, label: '2º Lugar', color: 'text-muted-foreground', height: 'h-24', mobileHeight: 'h-14' },
  2: { icon: Award, label: '3º Lugar', color: 'text-amber-700', height: 'h-20', mobileHeight: 'h-10' },
};

interface PodiumUserProps {
  user: AchievementRankingUser;
  position: number;
  isMobile: boolean;
}

function PodiumUser({ user, position, isMobile }: PodiumUserProps) {
  const config = positionConfig[position];
  const Icon = config.icon;
  
  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const podiumColors = {
    0: 'from-warning/20 to-warning/5 border-warning/30',
    1: 'from-muted to-muted/50 border-border',
    2: 'from-amber-900/20 to-amber-900/5 border-amber-700/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position === 0 ? 0.2 : position === 1 ? 0.1 : 0.3, duration: 0.4 }}
      className={cn(
        'flex flex-col items-center',
        position === 0 ? 'order-2' : position === 1 ? 'order-1' : 'order-3'
      )}
    >
      <Link to={`/profile/${user.user_id}`} className="flex flex-col items-center group">
        {/* Icon */}
        <Icon className={cn('mb-1 sm:mb-2', config.color, isMobile ? 'w-4 h-4' : 'w-6 h-6')} />
        
        {/* Avatar */}
        <div className="relative mb-1 sm:mb-2">
          <Avatar 
            className={cn(
              'border-2 group-hover:scale-105 transition-transform',
              isMobile ? 'h-10 w-10' : 'h-14 w-14',
              position === 0 ? 'border-warning' : position === 1 ? 'border-muted-foreground' : 'border-amber-700'
            )}
          >
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || 'User'} />
            <AvatarFallback className={cn(
              'bg-muted text-muted-foreground font-bold',
              isMobile ? 'text-xs' : 'text-base'
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <p className={cn(
          'font-semibold text-foreground text-center truncate',
          isMobile ? 'text-xs max-w-[60px]' : 'text-sm max-w-[100px]'
        )}>
          {user.full_name?.split(' ')[0] || 'Usuário'}
        </p>

        {/* Team - Hide on mobile */}
        {!isMobile && user.team_id && (
          <TeamBadge teamId={user.team_id} size="sm" />
        )}

        {/* Stats */}
        <div className={cn(
          'flex items-center gap-1 sm:gap-2 mt-1',
          isMobile ? 'text-[10px]' : 'text-xs'
        )}>
          <span className="flex items-center gap-0.5 text-warning">
            <Trophy className={isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {user.total_trophies}
          </span>
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Medal className={isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            {user.total_achievements}
          </span>
        </div>

        {/* Points */}
        <p className={cn(
          'font-bold mt-0.5',
          config.color,
          isMobile ? 'text-sm' : 'text-lg'
        )}>
          {user.total_points} pts
        </p>
      </Link>

      {/* Podium Bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className={cn(
          'mt-2 sm:mt-3 rounded-t-lg bg-gradient-to-b border-t border-x flex items-center justify-center',
          isMobile ? 'w-14' : 'w-20',
          isMobile ? config.mobileHeight : config.height,
          podiumColors[position as keyof typeof podiumColors]
        )}
      >
        <span className={cn('font-bold', config.color, isMobile ? 'text-lg' : 'text-2xl')}>
          {position + 1}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function AchievementRankingPodium() {
  const { ranking, isLoading } = useAchievementRanking(10);
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="text-center pb-3 sm:pb-6">
          <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-xl">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            Ranking de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-2 sm:gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className={cn('rounded-full', isMobile ? 'h-10 w-10' : 'h-14 w-14')} />
                <Skeleton className="h-3 w-12 sm:h-4 sm:w-20" />
                <Skeleton className={cn(isMobile ? 'h-14 w-14' : 'h-20 w-20')} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ranking.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="text-center pb-3 sm:pb-6">
          <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-xl">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
            Ranking de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 sm:py-12">
            <Medal className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Nenhuma conquista desbloqueada ainda</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70">As conquistas aparecerão aqui quando forem atribuídas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="text-center pb-3 sm:pb-6">
        <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-xl">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
          Ranking de Conquistas
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">Os membros com mais pontos de achievements</p>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex justify-center items-end gap-2 sm:gap-4 pt-2 sm:pt-4">
            {top3.map((user, index) => (
              <PodiumUser key={user.user_id} user={user} position={index} isMobile={isMobile} />
            ))}
          </div>
        )}

        {/* Rest of rankings */}
        {rest.length > 0 && (
          <div className="space-y-2 pt-3 sm:pt-4 border-t border-border/50">
            <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Classificação Geral</h4>
            {rest.map((user, index) => (
              <AchievementRankingCard key={user.user_id} user={user} position={index + 4} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
