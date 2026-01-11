import { Badge } from '@/components/ui/badge';

interface SuggestionBadgeProps {
  type: 'status' | 'category';
  value: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30' },
  read: { label: 'Lida', className: 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30' },
  in_progress: { label: 'Em Análise', className: 'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30' },
  resolved: { label: 'Resolvida', className: 'bg-green-500/20 text-green-600 hover:bg-green-500/30' },
  rejected: { label: 'Rejeitada', className: 'bg-red-500/20 text-red-600 hover:bg-red-500/30' },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  geral: { label: 'Geral', icon: '💬' },
  melhoria: { label: 'Melhoria', icon: '✨' },
  problema: { label: 'Problema', icon: '🐛' },
  ideia: { label: 'Ideia', icon: '💡' },
  elogio: { label: 'Elogio', icon: '❤️' },
};

export function SuggestionBadge({ type, value }: SuggestionBadgeProps) {
  if (type === 'status') {
    const config = STATUS_CONFIG[value] || STATUS_CONFIG.pending;
    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    );
  }

  const config = CATEGORY_CONFIG[value] || CATEGORY_CONFIG.geral;
  return (
    <Badge variant="outline" className="gap-1">
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  );
}

export { STATUS_CONFIG, CATEGORY_CONFIG };
