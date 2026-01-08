import { BookOpen, Play, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Quiz } from '@/hooks/useQuizzes';

interface QuizListProps {
  quizzes: Quiz[];
  onToggleActive: (quizId: string, isActive: boolean) => void;
  onDelete: (quizId: string) => void;
}

export function QuizList({ quizzes, onToggleActive, onDelete }: QuizListProps) {
  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-4 opacity-50" />
          <p>Nenhum quiz criado ainda.</p>
          <p className="text-sm">Crie um quiz para treinar sua equipe!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {quiz.title}
                  <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                    {quiz.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </CardTitle>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>📝 {quiz.questions?.length || 0} perguntas</span>
                <span>⏱️ {quiz.time_limit_seconds}s/pergunta</span>
                <span>🎁 +{quiz.bonus_points} pontos</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleActive(quiz.id, !quiz.is_active)}
                >
                  {quiz.is_active ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(quiz.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
