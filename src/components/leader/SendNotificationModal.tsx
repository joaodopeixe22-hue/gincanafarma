import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTeamNotifications, NotificationType, NOTIFICATION_TYPES } from '@/hooks/useTeamNotifications';
import { useLeaderAchievements } from '@/hooks/useLeaderAchievements';

interface SendNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
}

export function SendNotificationModal({
  open,
  onOpenChange,
  teamId,
}: SendNotificationModalProps) {
  const { toast } = useToast();
  const { teamMembers, isLoading: membersLoading } = useLeaderAchievements(teamId);
  const { sendNotification, isLoading } = useTeamNotifications(teamId);
  
  const [selectedType, setSelectedType] = useState<NotificationType | ''>('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetMember, setTargetMember] = useState<string>('all');

  const handleSend = async () => {
    if (!selectedType || !title.trim()) return;

    try {
      await sendNotification(
        selectedType,
        title.trim(),
        message.trim(),
        targetMember === 'all' ? undefined : targetMember
      );
      
      toast({
        title: 'Notificação enviada!',
        description: targetMember === 'all' 
          ? 'Todos os membros da equipe foram notificados.'
          : 'Membro notificado com sucesso.',
      });
      
      onOpenChange(false);
      setSelectedType('');
      setTitle('');
      setMessage('');
      setTargetMember('all');
    } catch (error) {
      toast({
        title: 'Erro ao enviar notificação',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Enviar Notificação
          </DialogTitle>
          <DialogDescription>
            Envie comunicados, lembretes ou celebrações para sua equipe.
          </DialogDescription>
        </DialogHeader>

        {membersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as NotificationType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(NOTIFICATION_TYPES) as [NotificationType, typeof NOTIFICATION_TYPES[NotificationType]][]).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{value.icon}</span>
                        <span>{value.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destinatário</label>
              <Select value={targetMember} onValueChange={setTargetMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>Toda a equipe</span>
                    </div>
                  </SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
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
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Título da notificação"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedType || !title.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
