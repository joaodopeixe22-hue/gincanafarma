import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trophy, History } from 'lucide-react';

interface MemberTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
}

interface TeamMemberCardProps {
  id: string;
  full_name: string | null;
  matricula: string | null;
  avatar_url: string | null;
  totals: MemberTotals;
  rank: number;
}

export function TeamMemberCard({ id, full_name, matricula, avatar_url, totals, rank }: TeamMemberCardProps) {
  const initials = full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-white';
    if (rank === 2) return 'bg-slate-400 text-white';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Rank Badge */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(rank)}`}>
            {rank <= 3 ? <Trophy className="w-4 h-4" /> : rank}
          </div>

          {/* Avatar */}
          <Avatar className="w-12 h-12">
            <AvatarImage src={avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{full_name || 'Sem nome'}</p>
            {matricula && (
              <p className="text-xs text-muted-foreground">Mat: {matricula}</p>
            )}
          </div>

          {/* Score */}
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{totals.total}</p>
            <p className="text-xs text-muted-foreground">pontos</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          <Badge variant="secondary" className="text-xs">
            OFEX: {totals.ofex}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Apoio: {totals.apoio}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Sorria: {totals.soria}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Cadastro: {totals.cadastro}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/profile/${id}`}>
              <Eye className="w-4 h-4 mr-1" />
              Ver Perfil
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
