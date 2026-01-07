import { cn } from '@/lib/utils';

interface TeamBadgeProps {
  teamId: 'dna' | 'elite' | 'alcateia';
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const teamConfig = {
  dna: {
    name: 'DNA de Campeões',
    shortName: 'DNA',
    icon: '🏆',
  },
  elite: {
    name: 'Elite do Cuidado',
    shortName: 'Elite',
    icon: '💎',
  },
  alcateia: {
    name: 'Alcateia',
    shortName: 'Alcateia',
    icon: '🐺',
  },
};

export function TeamBadge({ teamId, size = 'md', showName = true }: TeamBadgeProps) {
  const config = teamConfig[teamId];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-semibold',
        `bg-team-${teamId} text-team-${teamId}-foreground`,
        sizeClasses[size]
      )}
    >
      <span>{config.icon}</span>
      {showName && <span>{config.shortName}</span>}
    </div>
  );
}
