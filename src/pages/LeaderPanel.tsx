import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Award, BarChart3, Bell, BookOpen, ClipboardCheck, Flag, Heart, Lightbulb, Loader2, Plus, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { usePendingCount } from '@/hooks/data/useEntries';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamReports } from '@/hooks/useTeamReports';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useSuggestions } from '@/hooks/useSuggestions';
import { TeamSummaryCard } from '@/components/TeamSummaryCard';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { GrantTeamAchievementModal } from '@/components/leader/GrantTeamAchievementModal';
import { SendRecognitionModal } from '@/components/leader/SendRecognitionModal';
import { SendNotificationModal } from '@/components/leader/SendNotificationModal';
import { TeamReportCard } from '@/components/leader/TeamReportCard';
import { PerformanceChart } from '@/components/leader/PerformanceChart';
import { MemberPerformanceTable } from '@/components/leader/MemberPerformanceTable';
import { CreateQuizModal } from '@/components/leader/CreateQuizModal';
import { QuizList } from '@/components/leader/QuizList';
import { SuggestionList } from '@/components/suggestions/SuggestionList';
import { ApprovalsPanel } from '@/components/lideranca/ApprovalsPanel';
import { ChallengesPanel } from '@/components/lideranca/ChallengesPanel';

const ALL = '__all__';

export default function LeaderPanel() {
  const { isAdmin, isLider, isLoading: authLoading, user } = useAuth();
  const { teams, teamById } = useAppConfig();
  const { me, canManage } = useDirectory();
  const pendingQ = usePendingCount(isLider);

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [grantAchievementOpen, setGrantAchievementOpen] = useState(false);
  const [sendRecognitionOpen, setSendRecognitionOpen] = useState(false);
  const [sendNotificationOpen, setSendNotificationOpen] = useState(false);
  const [createQuizOpen, setCreateQuizOpen] = useState(false);

  useEffect(() => {
    if (me && selectedTeam === null) setSelectedTeam(isAdmin ? ALL : me.team_id);
  }, [me, isAdmin, selectedTeam]);

  const teamFilter = selectedTeam === ALL ? null : selectedTeam;
  const reportTeam = teamFilter ?? me?.team_id ?? teams[0]?.id ?? null;
  const { members, teamTotals, isLoading: membersLoading } = useTeamMembers(reportTeam);
  const { dailyData, weeklyComparison, memberPerformance, isLoading: reportsLoading } = useTeamReports(reportTeam);
  const { quizzes, isLoading: quizzesLoading, createQuiz, toggleQuizActive, deleteQuiz } = useQuizzes(user?.id);
  const { suggestions, isLoading: suggestionsLoading, pendingCount, respondToSuggestion } = useSuggestions(user?.id, true);
  const approvals = (pendingQ.data ?? []).filter((p) => canManage(p.user_id)).length;

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isLider) return <Navigate to="/" replace />;

  const team = teamById(reportTeam);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Liderança"
        icon={<Star className="h-6 w-6 text-warning" />}
        subtitle={isAdmin ? 'Você gerencia todas as equipes' : `Equipe ${team?.name ?? ''}`}
        actions={
          isAdmin && (
            <Select value={selectedTeam ?? ALL} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as equipes</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {!me?.team_id && !isAdmin ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Você não está associado a nenhuma equipe. Peça ao admin.</p>
        </div>
      ) : (
        <Tabs defaultValue="aprovacoes" className="space-y-4">
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="aprovacoes" className="relative">
                <ClipboardCheck className="mr-1 h-4 w-4" />Aprovações
                {approvals > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{approvals}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="campanhas"><Flag className="mr-1 h-4 w-4" />Campanhas</TabsTrigger>
              <TabsTrigger value="team"><Users className="mr-1 h-4 w-4" />Equipe</TabsTrigger>
              <TabsTrigger value="actions"><Award className="mr-1 h-4 w-4" />Ações</TabsTrigger>
              <TabsTrigger value="reports"><BarChart3 className="mr-1 h-4 w-4" />Relatórios</TabsTrigger>
              <TabsTrigger value="quizzes"><BookOpen className="mr-1 h-4 w-4" />Quizzes</TabsTrigger>
              <TabsTrigger value="suggestions">
                <Lightbulb className="mr-1 h-4 w-4" />Sugestões
                {pendingCount > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{pendingCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="aprovacoes">
            <ApprovalsPanel teamId={teamFilter} />
          </TabsContent>

          <TabsContent value="campanhas">
            <ChallengesPanel />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {membersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                {team && <TeamSummaryCard teamName={team.name} teamColor={team.color} totals={teamTotals} />}
                <h2 className="text-lg font-semibold">Ranking de KPIs aprovados ({members.length} pessoas)</h2>
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
                <Award className="h-8 w-8 text-yellow-500" />
                <span>Conceder conquista especial</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setSendRecognitionOpen(true)}>
                <Heart className="h-8 w-8 text-pink-500" />
                <span>Reconhecer alguém</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setSendNotificationOpen(true)}>
                <Bell className="h-8 w-8 text-blue-500" />
                <span>Avisar a equipe</span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {reportsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                {team && <TeamReportCard teamName={team.name} teamColor={team.color} weeklyComparison={weeklyComparison} memberCount={members.length} />}
                <PerformanceChart dailyData={dailyData} />
                <MemberPerformanceTable members={memberPerformance} />
              </>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quizzes</h2>
              <Button onClick={() => setCreateQuizOpen(true)}><Plus className="mr-1 h-4 w-4" />Criar quiz</Button>
            </div>
            {quizzesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <QuizList quizzes={quizzes} onToggleActive={toggleQuizActive} onDelete={deleteQuiz} />
            )}
          </TabsContent>

          <TabsContent value="suggestions">
            <SuggestionList suggestions={suggestions} isLoading={suggestionsLoading} pendingCount={pendingCount} onRespond={respondToSuggestion} />
          </TabsContent>
        </Tabs>
      )}

      <GrantTeamAchievementModal open={grantAchievementOpen} onOpenChange={setGrantAchievementOpen} teamId={reportTeam} />
      <SendRecognitionModal open={sendRecognitionOpen} onOpenChange={setSendRecognitionOpen} teamId={teamFilter} />
      <SendNotificationModal open={sendNotificationOpen} onOpenChange={setSendNotificationOpen} teamId={reportTeam} />
      <CreateQuizModal open={createQuizOpen} onOpenChange={setCreateQuizOpen} onCreateQuiz={async (...args) => { await createQuiz(...args); }} />
    </div>
  );
}
