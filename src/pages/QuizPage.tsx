import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, PartyPopper, RotateCcw, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Confetti } from '@/components/Confetti';
import { EmptyState, Loading } from '@/components/common';
import { usePlayableQuiz, useSubmitQuiz, type QuizResult } from '@/hooks/data/useQuizPlay';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

type Stage = 'intro' | 'playing' | 'result';

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const quizQ = usePlayableQuiz(quizId);
  const submit = useSubmitQuiz();
  const quiz = quizQ.data;

  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const startedAt = useRef(0);
  const sent = useRef(false);

  const finish = useCallback(
    async (final: (number | null)[]) => {
      if (!quiz || sent.current) return;
      sent.current = true;
      try {
        const r = await submit.mutateAsync({
          quizId: quiz.id,
          answers: final,
          timeTaken: Math.round((Date.now() - startedAt.current) / 1000),
        });
        setResult(r);
        setStage('result');
      } catch (e) {
        sent.current = false;
        toast({ title: 'Não foi possível enviar', description: errorMessage(e), variant: 'destructive' });
      }
    },
    [quiz, submit, toast],
  );

  // Cronômetro do quiz inteiro
  useEffect(() => {
    if (stage !== 'playing' || !quiz?.time_limit_seconds) return;
    const t = setInterval(() => {
      const left = quiz.time_limit_seconds! - Math.floor((Date.now() - startedAt.current) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(t);
        finish(answers);
      }
    }, 250);
    return () => clearInterval(t);
  }, [stage, quiz, answers, finish]);

  if (quizQ.isLoading) return <Loading />;
  if (!quiz) {
    return (
      <EmptyState title="Quiz indisponível">
        Ele pode ter sido desativado. <Link to="/" className="underline">Voltar</Link>
      </EmptyState>
    );
  }

  const total = quiz.questions.length;
  const start = () => {
    sent.current = false;
    setAnswers(Array(total).fill(null));
    setIndex(0);
    setResult(null);
    startedAt.current = Date.now();
    setRemaining(quiz.time_limit_seconds ?? 0);
    setStage('playing');
  };

  const choose = (opt: number) => {
    const next = [...answers];
    next[index] = opt;
    setAnswers(next);
    if (index < total - 1) setTimeout(() => setIndex(index + 1), 180);
    else finish(next);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>

      {stage === 'intro' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            {quiz.description && <CardDescription>{quiz.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">perguntas</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-2xl font-bold">{quiz.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60) || 1}min` : '∞'}</p>
                <p className="text-xs text-muted-foreground">tempo</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-2xl font-bold">+{quiz.bonus_points}</p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Para passar, acerte pelo menos {quiz.pass_pct}%. Os pontos entram na primeira vez que você passar; dá para refazer para treinar.
            </p>
            <Button size="lg" className="w-full" onClick={start}>
              Começar
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'playing' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Pergunta {index + 1} de {total}
              </span>
              {!!quiz.time_limit_seconds && (
                <span className={cn('flex items-center gap-1 font-semibold tabular-nums', remaining <= 10 && 'text-red-600')}>
                  <Clock className="h-4 w-4" />
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </span>
              )}
            </div>
            <Progress value={(100 * index) / total} className="h-1.5" />
            <CardTitle className="text-lg leading-snug">{quiz.questions[index].question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quiz.questions[index].options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={submit.isPending}
                onClick={() => choose(i)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5',
                  answers[index] === i && 'border-primary bg-primary/10',
                )}
              >
                <span className="mr-2 font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>
                Voltar à anterior
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {stage === 'result' && result && (
        <>
          <Confetti isActive={result.passed && result.points_earned > 0} onComplete={() => undefined} />
          <Card className={cn(result.passed ? 'border-emerald-500/50' : 'border-amber-500/50')}>
            <CardContent className="space-y-3 p-6 text-center">
              {result.passed ? <PartyPopper className="mx-auto h-12 w-12 text-emerald-600" /> : <RotateCcw className="mx-auto h-12 w-12 text-amber-600" />}
              <p className="text-4xl font-bold">{result.score}%</p>
              <p className="text-muted-foreground">
                {result.correct} de {result.total} certas ·{' '}
                {result.passed
                  ? result.points_earned
                    ? `Passou! +${result.points_earned} pontos`
                    : 'Passou! (os pontos já foram creditados antes)'
                  : `Faltou pouco: precisa de ${result.pass_pct}%`}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={start}>Refazer</Button>
                <Button asChild>
                  <Link to="/">Voltar para Hoje</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gabarito comentado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.review.map((q, i) => (
                <div key={i} className="rounded-xl border p-3">
                  <p className="mb-2 flex items-start gap-2 font-medium">
                    {q.is_correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                    {q.question}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {q.options.map((o, j) => (
                      <li
                        key={j}
                        className={cn(
                          'rounded-md px-2 py-1',
                          j === q.correct_option && 'bg-emerald-500/15 font-medium',
                          j === q.chosen && j !== q.correct_option && 'bg-red-500/15 line-through',
                        )}
                      >
                        {String.fromCharCode(65 + j)}. {o}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
