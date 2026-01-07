import { Link } from 'react-router-dom';
import { Trophy, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeamBadge } from '@/components/TeamBadge';
import { AchievementRankingUser } from '@/hooks/useAchievementRanking';

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
      className="flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-muted/50 transition-colors border border-border/50"
    >
      {/* Position */}
      <div className="w-8 text-center">
        <span className="text-lg font-bold text-muted-foreground">#{position}</span>
      </div>

      {/* Avatar */}
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || 'User'} />
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name and Team */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">
          {user.full_name || 'Usuário'}
        </p>
        {user.team_id && (
          <TeamBadge teamId={user.team_id} size="sm" />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Medal className="w-4 h-4" />
          <span>{user.total_achievements}</span>
        </div>
        <div className="flex items-center gap-1 text-warning">
          <Trophy className="w-4 h-4" />
          <span>{user.total_trophies}</span>
        </div>
        <div className="font-bold text-primary min-w-[60px] text-right">
          {user.total_points} pts
        </div>
      </div>
    </Link>
  );
}
