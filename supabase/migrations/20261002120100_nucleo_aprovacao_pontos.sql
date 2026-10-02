-- =====================================================================
-- NÚCLEO DO SUPER APP: pessoas, turnos e livro de pontos
--  * Lançamento de KPI vira SOLICITAÇÃO: colaborador envia, líder aprova
--    ou recusa (com motivo). Só lançamento aprovado gera pontos.
--  * Livro de pontos (points_ledger): toda pontuação é uma linha com
--    quem/origem/data/valor, gravada SÓ pelo servidor. Nível = soma.
--  * Placar das equipes = soma dos lançamentos aprovados (fonte única).
--  * Escala (shifts) e Agenda (tasks) entram no núcleo porque alimentam
--    sequência, conquistas e o Índice de Engajamento.
--  * Conquistas recalculadas por pessoa, no servidor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LANÇAMENTOS DIÁRIOS COM APROVAÇÃO
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_user_daily_data_change ON public.user_daily_data;
DROP FUNCTION IF EXISTS public.aggregate_team_daily_data();

DELETE FROM public.user_daily_data WHERE user_id NOT IN (SELECT id FROM auth.users);
ALTER TABLE public.user_daily_data
  ADD CONSTRAINT user_daily_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_daily_data
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN team_id TEXT REFERENCES public.teams(id) ON UPDATE CASCADE,
  ADD COLUMN submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN review_note TEXT,
  ADD COLUMN original_values JSONB;

-- Registros antigos: considerados aprovados (eram a regra até hoje)
UPDATE public.user_daily_data u
SET status = 'approved',
    reviewed_at = now(),
    review_note = 'Aprovado na migração (registro anterior ao fluxo de aprovação)',
    team_id = p.team_id,
    submitted_at = COALESCE(u.updated_at, u.created_at, now())
FROM public.profiles p
WHERE p.id = u.user_id;

DROP INDEX IF EXISTS public.idx_user_daily_data_is_locked;
ALTER TABLE public.user_daily_data DROP COLUMN IF EXISTS is_locked;
CREATE INDEX idx_user_daily_data_status_date ON public.user_daily_data (status, date);
CREATE INDEX idx_user_daily_data_team_date ON public.user_daily_data (team_id, date);

DROP POLICY IF EXISTS "Anyone can view user daily data" ON public.user_daily_data;
DROP POLICY IF EXISTS "Members can insert own daily data" ON public.user_daily_data;
DROP POLICY IF EXISTS "Members can update own daily data" ON public.user_daily_data;
DROP POLICY IF EXISTS "Admins can manage all user daily data" ON public.user_daily_data;

CREATE POLICY "Autenticados veem lancamentos" ON public.user_daily_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Colaborador envia o proprio lancamento" ON public.user_daily_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'member'));
CREATE POLICY "Colaborador corrige lancamento nao aprovado" ON public.user_daily_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status <> 'approved') WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Colaborador cancela lancamento pendente" ON public.user_daily_data FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Valida valores contra os limites configurados
CREATE OR REPLACE FUNCTION public.validate_kpi_values(_ofex INT, _apoio INT, _soria INT, _cadastro INT)
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE k RECORD; v INT;
BEGIN
  FOR k IN SELECT key, label, daily_max FROM kpi_definitions LOOP
    v := CASE k.key WHEN 'ofex' THEN _ofex WHEN 'apoio' THEN _apoio WHEN 'soria' THEN _soria ELSE _cadastro END;
    IF v IS NULL OR v < 0 THEN
      RAISE EXCEPTION '% não pode ser negativo', k.label;
    END IF;
    IF v > k.daily_max THEN
      RAISE EXCEPTION '% acima do limite diário (%). Confira o valor.', k.label, k.daily_max;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.kpi_points(_ofex INT, _apoio INT, _soria INT, _cadastro INT)
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE key WHEN 'ofex' THEN _ofex WHEN 'apoio' THEN _apoio WHEN 'soria' THEN _soria ELSE _cadastro END
    * points_per_unit), 0)::int
  FROM kpi_definitions WHERE is_active
$$;

-- Guarda do lançamento: o que vem do app do colaborador SEMPRE entra
-- como pendente, com equipe e horário definidos pelo servidor.
CREATE OR REPLACE FUNCTION public.guard_daily_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.app_settings%ROWTYPE;
BEGIN
  -- Escritas confiáveis: funções de aprovação do líder e o servidor
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO s FROM app_settings LIMIT 1;
  PERFORM validate_kpi_values(NEW.ofex, NEW.apoio, NEW.soria, NEW.cadastro);

  IF NEW.date > app_today() THEN
    RAISE EXCEPTION 'Não é possível lançar dias futuros';
  END IF;
  IF NEW.date < app_today() - s.entry_window_days THEN
    RAISE EXCEPTION 'O prazo para lançar % terminou. Peça ao seu líder para registrar.', to_char(NEW.date, 'DD/MM');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'approved' THEN
      RAISE EXCEPTION 'Este dia já foi aprovado e está fechado';
    END IF;
    IF NEW.user_id <> OLD.user_id OR NEW.date <> OLD.date THEN
      RAISE EXCEPTION 'Não é permitido alterar a data ou o colaborador do lançamento';
    END IF;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := now();
  END IF;

  NEW.team_id := (SELECT team_id FROM profiles WHERE id = NEW.user_id);
  NEW.status := 'pending';
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.review_note := NULL;
  NEW.original_values := NULL;
  NEW.submitted_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_daily_entry BEFORE INSERT OR UPDATE ON public.user_daily_data
  FOR EACH ROW EXECUTE FUNCTION public.guard_daily_entry();

-- ---------------------------------------------------------------------
-- 2. LIVRO DE PONTOS
-- ---------------------------------------------------------------------
CREATE TABLE public.points_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  ref_date DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('kpi', 'achievement', 'quiz', 'challenge', 'task', 'recognition', 'adjustment')),
  source_id TEXT,
  points INTEGER NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_points_ledger_user_date ON public.points_ledger (user_id, ref_date);
CREATE INDEX idx_points_ledger_source ON public.points_ledger (user_id, source, source_id);
CREATE INDEX idx_points_ledger_date ON public.points_ledger (ref_date);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem o livro de pontos" ON public.points_ledger FOR SELECT TO authenticated USING (true);
-- Sem políticas de escrita: só funções do servidor gravam.

-- Ajusta o saldo de uma origem (ex.: um lançamento) para _target,
-- gravando só a diferença. Nunca apaga linhas: o histórico fica auditável.
CREATE OR REPLACE FUNCTION public.ledger_sync(
  _user UUID, _team TEXT, _date DATE, _source TEXT, _source_id TEXT, _target INT, _description TEXT
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur INT; diff INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user) THEN
    RETURN 0; -- usuário sendo excluído
  END IF;
  SELECT COALESCE(SUM(points), 0) INTO cur FROM points_ledger
  WHERE user_id = _user AND source = _source AND source_id IS NOT DISTINCT FROM _source_id;
  diff := COALESCE(_target, 0) - cur;
  IF diff <> 0 THEN
    INSERT INTO points_ledger (user_id, team_id, ref_date, source, source_id, points, description, created_by)
    VALUES (_user, COALESCE(_team, (SELECT team_id FROM profiles WHERE id = _user)), _date, _source, _source_id,
            diff, _description, auth.uid());
  END IF;
  RETURN diff;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. NÍVEIS (calculados do livro de pontos)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.level_for_points(_points INT, OUT level_number INT, OUT level_name TEXT)
