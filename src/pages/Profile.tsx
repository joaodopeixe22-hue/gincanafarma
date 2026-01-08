import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAchievements } from '@/hooks/useAchievements';
import { useUserHistory } from '@/hooks/useUserHistory';
import { ProfileCard } from '@/components/ProfileCard';
import { AchievementList } from '@/components/AchievementList';
import { UserHistoryCard } from '@/components/UserHistoryCard';
import { EditProfileModal } from '@/components/EditProfileModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { profile, isLoading: profileLoading, updateProfile } = useProfile(targetUserId);
  const { 
    achievements, 
    userAchievements, 
    unlockedIds, 
    totalPoints,
    isLoading: achievementsLoading 
  } = useAchievements(targetUserId);
  const { records, totals, isLoading: historyLoading } = useUserHistory(targetUserId);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if trying to view own profile without being logged in
  if (!userId && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = profileLoading || achievementsLoading || historyLoading;
  const canEdit = isOwnProfile || isAdmin;
  const displayRole = isOwnProfile ? role : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <ProfileCard
              profile={profile}
              role={displayRole}
              totalPoints={totalPoints}
              achievementsCount={unlockedIds.size}
              canEdit={canEdit}
              onEdit={() => setEditOpen(true)}
            />

            <AchievementList
              achievements={achievements}
              userAchievements={userAchievements}
              unlockedIds={unlockedIds}
            />

            <UserHistoryCard
              records={records}
              totals={totals}
              isLoading={historyLoading}
            />
          </div>
        )}
      </main>

      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSave={updateProfile}
      />
    </div>
  );
}
