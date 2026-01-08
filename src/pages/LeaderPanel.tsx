import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamSummaryCard } from '@/components/TeamSummaryCard';
import { TeamMemberCard } from '@/components/TeamMemberCard';

const teamConfig: Record<string, { name: string; color: string }> = {
  dna: { name: 'DNA', color: '#3b82f6' },
  elite: { name: 'Elite', color: '#8b5cf6' },
  alcateia: { name: 'Alcateia', color: '#f59e0b' },
};

export default function LeaderPanel() {
  const { isAdmin, isLider, isLoading: authLoading, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  
  // Para admins, permite selecionar qualquer equipe. Para líderes, usa a equipe deles.
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  
  const canAccessPanel = isAdmin || isLider;
  const canSelectTeam = isAdmin; // Apenas admins podem ver outras equipes

  // Definir equipe inicial baseado no perfil do usuário
  useEffect(() => {
    if (!profileLoading && profile) {
      if (canSelectTeam) {
        // Admin: começa com a primeira equipe ou a dele se tiver
        setSelectedTeam(profile.team_id || 'dna');
      } else {
        // Líder: usa apenas a equipe dele
        setSelectedTeam(profile.team_id);
      }
    }
  }, [profile, profileLoading, canSelectTeam]);

  const { members, teamTotals, isLoading: membersLoading } = useTeamMembers(selectedTeam);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessPanel) {
    return <Navigate to="/" replace />;
  }

  const currentTeamConfig = selectedTeam ? teamConfig[selectedTeam] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link to="/">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Painel de Liderança
                </h1>
                <p className="text-sm text-muted-foreground">
                  Visualize as métricas da sua equipe
                </p>
              </div>
            </div>

            {/* Seletor de equipe (apenas para admins) */}
            {canSelectTeam && (
              <Select value={selectedTeam || ''} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Equipe" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(teamConfig).map(([id, config]) => (
                    <SelectItem key={id} value={id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: config.color }}
                        />
                        {config.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {!selectedTeam ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você não está associado a nenhuma equipe.</p>
            <p className="text-sm">Entre em contato com um administrador.</p>
          </div>
        ) : membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Resumo da equipe */}
            {currentTeamConfig && (
              <TeamSummaryCard
                teamName={currentTeamConfig.name}
                teamColor={currentTeamConfig.color}
                totals={teamTotals}
              />
            )}

            {/* Lista de membros */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Ranking da Equipe ({members.length} membros)
              </h2>
              
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum membro encontrado nesta equipe.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {members.map((member, index) => (
                    <TeamMemberCard
                      key={member.id}
                      id={member.id}
                      full_name={member.full_name}
                      matricula={member.matricula}
                      avatar_url={member.avatar_url}
                      totals={member.totals}
                      rank={index + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
