import { RecognitionDialog } from '@/components/mural/RecognitionDialog';

interface SendRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  fromUserId?: string;
}

/** Atalho do Painel de Liderança: reconhecer alguém da equipe selecionada */
export function SendRecognitionModal({ open, onOpenChange, teamId }: SendRecognitionModalProps) {
  return <RecognitionDialog open={open} onOpenChange={onOpenChange} teamId={teamId} />;
}
