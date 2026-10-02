import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAchievements } from '@/hooks/useAchievements';
import { useSuggestions } from '@/hooks/useSuggestions';
import { AdminUserTable } from '@/components/AdminUserTable';
import { GrantAchievementModal } from '@/components/GrantAchievementModal';
import { CreateUserModal } from '@/components/CreateUserModal';
import { ResetTeamDataModal } from '@/components/ResetTeamDataModal';
import { SuggestionList } from '@/components/suggestions/SuggestionList';
import { WeeklyReportViewer } from '@/components/admin/WeeklyReportViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Trophy, Award, UserPlus, Crown, Lightbulb, BarChart3, RotateCcw, Settings } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { SettingsPanel } from '@/components/admin/SettingsPanel';

export default function AdminPanel() {
  const { isAdmin, isRoot, isLoading: authLoading, canManageUsers, user } = useAuth();
  const { users, isLoading: usersLoading, updateUserRole, updateUserProfile, refetch } = useAdminUsers();
  const { achievements, grantAchievement } = useAchievements();
  const { suggestions, isLoading: suggestionsLoading, pendingCount, respondToSuggestion } = useSuggestions(user?.id, true);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [resetTeamModalOpen, setResetTeamModalOpen] = useState(false);
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Administração"
        icon={<Settings className="h-6 w-6 text-primary" />}
        actions={
          isRoot && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500">
              <Crown className="h-3 w-3" /> Root
            </span>
          )
        }
      />
        <Tabs defaultValue="users" className="space-y-6">
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="w-4 h-4" />
              Conquistas
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2 relative">
              <Lightbulb className="w-4 h-4" />
              Sugestões
              {pendingCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Gerenciar Usuários
                    </CardTitle>
                    <CardDescription>
                      Gerencie os usuários, suas equipes e papéis
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setResetTeamModalOpen(true)} className="gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Zerar Pontuação
                    </Button>
                    {canManageUsers && (
                      <Button onClick={() => setCreateUserModalOpen(true)} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Criar Usuário
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum usuário cadastrado ainda.
                  </p>
                ) : (
                  <AdminUserTable
                    users={users}
                    onUpdateRole={updateUserRole}
                    onUpdateProfile={updateUserProfile}
                    onDataChanged={refetch}
                    isRoot={isRoot}
                    canManageUsers={canManageUsers}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Gerenciar Conquistas
                    </CardTitle>
                    <CardDescription>
                      Conceda conquistas e troféus aos usuários manualmente
                    </CardDescription>
                  </div>
                  <Button onClick={() => setGrantModalOpen(true)} className="gap-2">
                    <Award className="w-4 h-4" />
                    Conceder Conquista
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {achievement.description}
                          </p>
                          <p className="text-xs text-primary mt-1">
                            {achievement.points} pontos
                            {achievement.is_trophy && ' • 🏆 Troféu'}
                            {achievement.manual_grant ? ' • concedida pelo líder' : ' • automática'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions">
            <SuggestionList
              suggestions={suggestions}
              isLoading={suggestionsLoading}
              pendingCount={pendingCount}
              onRespond={respondToSuggestion}
            />
          </TabsContent>

          <TabsContent value="reports">
            <WeeklyReportViewer />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>

      <GrantAchievementModal
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        users={users}
        achievements={achievements}
        onGrant={grantAchievement}
      />

      <CreateUserModal
        open={createUserModalOpen}
        onOpenChange={setCreateUserModalOpen}
        onUserCreated={refetch}
      />

      <ResetTeamDataModal
        open={resetTeamModalOpen}
        onOpenChange={setResetTeamModalOpen}
        onDataChanged={refetch}
      />
    </div>
  );
}
