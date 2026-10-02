import { useState } from 'react';
import { Lightbulb, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionSheet } from './SuggestionSheet';
import { Suggestion } from '@/hooks/useSuggestions';
import { STATUS_CONFIG, CATEGORY_CONFIG } from './SuggestionBadge';

interface SuggestionListProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  pendingCount: number;
  onRespond: (suggestionId: string, response: string, status: string) => Promise<{ error: { message?: string } | null }>;
}

export function SuggestionList({ suggestions, isLoading, pendingCount, onRespond }: SuggestionListProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredSuggestions = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    return true;
  });

  const handleCardClick = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setSheetOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Caixa de Sugestões
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} nova{pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma sugestão encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => handleCardClick(suggestion)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SuggestionSheet
        suggestion={selectedSuggestion}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRespond={onRespond}
        canRespond={true}
      />
    </>
  );
}
