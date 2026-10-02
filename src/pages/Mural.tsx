import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, Loading, PageHeader, PersonAvatar, RankMedal, scoreColor } from '@/components/common';
import { RecognitionDialog } from '@/components/mural/RecognitionDialog';
import { TeamBadge } from '@/components/TeamBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { REACTIONS, RECOGNITION_TYPES, useFeed, useReact, useRecognitionsLeft, type FeedPost } from '@/hooks/data/useFeed';
import { useEngagement } from '@/hooks/data/useRankings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/errors';
import { periodRange, shiftPeriod } from '@/lib/period';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<string, string> = {
  achievement: '🏅',
  recognition: '💛',
  level_up: '⬆️',
  challenge_completed: '🏁',
  quiz_passed: '🎓',
  champion: '👑',
};

function Post({ post }: { post: FeedPost }) {
  const { user, isAdmin } = useAuth();
  const { byId } = useDirectory();
  const react = useReact();
  const qc = useQueryClient();
  const { toast } = useToast();
  const author = byId(post.user_id);
  const meta = (post.metadata ?? {}) as Record<string, unknown>;
  const recType = typeof meta.recognition_type === 'string' ? RECOGNITION_TYPES[meta.recognition_type] : null;
  const mine = post.reactions.find((r) => r.user_id === user?.id)?.reaction_type;

  const del = async () => {
    const { error } = await supabase.from('activity_feed').delete().eq('id', post.id);
    if (error) toast({ title: 'Erro', description: errorMessage(error), variant: 'destructive' });
    else qc.invalidateQueries({ queryKey: ['feed'] });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Link to={`/profile/${post.user_id}`}>
            <PersonAvatar name={author?.full_name} url={author?.avatar_url} size={42} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <Link to={`/profile/${post.user_id}`} className="font-semibold hover:underline">
                {author?.full_name ?? 'Colega'}
              </Link>{' '}
              {post.activity_type === 'recognition' ? (
                <span className="text-muted-foreground">
                  foi reconhecido(a) por <strong className="text-foreground">{String(meta.from_name ?? 'um colega')}</strong>
                  {meta.from_leader ? ' (liderança)' : ''}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TeamBadge teamId={post.team_id} size="sm" showName={false} />
              {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </div>
          </div>
          {!!post.points_earned && <Badge variant="secondary">+{post.points_earned} pts</Badge>}
        </div>

        <div className={cn('rounded-xl p-3', post.activity_type === 'recognition' ? 'bg-pink-500/10' : 'bg-muted/50')}>
          <p className="font-semibold">
            <span className="mr-1.5">{recType?.emoji ?? TYPE_ICON[post.activity_type] ?? '✨'}</span>
            {post.title}
          </p>
          {post.description && <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {REACTIONS.map((r) => {
            const count = post.reactions.filter((x) => x.reaction_type === r.key).length;
            return (
              <button
                key={r.key}
                type="button"
                title={r.label}
                onClick={() => react.mutate({ post, type: r.key })}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors',
                  mine === r.key ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
                )}
              >
                <span>{r.emoji}</span>
                {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
              </button>
            );
          })}
          {isAdmin && (
            <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-muted-foreground" onClick={del} title="Remover do mural">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Mural() {
  const feed = useFeed();
  const left = useRecognitionsLeft();
  const { weekStartsOn } = useAppConfig();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'tudo' | 'reconhecimentos' | 'conquistas'>('tudo');
  const lastWeek = periodRange('week', shiftPeriod('week', new Date(), -1), weekStartsOn);
  const thisWeek = periodRange('week', new Date(), weekStartsOn);
  const prev = useEngagement(lastWeek.startStr, lastWeek.endStr);
  const curr = useEngagement(thisWeek.startStr, thisWeek.endStr);
  const posts = useMemo(() => {
    const all = feed.data?.pages.flat() ?? [];
    if (filter === 'reconhecimentos') return all.filter((p) => p.activity_type === 'recognition');
    if (filter === 'conquistas') return all.filter((p) => p.activity_type !== 'recognition');
    return all;
  }, [feed.data, filter]);
  const top = (rows?: typeof prev.data) => (rows ?? []).filter((r) => r.indice != null).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Mural"
        icon={<Sparkles className="h-6 w-6 text-primary" />}
        subtitle="Conquistas, campanhas concluídas e reconhecimentos da equipe"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Heart className="mr-2 h-4 w-4" /> Reconhecer um colega
            {left.data != null && <Badge variant="secondary" className="ml-2">{left.data}</Badge>}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="tudo">Tudo</TabsTrigger>
              <TabsTrigger value="reconhecimentos">💛 Reconhecimentos</TabsTrigger>
              <TabsTrigger value="conquistas">🏅 Conquistas</TabsTrigger>
            </TabsList>
          </Tabs>
          {feed.isLoading ? (
            <Loading />
          ) : posts.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-8 w-8" />} title="O mural ainda está vazio">
              Comece reconhecendo um colega que fez a diferença hoje.
            </EmptyState>
          ) : (
            posts.map((p) => <Post key={p.id} post={p} />)
          )}
          {feed.hasNextPage && (
            <Button variant="outline" className="w-full" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
              {feed.isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
            </Button>
          )}
        </div>

        <aside className="space-y-4">
          {[
            { title: 'Destaques da semana passada', rows: top(prev.data) },
            { title: 'Liderando esta semana', rows: top(curr.data) },
          ].map((box) => (
            <Card key={box.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{box.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {box.rows.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
                {box.rows.map((r, i) => (
                  <div key={r.user_id} className="flex items-center gap-2">
                    <RankMedal rank={i + 1} />
                    <PersonAvatar name={r.full_name} url={r.avatar_url} size={30} />
                    <span className="min-w-0 flex-1 truncate text-sm">{r.full_name}</span>
                    <span className={cn('font-bold tabular-nums', scoreColor(r.indice))}>{Math.round(Number(r.indice))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>

      <RecognitionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
