import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'root' | 'admin' | 'lider' | 'member' | null;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole;
  isLoading: boolean;
  isRoot: boolean;
  isAdmin: boolean;
  isLider: boolean;
  isMember: boolean;
  canManageUsers: boolean;
  canAccessLeaderPanel: boolean;
  isAuthenticated: boolean;
  signIn: (matricula: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Sessão e papel do usuário carregados UMA vez para o app inteiro
 * (antes cada componente que chamava useAuth buscava o papel de novo).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = async (userId: string) => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (error) console.error('Erro ao buscar papel:', error);
      setRole((data?.role as AppRole) ?? null);
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // adiado para evitar deadlock dentro do callback do supabase-js
        setTimeout(() => loadRole(newSession.user.id), 0);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      if (current?.user) loadRole(current.user.id);
      else setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (matricula: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: `${matricula.trim()}@gincana.local`,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setRole(null);
    }
    return { error };
  };

  const value: AuthContextValue = {
    user,
    session,
    role,
    isLoading,
    isRoot: role === 'root',
    isAdmin: role === 'admin' || role === 'root',
    isLider: role === 'lider' || role === 'admin' || role === 'root',
    isMember: role !== null,
    canManageUsers: role === 'root' || role === 'admin',
    canAccessLeaderPanel: role === 'lider' || role === 'admin' || role === 'root',
    isAuthenticated: !!session,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
