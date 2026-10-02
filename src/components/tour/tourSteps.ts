import { Step } from 'react-joyride';

export const getTourSteps = (isLider: boolean, isMobile: boolean): Step[] => {
  const steps: Step[] = [
    {
      target: '.tour-header',
      content:
        'Bem-vindo! Aqui fica tudo da loja num lugar só: seus lançamentos, tarefas, escala, campanhas, reconhecimentos e resultados. Vamos dar uma volta rápida.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-nav-hoje',
      content:
        '🏠 Hoje: seu turno, suas tarefas, seu lançamento do dia e o seu Índice de Engajamento. Comece por aqui todo dia.',
      placement: isMobile ? 'top' : 'bottom',
    },
    {
      target: '.tour-nav-gincana',
      content:
        '🏆 Gincana: rankings de engajamento, das equipes e individuais. Seus KPIs só contam depois que o líder aprova o lançamento.',
      placement: isMobile ? 'top' : 'bottom',
    },
    {
      target: '.tour-nav-agenda',
      content: '✅ Agenda: tarefas do dia e da semana. Concluir no prazo vale pontos e conta no índice.',
      placement: isMobile ? 'top' : 'bottom',
    },
    {
      target: '.tour-nav-mural',
      content: '✨ Mural: conquistas da equipe e reconhecimentos. Você pode elogiar colegas (3 por semana).',
      placement: isMobile ? 'top' : 'bottom',
    },
  ];

  if (isMobile) {
    steps.push({
      target: '.tour-nav-mais',
      content: '☰ Mais: Escala, Resultados da loja, seu perfil' + (isLider ? ' e o Painel de Liderança.' : '.'),
      placement: 'top',
    });
  } else {
    steps.push(
      { target: '.tour-nav-escala', content: '🗓️ Escala: sua semana de trabalho.', placement: 'bottom' },
      { target: '.tour-nav-resultados', content: '📊 Resultados: metas de venda e Encantômetro da loja.', placement: 'bottom' },
    );
    if (isLider) {
      steps.push({
        target: '.tour-nav-lideranca',
        content: '⭐ Liderança: aprove os lançamentos do dia, crie campanhas, quizzes e acompanhe a equipe.',
        placement: 'bottom',
      });
    }
  }

  steps.push({
    target: '.tour-user-menu',
    content: '👤 Menu: seu perfil, extrato de pontos, sugestões e este tour de novo quando quiser.',
    placement: 'bottom-end',
  });
  return steps;
};

export const tourLocale = {
  back: 'Voltar',
  close: 'Fechar',
  last: 'Finalizar',
  next: 'Próximo',
  skip: 'Pular tour',
  open: 'Abrir tour',
};
