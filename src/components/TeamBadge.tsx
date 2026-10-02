import { cn } from '@/lib/utils';
import { useAppConfig } from '@/hooks/data/useAppConfig';

interface TeamBadgeProps {
  teamId: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  full?: boolean;
}

/** Selo da equipe com nome, ícone e cor vindos do banco (Admin › Configurações › Equipes). */
export function TeamBadge({ teamId, size = 'md', showName = true, full = false }: TeamBadgeProps) {
  const { teamById } = useAppConfig();
  const team = teamById(teamId);
  if (!team) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap', sizeClasses[size])}
      style={{ backgroundColor: `${team.color}22`, borderColor: `${team.color}66`, color: 'hsl(var(--foreground))' }}
      title={team.name}
    >
      <span aria-hidden>{team.icon}</span>
      {showName && <span>{full ? team.name : team.short_name}</span>}
    </span>
  );
}