LANGUAGE sql IMMUTABLE AS $$
  SELECT l.n, l.name FROM (VALUES
    (6, 'Lenda', 2000), (5, 'Diamante', 1000), (4, 'Ouro', 600),
    (3, 'Prata', 300), (2, 'Bronze', 100), (1, 'Iniciante', 0)
  ) AS l(n, name, min_points)
  WHERE COALESCE(_points, 0) >= l.min_points
  ORDER BY l.n DESC LIMIT 1
$$;

-- Feed de atividades (uso interno)
CREATE OR REPLACE FUNCTION public.post_activity(
  _user UUID, _type TEXT, _title TEXT, _description TEXT, _points INT, _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO activity_feed (user_id, team_id, activity_type, title, description, points_earned, metadata)
  SELECT _user, p.team_id, _type, _title, _description, COALESCE(_points, 0), COALESCE(_metadata, '{}'::jsonb)
  FROM profiles p WHERE p.id = _user
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_level(_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT; lvl RECORD; old_level INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user) THEN RETURN; END IF;
  SELECT COALESCE(SUM(points), 0) INTO total FROM points_ledger WHERE user_id = _user;
  SELECT * INTO lvl FROM level_for_points(total);
  SELECT level_number INTO old_level FROM user_levels WHERE user_id = _user;

  INSERT INTO user_levels (user_id, level_number, level_name, total_points, updated_at)
  VALUES (_user, lvl.level_number, lvl.level_name, total, now())
  ON CONFLICT (user_id) DO UPDATE
    SET level_number = EXCLUDED.level_number, level_name = EXCLUDED.level_name,
        total_points = EXCLUDED.total_points, updated_at = now();

  IF old_level IS NOT NULL AND lvl.level_number > old_level
     AND COALESCE(current_setting('app.silent', true), '') <> 'on' THEN
    PERFORM notify_user(_user, 'Você subiu de nível!', 'Agora você é nível ' || lvl.level_name || '.', 'level_up',
                        jsonb_build_object('level', lvl.level_number));
    PERFORM post_activity(_user, 'level_up', 'Subiu para o nível ' || lvl.level_name, NULL, 0,
                          jsonb_build_object('level', lvl.level_number));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_ledger_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM refresh_user_level(NEW.user_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ledger_insert AFTER INSERT ON public.points_ledger
  FOR EACH ROW EXECUTE FUNCTION public.on_ledger_insert();

-- Níveis e sequências passam a ser só do servidor
DROP POLICY IF EXISTS "Users can insert their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can insert their own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update their own streak" ON public.user_streaks;

-- ---------------------------------------------------------------------
-- 4. PLACAR DAS EQUIPES: uma única fonte
-- A tabela antiga (preenchida à mão ou por gatilho) vira histórico.
-- Dias antigos sem lançamento individual continuam aparecendo.
-- ---------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime DROP TABLE public.gincana_daily_data;
ALTER TABLE public.gincana_daily_data RENAME TO gincana_daily_data_legacy;
DROP POLICY IF EXISTS "Members and admins can insert gincana data" ON public.gincana_daily_data_legacy;
DROP POLICY IF EXISTS "Only admins can update gincana data" ON public.gincana_daily_data_legacy;

CREATE VIEW public.team_daily_kpis WITH (security_invoker = true) AS
SELECT u.date, u.team_id,
       SUM(u.ofex)::int AS ofex, SUM(u.apoio)::int AS apoio, SUM(u.soria)::int AS soria, SUM(u.cadastro)::int AS cadastro,
       SUM(u.ofex + u.apoio + u.soria + u.cadastro)::int AS total,
       'individual'::text AS source
FROM public.user_daily_data u
WHERE u.status = 'approved' AND u.team_id IS NOT NULL
GROUP BY u.date, u.team_id
UNION ALL
SELECT l.date, v.team_id, v.ofex, v.apoio, v.soria, v.cadastro, v.ofex + v.apoio + v.soria + v.cadastro, 'legacy'
FROM public.gincana_daily_data_legacy l
CROSS JOIN LATERAL (VALUES
  ('dna', l.dna_ofex, l.dna_apoio, l.dna_soria, l.dna_cadastro),
  ('elite', l.elite_ofex, l.elite_apoio, l.elite_soria, l.elite_cadastro),
  ('alcateia', l.alcateia_ofex, l.alcateia_apoio, l.alcateia_soria, l.alcateia_cadastro)
) AS v(team_id, ofex, apoio, soria, cadastro)
WHERE v.ofex + v.apoio + v.soria + v.cadastro > 0
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = v.team_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_daily_data u
    WHERE u.date = l.date AND u.team_id = v.team_id AND u.status = 'approved'
  );

GRANT SELECT ON public.team_daily_kpis TO authenticated;

-- ---------------------------------------------------------------------
-- 5. ESCALA (turnos)
-- ---------------------------------------------------------------------
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'trabalho'
    CHECK (kind IN ('trabalho', 'folga', 'ferias', 'atestado', 'treinamento', 'banco_horas')),
  start_time TIME,
  end_time TIME,
  note TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date),
  CONSTRAINT shift_needs_hours CHECK (kind NOT IN ('trabalho', 'treinamento') OR (start_time IS NOT NULL AND end_time IS NOT NULL))
);
CREATE INDEX idx_shifts_date ON public.shifts (date);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem a escala" ON public.shifts FOR SELECT TO authenticated USING (true);
-- Escrita somente pela função save_shifts (valida interjornada)

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 6. AGENDA (tarefas)
-- ---------------------------------------------------------------------
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'rotina'
    CHECK (category IN ('rotina', 'operacional', 'campanha', 'treinamento', 'outro')),
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  due_time TIME,
  points INTEGER NOT NULL DEFAULT 5 CHECK (points BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'concluida', 'recusada')),
  completed_at TIMESTAMPTZ,
  completion_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assignee_due ON public.tasks (assigned_to, due_date);
CREATE INDEX idx_tasks_due ON public.tasks (due_date);
CREATE INDEX idx_tasks_group ON public.tasks (group_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem a agenda" ON public.tasks FOR SELECT TO authenticated USING (true);
-- Escrita somente por funções (create_tasks, complete_task, review_task...)

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tarefa concluída no prazo? (data local da conclusão <= vencimento)
CREATE OR REPLACE FUNCTION public.task_on_time(_t public.tasks)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _t.status = 'concluida' AND _t.completed_at IS NOT NULL AND app_local_date(_t.completed_at) <= _t.due_date
$$;

-- ---------------------------------------------------------------------
-- 7. METAS INDIVIDUAIS: meta diária efetiva de um KPI
-- (meta definida pelo líder; senão, a meta padrão do KPI)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.member_daily_goal(_user UUID, _kpi TEXT)
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT target_value FROM member_goals
      WHERE user_id = _user AND period_type = 'daily' AND kpi_type = _kpi AND target_value > 0),
    (SELECT default_daily_goal FROM kpi_definitions WHERE key = _kpi)
  )
$$;

