import { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '@/hooks/useAuth';
import { useTourState } from '@/hooks/useTourState';
import { getTourSteps, tourLocale } from './tourSteps';

interface GuidedTourProps {
  isMobile?: boolean;
}

export function GuidedTour({ isMobile = false }: GuidedTourProps) {
  const { user, isLider } = useAuth();
  const { shouldShowTour, isLoading, completeTour } = useTourState(user?.id);

  const steps = getTourSteps(isLider, isMobile);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, type } = data;

    // Tour finalizado ou pulado
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
    }

    // Fechou o tour manualmente
    if (action === ACTIONS.CLOSE && type === EVENTS.STEP_AFTER) {
      completeTour();
    }
  }, [completeTour]);

  // Não renderiza enquanto carrega ou se não deve mostrar
  if (isLoading || !shouldShowTour) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={shouldShowTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleCallback}
      locale={tourLocale}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          primaryColor: 'hsl(262, 83%, 58%)', // primary color
          backgroundColor: 'hsl(240, 10%, 3.9%)', // card background
          textColor: 'hsl(0, 0%, 98%)', // foreground
          overlayColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 10000,
          arrowColor: 'hsl(240, 10%, 3.9%)',
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
          fontSize: 14,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        tooltipContent: {
          padding: '12px 0',
          lineHeight: 1.6,
        },
        buttonNext: {
          backgroundColor: 'hsl(262, 83%, 58%)',
          color: 'white',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 500,
        },
        buttonBack: {
          color: 'hsl(240, 5%, 64.9%)',
          marginRight: 10,
          fontSize: 14,
        },
        buttonSkip: {
          color: 'hsl(240, 5%, 64.9%)',
          fontSize: 13,
        },
        buttonClose: {
          color: 'hsl(240, 5%, 64.9%)',
        },
        spotlight: {
          borderRadius: 12,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
        },
        beacon: {
          display: 'none',
        },
        beaconInner: {
          backgroundColor: 'hsl(262, 83%, 58%)',
        },
        beaconOuter: {
          backgroundColor: 'hsl(262, 83%, 58%)',
          border: '2px solid hsl(262, 83%, 58%)',
        },
      }}
    />
  );
}
