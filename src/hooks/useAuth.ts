import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'root' | 'admin' | 'lider' | 'member' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole;
  isAdmin: boolean;
  isMember: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        // No role found, user is authenticated but has no role yet
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (matricula: string, password: string) => {
    const fakeEmail = `${matricula}@gincana.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
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

  return {
    user,
    session,
    role,
    isRoot: role === 'root',
    isAdmin: role === 'admin' || role === 'root', // root herda admin
    isLider: role === 'lider' || role === 'admin' || role === 'root', // admin e root herdam líder
    isMember: role === 'member' || role === 'lider' || role === 'admin' || role === 'root', // todos herdam member
    canManageUsers: role === 'root' || role === 'admin', // root e admin podem criar/excluir usuários
    canAccessLeaderPanel: role === 'lider' || role === 'admin' || role === 'root',
    isAuthenticated: !!session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };
}
