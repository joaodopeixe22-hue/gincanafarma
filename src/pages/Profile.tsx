import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAchievements } from '@/hooks/useAchievements';
import { useUserHistory } from '@/hooks/useUserHistory';
import { useSuggestions } from '@/hooks/useSuggestions';
import { useLevelAndStreak } from '@/hooks/data/useRankings';
import { ProfileCard } from '@/components/ProfileCard';
import { AchievementList } from '@/components/AchievementList';
import { UserHistoryCard } from '@/components/UserHistoryCard';
import { EditProfileModal } from '@/components/EditProfileModal';
import { LevelCard } from '@/components/LevelCard';
import { LedgerCard } from '@/components/LedgerCard';
import { MySuggestions } from '@/components/suggestions/MySuggestions';
import { getLevelByPoints, getNextLevel, getPointsToNextLevel, getProgressToNextLevel } from '@/lib/levels';

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { profile, isLoading: profileLoading, updateProfile } = useProfile(targetUserId);
  const { achievements, userAchievements, unlockedIds, isLoading: achievementsLoading } = useAchievements(targetUserId);
  const { records, totals, isLoading: historyLoading } = useUserHistory(targetUserId);
  const levelQ = useLevelAndStreak(targetUserId);
  const { suggestions, isLoading: suggestionsLoading, createSuggestion } = useSuggestions(isOwnProfile ? targetUserId : undefined);

  if (authLoading) return <Loading />;
  if (!userId && !isAuthenticated) return <Navigate to="/auth" replace />;

  // Pontos e nível vêm do servidor (livro de pontos), não são mais recalculados no celular
  const totalPoints = levelQ.data?.totalPoints ?? 0;
  const currentLevel = getLevelByPoints(totalPoints);
  const nextLevel = getNextLevel(currentLevel);
  const progress = getProgressToNextLevel(totalPoints);
  const pointsToNext = getPointsToNextLevel(totalPoints);
  const isLoading = profileLoading || achievementsLoading || historyLoading;

  return (
    <div className="mx-auto max-w-3xl">
      {isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <ProfileCard
            profile={profile}
            role={isOwnProfile ? role : null}
            totalPoints={totalPoints}
            achievementsCount={unlockedIds.size}
            canEdit={isOwnProfile || isAdmin}
            onEdit={() => setEditOpen(true)}
            currentLevel={currentLevel}
            nextLevel={nextLevel}
            progress={progress}
            pointsToNext={pointsToNext}
          />

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <LevelCard currentLevel={currentLevel} nextLevel={nextLevel} progress={progress} pointsToNext={pointsToNext} totalPoints={totalPoints} />
            <Card>
              <CardContent className="flex h-full flex-col items-center justify-center gap-1 p-6">
                <div className="flex items-center gap-1 text-3xl font-bold text-orange-500">
                  <Flame className="h-7 w-7" />
                  {levelQ.data?.currentStreak ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">dias de trabalho seguidos</p>
                <p className="text-xs text-muted-foreground">recorde: {levelQ.data?.longestStreak ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <AchievementList achievements={achievements} userAchievements={userAchievements} unlockedIds={unlockedIds} />

          <LedgerCard userId={targetUserId} />

          <UserHistoryCard records={records} totals={totals} isLoading={historyLoading} />

          {isOwnProfile && <MySuggestions suggestions={suggestions} isLoading={suggestionsLoading} onCreateSuggestion={createSuggestion} />}
        </div>
      )}

      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} profile={profile} onSave={updateProfile} />
    </div>
  );
}
