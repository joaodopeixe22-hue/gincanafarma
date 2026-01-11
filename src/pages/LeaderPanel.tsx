import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, Award, Heart, Bell, BarChart3, BookOpen, Plus, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamReports } from '@/hooks/useTeamReports';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useSuggestions } from '@/hooks/useSuggestions';
import { TeamSummaryCard } from '@/components/TeamSummaryCard';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { NotificationBell } from '@/components/NotificationBell';
import { GrantTeamAchievementModal } from '@/components/leader/GrantTeamAchievementModal';
import { SendRecognitionModal } from '@/components/leader/SendRecognitionModal';
import { SendNotificationModal } from '@/components/leader/SendNotificationModal';
import { TeamReportCard } from '@/components/leader/TeamReportCard';
import { PerformanceChart } from '@/components/leader/PerformanceChart';
import { MemberPerformanceTable } from '@/components/leader/MemberPerformanceTable';
import { CreateQuizModal } from '@/components/leader/CreateQuizModal';
import { QuizList } from '@/components/leader/QuizList';
import { SuggestionList } from '@/components/suggestions/SuggestionList';

const teamConfig: Record<string, { name: string; color: string }> = {
  dna: { name: 'DNA', color: '#3b82f6' },
  elite: { name: 'Elite', color: '#8b5cf6' },
  alcateia: { name: 'Alcateia', color: '#f59e0b' },
};

export default function LeaderPanel() {
  const { isAdmin, isLider, isLoading: authLoading, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [grantAchievementOpen, setGrantAchievementOpen] = useState(false);
  const [sendRecognitionOpen, setSendRecognitionOpen] = useState(false);
  const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
  const [createQuizOpen, setCreateQuizOpen] = useState(false);
  
  const canAccessPanel = isAdmin || isLider;
  const canSelectTeam = isAdmin;

  useEffect(() => {
    if (!profileLoading && profile) {
      setSelectedTeam(canSelectTeam ? (profile.team_id || 'dna') : profile.team_id);
    }
  }, [profile, profileLoading, canSelectTeam]);

  const { members, teamTotals, isLoading: membersLoading } = useTeamMembers(selectedTeam);
  const { dailyData, weeklyComparison, memberPerformance, isLoading: reportsLoading } = useTeamReports(selectedTeam);
  const { quizzes, isLoading: quizzesLoading, createQuiz, toggleQuizActive, deleteQuiz } = useQuizzes(user?.id);
  const { suggestions, isLoading: suggestionsLoading, pendingCount, respondToSuggestion } = useSuggestions(user?.id, true);

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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Painel de Liderança
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie sua equipe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell userId={user?.id} />
              {canSelectTeam && (
                <Select value={selectedTeam || ''} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(teamConfig).map(([id, config]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                          {config.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!selectedTeam ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Você não está associado a nenhuma equipe.</p>
          </div>
        ) : (
          <Tabs defaultValue="team" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="team"><Users className="w-4 h-4 mr-1" />Equipe</TabsTrigger>
              <TabsTrigger value="actions"><Award className="w-4 h-4 mr-1" />Ações</TabsTrigger>
              <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-1" />Relatórios</TabsTrigger>
              <TabsTrigger value="quizzes"><BookOpen className="w-4 h-4 mr-1" />Quizzes</TabsTrigger>
              <TabsTrigger value="suggestions" className="relative">
                <Lightbulb className="w-4 h-4 mr-1" />Sugestões
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1" />Notificar</TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="space-y-6">
              {membersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                <>
                  {currentTeamConfig && <TeamSummaryCard teamName={currentTeamConfig.name} teamColor={currentTeamConfig.color} totals={teamTotals} />}
                  <h2 className="text-lg font-semibold">Ranking ({members.length} membros)</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((member, index) => (
                      <TeamMemberCard key={member.id} {...member} rank={index + 1} showGoalsButton />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setGrantAchievementOpen(true)}>
                  <Award className="w-8 h-8 text-yellow-500" />
                  <span>Conceder Conquista</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setSendRecognitionOpen(true)}>
                  <Heart className="w-8 h-8 text-pink-500" />
                  <span>Enviar Reconhecimento</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setSendNotificationOpen(true)}>
                  <Bell className="w-8 h-8 text-blue-500" />
                  <span>Notificar Equipe</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              {reportsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                <>
                  {currentTeamConfig && <TeamReportCard teamName={currentTeamConfig.name} teamColor={currentTeamConfig.color} weeklyComparison={weeklyComparison} memberCount={members.length} />}
                  <PerformanceChart dailyData={dailyData} />
                  <MemberPerformanceTable members={memberPerformance} />
                </>
              )}
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Quizzes Educativos</h2>
                <Button onClick={() => setCreateQuizOpen(true)}><Plus className="w-4 h-4 mr-1" />Criar Quiz</Button>
              </div>
              {quizzesLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : (
                <QuizList quizzes={quizzes} onToggleActive={toggleQuizActive} onDelete={deleteQuiz} />
              )}
            </TabsContent>

            <TabsContent value="suggestions">
              <SuggestionList
                suggestions={suggestions}
                isLoading={suggestionsLoading}
                pendingCount={pendingCount}
                onRespond={respondToSuggestion}
              />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Button className="w-full h-24 flex-col gap-2" variant="outline" onClick={() => setSendNotificationOpen(true)}>
                <Bell className="w-8 h-8" />
                <span>Enviar Notificação para a Equipe</span>
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <GrantTeamAchievementModal open={grantAchievementOpen} onOpenChange={setGrantAchievementOpen} teamId={selectedTeam} />
      <SendRecognitionModal open={sendRecognitionOpen} onOpenChange={setSendRecognitionOpen} teamId={selectedTeam} fromUserId={user?.id || ''} />
      <SendNotificationModal open={sendNotificationOpen} onOpenChange={setSendNotificationOpen} teamId={selectedTeam} />
      <CreateQuizModal open={createQuizOpen} onOpenChange={setCreateQuizOpen} onCreateQuiz={async (...args) => { await createQuiz(...args); }} />
    </div>
  );
}
