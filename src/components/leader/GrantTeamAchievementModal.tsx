import { useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useLeaderAchievements } from '@/hooks/useLeaderAchievements';

interface GrantTeamAchievementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
}

export function GrantTeamAchievementModal({
  open,
  onOpenChange,
  teamId,
}: GrantTeamAchievementModalProps) {
  const { toast } = useToast();
  const { achievements, teamMembers, isLoading, grantAchievement } = useLeaderAchievements(teamId);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedAchievement, setSelectedAchievement] = useState<string>('');
  const [isGranting, setIsGranting] = useState(false);

  const handleGrant = async () => {
    if (!selectedMember || !selectedAchievement) return;

    setIsGranting(true);
    try {
      await grantAchievement(selectedMember, selectedAchievement);
      const member = teamMembers.find(m => m.id === selectedMember);
      const achievement = achievements.find(a => a.id === selectedAchievement);
      
      toast({
        title: 'Conquista concedida!',
        description: `${achievement?.name} foi atribuída a ${member?.full_name}`,
      });
      
      onOpenChange(false);
      setSelectedMember('');
      setSelectedAchievement('');
    } catch (error) {
      toast({
        title: 'Erro ao conceder conquista',
        description: 'Verifique se o membro já possui esta conquista.',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Conceder Conquista
          </DialogTitle>
          <DialogDescription>
            Atribua uma conquista a um membro da sua equipe por esforço ou realização especial.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Membro</label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.matricula}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conquista</label>
              <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conquista" />
                </SelectTrigger>
                <SelectContent>
                  {achievements.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhuma conquista de desafio disponível
                    </div>
                  ) : (
                    achievements.map(achievement => (
                      <SelectItem key={achievement.id} value={achievement.id}>
                        <div className="flex items-center gap-2">
                          <span>{achievement.icon}</span>
                          <span>{achievement.name}</span>
                          <span className="text-muted-foreground text-xs">
                            +{achievement.points || 0}pts
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGrant}
                disabled={!selectedMember || !selectedAchievement || isGranting}
              >
                {isGranting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                Conceder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
