import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useIndividualRanking, TeamContribution, IndividualRanking } from '@/hooks/useIndividualRanking';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { LevelBadge } from '@/components/LevelBadge';
import { getLevelByPoints } from '@/lib/levels';

const teamConfig = {
  dna: { name: 'DNA', color: 'bg-blue-500', textColor: 'text-blue-500', borderColor: 'border-blue-500' },
  elite: { name: 'Elite', color: 'bg-purple-500', textColor: 'text-purple-500', borderColor: 'border-purple-500' },
  alcateia: { name: 'Alcateia', color: 'bg-amber-500', textColor: 'text-amber-500', borderColor: 'border-amber-500' },
};

interface IndividualRankingDashboardProps {
  selectedDate: Date;
}

function MemberCard({ member, rank }: { member: IndividualRanking; rank: number }) {
  const team = member.team_id ? teamConfig[member.team_id as keyof typeof teamConfig] : null;
  const initials = member.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const memberLevel = getLevelByPoints(member.total);

  const getRankBadge = () => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white">🥇 1º</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white">🥈 2º</Badge>;
    if (rank === 3) return <Badge className="bg-amber-700 text-white">🥉 3º</Badge>;
    return <Badge variant="outline">{rank}º</Badge>;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-muted/50",
      rank <= 3 && "bg-muted/30"
    )}>
      <div className="flex-shrink-0">
        {getRankBadge()}
      </div>
      <Avatar className="w-10 h-10">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="text-sm">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{member.full_name}</p>
          <LevelBadge level={memberLevel} size="sm" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>OFEX: {member.ofex}</span>
          <span>•</span>
          <span>Apoio: {member.apoio}</span>
          <span>•</span>
          <span>Sorria: {member.soria}</span>
          <span>•</span>
          <span>Cadastro: {member.cadastro}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-primary">{member.total}</p>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </div>
  );
}

function TeamContributionCard({ contribution, rank }: { contribution: TeamContribution; rank: number }) {
  const team = teamConfig[contribution.team_id as keyof typeof teamConfig];
  
  if (!team) return null;

  return (
    <Card className={cn("overflow-hidden", team.borderColor, "border-l-4")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", team.color)}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {contribution.members.length} membro{contribution.members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{contribution.total}</p>
            <p className="text-xs text-muted-foreground">pontos totais</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {contribution.members.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum membro com dados registrados
          </p>
        ) : (
          <div className="space-y-2">
            {contribution.members.map((member, index) => (
              <MemberCard key={member.user_id} member={member} rank={index + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPerformers({ rankings }: { rankings: IndividualRanking[] }) {
  const top3 = rankings.slice(0, 3);

  if (top3.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado registrado ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="order-1 sm:order-1 text-center">
              <Avatar className="w-16 h-16 mx-auto border-4 border-gray-400 shadow-lg">
                <AvatarImage src={top3[1].avatar_url || undefined} />
                <AvatarFallback>
                  {top3[1].full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium mt-2 truncate max-w-[100px]">{top3[1].full_name}</p>
              <Badge className="bg-gray-400 text-white mt-1">🥈 {top3[1].total} pts</Badge>
            </div>
          )}
          
          {/* 1st Place */}
          {top3[0] && (
            <div className="order-0 sm:order-2 text-center scale-110">
              <Avatar className="w-20 h-20 mx-auto border-4 border-yellow-500 shadow-xl">
                <AvatarImage src={top3[0].avatar_url || undefined} />
                <AvatarFallback>
                  {top3[0].full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold mt-2 truncate max-w-[120px]">{top3[0].full_name}</p>
              <Badge className="bg-yellow-500 text-white mt-1">🥇 {top3[0].total} pts</Badge>
            </div>
          )}
          
          {/* 3rd Place */}
          {top3[2] && (
            <div className="order-2 sm:order-3 text-center">
              <Avatar className="w-16 h-16 mx-auto border-4 border-amber-700 shadow-lg">
                <AvatarImage src={top3[2].avatar_url || undefined} />
                <AvatarFallback>
                  {top3[2].full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium mt-2 truncate max-w-[100px]">{top3[2].full_name}</p>
              <Badge className="bg-amber-700 text-white mt-1">🥉 {top3[2].total} pts</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function IndividualRankingDashboard({ selectedDate }: IndividualRankingDashboardProps) {
  const {
    isLoading,
    getDailyRanking,
    getWeeklyRanking,
    getMonthlyRanking,
    getDailyContributions,
    getWeeklyContributions,
    getMonthlyContributions,
  } = useIndividualRanking();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRankings = () => {
    switch (period) {
      case 'daily': return getDailyRanking(selectedDate);
      case 'weekly': return getWeeklyRanking(selectedDate);
      case 'monthly': return getMonthlyRanking(selectedDate);
    }
  };

  const getContributions = () => {
    switch (period) {
      case 'daily': return getDailyContributions(selectedDate);
      case 'weekly': return getWeeklyContributions(selectedDate);
      case 'monthly': return getMonthlyContributions(selectedDate);
    }
  };

  const getPeriodLabel = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    
    switch (period) {
      case 'daily': return format(selectedDate, "d 'de' MMMM", { locale: ptBR });
      case 'weekly': return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
      case 'monthly': return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const rankings = getRankings();
  const contributions = getContributions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Ranking Individual
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {getPeriodLabel()}
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TopPerformers rankings={rankings} />

      <div className="grid gap-6 lg:grid-cols-3">
        {contributions.map((contribution, index) => (
          <TeamContributionCard 
            key={contribution.team_id} 
            contribution={contribution} 
            rank={index + 1} 
          />
        ))}
      </div>
    </div>
  );
}
