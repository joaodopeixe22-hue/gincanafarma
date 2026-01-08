import { Achievement, UserAchievement } from '@/types/profile';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Trophy, Medal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
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

  const countUnlocked = (items: Achievement[]) => 
    items.filter(a => unlockedIds.has(a.id)).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Trophies Section */}
      {trophies.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Troféus</span>
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                {countUnlocked(trophies)}/{trophies.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                  {trophies.map(trophy => (
                    <AchievementBadge
                      key={trophy.id}
                      achievement={trophy}
                      isUnlocked={unlockedIds.has(trophy.id)}
                      achievedAt={getAchievedAt(trophy.id)}
                      size="md"
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Badges by Category */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-primary" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {countUnlocked(categoryBadges)}/{categoryBadges.length}
                </span>
              </div>
              {isMobile ? (
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 pb-2">
                    {categoryBadges.map(badge => (
                      <AchievementBadge
                        key={badge.id}
                        achievement={badge}
                        isUnlocked={unlockedIds.has(badge.id)}
                        achievedAt={getAchievedAt(badge.id)}
                        size="sm"
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {categoryBadges.map(badge => (
                    <AchievementBadge
                      key={badge.id}
                      achievement={badge}
                      isUnlocked={unlockedIds.has(badge.id)}
                      achievedAt={getAchievedAt(badge.id)}
                      size="md"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
