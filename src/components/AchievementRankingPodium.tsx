import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamBadge } from '@/components/TeamBadge';
import { AchievementRankingCard } from '@/components/AchievementRankingCard';
import { useAchievementRanking, AchievementRankingUser } from '@/hooks/useAchievementRanking';
import { Skeleton } from '@/components/ui/skeleton';

const positionConfig: Record<number, { icon: React.ElementType; label: string; color: string; height: string }> = {
  0: { icon: Crown, label: '1º Lugar', color: 'text-warning', height: 'h-32' },
  1: { icon: Award, label: '2º Lugar', color: 'text-muted-foreground', height: 'h-24' },
  2: { icon: Award, label: '3º Lugar', color: 'text-amber-700', height: 'h-20' },
};

interface PodiumUserProps {
  user: AchievementRankingUser;
  position: number;
}

function PodiumUser({ user, position }: PodiumUserProps) {
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
      className={`flex flex-col items-center ${position === 0 ? 'order-2' : position === 1 ? 'order-1' : 'order-3'}`}
    >
      <Link to={`/profile/${user.user_id}`} className="flex flex-col items-center group">
        {/* Icon */}
        <Icon className={`w-6 h-6 ${config.color} mb-2`} />
        
        {/* Avatar */}
        <div className="relative mb-2">
          <Avatar className={`h-16 w-16 border-3 ${position === 0 ? 'border-warning' : position === 1 ? 'border-muted-foreground' : 'border-amber-700'} group-hover:scale-105 transition-transform`}>
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || 'User'} />
            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <p className="font-semibold text-foreground text-sm text-center max-w-[100px] truncate">
          {user.full_name || 'Usuário'}
        </p>

        {/* Team */}
        {user.team_id && (
          <TeamBadge teamId={user.team_id} size="sm" />
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="flex items-center gap-0.5 text-warning">
            <Trophy className="w-3 h-3" />
            {user.total_trophies}
          </span>
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Medal className="w-3 h-3" />
            {user.total_achievements}
          </span>
        </div>

        {/* Points */}
        <p className={`font-bold text-lg ${config.color} mt-1`}>
          {user.total_points} pts
        </p>
      </Link>

      {/* Podium Bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className={`w-24 ${config.height} mt-3 rounded-t-lg bg-gradient-to-b ${podiumColors[position as keyof typeof podiumColors]} border-t border-x flex items-center justify-center`}
      >
        <span className={`text-2xl font-bold ${config.color}`}>
          {position + 1}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function AchievementRankingPodium() {
  const { ranking, isLoading } = useAchievementRanking(10);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-warning" />
            Ranking de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-20 w-24" />
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
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-warning" />
            Ranking de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Medal className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma conquista desbloqueada ainda</p>
            <p className="text-sm text-muted-foreground/70">As conquistas aparecerão aqui quando forem atribuídas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-warning" />
          Ranking de Conquistas
        </CardTitle>
        <p className="text-sm text-muted-foreground">Os membros com mais pontos de achievements</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Podium */}
        {top3.length > 0 && (
          <div className="flex justify-center items-end gap-4 pt-4">
            {top3.map((user, index) => (
              <PodiumUser key={user.user_id} user={user} position={index} />
            ))}
          </div>
        )}

        {/* Rest of rankings */}
        {rest.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Classificação Geral</h4>
            {rest.map((user, index) => (
              <AchievementRankingCard key={user.user_id} user={user} position={index + 4} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
