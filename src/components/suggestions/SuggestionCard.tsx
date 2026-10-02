import { useAppConfig } from '@/hooks/data/useAppConfig';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SuggestionBadge } from './SuggestionBadge';
import { Suggestion } from '@/hooks/useSuggestions';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onClick?: () => void;
  showUser?: boolean;
}


export function SuggestionCard({ suggestion, onClick, showUser = true }: SuggestionCardProps) {
  const { teamById } = useAppConfig();
  const team = teamById(suggestion.user_team);

  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium line-clamp-1">{suggestion.title}</h4>
          <SuggestionBadge type="status" value={suggestion.status} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {suggestion.message}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {showUser && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {suggestion.user_name}
                {team && (
                  <span>• {team.icon} {team.short_name}</span>
                )}
              </span>
            )}
            <SuggestionBadge type="category" value={suggestion.category} />
          </div>
          
          <div className="flex items-center gap-2">
            {suggestion.admin_response && (
              <MessageSquare className="w-3 h-3 text-primary" />
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(suggestion.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
