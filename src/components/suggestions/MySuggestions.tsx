import { useState } from 'react';
import { Lightbulb, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionSheet } from './SuggestionSheet';
import { SuggestionForm } from './SuggestionForm';
import { Suggestion } from '@/hooks/useSuggestions';

interface MySuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onCreateSuggestion: (data: { title: string; message: string; category: string }) => Promise<{ error: { message?: string } | null }>;
}

export function MySuggestions({ suggestions, isLoading, onCreateSuggestion }: MySuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const handleCardClick = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setSheetOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Minhas Sugestões
            </CardTitle>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Você ainda não enviou nenhuma sugestão</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setFormOpen(true)}
              >
                Enviar primeira sugestão
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => handleCardClick(suggestion)}
                  showUser={false}
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
        canRespond={false}
      />

      <SuggestionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={onCreateSuggestion}
      />
    </>
  );
}
