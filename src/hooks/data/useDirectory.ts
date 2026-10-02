import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/hooks/useAuth';

export interface Person {
  id: string;
  full_name: string;
  avatar_url: string | null;
  team_id: string | null;
  matricula: string | null;
  role: AppRole;
}

/** Todas as pessoas da loja com papel — usado em seletores, escala, agenda e aprovações. */
export function useDirectory() {
  const { isAuthenticated, user, isAdmin, isLider } = useAuth();

  const q = useQuery({
    queryKey: ['directory'],
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, team_id, matricula').order('full_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const roleOf = new Map(roles.data.map((r) => [r.user_id, r.role as AppRole]));
      return profiles.data.map<Person>((p) => ({
        ...p,
        full_name: p.full_name || p.matricula || 'Sem nome',
        role: roleOf.get(p.id) ?? null,
      }));
    },
  });

  const people = useMemo(() => q.data ?? [], [q.data]);
  /** Quem participa da gincana (membros e líderes) */
  const players = useMemo(() => people.filter((p) => p.role === 'member' || p.role === 'lider'), [people]);
  const me = useMemo(() => people.find((p) => p.id === user?.id) ?? null, [people, user?.id]);
  const byId = useCallback((id?: string | null) => people.find((p) => p.id === id) ?? null, [people]);

  /** Mesma regra do banco (can_manage_user): admin gerencia todos; líder, a própria equipe. */
  const canManage = useCallback(
    (targetId: string) => {
      if (isAdmin) return true;
      if (!isLider || !me?.team_id) return false;
      return byId(targetId)?.team_id === me.team_id;
    },
    [isAdmin, isLider, me?.team_id, byId],
  );
  const managed = useMemo(() => players.filter((p) => canManage(p.id)), [players, canManage]);

  return { people, players, managed, me, byId, canManage, isLoading: q.isLoading, refetch: q.refetch };
}
