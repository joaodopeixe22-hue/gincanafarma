import { Achievement, UserAchievement } from '@/types/profile';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

interface AchievementListProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  unlockedIds: Set<string>;
}

export function AchievementList({ 
  achievements, 
  userAchievements,
  unlockedIds 
}: AchievementListProps) {
  const trophies = achievements.filter(a => a.is_trophy);
  const badges = achievements.filter(a => !a.is_trophy);

  const getAchievedAt = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievement_id === achievementId)?.achieved_at;
  };

  const categoryLabels = {
    streak: 'Sequência',
    kpi: 'Pontuação',
    challenge: 'Desafios',
    milestone: 'Marcos',
  };

  const groupedBadges = badges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="space-y-6">
      {/* Trophies Section */}
      {trophies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Troféus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {trophies.map(trophy => (
                <AchievementBadge
                  key={trophy.id}
                  achievement={trophy}
                  isUnlocked={unlockedIds.has(trophy.id)}
                  achievedAt={getAchievedAt(trophy.id)}
                  size="lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-primary" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedBadges).map(([category, badges]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="flex flex-wrap gap-3">
                {badges.map(badge => (
                  <AchievementBadge
                    key={badge.id}
                    achievement={badge}
                    isUnlocked={unlockedIds.has(badge.id)}
                    achievedAt={getAchievedAt(badge.id)}
                    size="md"
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
