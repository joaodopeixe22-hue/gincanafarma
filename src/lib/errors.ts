/** Mensagem legível de um erro do Supabase/PostgREST ou JS. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const e = error as { message?: string; details?: string };
    if (e.message) {
      if (e.message.includes('row-level security')) return 'Você não tem permissão para fazer isso.';
      if (e.message.includes('Failed to fetch')) return 'Sem conexão. Verifique a internet e tente de novo.';
      return e.message;
    }
  }
  return fallback;
}

export const initials = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const firstName = (name?: string | null) => (name || '').split(' ')[0] || 'colega';
