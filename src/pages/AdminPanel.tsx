import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAchievements } from '@/hooks/useAchievements';
import { AdminUserTable } from '@/components/AdminUserTable';
import { GrantAchievementModal } from '@/components/GrantAchievementModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Users, Trophy, Award } from 'lucide-react';

export default function AdminPanel() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { users, isLoading: usersLoading, updateUserRole, updateUserProfile } = useAdminUsers();
  const { achievements, grantAchievement } = useAchievements();
  const [grantModalOpen, setGrantModalOpen] = useState(false);

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Painel Administrativo</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="w-4 h-4" />
              Conquistas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>
                  Gerencie os usuários, suas equipes e papéis (Admin/Membro)
                </CardDescription>
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
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <GrantAchievementModal
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        users={users}
        achievements={achievements}
        onGrant={grantAchievement}
      />
    </div>
  );
}
