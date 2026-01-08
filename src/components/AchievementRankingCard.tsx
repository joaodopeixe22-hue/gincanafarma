import { Link } from 'react-router-dom';
import { Trophy, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamBadge } from '@/components/TeamBadge';
import { AchievementRankingUser } from '@/hooks/useAchievementRanking';
import { cn } from '@/lib/utils';

interface AchievementRankingCardProps {
  user: AchievementRankingUser;
  position: number;
}

export function AchievementRankingCard({ user, position }: AchievementRankingCardProps) {
  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <Link
      to={`/profile/${user.user_id}`}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-card hover:bg-muted/50 transition-colors border border-border/50"
    >
      {/* Position */}
      <div className="w-6 sm:w-8 text-center shrink-0">
        <span className="text-sm sm:text-lg font-bold text-muted-foreground">#{position}</span>
      </div>

      {/* Avatar */}
      <Avatar className="h-9 w-9 sm:h-12 sm:w-12 border-2 border-border shrink-0">
        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || 'User'} />
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs sm:text-base">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name and Team */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate text-sm sm:text-base">
          {user.full_name || 'Usuário'}
        </p>
        {user.team_id && (
          <TeamBadge teamId={user.team_id} size="sm" />
        )}
      </div>

      {/* Stats - Stack on mobile */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Medal className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{user.total_achievements}</span>
          </div>
          <div className="flex items-center gap-1 text-warning">
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{user.total_trophies}</span>
          </div>
        </div>
        <div className="font-bold text-primary text-sm sm:text-base">
          {user.total_points} pts
        </div>
      </div>
    </Link>
  );
}
