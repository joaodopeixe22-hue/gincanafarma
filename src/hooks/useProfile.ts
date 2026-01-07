import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Profile not found - this is ok, user might not have one yet
        setProfile(null);
      } else {
        setError(fetchError.message);
      }
    } else {
      setProfile(data as Profile);
    }
    
    setIsLoading(false);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!userId) return { error: new Error('No user ID provided') };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);

    if (updateError) {
      return { error: updateError };
    }

    await fetchProfile(userId);
    return { error: null };
  };

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch: () => userId && fetchProfile(userId),
  };
}
