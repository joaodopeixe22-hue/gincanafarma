import { Step } from 'react-joyride';

export const getTourSteps = (isLider: boolean, isAuthenticated: boolean): Step[] => {
  const baseSteps: Step[] = [
    {
      target: '.tour-header',
      content: 'Bem-vindo ao Circuito Farma! Esta é a plataforma de gamificação onde equipes competem em KPIs. Vamos fazer um tour rápido pelas principais funcionalidades.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-calendar',
      content: '📅 Calendário: Clique em um dia para registrar seus KPIs diários (OFEX, Apoio, Sorria, Cadastro). Seus dados são somados automaticamente ao time!',
      placement: 'bottom',
    },
    {
      target: '.tour-ranking-daily',
      content: '🎯 Ranking Diário: Veja qual equipe está liderando hoje. Cada indicador contribui para a pontuação total.',
      placement: 'bottom',
    },
    {
      target: '.tour-ranking-weekly',
      content: '📈 Ranking Semanal: Acompanhe a performance da semana. Consistência é a chave para vencer!',
      placement: 'bottom',
    },
    {
      target: '.tour-ranking-monthly',
      content: '🏆 Ranking Mensal: Os campeões do mês ganham reconhecimento especial. Mire no topo!',
      placement: 'bottom',
    },
    {
      target: '.tour-individual',
      content: '👤 Ranking Individual: Compare sua performance com outros membros. Veja quem são os destaques!',
      placement: 'bottom',
    },
    {
      target: '.tour-achievements',
      content: '🏅 Conquistas: Desbloqueie badges por performance! Cada conquista dá pontos que aumentam seu nível.',
      placement: 'bottom',
    },
    {
      target: '.tour-user-menu',
      content: '⚙️ Menu: Acesse seu perfil, veja suas conquistas, níveis e mais opções aqui.',
      placement: 'bottom-end',
    },
  ];

  // Steps adicionais para usuários autenticados
  if (isAuthenticated) {
    baseSteps.push({
      target: '.tour-profile-link',
      content: '👤 Perfil: No seu perfil você pode ver todas suas conquistas, nível atual, histórico de performance e editar suas informações.',
      placement: 'bottom',
    });
  }

  // Steps adicionais para líderes
  if (isLider) {
    baseSteps.push({
      target: '.tour-leader-link',
      content: '⭐ Painel de Liderança: Como líder, você pode conceder conquistas, enviar reconhecimentos, criar quizzes e ver relatórios da equipe!',
      placement: 'bottom',
    });
  }

  // Step final
  baseSteps.push({
    target: '.tour-header',
    content: '🚀 Pronto! Agora você conhece as principais funcionalidades. Boa sorte na competição! Você pode refazer este tour a qualquer momento pelo menu.',
    placement: 'bottom',
  });

  return baseSteps;
};

export const tourLocale = {
  back: 'Voltar',
  close: 'Fechar',
  last: 'Finalizar',
  next: 'Próximo',
  skip: 'Pular tour',
  open: 'Abrir tour',
};
