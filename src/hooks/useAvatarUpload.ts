import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAvatarUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File, userId: string, currentAvatarUrl?: string | null) => {
    if (!file || !userId) return null;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG ou WEBP.');
      return null;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return null;
    }

    setIsUploading(true);

    try {
      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da imagem');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, isUploading };
}
