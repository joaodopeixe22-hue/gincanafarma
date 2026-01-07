import { Profile } from '@/types/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const teamConfig = {
  dna: { name: 'DNA', color: 'bg-blue-500' },
  elite: { name: 'Elite', color: 'bg-purple-500' },
  alcateia: { name: 'Alcateia', color: 'bg-amber-500' },
};

interface ProfileCardProps {
  profile: Profile | null;
  role?: 'root' | 'admin' | 'member' | null;
  totalPoints: number;
  achievementsCount: number;
  canEdit: boolean;
  onEdit: () => void;
}

export function ProfileCard({ 
  profile, 
  role, 
  totalPoints, 
  achievementsCount,
  canEdit, 
  onEdit 
}: ProfileCardProps) {
  const team = profile?.team_id ? teamConfig[profile.team_id] : null;
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'h-24 bg-gradient-to-r',
        team ? `from-${team.color.replace('bg-', '')} to-${team.color.replace('bg-', '')}/70` : 'from-primary to-primary/70'
      )} 
      style={{
        background: team 
          ? `linear-gradient(to right, var(--${team.color.replace('bg-', '')}), var(--${team.color.replace('bg-', '')}))`
          : undefined
      }}
      />
      <CardContent className="relative pt-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center sm:text-left pb-2">
            <h2 className="text-2xl font-bold">
              {profile?.full_name || 'Usuário'}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
              {team && (
                <Badge className={cn(team.color, 'text-white')}>
                  {team.name}
                </Badge>
              )}
              {role === 'root' && (
                <Badge variant="outline" className="border-rose-500 text-rose-500">
                  Root
                </Badge>
              )}
              {role === 'admin' && (
                <Badge variant="outline" className="border-amber-500 text-amber-500">
                  Admin
                </Badge>
              )}
              {role === 'member' && (
                <Badge variant="outline" className="border-primary text-primary">
                  Membro
                </Badge>
              )}
            </div>
          </div>

          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          )}
        </div>

        {profile?.bio && (
          <p className="mt-4 text-muted-foreground">{profile.bio}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Pontos</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{achievementsCount}</p>
            <p className="text-sm text-muted-foreground">Conquistas</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