-- ---------------------------------------------------------------------
-- 8. SEQUÊNCIA (streak): dias de TRABALHO seguidos com lançamento.
-- Folga não quebra. Sem escala cadastrada, aceita até 1 dia de folga
-- entre lançamentos (rotina 3x1).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_streak(_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d RECORD; cur INT := 0; best INT := 0; prev DATE; today DATE := app_today(); last_active DATE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user) THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM shifts WHERE user_id = _user AND kind = 'trabalho') THEN
    FOR d IN
      SELECT s.date,
             EXISTS (SELECT 1 FROM user_daily_data u
                     WHERE u.user_id = _user AND u.date = s.date AND u.status <> 'rejected') AS ok
      FROM shifts s
      WHERE s.user_id = _user AND s.kind = 'trabalho' AND s.date <= today
      ORDER BY s.date
    LOOP
      IF d.ok THEN
        cur := cur + 1; best := GREATEST(best, cur); last_active := d.date;
      ELSIF d.date < today THEN
        cur := 0; -- dia de trabalho que passou sem lançamento
      END IF;
    END LOOP;
  ELSE
    FOR d IN
      SELECT date FROM user_daily_data
      WHERE user_id = _user AND status <> 'rejected' AND date <= today ORDER BY date
    LOOP
      IF prev IS NOT NULL AND d.date - prev <= 2 THEN cur := cur + 1; ELSE cur := 1; END IF;
      best := GREATEST(best, cur); prev := d.date; last_active := d.date;
    END LOOP;
    IF prev IS NOT NULL AND today - prev > 2 THEN cur := 0; END IF;
  END IF;

  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
  VALUES (_user, cur, best, last_active)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(user_streaks.longest_streak, EXCLUDED.longest_streak),
        last_active_date = EXCLUDED.last_active_date,
        updated_at = now();
END;
$$;

-- ---------------------------------------------------------------------
-- 9. CONQUISTAS
-- ---------------------------------------------------------------------
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_category_check;
ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_category_check
    CHECK (category IN ('streak', 'kpi', 'challenge', 'milestone', 'learning', 'social', 'tasks', 'engagement', 'special')),
  ADD COLUMN manual_grant BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Campeões: cada um com sua regra (antes as três usavam a mesma)
UPDATE public.achievements SET requirement_type = 'champion_daily',
  description = 'Maior pontuação de KPIs aprovados em um dia' WHERE name = 'Campeão do Dia';
UPDATE public.achievements SET requirement_type = 'champion_weekly',
  description = 'Maior Índice de Engajamento da semana' WHERE name = 'Campeão da Semana';
UPDATE public.achievements SET requirement_type = 'champion_monthly',
  description = 'Maior Índice de Engajamento do mês' WHERE name = 'Campeão do Mês';
UPDATE public.achievements SET description = 'Primeiro lançamento aprovado' WHERE name = 'Primeiro Passo';
UPDATE public.achievements SET description = '7 dias de trabalho seguidos com lançamento (folga não quebra)'
  WHERE name = 'Semana Completa';
UPDATE public.achievements SET description = '30 dias de trabalho seguidos com lançamento (folga não quebra)'
  WHERE name = 'Mês de Ouro';
UPDATE public.achievements SET description = '100 pontos de KPIs aprovados' WHERE name = 'Estreante';
UPDATE public.achievements SET description = '500 pontos de KPIs aprovados' WHERE name = 'Em Ascensão';
UPDATE public.achievements SET description = '1.000 pontos de KPIs aprovados' WHERE name = 'Veterano';
UPDATE public.achievements SET description = 'Primeiro a lançar o dia (no próprio dia), com lançamento aprovado'
  WHERE name = 'Madrugador';
UPDATE public.achievements SET description = 'Bateu a meta individual de todos os KPIs em um dia'
  WHERE name = 'Perfeccionista';
UPDATE public.achievements SET description = 'Desbloqueou todas as conquistas automáticas' WHERE name = 'Lenda';

INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points, is_trophy, manual_grant) VALUES
  ('Quinzena de Fogo', '15 dias de trabalho seguidos com lançamento', 'flame', 'streak', 'days_streak', 15, 100, false, false),
  ('Estudioso', 'Passou no primeiro quiz', 'book-open', 'learning', 'quiz_passed', 1, 15, false, false),
  ('Mestre do Conhecimento', 'Passou em 10 quizzes diferentes', 'graduation-cap', 'learning', 'quiz_passed', 10, 100, true, false),
  ('Nota 10', 'Acertou 100% de um quiz', 'badge-check', 'learning', 'quiz_perfect', 1, 25, false, false),
  ('Mão na Massa', '10 tarefas da agenda concluídas no prazo', 'list-checks', 'tasks', 'tasks_on_time', 10, 30, false, false),
  ('Pontualidade', '50 tarefas da agenda concluídas no prazo', 'alarm-clock-check', 'tasks', 'tasks_on_time', 50, 120, true, false),
  ('Desafiante', 'Concluiu a primeira campanha', 'flag', 'challenge', 'challenges_completed', 1, 30, false, false),
  ('Caçador de Campanhas', 'Concluiu 5 campanhas', 'target', 'challenge', 'challenges_completed', 5, 120, true, false),
  ('Querido pela Equipe', 'Recebeu 5 reconhecimentos', 'heart', 'social', 'recognitions_received', 5, 40, false, false),
  ('Inspirador', 'Reconheceu colegas 10 vezes', 'hand-heart', 'social', 'recognitions_sent', 10, 40, false, false),
  ('Engajamento Total', 'Índice de Engajamento de 90+ em uma semana', 'zap', 'engagement', 'engagement_90', 1, 80, false, false),
  ('Referência da Loja', 'Índice de Engajamento de 90+ em 4 semanas', 'gem', 'engagement', 'engagement_90', 4, 200, true, false),
  -- Conquistas concedidas pelo líder
  ('Atendimento Encantador', 'Cliente elogiou o atendimento', 'smile', 'special', NULL, NULL, 40, false, true),
  ('Parceiro de Equipe', 'Ajudou colegas além do esperado', 'handshake', 'special', NULL, NULL, 30, false, true),
  ('Guardião da Loja', 'Organização, PVPS e exposição exemplares', 'shield-check', 'special', NULL, NULL, 30, false, true),
  ('Destaque do Líder', 'Reconhecimento especial da liderança', 'award', 'special', NULL, NULL, 50, false, true);

-- Líder só concede conquistas "manuais"; admin concede qualquer uma
DROP POLICY IF EXISTS "Leaders can grant achievements to team members" ON public.user_achievements;
CREATE POLICY "Lideres concedem conquistas manuais para a equipe" ON public.user_achievements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'lider')
    AND public.can_manage_user(user_id)
    AND user_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.achievements a WHERE a.id = achievement_id AND a.manual_grant)
  );

