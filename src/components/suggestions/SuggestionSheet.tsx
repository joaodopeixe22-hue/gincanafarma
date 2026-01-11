import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Calendar, Tag, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SuggestionBadge, STATUS_CONFIG } from './SuggestionBadge';
import { Suggestion } from '@/hooks/useSuggestions';

interface SuggestionSheetProps {
  suggestion: Suggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRespond?: (suggestionId: string, response: string, status: string) => Promise<{ error: any }>;
  canRespond?: boolean;
}

const TEAM_CONFIG: Record<string, { name: string; color: string }> = {
  dna: { name: 'DNA', color: 'text-blue-500' },
  elite: { name: 'Elite', color: 'text-amber-500' },
  alcateia: { name: 'Alcateia', color: 'text-emerald-500' },
};

export function SuggestionSheet({ 
  suggestion, 
  open, 
  onOpenChange, 
  onRespond,
  canRespond = false 
}: SuggestionSheetProps) {
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('read');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!suggestion) return null;

  const teamConfig = suggestion.user_team ? TEAM_CONFIG[suggestion.user_team] : null;

  const handleRespond = async () => {
    if (!onRespond || !response.trim()) return;

    setIsSubmitting(true);
    const { error } = await onRespond(suggestion.id, response, status);
    setIsSubmitting(false);

    if (!error) {
      setResponse('');
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {suggestion.title}
          </SheetTitle>
          <SheetDescription>
            Detalhes da sugestão
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Meta info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{suggestion.user_name}</span>
              {teamConfig && (
                <span className={`text-xs ${teamConfig.color}`}>
                  ({teamConfig.name})
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(suggestion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <SuggestionBadge type="category" value={suggestion.category} />
              <SuggestionBadge type="status" value={suggestion.status} />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Mensagem</Label>
            <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {suggestion.message}
            </div>
          </div>

          {/* Existing response */}
          {suggestion.admin_response && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Resposta ({suggestion.responder_name})
              </Label>
              <div className="p-4 bg-primary/10 rounded-lg text-sm whitespace-pre-wrap border border-primary/20">
                {suggestion.admin_response}
              </div>
              {suggestion.responded_at && (
                <p className="text-xs text-muted-foreground">
                  Respondido {formatDistanceToNow(new Date(suggestion.responded_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Response form for admins */}
          {canRespond && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="status">Alterar status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">
                  {suggestion.admin_response ? 'Atualizar resposta' : 'Sua resposta'}
                </Label>
                <Textarea
                  id="response"
                  placeholder="Escreva sua resposta..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleRespond} 
                disabled={isSubmitting || !response.trim()}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
