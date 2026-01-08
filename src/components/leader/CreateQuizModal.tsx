import { useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QuizQuestionEditor, QuizQuestionData } from './QuizQuestionEditor';

interface CreateQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuiz: (
    title: string,
    description: string | null,
    timeLimitSeconds: number,
    bonusPoints: number,
    questions: QuizQuestionData[]
  ) => Promise<void>;
}

export function CreateQuizModal({
  open,
  onOpenChange,
  onCreateQuiz,
}: CreateQuizModalProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [bonusPoints, setBonusPoints] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestionData[]>([
    { question: '', options: ['', '', '', ''], correct_option: 0, order_index: 0 },
  ]);

  const addQuestion = () => {
    if (questions.length >= 10) {
      toast({ title: 'Limite atingido', description: 'Máximo de 10 perguntas por quiz.' });
      return;
    }
    setQuestions([
      ...questions,
      { question: '', options: ['', '', '', ''], correct_option: 0, order_index: questions.length },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i })));
  };

  const updateQuestion = (index: number, data: QuizQuestionData) => {
    const updated = [...questions];
    updated[index] = data;
    setQuestions(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    
    const invalidQuestions = questions.some(
      q => !q.question.trim() || q.options.some(o => !o.trim())
    );
    if (invalidQuestions) {
      toast({ 
        title: 'Preencha todas as perguntas', 
        description: 'Cada pergunta deve ter texto e 4 opções.',
        variant: 'destructive' 
      });
      return;
    }

    setIsCreating(true);
    try {
      await onCreateQuiz(title.trim(), description.trim() || null, timeLimit, bonusPoints, questions);
      toast({ title: 'Quiz criado!', description: 'Seu quiz está disponível para os membros.' });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao criar quiz', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimeLimit(30);
    setBonusPoints(10);
    setQuestions([{ question: '', options: ['', '', '', ''], correct_option: 0, order_index: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Criar Quiz
          </DialogTitle>
          <DialogDescription>
            Crie um quiz educativo para sua equipe. Membros ganham pontos ao completar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Conhecendo nossos produtos"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo do quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Tempo por pergunta (seg)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={10}
                max={120}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusPoints">Pontos bônus</Label>
              <Input
                id="bonusPoints"
                type="number"
                min={5}
                max={100}
                value={bonusPoints}
                onChange={(e) => setBonusPoints(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Perguntas ({questions.length}/10)</h3>
              <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 10}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {questions.map((q, index) => (
              <div key={index} className="relative border rounded-lg p-4">
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
                <QuizQuestionEditor
                  index={index}
                  data={q}
                  onChange={(data) => updateQuestion(index, data)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Quiz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
