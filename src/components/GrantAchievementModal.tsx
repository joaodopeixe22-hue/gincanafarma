import { errorMessage } from '@/lib/errors';
import { useState } from 'react';
import { Achievement, UserWithProfile } from '@/types/profile';
import {
  Dialog,
  DialogContent,
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
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GrantAchievementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserWithProfile[];
  achievements: Achievement[];
  onGrant: (userId: string, achievementId: string) => Promise<{ error: { message?: string } | null }>;
}

export function GrantAchievementModal({
  open,
  onOpenChange,
  users,
  achievements,
  onGrant,
}: GrantAchievementModalProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGrant = async () => {
    if (!selectedUser || !selectedAchievement) return;

    setIsLoading(true);
    const { error } = await onGrant(selectedUser, selectedAchievement);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao conceder conquista',
        description: errorMessage(error),
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conquista concedida!',
        description: 'A conquista foi atribuída ao usuário.',
      });
      setSelectedUser('');
      setSelectedAchievement('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conceder Conquista</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.profile?.full_name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conquista</Label>
            <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conquista" />
              </SelectTrigger>
              <SelectContent>
                {achievements.map((achievement) => (
                  <SelectItem key={achievement.id} value={achievement.id}>
                    {achievement.name} ({achievement.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGrant} 
              disabled={isLoading || !selectedUser || !selectedAchievement}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Conceder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