-- Campeões e semanas 90+ ficam registrados por período
CREATE TABLE public.period_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award TEXT NOT NULL CHECK (award IN ('champion_daily', 'champion_weekly', 'champion_monthly', 'engagement_90')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (award, period_start, user_id)
);
CREATE TABLE public.processed_periods (
  award TEXT NOT NULL,
  period_start DATE NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (award, period_start)
);
ALTER TABLE public.period_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem premiacoes" ON public.period_awards FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.evaluate_achievements(_user UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a RECORD; ok BOOLEAN; v INT; granted INT := 0; pass_pct INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user)
     OR NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user) THEN
    RETURN 0;
  END IF;
  SELECT quiz_pass_pct INTO pass_pct FROM app_settings LIMIT 1;

  FOR a IN
    SELECT * FROM achievements
    WHERE is_active AND NOT manual_grant AND requirement_type IS NOT NULL
      AND requirement_type <> 'all_achievements'
      AND id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = _user)
  LOOP
    v := COALESCE(a.requirement_value, 1);
    ok := CASE a.requirement_type
      WHEN 'days_active' THEN
        (SELECT COUNT(DISTINCT date) FROM user_daily_data WHERE user_id = _user AND status = 'approved') >= v
      WHEN 'days_streak' THEN
        COALESCE((SELECT longest_streak FROM user_streaks WHERE user_id = _user), 0) >= v
      WHEN 'kpi_total' THEN
        COALESCE((SELECT SUM(points) FROM points_ledger WHERE user_id = _user AND source = 'kpi'), 0) >= v
      WHEN 'kpi_daily_ofex' THEN
        EXISTS (SELECT 1 FROM user_daily_data WHERE user_id = _user AND status = 'approved' AND ofex >= v)
      WHEN 'kpi_daily_apoio' THEN
        EXISTS (SELECT 1 FROM user_daily_data WHERE user_id = _user AND status = 'approved' AND apoio >= v)
      WHEN 'kpi_daily_soria' THEN
        EXISTS (SELECT 1 FROM user_daily_data WHERE user_id = _user AND status = 'approved' AND soria >= v)
      WHEN 'kpi_daily_cadastro' THEN
        EXISTS (SELECT 1 FROM user_daily_data WHERE user_id = _user AND status = 'approved' AND cadastro >= v)
      WHEN 'first_daily' THEN
        (SELECT COUNT(*) FROM user_daily_data u
          WHERE u.user_id = _user AND u.status = 'approved'
            AND app_local_date(u.created_at) = u.date
            AND u.ofex + u.apoio + u.soria + u.cadastro > 0
            AND u.created_at = (SELECT MIN(x.created_at) FROM user_daily_data x
                                WHERE x.date = u.date AND x.status = 'approved'
                                  AND x.ofex + x.apoio + x.soria + x.cadastro > 0)) >= v
      WHEN 'goal_reached' THEN
        EXISTS (
          SELECT 1 FROM user_daily_data u
          WHERE u.user_id = _user AND u.status = 'approved'
            AND EXISTS (SELECT 1 FROM kpi_definitions k WHERE k.is_active AND member_daily_goal(_user, k.key) > 0)
            AND NOT EXISTS (
              SELECT 1 FROM kpi_definitions k
              WHERE k.is_active AND member_daily_goal(_user, k.key) > 0
                AND (CASE k.key WHEN 'ofex' THEN u.ofex WHEN 'apoio' THEN u.apoio
                                WHEN 'soria' THEN u.soria ELSE u.cadastro END) < member_daily_goal(_user, k.key)
            )
        )
      WHEN 'champion_daily' THEN
        (SELECT COUNT(*) FROM period_awards WHERE user_id = _user AND award = 'champion_daily') >= v
      WHEN 'champion_weekly' THEN
        (SELECT COUNT(*) FROM period_awards WHERE user_id = _user AND award = 'champion_weekly') >= v
      WHEN 'champion_monthly' THEN
        (SELECT COUNT(*) FROM period_awards WHERE user_id = _user AND award = 'champion_monthly') >= v
      WHEN 'engagement_90' THEN
        (SELECT COUNT(*) FROM period_awards WHERE user_id = _user AND award = 'engagement_90') >= v
      WHEN 'quiz_passed' THEN
        (SELECT COUNT(DISTINCT quiz_id) FROM quiz_attempts WHERE user_id = _user AND score >= pass_pct) >= v
      WHEN 'quiz_perfect' THEN
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = _user AND score >= 100) >= v
      WHEN 'tasks_on_time' THEN
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = _user AND task_on_time(t)) >= v
      WHEN 'challenges_completed' THEN
        (SELECT COUNT(*) FROM challenge_participants WHERE user_id = _user AND completed) >= v
      WHEN 'recognitions_received' THEN
        (SELECT COUNT(*) FROM recognitions WHERE to_user_id = _user) >= v
      WHEN 'recognitions_sent' THEN
        (SELECT COUNT(*) FROM recognitions WHERE from_user_id = _user) >= v
      ELSE false
    END;

    IF ok THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user, a.id) ON CONFLICT DO NOTHING;
      IF FOUND THEN granted := granted + 1; END IF;
    END IF;
  END LOOP;

  -- "Lenda": todas as automáticas
  FOR a IN
    SELECT * FROM achievements
    WHERE is_active AND requirement_type = 'all_achievements'
      AND id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = _user)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM achievements x
      WHERE x.is_active AND NOT x.manual_grant AND x.requirement_type IS NOT NULL
        AND x.requirement_type <> 'all_achievements'
        AND x.id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = _user)
    ) THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user, a.id) ON CONFLICT DO NOTHING;
      IF FOUND THEN granted := granted + 1; END IF;
    END IF;
  END LOOP;

  RETURN granted;
END;
$$;

-- Conquista desbloqueada/removida -> livro de pontos, mural e aviso
CREATE OR REPLACE FUNCTION public.on_user_achievement_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO a FROM achievements WHERE id = NEW.achievement_id;
    PERFORM ledger_sync(NEW.user_id, NULL, app_local_date(COALESCE(NEW.achieved_at, now())), 'achievement',
                        NEW.id::text, COALESCE(a.points, 0), 'Conquista: ' || a.name);
    PERFORM notify_user(NEW.user_id, 'Nova conquista: ' || a.name,
                        COALESCE(a.description, '') || ' (+' || COALESCE(a.points, 0) || ' pts)', 'achievement',
                        jsonb_build_object('achievement_id', a.id));
    -- No mural só vai o que vale comemorar (evita spam de conquistas pequenas);
    -- a notificação pessoal acima sai sempre.
    IF COALESCE(a.points, 0) >= 25 OR a.is_trophy OR a.manual_grant THEN
      PERFORM post_activity(NEW.user_id, 'achievement', 'Desbloqueou "' || a.name || '"', a.description,
                            COALESCE(a.points, 0),
                            jsonb_build_object('achievement_id', a.id, 'icon', a.icon, 'is_trophy', a.is_trophy,
                                               'granted_by', auth.uid()));
    END IF;
    RETURN NEW;
  ELSE
    SELECT * INTO a FROM achievements WHERE id = OLD.achievement_id;
    PERFORM ledger_sync(OLD.user_id, NULL, app_today(), 'achievement', OLD.id::text, 0,
                        'Conquista removida: ' || COALESCE(a.name, ''));
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER on_user_achievement_change AFTER INSERT OR DELETE ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.on_user_achievement_change();

-- ---------------------------------------------------------------------
-- 10. CAMPANHAS (desafios): pontuação calculada no servidor
-- ---------------------------------------------------------------------
ALTER TABLE public.challenges
  ADD COLUMN team_id TEXT REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE,
  ALTER COLUMN challenge_type SET DEFAULT 'individual';
UPDATE public.challenges SET kpi_type = 'manual' WHERE kpi_type IS NULL
  OR kpi_type NOT IN ('ofex', 'apoio', 'soria', 'cadastro', 'total', 'tasks', 'manual');
ALTER TABLE public.challenges
  ALTER COLUMN kpi_type SET DEFAULT 'total',
  ALTER COLUMN kpi_type SET NOT NULL,
  ADD CONSTRAINT challenges_kpi_type_check CHECK (kpi_type IN ('ofex', 'apoio', 'soria', 'cadastro', 'total', 'tasks', 'manual')),
  ADD CONSTRAINT challenges_period_check CHECK (end_time > start_time);

