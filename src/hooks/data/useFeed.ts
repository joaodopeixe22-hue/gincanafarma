import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ActivityPost, Reaction } from '@/types/db';

export const REACTIONS = [
  { key: 'aplauso', emoji: '👏', label: 'Aplausos' },
  { key: 'coracao', emoji: '❤️', label: 'Amei' },
  { key: 'fogo', emoji: '🔥', label: 'Fogo' },
  { key: 'forca', emoji: '💪', label: 'Força' },
  { key: 'festa', emoji: '🎉', label: 'Festa' },
] as const;

export const RECOGNITION_TYPES: Record<string, { label: string; emoji: string; hint: string }> = {
  helping_hand: { label: 'Mão Amiga', emoji: '🤝', hint: 'Ajudou você ou a equipe' },
  customer_care: { label: 'Atendimento Encantador', emoji: '😊', hint: 'Fez a diferença para um cliente' },
  extra_effort: { label: 'Esforço Extra', emoji: '💪', hint: 'Foi além do esperado' },
  team_player: { label: 'Jogador de Equipe', emoji: '🧩', hint: 'Colaboração e espírito de time' },
  improvement: { label: 'Evolução Notável', emoji: '📈', hint: 'Melhorou visivelmente' },
  highlight: { label: 'Destaque', emoji: '⭐', hint: 'Brilhou na semana' },
  congratulations: { label: 'Parabéns!', emoji: '🎉', hint: 'Uma conquista para comemorar' },
};

const PAGE = 25;

export interface FeedPost extends ActivityPost {
  reactions: Reaction[];
}

export function useFeed() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: ['feed'],
    enabled: isAuthenticated,
    initialPageParam: 0,
    getNextPageParam: (last: FeedPost[], all) => (last.length < PAGE ? undefined : all.length * PAGE),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (error) throw error;
      const ids = (data ?? []).map((p) => p.id);
      let reactions: Reaction[] = [];
      if (ids.length) {
        const r = await supabase.from('reactions').select('*').in('activity_id', ids);
        if (r.error) throw r.error;
        reactions = r.data as Reaction[];
      }
      return (data as ActivityPost[]).map<FeedPost>((p) => ({ ...p, reactions: reactions.filter((r) => r.activity_id === p.id) }));
    },
  });
}

export function useReact() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ post, type }: { post: FeedPost; type: string }) => {
      const mine = post.reactions.find((r) => r.user_id === user!.id);
      if (mine && mine.reaction_type === type) {
        const { error } = await supabase.from('reactions').delete().eq('id', mine.id);
        if (error) throw error;
      } else if (mine) {
        const { error } = await supabase.from('reactions').update({ reaction_type: type }).eq('id', mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reactions').insert({ activity_id: post.id, user_id: user!.id, reaction_type: type });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useRecognitionsLeft() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['recognitions-left'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_peer_recognitions_left');
      if (error) throw error;
      return data as number;
    },
  });
}

export function useSendRecognition() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = useCallback(() => {
    ['feed', 'recognitions-left', 'engagement', 'points-ranking'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
  return useMutation({
    mutationFn: async (args: { toUserId: string; type: string; message: string }) => {
      const { error } = await supabase.from('recognitions').insert({
        from_user_id: user!.id,
        to_user_id: args.toUserId,
        recognition_type: args.type,
        message: args.message,
        is_public: true,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
