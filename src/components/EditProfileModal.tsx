import { useState } from 'react';
import { Profile } from '@/types/profile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSave: (data: Partial<Profile>) => Promise<{ error: { message?: string } | null }>;
}

export function EditProfileModal({ 
  open, 
  onOpenChange, 
  profile,
  onSave 
}: EditProfileModalProps) {
  const { user, isAdmin } = useAuth();
  const { teams } = useAppConfig();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [teamId, setTeamId] = useState(profile?.team_id || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { uploadAvatar, isUploading } = useAvatarUpload();

  const handleSave = async () => {
    setIsLoading(true);
    
    let avatarUrl = profile?.avatar_url;
    
    // Upload avatar if there's a pending file
    if (pendingFile && user?.id) {
      const newUrl = await uploadAvatar(pendingFile, user.id, profile?.avatar_url);
      if (newUrl) {
        avatarUrl = newUrl;
      }
    }
    
    const { error } = await onSave({
      full_name: fullName || null,
      ...(isAdmin ? { team_id: teamId || null } : {}),
      bio: bio || null,
      avatar_url: avatarUrl,
    });
    setIsLoading(false);
    
    if (!error) {
      setPendingFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <AvatarUpload
            currentUrl={profile?.avatar_url}
            fullName={fullName || profile?.full_name}
            isUploading={isUploading}
            onFileSelect={setPendingFile}
          />

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          {isAdmin && (
          <div className="space-y-2">
            <Label htmlFor="team">Equipe</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading || isUploading}>
              {(isLoading || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
