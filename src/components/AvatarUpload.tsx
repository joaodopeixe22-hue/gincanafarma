import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  currentUrl?: string | null;
  fullName?: string | null;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
}

export function AvatarUpload({ 
  currentUrl, 
  fullName, 
  isUploading, 
  onFileSelect 
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  const displayUrl = previewUrl || currentUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
          <AvatarImage src={displayUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        {currentUrl ? 'Trocar foto' : 'Adicionar foto'}
      </Button>

      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WEBP. Máximo 2MB.
      </p>
    </div>
  );
}
