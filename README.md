# Gincana Farma

App da loja que reúne num lugar só o que antes estava espalhado em várias ferramentas: **lançamento de KPIs com aprovação do líder, gincana entre equipes, Índice de Engajamento, agenda de tarefas, escala semanal, campanhas, quizzes, mural de reconhecimento e resultados da loja (metas + Encantômetro)**.

O norte do app é **medir engajamento de forma justa e confiável**: todo ponto tem origem registrada, ninguém altera o próprio placar e quem estava de folga não é penalizado.

---

## Telas

| Tela | Quem usa | O que faz |
|---|---|---|
| **Hoje** | todos | Turno do dia, lançamento do dia (com status), tarefas, Índice de Engajamento da semana, campanhas ativas, quizzes pendentes |
| **Gincana** | todos | Ranking de engajamento (pessoas e equipes), placar de KPIs das equipes, KPIs individuais, pontos do período, meu calendário |
| **Agenda** | todos / líder cria | Tarefas do dia e da semana; o líder cria tarefas únicas ou rotinas (dias da semana até uma data), pulando folgas da escala |
| **Escala** | todos / líder edita | Grade semanal; edição em lote com validação da **interjornada de 11h (CLT art. 66)**, copiar semana anterior, importar JSON, exportar imagem |
| **Mural** | todos | Reconhecimentos, conquistas relevantes, campeões e campanhas concluídas, com reações; elogio entre colegas (limite semanal) |
| **Resultados** | todos / líder lança | Vendas × meta, clientes, ticket, venda simples e Encantômetro (NSS); card 1080×1080 para o Teams na paleta RD |
| **Liderança** | líder, admin | **Aprovações** (fila do dia, aprovar com ajuste, recusar com motivo, fechar o dia), campanhas, equipe, relatórios, quizzes, sugestões |
| **Admin** | admin, root | Usuários, conquistas, sugestões, relatório semanal e **Configurações** (loja, semana, pesos do índice, equipes, KPIs) |

## Como funciona a pontuação

1. **Lançamento vira solicitação.** O colaborador envia os KPIs do dia; o lançamento entra como *aguardando aprovação*. O líder confere com o relatório do sistema e aprova (podendo ajustar — o valor original fica guardado) ou recusa com motivo. Só lançamento aprovado gera pontos.
2. **Livro de pontos** (`points_ledger`). Cada ponto é uma linha: quem, origem (KPI, conquista, quiz, campanha, tarefa, reconhecimento, ajuste), data e descrição. Só o servidor grava. Nível, rankings e extrato são somas dessa tabela. Reabrir, recusar ou excluir algo gera estorno — nada some sem rastro.
3. **Conquistas** são avaliadas por pessoa, no servidor, quando algo acontece (aprovação, quiz, tarefa, campanha, reconhecimento). Líder concede só as conquistas "especiais"; o admin concede qualquer uma.

## Índice de Engajamento (0–100)

| Pilar | Peso padrão | Mede |
|---|---|---|
| Execução | 35% | KPIs aprovados em % da meta diária individual, por dia trabalhado |
| Compromissos | 20% | Tarefas da agenda concluídas no prazo |
| Campanhas | 20% | Participação e conclusão das campanhas ativas |
| Constância | 10% | Dias trabalhados com lançamento feito no próprio dia |
| Desenvolvimento | 10% | Quizzes disponíveis em que passou |
| Reconhecimento | 5% | Reconhecimentos recebidos |

- **Dias trabalhados vêm da escala**: folga, férias e atestado não penalizam. Sem escala, usa os dias com lançamento.
- Pilar sem dado no período (ex.: nenhuma tarefa) sai da conta e o peso é redistribuído.
- Quem não trabalhou no período fica sem índice (não entra no ranking).
- Pesos ajustáveis em **Admin › Configurações**.
- Campeões do dia (KPIs) e da semana/mês (índice) são premiados automaticamente quando o período fecha.

## Segurança

- Nada é acessível sem login.
- Admin não se promove a root nem altera o root; só o root cria admins.
- Colaborador não troca a própria equipe/matrícula nem grava pontos, níveis, sequência ou placar de campanha.
- Notificações só por líder (para a própria equipe) ou admin.
- Contas criadas fora do painel não recebem papel.
- Gabarito dos quizzes não vai para o celular; a correção é no servidor.

---

## Como aplicar (Lovable)

O Lovable **não aplica sozinho** migrations nem edge functions que chegam pelo GitHub ([documentação](https://docs.lovable.dev/integrations/git-sync-overview)). Depois de juntar este código no branch `main`:

1. **Banco de dados** — no chat do Lovable, peça: *"Aplique, nesta ordem, as migrations `20261002120000_seguranca_e_configuracao.sql`, `20261002120100_nucleo_aprovacao_pontos.sql` e `20261002120200_modulos_super_app.sql` da pasta supabase/migrations"*. Ou rode o conteúdo de cada arquivo, nessa ordem, no editor SQL do Cloud.
2. **Edge functions** — peça ao Lovable para **reimplantar `create-user`** e **excluir `setup-root-user` e `check-achievements`** (em *More › Cloud › Edge functions*).
3. **Autenticação** — desligue o cadastro público (*Allow new users to sign up*) nas configurações de Auth.
4. **Senha do root** — troque a senha do usuário `root.0000`: a senha antiga ficou exposta no histórico do repositório.
5. **Repositório** — deixe o repositório **privado** no GitHub.
6. Entre como admin e revise **Admin › Configurações** (nome da loja, circuito, semana, metas padrão dos KPIs, pesos).

### O que acontece com os dados atuais
- Lançamentos antigos viram **aprovados** e geram pontos no livro.
- Conquistas e quizzes já ganhos entram no livro; o nível de todos é recalculado.
- O placar antigo das equipes continua aparecendo nos dias que não têm lançamento individual.
- Campeões começam a contar a partir da migração (dados antigos não passaram por aprovação).

---

## Desenvolvimento

```sh
npm i
npm run dev      # http://localhost:8080
npm run build
npm run lint
```

Stack: Vite, React, TypeScript, Tailwind, shadcn-ui, TanStack Query, Supabase (Postgres + RLS + RPCs).

### Testes do banco

`supabase/tests/test_db.py` sobe as migrations num Postgres local, cria dados no formato antigo, aplica as migrations novas por cima e testa **137 regras** como visitante, membro, líder e admin (aprovação, livro de pontos, conquistas, quiz, campanhas, reconhecimento, interjornada, agenda, resultados, índice).

```sh
PGHOST=localhost PGPORT=5432 python3 supabase/tests/test_db.py
```

`supabase/tests/seed_demo.sql` cria uma loja fictícia para testar as telas.

### Estrutura

```
src/
  pages/            Hoje, Gincana, Agenda, Escala, Mural, Resultados, QuizPage, LeaderPanel, AdminPanel, Profile
  components/
    layout/         AppShell (cabeçalho, navegação, barra inferior no celular)
    common/         componentes compartilhados (PeriodNav, ScoreRing, PillarBars…)
    hoje/ agenda/ mural/ lideranca/ resultados/ admin/
  hooks/data/       acesso a dados (React Query) por módulo
  lib/period.ts     regra única de semana/mês para o app inteiro
supabase/
  migrations/       esquema, RLS e funções do servidor
  functions/        create-user, delete-user
  tests/            testes do banco e dados de demonstração
```
