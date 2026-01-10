import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOUR_STORAGE_KEY = 'circuito_farma_tour_completed';

export function useTourState(userId?: string) {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTourStatus = async () => {
      setIsLoading(true);

      // Se usuário está logado, verifica no banco de dados
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('has_completed_tour')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Erro ao verificar status do tour:', error);
            setShouldShowTour(true);
          } else {
            setShouldShowTour(!data?.has_completed_tour);
          }
        } catch (error) {
          console.error('Erro ao verificar status do tour:', error);
          setShouldShowTour(true);
        }
      } else {
        // Visitante - usa localStorage
        const completed = localStorage.getItem(TOUR_STORAGE_KEY);
        setShouldShowTour(!completed);
      }

      setIsLoading(false);
    };

    checkTourStatus();
  }, [userId]);

  const completeTour = useCallback(async () => {
    setShouldShowTour(false);

    if (userId) {
      // Usuário logado - salva no banco
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_tour: true })
          .eq('id', userId);
      } catch (error) {
        console.error('Erro ao salvar conclusão do tour:', error);
      }
    } else {
      // Visitante - salva no localStorage
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
  }, [userId]);

  const resetTour = useCallback(async () => {
    setShouldShowTour(true);

    if (userId) {
      // Usuário logado - reseta no banco
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_tour: false })
          .eq('id', userId);
      } catch (error) {
        console.error('Erro ao resetar tour:', error);
      }
    } else {
      // Visitante - remove do localStorage
      localStorage.removeItem(TOUR_STORAGE_KEY);
    }
  }, [userId]);

  return {
    shouldShowTour,
    isLoading,
    completeTour,
    resetTour,
  };
}