CREATE OR REPLACE FUNCTION public.refresh_challenge_scores(_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; sc INT; done BOOLEAN;
BEGIN
  FOR c IN
    SELECT ch.*, cp.id AS cp_id, cp.completed AS was_completed
    FROM challenge_participants cp JOIN challenges ch ON ch.id = cp.challenge_id
    WHERE cp.user_id = _user AND ch.kpi_type <> 'manual'
      AND ch.end_time >= now() - interval '15 days'
  LOOP
    IF c.kpi_type = 'tasks' THEN
      SELECT COUNT(*) INTO sc FROM tasks t
      WHERE t.assigned_to = _user AND task_on_time(t)
        AND t.due_date BETWEEN app_local_date(c.start_time) AND app_local_date(c.end_time);
    ELSE
      SELECT COALESCE(SUM(CASE c.kpi_type
                WHEN 'ofex' THEN u.ofex WHEN 'apoio' THEN u.apoio WHEN 'soria' THEN u.soria
                WHEN 'cadastro' THEN u.cadastro ELSE u.ofex + u.apoio + u.soria + u.cadastro END), 0)
      INTO sc FROM user_daily_data u
      WHERE u.user_id = _user AND u.status = 'approved'
        AND u.date BETWEEN app_local_date(c.start_time) AND app_local_date(c.end_time);
    END IF;
    done := c.target_value IS NOT NULL AND c.target_value > 0 AND sc >= c.target_value;
    UPDATE challenge_participants
    SET score = sc, completed = done,
        completed_at = CASE WHEN done AND NOT COALESCE(c.was_completed, false) THEN now()
                            WHEN done THEN completed_at ELSE NULL END
    WHERE id = c.cp_id
      AND (score IS DISTINCT FROM sc OR completed IS DISTINCT FROM done);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 11. EFEITOS DE UM LANÇAMENTO (aprovar/recusar/reabrir/excluir)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_daily_entry_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts INT; lbl TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ledger_sync(OLD.user_id, OLD.team_id, OLD.date, 'kpi', OLD.id::text, 0,
                        'Lançamento de ' || to_char(OLD.date, 'DD/MM') || ' removido');
    PERFORM refresh_streak(OLD.user_id);
    PERFORM refresh_challenge_scores(OLD.user_id);
    RETURN OLD;
  END IF;

  lbl := 'KPIs de ' || to_char(NEW.date, 'DD/MM');
  pts := CASE WHEN NEW.status = 'approved' THEN kpi_points(NEW.ofex, NEW.apoio, NEW.soria, NEW.cadastro) ELSE 0 END;
  PERFORM ledger_sync(NEW.user_id, NEW.team_id, NEW.date, 'kpi', NEW.id::text, pts, lbl);

  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM refresh_streak(NEW.user_id);
    IF NEW.status = 'approved' THEN
      PERFORM refresh_challenge_scores(NEW.user_id);
      PERFORM evaluate_achievements(NEW.user_id);
      IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by <> NEW.user_id THEN
        PERFORM notify_user(NEW.user_id, 'Lançamento aprovado',
          lbl || ': +' || pts || ' pts' ||
          CASE WHEN NEW.original_values IS NOT NULL THEN ' (valores ajustados pelo líder)' ELSE '' END ||
          COALESCE(' — ' || NEW.review_note, ''), 'entry_approved',
          jsonb_build_object('entry_id', NEW.id, 'date', NEW.date));
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_user(NEW.user_id, 'Lançamento recusado',
        lbl || ': ' || COALESCE(NEW.review_note, 'sem motivo informado') || '. Corrija e reenvie.', 'entry_rejected',
        jsonb_build_object('entry_id', NEW.id, 'date', NEW.date));
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      PERFORM refresh_challenge_scores(NEW.user_id);
    END IF;
  ELSIF NEW.status = 'approved' THEN
    -- valores ajustados num lançamento já aprovado
    PERFORM refresh_challenge_scores(NEW.user_id);
    PERFORM evaluate_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_daily_entry_change AFTER INSERT OR UPDATE OR DELETE ON public.user_daily_data
  FOR EACH ROW EXECUTE FUNCTION public.on_daily_entry_change();

-- ---------------------------------------------------------------------
-- 12. APROVAÇÃO PELO LÍDER
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_daily_entry(
  _id UUID, _decision TEXT, _note TEXT DEFAULT NULL, _values JSONB DEFAULT NULL
) RETURNS public.user_daily_data LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.user_daily_data; r public.user_daily_data;
  nv_ofex INT; nv_apoio INT; nv_soria INT; nv_cadastro INT;
BEGIN
  SELECT * INTO e FROM user_daily_data WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
  IF NOT can_manage_user(e.user_id) THEN RAISE EXCEPTION 'Você não gerencia este colaborador'; END IF;
  IF e.user_id = auth.uid() AND NOT is_root(auth.uid()) THEN
    RAISE EXCEPTION 'Você não pode aprovar o próprio lançamento. Peça a outro líder.';
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);

  IF _decision = 'approve' THEN
    nv_ofex := COALESCE((_values ->> 'ofex')::int, e.ofex);
    nv_apoio := COALESCE((_values ->> 'apoio')::int, e.apoio);
    nv_soria := COALESCE((_values ->> 'soria')::int, e.soria);
    nv_cadastro := COALESCE((_values ->> 'cadastro')::int, e.cadastro);
    PERFORM validate_kpi_values(nv_ofex, nv_apoio, nv_soria, nv_cadastro);
    UPDATE user_daily_data SET
      status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = NULLIF(trim(_note), ''),
      original_values = CASE
        WHEN (nv_ofex, nv_apoio, nv_soria, nv_cadastro) IS DISTINCT FROM (e.ofex, e.apoio, e.soria, e.cadastro)
        THEN COALESCE(e.original_values, jsonb_build_object('ofex', e.ofex, 'apoio', e.apoio, 'soria', e.soria, 'cadastro', e.cadastro))
        ELSE e.original_values END,
      ofex = nv_ofex, apoio = nv_apoio, soria = nv_soria, cadastro = nv_cadastro
    WHERE id = _id RETURNING * INTO r;
  ELSIF _decision = 'reject' THEN
    IF COALESCE(trim(_note), '') = '' THEN RAISE EXCEPTION 'Informe o motivo da recusa'; END IF;
    UPDATE user_daily_data SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = trim(_note)
    WHERE id = _id RETURNING * INTO r;
  ELSIF _decision = 'reopen' THEN
    UPDATE user_daily_data SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL,
      review_note = COALESCE(NULLIF(trim(_note), ''), 'Reaberto pela liderança')
    WHERE id = _id RETURNING * INTO r;
  ELSE
    RAISE EXCEPTION 'Decisão inválida: %', _decision;
  END IF;

  PERFORM set_config('app.trusted_write', 'off', true);
  RETURN r;
END;
$$;

-- Líder registra direto (dia esquecido / fora do prazo): já entra aprovado
CREATE OR REPLACE FUNCTION public.leader_save_entry(
  _user UUID, _date DATE, _ofex INT, _apoio INT, _soria INT, _cadastro INT, _note TEXT DEFAULT NULL
) RETURNS public.user_daily_data LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_daily_data;
BEGIN
  IF NOT can_manage_user(_user) THEN RAISE EXCEPTION 'Você não gerencia este colaborador'; END IF;
  IF _user = auth.uid() AND NOT is_root(auth.uid()) THEN
    RAISE EXCEPTION 'Você não pode registrar e aprovar o próprio dia';
  END IF;
  IF _date > app_today() THEN RAISE EXCEPTION 'Não é possível lançar dias futuros'; END IF;
  PERFORM validate_kpi_values(_ofex, _apoio, _soria, _cadastro);
  PERFORM set_config('app.trusted_write', 'on', true);
  INSERT INTO user_daily_data (user_id, date, ofex, apoio, soria, cadastro, status, team_id,
                               reviewed_by, reviewed_at, review_note, submitted_at)
  VALUES (_user, _date, _ofex, _apoio, _soria, _cadastro, 'approved', (SELECT team_id FROM profiles WHERE id = _user),
          auth.uid(), now(), COALESCE(NULLIF(trim(_note), ''), 'Registrado pela liderança'), now())
  ON CONFLICT (user_id, date) DO UPDATE SET
    original_values = CASE WHEN user_daily_data.status = 'approved' THEN user_daily_data.original_values
      ELSE COALESCE(user_daily_data.original_values, jsonb_build_object('ofex', user_daily_data.ofex,
        'apoio', user_daily_data.apoio, 'soria', user_daily_data.soria, 'cadastro', user_daily_data.cadastro)) END,
    ofex = EXCLUDED.ofex, apoio = EXCLUDED.apoio, soria = EXCLUDED.soria, cadastro = EXCLUDED.cadastro,
    status = 'approved', reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now(), review_note = EXCLUDED.review_note
  RETURNING * INTO r;
  PERFORM set_config('app.trusted_write', 'off', true);
  RETURN r;
