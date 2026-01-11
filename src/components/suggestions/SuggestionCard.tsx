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

const TEAM_CONFIG: Record<string, { name: string; color: string }> = {
  dna: { name: 'DNA', color: 'text-blue-500' },
  elite: { name: 'Elite', color: 'text-amber-500' },
  alcateia: { name: 'Alcateia', color: 'text-emerald-500' },
};

export function SuggestionCard({ suggestion, onClick, showUser = true }: SuggestionCardProps) {
  const teamConfig = suggestion.user_team ? TEAM_CONFIG[suggestion.user_team] : null;

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
                {teamConfig && (
                  <span className={teamConfig.color}>• {teamConfig.name}</span>
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
