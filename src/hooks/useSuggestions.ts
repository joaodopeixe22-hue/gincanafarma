import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_team?: string;
  responder_name?: string;
}

interface CreateSuggestionData {
  title: string;
  message: string;
  category: string;
}

interface UpdateSuggestionData {
  status?: string;
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
}

export function useSuggestions(userId?: string, isAdmin?: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))];
        const responderIds = [...new Set(data.map(s => s.responded_by).filter(Boolean))];
        const allUserIds = [...new Set([...userIds, ...responderIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, team_id')
          .in('id', allUserIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedData = data.map(suggestion => ({
          ...suggestion,
          user_name: profileMap.get(suggestion.user_id)?.full_name || 'Usuário',
          user_team: profileMap.get(suggestion.user_id)?.team_id || null,
          responder_name: suggestion.responded_by 
            ? profileMap.get(suggestion.responded_by)?.full_name || 'Admin'
            : null,
        }));

        setSuggestions(enrichedData);
        setPendingCount(enrichedData.filter(s => s.status === 'pending').length);
      } else {
        setSuggestions([]);
        setPendingCount(0);
      }
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: 'Erro ao carregar sugestões',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSuggestion = async (data: CreateSuggestionData) => {
    if (!userId) return { error: new Error('User not authenticated') };

    try {
      const { error } = await supabase
        .from('suggestions')
        .insert({
          user_id: userId,
          title: data.title,
          message: data.message,
          category: data.category,
        });

      if (error) throw error;

      toast({
        title: 'Sugestão enviada!',
        description: 'Sua sugestão foi enviada para análise.',
      });

      await fetchSuggestions();
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar sugestão',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const updateSuggestion = async (suggestionId: string, data: UpdateSuggestionData) => {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update(data)
        .eq('id', suggestionId);

      if (error) throw error;

      toast({
        title: 'Sugestão atualizada!',
        description: 'A sugestão foi atualizada com sucesso.',
      });

      await fetchSuggestions();
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar sugestão',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const respondToSuggestion = async (suggestionId: string, response: string, newStatus: string) => {
    if (!userId) return { error: new Error('User not authenticated') };

    return updateSuggestion(suggestionId, {
      admin_response: response,
      responded_by: userId,
      responded_at: new Date().toISOString(),
      status: newStatus,
    });
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    fetchSuggestions();

    const channel = supabase
      .channel('suggestions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    suggestions,
    isLoading,
    pendingCount,
    createSuggestion,
    updateSuggestion,
    respondToSuggestion,
    refetch: fetchSuggestions,
  };
}
