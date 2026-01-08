import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useRecognitions, RecognitionType, RECOGNITION_TYPES } from '@/hooks/useRecognitions';
import { useLeaderAchievements } from '@/hooks/useLeaderAchievements';

interface SendRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  fromUserId: string;
}

export function SendRecognitionModal({
  open,
  onOpenChange,
  teamId,
  fromUserId,
}: SendRecognitionModalProps) {
  const { toast } = useToast();
  const { teamMembers, isLoading: membersLoading } = useLeaderAchievements(teamId);
  const { sendRecognition, isLoading } = useRecognitions();
  
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedType, setSelectedType] = useState<RecognitionType | ''>('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!selectedMember || !selectedType) return;

    try {
      await sendRecognition(
        fromUserId,
        selectedMember,
        selectedType,
        message || null,
        teamId
      );
      
      const member = teamMembers.find(m => m.id === selectedMember);
      toast({
        title: 'Reconhecimento enviado!',
        description: `${RECOGNITION_TYPES[selectedType].emoji} ${RECOGNITION_TYPES[selectedType].label} para ${member?.full_name}`,
      });
      
      onOpenChange(false);
      setSelectedMember('');
      setSelectedType('');
      setMessage('');
    } catch (error) {
      toast({
        title: 'Erro ao enviar reconhecimento',
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
            <Heart className="w-5 h-5 text-pink-500" />
            Enviar Reconhecimento
          </DialogTitle>
          <DialogDescription>
            Reconheça o esforço de um membro da sua equipe. O reconhecimento aparecerá no mural de atividades.
          </DialogDescription>
        </DialogHeader>

        {membersLoading ? (
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
              <label className="text-sm font-medium">Tipo de Reconhecimento</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RecognitionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(RECOGNITION_TYPES) as [RecognitionType, typeof RECOGNITION_TYPES[RecognitionType]][]).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{value.emoji}</span>
                        <span>{value.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem (opcional)</label>
              <Textarea
                placeholder="Adicione uma mensagem personalizada..."
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
                disabled={!selectedMember || !selectedType || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Heart className="w-4 h-4 mr-2" />
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
