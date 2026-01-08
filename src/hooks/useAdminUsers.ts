import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserWithProfile } from '@/types/profile';

export function useAdminUsers() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*');

    // Get all roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*');

    if (profiles) {
      const usersWithRoles: UserWithProfile[] = profiles.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: '', // We can't get email from profiles, will need to handle differently
          profile: profile as any,
          role: userRole?.role as 'admin' | 'lider' | 'member' | null || null,
        };
      });
      setUsers(usersWithRoles);
    }

    setIsLoading(false);
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'lider' | 'member') => {
    // Check if user already has a role
    const { data: existing } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (!error) await fetchUsers();
      return { error };
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (!error) await fetchUsers();
      return { error };
    }
  };

  const updateUserProfile = async (userId: string, data: { full_name?: string; team_id?: string }) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (!error) await fetchUsers();
    return { error };
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    isLoading,
    updateUserRole,
    updateUserProfile,
    refetch: fetchUsers,
  };
}