END;
$$;

-- ---------------------------------------------------------------------
-- 13. ÍNDICE DE ENGAJAMENTO (0 a 100)
-- Pilar sem dado no período (ex.: nenhuma tarefa) sai da conta e o peso
-- é redistribuído. Dias de trabalho vêm da escala; sem escala, dos dias
-- com lançamento.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.engagement_index(_start DATE, _end DATE)
RETURNS TABLE (
  user_id UUID, full_name TEXT, avatar_url TEXT, team_id TEXT,
  dias_trabalhados INT, escala_cadastrada BOOLEAN, pendentes INT,
  execucao NUMERIC, compromissos NUMERIC, campanhas NUMERIC,
  constancia NUMERIC, desenvolvimento NUMERIC, reconhecimento NUMERIC,
  indice NUMERIC
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  s public.app_settings%ROWTYPE; eff_end DATE; weeks NUMERIC; store_recog INT; today DATE := app_today();
BEGIN
  SELECT * INTO s FROM app_settings LIMIT 1;
  eff_end := LEAST(_end, today);
  weeks := GREATEST(1, CEIL((_end - _start + 1) / 7.0));
  SELECT COUNT(*) INTO store_recog FROM recognitions r WHERE app_local_date(r.created_at) BETWEEN _start AND _end;

  RETURN QUERY
  WITH people AS (
    SELECT p.id, p.full_name, p.avatar_url, p.team_id
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = p.id AND r.role IN ('member', 'lider'))
  ),
  has_shift AS (
    SELECT DISTINCT sh.user_id FROM shifts sh WHERE sh.date BETWEEN _start AND _end
  ),
  days AS (
    SELECT sh.user_id, sh.date FROM shifts sh
    WHERE sh.kind = 'trabalho' AND sh.date BETWEEN _start AND eff_end
    UNION
    SELECT u.user_id, u.date FROM user_daily_data u
    WHERE u.date BETWEEN _start AND eff_end AND u.status <> 'rejected'
  ),
  day_detail AS (
    SELECT d.user_id, d.date, u.status, u.created_at,
      (SELECT AVG(LEAST(1.5,
          (CASE k.key WHEN 'ofex' THEN u.ofex WHEN 'apoio' THEN u.apoio WHEN 'soria' THEN u.soria ELSE u.cadastro END)::numeric
          / member_daily_goal(d.user_id, k.key)))
       FROM kpi_definitions k
       WHERE k.is_active AND member_daily_goal(d.user_id, k.key) > 0) AS att
    FROM days d
    LEFT JOIN user_daily_data u ON u.user_id = d.user_id AND u.date = d.date AND u.status <> 'rejected'
  ),
  exec AS (
    SELECT dd.user_id,
      COUNT(*)::int AS n_days,
      COUNT(*) FILTER (WHERE dd.status = 'pending')::int AS n_pending,
      AVG(CASE WHEN dd.status = 'approved' THEN LEAST(1, COALESCE(dd.att, 0)) ELSE 0 END)
        FILTER (WHERE dd.status IS DISTINCT FROM 'pending') AS execucao,
      AVG(CASE WHEN dd.created_at IS NOT NULL AND app_local_date(dd.created_at) = dd.date THEN 1 ELSE 0 END) AS constancia
    FROM day_detail dd GROUP BY dd.user_id
  ),
  comp AS (
    SELECT t.assigned_to AS user_id,
      AVG(CASE WHEN task_on_time(t) THEN 1 ELSE 0 END) AS v
    FROM tasks t
    WHERE t.due_date BETWEEN _start AND eff_end
      AND (t.due_date < today OR t.status <> 'aberta')
    GROUP BY t.assigned_to
  ),
  camp AS (
    SELECT p.id AS user_id,
      AVG(CASE
            WHEN cp.completed THEN 1
            WHEN cp.id IS NOT NULL AND COALESCE(c.target_value, 0) > 0
              THEN LEAST(0.8, COALESCE(cp.score, 0)::numeric / c.target_value)
            WHEN cp.id IS NOT NULL THEN 0.3
            ELSE 0 END) AS v
    FROM people p
    JOIN challenges c ON c.is_active
      AND c.start_time <= now()
      AND app_local_date(c.start_time) <= eff_end AND app_local_date(c.end_time) >= _start
      AND (c.team_id IS NULL OR c.team_id = p.team_id)
    LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = p.id
    GROUP BY p.id
  ),
  dev AS (
    SELECT p.id AS user_id,
      AVG(CASE WHEN EXISTS (
            SELECT 1 FROM quiz_attempts qa
            WHERE qa.quiz_id = q.id AND qa.user_id = p.id AND qa.score >= s.quiz_pass_pct
              AND app_local_date(qa.completed_at) <= _end) THEN 1 ELSE 0 END) AS v
    FROM people p
    JOIN quizzes q ON q.is_active AND app_local_date(q.created_at) <= _end
      AND EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quiz_id = q.id)
    GROUP BY p.id
  ),
  rec AS (
    SELECT r.to_user_id AS user_id, COUNT(*) AS n
    FROM recognitions r WHERE app_local_date(r.created_at) BETWEEN _start AND _end
    GROUP BY r.to_user_id
  ),
  pillars AS (
    SELECT p.id, p.full_name, p.avatar_url, p.team_id,
      COALESCE(e.n_days, 0) AS n_days,
      (p.id IN (SELECT user_id FROM has_shift)) AS escala,
      COALESCE(e.n_pending, 0) AS n_pending,
      ROUND(100 * e.execucao, 1) AS execucao,
      ROUND(100 * cm.v, 1) AS compromissos,
      ROUND(100 * ca.v, 1) AS campanhas,
      ROUND(100 * e.constancia, 1) AS constancia,
      ROUND(100 * dv.v, 1) AS desenvolvimento,
      CASE WHEN store_recog = 0 THEN NULL
           ELSE ROUND(100 * LEAST(1, COALESCE(rc.n, 0) / (s.recognition_target_per_week * weeks)), 1) END AS reconhecimento
    FROM people p
    LEFT JOIN exec e ON e.user_id = p.id
    LEFT JOIN comp cm ON cm.user_id = p.id
    LEFT JOIN camp ca ON ca.user_id = p.id
    LEFT JOIN dev dv ON dv.user_id = p.id
    LEFT JOIN rec rc ON rc.user_id = p.id
  )
  SELECT pl.id, pl.full_name, pl.avatar_url, pl.team_id, pl.n_days, pl.escala, pl.n_pending,
    pl.execucao, pl.compromissos, pl.campanhas, pl.constancia, pl.desenvolvimento, pl.reconhecimento,
    -- sem nenhum dia trabalhado no período (férias, afastamento): sem índice
    CASE WHEN pl.n_days = 0 THEN NULL ELSE ROUND(
      (COALESCE(pl.execucao * s.weight_execucao, 0) + COALESCE(pl.compromissos * s.weight_compromissos, 0)
       + COALESCE(pl.campanhas * s.weight_campanhas, 0) + COALESCE(pl.constancia * s.weight_constancia, 0)
       + COALESCE(pl.desenvolvimento * s.weight_desenvolvimento, 0) + COALESCE(pl.reconhecimento * s.weight_reconhecimento, 0))
      / NULLIF(
        (CASE WHEN pl.execucao IS NULL THEN 0 ELSE s.weight_execucao END)
        + (CASE WHEN pl.compromissos IS NULL THEN 0 ELSE s.weight_compromissos END)
        + (CASE WHEN pl.campanhas IS NULL THEN 0 ELSE s.weight_campanhas END)
        + (CASE WHEN pl.constancia IS NULL THEN 0 ELSE s.weight_constancia END)
        + (CASE WHEN pl.desenvolvimento IS NULL THEN 0 ELSE s.weight_desenvolvimento END)
        + (CASE WHEN pl.reconhecimento IS NULL THEN 0 ELSE s.weight_reconhecimento END), 0)
    , 1) END AS indice
  FROM pillars pl
  ORDER BY indice DESC NULLS LAST, pl.full_name;
END;
$$;

-- ---------------------------------------------------------------------
-- 14. CAMPEÕES DO DIA / SEMANA / MÊS (só períodos já fechados)
-- Um dia "fecha" quando passou o prazo de lançamento e não há pendência.
-- Pode ser chamada várias vezes: é idempotente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_champions()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.app_settings%ROWTYPE; cutoff DATE; d DATE; ps DATE; pe DATE; top NUMERIC; n INT := 0; w RECORD;
  awarded UUID[] := '{}'; u UUID;
BEGIN
  SELECT * INTO s FROM app_settings LIMIT 1;
  cutoff := app_today() - s.entry_window_days - 1;

  -- Diário: maior pontuação de KPIs aprovados no dia
  FOR d IN SELECT generate_series(cutoff - 30, cutoff, interval '1 day')::date LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM processed_periods WHERE award = 'champion_daily' AND period_start = d);
    CONTINUE WHEN EXISTS (SELECT 1 FROM user_daily_data WHERE date = d AND status = 'pending');
    SELECT MAX(kpi_points(ofex, apoio, soria, cadastro)) INTO top FROM user_daily_data WHERE date = d AND status = 'approved';
    IF COALESCE(top, 0) > 0 THEN
      FOR w IN SELECT user_id, team_id FROM user_daily_data
               WHERE date = d AND status = 'approved' AND kpi_points(ofex, apoio, soria, cadastro) = top LOOP
        INSERT INTO period_awards (award, period_start, period_end, user_id, team_id, value)
        VALUES ('champion_daily', d, d, w.user_id, w.team_id, top) ON CONFLICT DO NOTHING;
        IF FOUND THEN
          n := n + 1; awarded := awarded || w.user_id;
          PERFORM post_activity(w.user_id, 'champion', 'Campeão do dia ' || to_char(d, 'DD/MM'),
                                top || ' pontos de KPIs', 0, jsonb_build_object('award', 'champion_daily', 'date', d));
        END IF;
      END LOOP;
    END IF;
    INSERT INTO processed_periods (award, period_start) VALUES ('champion_daily', d) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Semanal e mensal: maior Índice de Engajamento; semana 90+ também premia
  FOR ps IN
    SELECT DISTINCT period_start('week', g::date) FROM generate_series(cutoff - 70, cutoff, interval '1 day') g
  LOOP
    pe := period_end('week', ps);
    CONTINUE WHEN pe > cutoff;
    CONTINUE WHEN EXISTS (SELECT 1 FROM processed_periods WHERE award = 'champion_weekly' AND period_start = ps);
    CONTINUE WHEN EXISTS (SELECT 1 FROM user_daily_data WHERE date BETWEEN ps AND pe AND status = 'pending');
    SELECT MAX(ei.indice) INTO top FROM engagement_index(ps, pe) ei;
    FOR w IN SELECT * FROM engagement_index(ps, pe) ei WHERE ei.indice IS NOT NULL AND (ei.indice = top OR ei.indice >= 90) LOOP
      IF w.indice = top AND top > 0 THEN
        INSERT INTO period_awards (award, period_start, period_end, user_id, team_id, value)
        VALUES ('champion_weekly', ps, pe, w.user_id, w.team_id, w.indice) ON CONFLICT DO NOTHING;
        IF FOUND THEN
          n := n + 1; awarded := awarded || w.user_id;
          PERFORM post_activity(w.user_id, 'champion', 'Campeão da semana ' || to_char(ps, 'DD/MM') || '–' || to_char(pe, 'DD/MM'),
                                'Índice de Engajamento ' || w.indice, 0, jsonb_build_object('award', 'champion_weekly'));
        END IF;
      END IF;
      IF w.indice >= 90 THEN
        INSERT INTO period_awards (award, period_start, period_end, user_id, team_id, value)
        VALUES ('engagement_90', ps, pe, w.user_id, w.team_id, w.indice) ON CONFLICT DO NOTHING;
        IF FOUND THEN n := n + 1; awarded := awarded || w.user_id; END IF;
      END IF;
    END LOOP;
    INSERT INTO processed_periods (award, period_start) VALUES ('champion_weekly', ps) ON CONFLICT DO NOTHING;
  END LOOP;

  FOR ps IN
    SELECT DISTINCT date_trunc('month', g)::date FROM generate_series(cutoff - 95, cutoff, interval '1 day') g
  LOOP
    pe := period_end('month', ps);
    CONTINUE WHEN pe > cutoff;
    CONTINUE WHEN EXISTS (SELECT 1 FROM processed_periods WHERE award = 'champion_monthly' AND period_start = ps);
    CONTINUE WHEN EXISTS (SELECT 1 FROM user_daily_data WHERE date BETWEEN ps AND pe AND status = 'pending');
    SELECT MAX(ei.indice) INTO top FROM engagement_index(ps, pe) ei;
    IF COALESCE(top, 0) > 0 THEN
      FOR w IN SELECT * FROM engagement_index(ps, pe) ei WHERE ei.indice = top LOOP
        INSERT INTO period_awards (award, period_start, period_end, user_id, team_id, value)
        VALUES ('champion_monthly', ps, pe, w.user_id, w.team_id, w.indice) ON CONFLICT DO NOTHING;
        IF FOUND THEN
          n := n + 1; awarded := awarded || w.user_id;
          PERFORM post_activity(w.user_id, 'champion', 'Campeão do mês de ' || to_char(ps, 'MM/YYYY'),
                                'Índice de Engajamento ' || w.indice, 0, jsonb_build_object('award', 'champion_monthly'));
        END IF;
      END LOOP;
    END IF;
    INSERT INTO processed_periods (award, period_start) VALUES ('champion_monthly', ps) ON CONFLICT DO NOTHING;
  END LOOP;

  FOREACH u IN ARRAY ARRAY(SELECT DISTINCT x FROM unnest(awarded) AS x) LOOP
    PERFORM evaluate_achievements(u);
  END LOOP;
  RETURN n;
END;
$$;

-- Fecha o dia: aprova todos os pendentes que o líder gerencia
CREATE OR REPLACE FUNCTION public.close_day(_date DATE, _team TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; n INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'lider') THEN RAISE EXCEPTION 'Apenas a liderança pode fechar o dia'; END IF;
  FOR e IN
    SELECT id, user_id FROM user_daily_data
    WHERE date = _date AND status = 'pending' AND (_team IS NULL OR team_id = _team)
  LOOP
    CONTINUE WHEN NOT can_manage_user(e.user_id);
    CONTINUE WHEN e.user_id = auth.uid() AND NOT is_root(auth.uid());
    PERFORM review_daily_entry(e.id, 'approve', NULL, NULL);
    n := n + 1;
  END LOOP;
  PERFORM award_champions();
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- 15. RANKINGS AGREGADOS (evita o limite de 1.000 linhas por consulta)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kpi_ranking(_start DATE, _end DATE)
RETURNS TABLE (user_id UUID, full_name TEXT, avatar_url TEXT, team_id TEXT,
               ofex INT, apoio INT, soria INT, cadastro INT, total INT, points INT, days INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.team_id,
    SUM(u.ofex)::int, SUM(u.apoio)::int, SUM(u.soria)::int, SUM(u.cadastro)::int,
    SUM(u.ofex + u.apoio + u.soria + u.cadastro)::int,
    SUM(kpi_points(u.ofex, u.apoio, u.soria, u.cadastro))::int,
    COUNT(*)::int
  FROM user_daily_data u JOIN profiles p ON p.id = u.user_id
  WHERE u.status = 'approved' AND u.date BETWEEN _start AND _end
  GROUP BY p.id, p.full_name, p.avatar_url, p.team_id
  ORDER BY 9 DESC
$$;

CREATE OR REPLACE FUNCTION public.points_ranking(_start DATE DEFAULT NULL, _end DATE DEFAULT NULL)
RETURNS TABLE (user_id UUID, full_name TEXT, avatar_url TEXT, team_id TEXT, points INT,
               achievements INT, trophies INT, level_number INT, level_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.team_id,
    COALESCE((SELECT SUM(l.points) FROM points_ledger l WHERE l.user_id = p.id
              AND (_start IS NULL OR l.ref_date >= _start) AND (_end IS NULL OR l.ref_date <= _end)), 0)::int,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = p.id)::int,
    (SELECT COUNT(*) FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = p.id AND a.is_trophy)::int,
    COALESCE(ul.level_number, 1), COALESCE(ul.level_name, 'Iniciante')
  FROM profiles p
  LEFT JOIN user_levels ul ON ul.user_id = p.id
  WHERE EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = p.id AND r.role IN ('member', 'lider'))
  ORDER BY 5 DESC, 7 DESC, 6 DESC
$$;

-- ---------------------------------------------------------------------
-- 16. AJUSTES DE PONTOS (sempre com motivo; ficam no histórico)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_points(_user UUID, _points INT, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_manage_user(_user) THEN RAISE EXCEPTION 'Você não gerencia este colaborador'; END IF;
  IF _user = auth.uid() AND NOT is_root(auth.uid()) THEN RAISE EXCEPTION 'Você não pode ajustar os próprios pontos'; END IF;
  IF COALESCE(trim(_reason), '') = '' THEN RAISE EXCEPTION 'Informe o motivo do ajuste'; END IF;
  IF _points = 0 OR abs(_points) > 1000 THEN RAISE EXCEPTION 'Ajuste deve ser entre -1000 e 1000 (e diferente de zero)'; END IF;
  INSERT INTO points_ledger (user_id, team_id, ref_date, source, source_id, points, description, created_by)
  VALUES (_user, (SELECT team_id FROM profiles WHERE id = _user), app_today(), 'adjustment',
          gen_random_uuid()::text, _points, trim(_reason), auth.uid());
  PERFORM notify_user(_user, 'Ajuste de pontos', (CASE WHEN _points > 0 THEN '+' ELSE '' END) || _points || ' pts: ' || trim(_reason),
                      'points_adjustment', '{}'::jsonb);
END;
$$;

-- Zerar pontos (novo circuito): grava ajuste negativo do saldo, sem apagar histórico
CREATE OR REPLACE FUNCTION public.reset_points(_user UUID DEFAULT NULL, _team TEXT DEFAULT NULL, _reason TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores podem zerar pontos'; END IF;
  IF COALESCE(trim(_reason), '') = '' THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  FOR r IN
    SELECT l.user_id, SUM(l.points)::int AS total FROM points_ledger l JOIN profiles p ON p.id = l.user_id
    WHERE (_user IS NULL OR l.user_id = _user) AND (_team IS NULL OR p.team_id = _team)
    GROUP BY l.user_id HAVING SUM(l.points) <> 0
  LOOP
    INSERT INTO points_ledger (user_id, team_id, ref_date, source, source_id, points, description, created_by)
    VALUES (r.user_id, (SELECT team_id FROM profiles WHERE id = r.user_id), app_today(), 'adjustment',
            gen_random_uuid()::text, -r.total, 'Pontos zerados: ' || trim(_reason), auth.uid());
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Excluir lançamentos (admin) — os pontos são estornados automaticamente
CREATE OR REPLACE FUNCTION public.delete_entries(_user UUID DEFAULT NULL, _team TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas administradores podem excluir lançamentos'; END IF;
  IF _user IS NULL AND _team IS NULL AND NOT is_root(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o root pode excluir os lançamentos de todos';
  END IF;
  DELETE FROM user_daily_data
  WHERE (_user IS NULL OR user_id = _user) AND (_team IS NULL OR team_id = _team);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- 17. CARGA INICIAL DO LIVRO DE PONTOS (histórico existente)
-- ---------------------------------------------------------------------
DO $$
DECLARE r RECORD; cutoff DATE;
BEGIN
  PERFORM set_config('app.silent', 'on', true);
  -- KPIs aprovados
  FOR r IN SELECT * FROM public.user_daily_data WHERE status = 'approved' LOOP
    PERFORM public.ledger_sync(r.user_id, r.team_id, r.date, 'kpi', r.id::text,
      public.kpi_points(r.ofex, r.apoio, r.soria, r.cadastro), 'KPIs de ' || to_char(r.date, 'DD/MM'));
  END LOOP;
  -- Conquistas já desbloqueadas
  FOR r IN SELECT ua.*, a.points, a.name FROM public.user_achievements ua JOIN public.achievements a ON a.id = ua.achievement_id LOOP
    PERFORM public.ledger_sync(r.user_id, NULL, public.app_local_date(COALESCE(r.achieved_at, now())), 'achievement',
      r.id::text, COALESCE(r.points, 0), 'Conquista: ' || r.name);
  END LOOP;
  -- Quizzes aprovados (primeira aprovação de cada quiz)
  FOR r IN
    SELECT DISTINCT ON (qa.user_id, qa.quiz_id) qa.user_id, qa.quiz_id, qa.completed_at, q.bonus_points, q.title
    FROM public.quiz_attempts qa JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.score >= 70 ORDER BY qa.user_id, qa.quiz_id, qa.completed_at
  LOOP
    PERFORM public.ledger_sync(r.user_id, NULL, public.app_local_date(r.completed_at), 'quiz', r.quiz_id::text,
      COALESCE(r.bonus_points, 10), 'Quiz: ' || r.title);
  END LOOP;
  -- Níveis e sequências de todos
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.refresh_user_level(r.id);
    PERFORM public.refresh_streak(r.id);
  END LOOP;
  -- Campeões começam a contar a partir de agora: períodos antigos ficam marcados
  -- como processados (os dados antigos não passaram por aprovação).
  cutoff := public.app_today() - (SELECT entry_window_days FROM public.app_settings LIMIT 1) - 1;
  INSERT INTO public.processed_periods (award, period_start)
  SELECT 'champion_daily', g::date FROM generate_series(cutoff - 30, cutoff, interval '1 day') g
  ON CONFLICT DO NOTHING;
  INSERT INTO public.processed_periods (award, period_start)
  SELECT DISTINCT 'champion_weekly', public.period_start('week', g::date)
  FROM generate_series(cutoff - 70, cutoff, interval '1 day') g
  WHERE public.period_end('week', g::date) <= cutoff
  ON CONFLICT DO NOTHING;
  INSERT INTO public.processed_periods (award, period_start)
  SELECT DISTINCT 'champion_monthly', date_trunc('month', g)::date
  FROM generate_series(cutoff - 95, cutoff, interval '1 day') g
  WHERE public.period_end('month', g::date) <= cutoff
  ON CONFLICT DO NOTHING;
  PERFORM set_config('app.silent', 'off', true);
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_daily_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_ledger;
