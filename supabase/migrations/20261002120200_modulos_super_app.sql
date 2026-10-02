-- =====================================================================
-- MÓDULOS DO SUPER APP
--  * Quiz: gabarito não vai mais para o celular; correção no servidor
--  * Campanhas: líder cria, colaborador participa, progresso automático
--  * Mural: feed + reações; reconhecimento entre colegas com limite semanal
--  * Escala: gravação em lote com validação de interjornada (11h, CLT art. 66)
--  * Agenda: tarefas com pontos (no prazo = cheio; atrasada = metade)
--  * Resultados da loja: vendas, clientes, venda simples e Encantômetro (NSS)
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUIZ
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Lideres veem perguntas com gabarito" ON public.quiz_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lider'));

DROP POLICY IF EXISTS "Users can submit quiz attempts" ON public.quiz_attempts;
-- tentativas só via submit_quiz_attempt

CREATE OR REPLACE FUNCTION public.list_my_quizzes()
RETURNS TABLE (id UUID, title TEXT, description TEXT, time_limit_seconds INT, bonus_points INT,
               question_count INT, attempts INT, best_score INT, passed BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.title, q.description, q.time_limit_seconds, q.bonus_points,
    (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id)::int,
    (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = auth.uid())::int,
    (SELECT MAX(score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = auth.uid())::int,
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = auth.uid()
            AND qa.score >= (SELECT quiz_pass_pct FROM app_settings LIMIT 1)),
    q.created_at
  FROM quizzes q
  WHERE q.is_active AND EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.quiz_id = q.id)
  ORDER BY q.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_for_attempt(_quiz UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', q.id, 'title', q.title, 'description', q.description,
    'time_limit_seconds', q.time_limit_seconds, 'bonus_points', q.bonus_points,
    'pass_pct', (SELECT quiz_pass_pct FROM app_settings LIMIT 1),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', qq.id, 'question', qq.question, 'options', qq.options)
                       ORDER BY qq.order_index, qq.id)
      FROM quiz_questions qq WHERE qq.quiz_id = q.id), '[]'::jsonb))
  FROM quizzes q
  WHERE q.id = _quiz AND (q.is_active OR has_role(auth.uid(), 'lider'))
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_quiz UUID, _answers INT[], _time_taken INT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quizzes%ROWTYPE; qs RECORD; i INT := 0; total INT; correct INT := 0; sc INT;
  pass_pct INT; passed BOOLEAN; already BOOLEAN; pts INT := 0; review JSONB := '[]'::jsonb; chosen INT;
BEGIN
  IF NOT has_role(auth.uid(), 'member') THEN RAISE EXCEPTION 'Sem permissão para responder quizzes'; END IF;
  SELECT * INTO q FROM quizzes WHERE id = _quiz;
  IF NOT FOUND OR NOT q.is_active THEN RAISE EXCEPTION 'Quiz não disponível'; END IF;
  SELECT quiz_pass_pct INTO pass_pct FROM app_settings LIMIT 1;
  SELECT COUNT(*) INTO total FROM quiz_questions WHERE quiz_id = _quiz;
  IF total = 0 THEN RAISE EXCEPTION 'Quiz sem perguntas'; END IF;

  already := EXISTS (SELECT 1 FROM quiz_attempts WHERE quiz_id = _quiz AND user_id = auth.uid() AND score >= pass_pct);

  FOR qs IN SELECT * FROM quiz_questions WHERE quiz_id = _quiz ORDER BY order_index, id LOOP
    i := i + 1;
    chosen := CASE WHEN _answers IS NOT NULL AND array_length(_answers, 1) >= i THEN _answers[i] END;
    IF chosen IS NOT NULL AND chosen = qs.correct_option THEN correct := correct + 1; END IF;
    review := review || jsonb_build_object('question', qs.question, 'options', qs.options,
                                           'chosen', chosen, 'correct_option', qs.correct_option,
                                           'is_correct', chosen IS NOT NULL AND chosen = qs.correct_option);
  END LOOP;

  sc := ROUND(100.0 * correct / total);
  passed := sc >= pass_pct;

  INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, correct_answers, time_taken_seconds)
  VALUES (_quiz, auth.uid(), sc, total, correct, _time_taken);

  IF passed AND NOT already THEN
    pts := COALESCE(q.bonus_points, 10);
    PERFORM ledger_sync(auth.uid(), NULL, app_today(), 'quiz', _quiz::text, pts, 'Quiz: ' || q.title);
    PERFORM post_activity(auth.uid(), 'quiz_passed', 'Passou no quiz "' || q.title || '"',
                          'Acertou ' || correct || ' de ' || total, pts, jsonb_build_object('quiz_id', _quiz, 'score', sc));
  END IF;
  PERFORM evaluate_achievements(auth.uid());

  RETURN jsonb_build_object('score', sc, 'correct', correct, 'total', total, 'passed', passed,
                            'pass_pct', pass_pct, 'points_earned', pts, 'already_passed', already,
                            'review', review);
END;
$$;

-- ---------------------------------------------------------------------
-- CAMPANHAS
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Leaders can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Leaders can update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Leaders can delete challenges" ON public.challenges;
CREATE POLICY "Admin cria campanhas; lider so para a propria equipe" ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'lider') AND team_id IS NOT NULL AND team_id = public.my_team()));
CREATE POLICY "Admin altera campanhas; lider so da propria equipe" ON public.challenges FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'lider') AND team_id IS NOT NULL AND team_id = public.my_team()))
  WITH CHECK (public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'lider') AND team_id IS NOT NULL AND team_id = public.my_team()));
CREATE POLICY "Admin exclui campanhas; lider so da propria equipe" ON public.challenges FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'lider') AND team_id IS NOT NULL AND team_id = public.my_team()));

CREATE OR REPLACE FUNCTION public.on_challenge_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT pr.id FROM profiles pr
    WHERE (NEW.team_id IS NULL OR pr.team_id = NEW.team_id)
      AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pr.id AND r.role IN ('member', 'lider'))
  LOOP
    PERFORM notify_user(p.id, 'Nova campanha: ' || NEW.title,
      'Vale +' || COALESCE(NEW.bonus_points, 0) || ' pts. Entre em Hoje › Campanhas e participe!', 'challenge',
      jsonb_build_object('challenge_id', NEW.id));
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_challenge_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_challenge_creator BEFORE INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_challenge_creator();
CREATE TRIGGER on_challenge_insert AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.on_challenge_insert();

DROP POLICY IF EXISTS "Users can update their participation" ON public.challenge_participants;
CREATE POLICY "Colaborador sai de campanha nao concluida" ON public.challenge_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND NOT COALESCE(completed, false));

CREATE OR REPLACE FUNCTION public.guard_challenge_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.challenges%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id <> auth.uid() AND NOT can_manage_user(NEW.user_id) THEN
    RAISE EXCEPTION 'Você só pode entrar em campanhas por você mesmo';
  END IF;
  SELECT * INTO c FROM challenges WHERE id = NEW.challenge_id;
  IF NOT FOUND OR NOT c.is_active OR c.end_time < now() THEN
    RAISE EXCEPTION 'Campanha encerrada ou indisponível';
  END IF;
  IF c.team_id IS NOT NULL AND c.team_id IS DISTINCT FROM (SELECT team_id FROM profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Esta campanha é de outra equipe';
  END IF;
  NEW.score := 0; NEW.completed := false; NEW.completed_at := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_challenge_join BEFORE INSERT ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_challenge_join();

CREATE OR REPLACE FUNCTION public.on_challenge_participant_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.challenges%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_challenge_scores(NEW.user_id);
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM ledger_sync(OLD.user_id, NULL, app_today(), 'challenge', OLD.challenge_id::text, 0, 'Saiu da campanha');
    RETURN OLD;
  END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN
    SELECT * INTO c FROM challenges WHERE id = NEW.challenge_id;
    PERFORM ledger_sync(NEW.user_id, NULL, app_today(), 'challenge', NEW.challenge_id::text,
                        CASE WHEN NEW.completed THEN COALESCE(c.bonus_points, 0) ELSE 0 END,
                        'Campanha: ' || c.title);
    IF NEW.completed THEN
      PERFORM notify_user(NEW.user_id, 'Campanha concluída!', c.title || ' (+' || COALESCE(c.bonus_points, 0) || ' pts)',
                          'challenge_completed', jsonb_build_object('challenge_id', c.id));
      PERFORM post_activity(NEW.user_id, 'challenge_completed', 'Concluiu a campanha "' || c.title || '"',
                            NULL, COALESCE(c.bonus_points, 0), jsonb_build_object('challenge_id', c.id));
      PERFORM evaluate_achievements(NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_challenge_participant_change AFTER INSERT OR UPDATE OR DELETE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.on_challenge_participant_change();

-- Campanhas "manuais" (ex.: vitrine, PVPS): líder marca quem cumpriu
CREATE OR REPLACE FUNCTION public.set_challenge_completion(_challenge UUID, _user UUID, _completed BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.challenges%ROWTYPE;
BEGIN
  SELECT * INTO c FROM challenges WHERE id = _challenge;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada'; END IF;
  IF c.kpi_type <> 'manual' THEN RAISE EXCEPTION 'Esta campanha é calculada automaticamente'; END IF;
  IF NOT can_manage_user(_user) THEN RAISE EXCEPTION 'Você não gerencia este colaborador'; END IF;
  IF _user = auth.uid() AND NOT is_root(auth.uid()) THEN RAISE EXCEPTION 'Você não pode validar a própria campanha'; END IF;
  IF NOT EXISTS (SELECT 1 FROM challenge_participants WHERE challenge_id = _challenge AND user_id = _user) THEN
    IF c.end_time < now() THEN
      RAISE EXCEPTION 'O colaborador não participou desta campanha';
    END IF;
    INSERT INTO challenge_participants (challenge_id, user_id) VALUES (_challenge, _user);
  END IF;
  UPDATE challenge_participants
  SET completed = _completed, score = CASE WHEN _completed THEN COALESCE(c.target_value, 1) ELSE 0 END,
      completed_at = CASE WHEN _completed THEN now() ELSE NULL END
  WHERE challenge_id = _challenge AND user_id = _user;
END;
$$;

-- ---------------------------------------------------------------------
-- MURAL (feed + reações)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activity_feed;
CREATE POLICY "Admins removem posts do mural" ON public.activity_feed FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_type_check CHECK (reaction_type IN ('like', 'aplauso', 'coracao', 'fogo', 'forca', 'festa'));
CREATE POLICY "Usuario troca a propria reacao" ON public.reactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- RECONHECIMENTO
-- ---------------------------------------------------------------------
ALTER TABLE public.recognitions ADD COLUMN from_leader BOOLEAN NOT NULL DEFAULT false;
UPDATE public.recognitions SET recognition_type = 'congratulations'
WHERE recognition_type NOT IN ('congratulations', 'highlight', 'extra_effort', 'team_player', 'improvement',
                               'customer_care', 'helping_hand');
ALTER TABLE public.recognitions ADD CONSTRAINT recognitions_type_check CHECK (recognition_type IN (
  'congratulations', 'highlight', 'extra_effort', 'team_player', 'improvement', 'customer_care', 'helping_hand'));

CREATE OR REPLACE FUNCTION public.recognition_label(_type TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _type
    WHEN 'congratulations' THEN 'Parabéns!' WHEN 'highlight' THEN 'Destaque'
    WHEN 'extra_effort' THEN 'Esforço Extra' WHEN 'team_player' THEN 'Jogador de Equipe'
    WHEN 'improvement' THEN 'Evolução Notável' WHEN 'customer_care' THEN 'Atendimento Encantador'
    WHEN 'helping_hand' THEN 'Mão Amiga' ELSE 'Reconhecimento' END
$$;

CREATE OR REPLACE FUNCTION public.guard_recognition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim INT; used INT; wk DATE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.from_user_id := auth.uid();
  NEW.created_at := now();
  IF NEW.to_user_id = NEW.from_user_id THEN RAISE EXCEPTION 'Você não pode reconhecer a si mesmo'; END IF;
  IF NOT has_role(auth.uid(), 'member') THEN RAISE EXCEPTION 'Sem permissão para enviar reconhecimentos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.to_user_id) THEN RAISE EXCEPTION 'Colaborador inválido'; END IF;
  IF char_length(trim(COALESCE(NEW.message, ''))) < 10 THEN
    RAISE EXCEPTION 'Conte o motivo do reconhecimento (mínimo 10 caracteres)';
  END IF;
  NEW.message := trim(NEW.message);
  NEW.from_leader := can_manage_user(NEW.to_user_id);

  IF NOT NEW.from_leader THEN
    SELECT peer_recognitions_per_week INTO lim FROM app_settings LIMIT 1;
    wk := period_start('week', app_today());
    SELECT COUNT(*) INTO used FROM recognitions
    WHERE from_user_id = auth.uid() AND NOT from_leader AND app_local_date(created_at) >= wk;
    IF used >= lim THEN
      RAISE EXCEPTION 'Você já usou seus % elogios desta semana. Na próxima semana tem mais!', lim;
    END IF;
    IF EXISTS (SELECT 1 FROM recognitions WHERE from_user_id = auth.uid() AND to_user_id = NEW.to_user_id
               AND NOT from_leader AND app_local_date(created_at) >= wk) THEN
      RAISE EXCEPTION 'Você já reconheceu esta pessoa nesta semana. Que tal reconhecer outro colega?';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_recognition BEFORE INSERT ON public.recognitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_recognition();

CREATE OR REPLACE FUNCTION public.on_recognition_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.app_settings%ROWTYPE; pts INT; from_name TEXT; to_name TEXT;
BEGIN
  SELECT * INTO s FROM app_settings LIMIT 1;
  pts := CASE WHEN NEW.from_leader THEN s.recognition_points_leader ELSE s.recognition_points_peer END;
  SELECT COALESCE(full_name, 'Colega') INTO from_name FROM profiles WHERE id = NEW.from_user_id;
  SELECT COALESCE(full_name, 'Colega') INTO to_name FROM profiles WHERE id = NEW.to_user_id;
  PERFORM ledger_sync(NEW.to_user_id, NULL, app_local_date(NEW.created_at), 'recognition', NEW.id::text, pts,
                      recognition_label(NEW.recognition_type) || ' de ' || from_name);
  IF NEW.is_public THEN
    PERFORM post_activity(NEW.to_user_id, 'recognition', recognition_label(NEW.recognition_type), NEW.message, pts,
      jsonb_build_object('recognition_type', NEW.recognition_type, 'from_user_id', NEW.from_user_id,
                         'from_name', from_name, 'to_name', to_name, 'from_leader', NEW.from_leader));
  END IF;
  PERFORM notify_user(NEW.to_user_id, from_name || ' reconheceu você: ' || recognition_label(NEW.recognition_type),
                      NEW.message || ' (+' || pts || ' pts)', 'recognition',
                      jsonb_build_object('recognition_id', NEW.id));
  PERFORM evaluate_achievements(NEW.to_user_id);
  PERFORM evaluate_achievements(NEW.from_user_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_recognition_insert AFTER INSERT ON public.recognitions
  FOR EACH ROW EXECUTE FUNCTION public.on_recognition_insert();

-- Quantos elogios ainda posso enviar nesta semana
CREATE OR REPLACE FUNCTION public.my_peer_recognitions_left()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, (SELECT peer_recognitions_per_week FROM app_settings LIMIT 1) - (
    SELECT COUNT(*) FROM recognitions
    WHERE from_user_id = auth.uid() AND NOT from_leader
      AND app_local_date(created_at) >= period_start('week', app_today())))::int
$$;

-- ---------------------------------------------------------------------
-- ESCALA
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.interjornada_violations(_start DATE, _end DATE)
RETURNS TABLE (user_id UUID, full_name TEXT, date_from DATE, date_to DATE, rest_hours NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT sh.user_id, sh.date,
      (sh.date + sh.start_time) AS st,
      (sh.date + sh.end_time + CASE WHEN sh.end_time <= sh.start_time THEN interval '1 day' ELSE interval '0' END) AS en
    FROM shifts sh
    WHERE sh.kind IN ('trabalho', 'treinamento') AND sh.date BETWEEN _start - 1 AND _end + 1
  ), seq AS (
    SELECT s.*, lead(s.st) OVER w AS next_st, lead(s.date) OVER w AS next_date
    FROM s WINDOW w AS (PARTITION BY s.user_id ORDER BY s.date)
  )
  SELECT seq.user_id, p.full_name, seq.date, seq.next_date,
         ROUND((EXTRACT(EPOCH FROM (seq.next_st - seq.en)) / 3600)::numeric, 1)
  FROM seq JOIN profiles p ON p.id = seq.user_id
  WHERE seq.next_st IS NOT NULL
    AND seq.next_st - seq.en < interval '11 hours'
    AND (seq.date BETWEEN _start AND _end OR seq.next_date BETWEEN _start AND _end)
  ORDER BY p.full_name, seq.date
$$;

-- Grava vários turnos de uma vez. Formato:
-- [{"user_id": "...", "date": "2026-10-05", "kind": "trabalho", "start_time": "13:00", "end_time": "23:00"},
--  {"user_id": "...", "date": "2026-10-06", "kind": "remover"}]
CREATE OR REPLACE FUNCTION public.save_shifts(_rows JSONB)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INT := 0; users UUID[] := '{}'; dmin DATE; dmax DATE; msg TEXT; u UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'lider') THEN RAISE EXCEPTION 'Apenas a liderança pode editar a escala'; END IF;
  IF jsonb_typeof(_rows) <> 'array' THEN RAISE EXCEPTION 'Formato inválido'; END IF;

  FOR r IN SELECT * FROM jsonb_to_recordset(_rows)
           AS x(user_id UUID, date DATE, kind TEXT, start_time TIME, end_time TIME, note TEXT)
  LOOP
    IF r.user_id IS NULL OR r.date IS NULL THEN RAISE EXCEPTION 'Linha sem colaborador ou data'; END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = r.user_id) THEN RAISE EXCEPTION 'Colaborador não encontrado'; END IF;
    IF r.kind IS NULL OR r.kind = 'remover' THEN
      DELETE FROM shifts WHERE user_id = r.user_id AND date = r.date;
    ELSE
      INSERT INTO shifts (user_id, date, kind, start_time, end_time, note, updated_by)
      VALUES (r.user_id, r.date, r.kind,
              CASE WHEN r.kind IN ('trabalho', 'treinamento') THEN r.start_time END,
              CASE WHEN r.kind IN ('trabalho', 'treinamento') THEN r.end_time END,
              NULLIF(trim(r.note), ''), auth.uid())
      ON CONFLICT (user_id, date) DO UPDATE SET
        kind = EXCLUDED.kind, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
        note = EXCLUDED.note, updated_by = EXCLUDED.updated_by;
    END IF;
    n := n + 1;
    users := users || r.user_id;
    dmin := LEAST(dmin, r.date); dmax := GREATEST(dmax, r.date);
  END LOOP;

  IF n = 0 THEN RETURN 0; END IF;

  SELECT string_agg(v.full_name || ' (' || to_char(v.date_from, 'DD/MM') || ' → ' || to_char(v.date_to, 'DD/MM')
                    || ': ' || v.rest_hours || 'h)', '; ')
  INTO msg
  FROM interjornada_violations(dmin, dmax) v WHERE v.user_id = ANY (users);
  IF msg IS NOT NULL THEN
    RAISE EXCEPTION 'Interjornada menor que 11h (CLT art. 66): %', msg;
  END IF;

  FOREACH u IN ARRAY ARRAY(SELECT DISTINCT x FROM unnest(users) AS x) LOOP
    PERFORM refresh_streak(u);
  END LOOP;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- AGENDA (tarefas)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_task_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ledger_sync(OLD.assigned_to, NULL, OLD.due_date, 'task', OLD.id::text, 0, 'Tarefa removida: ' || OLD.title);
    PERFORM refresh_challenge_scores(OLD.assigned_to);
    RETURN OLD;
  END IF;
  pts := CASE
    WHEN NEW.status <> 'concluida' THEN 0
    WHEN task_on_time(NEW) THEN NEW.points
    ELSE CEIL(NEW.points / 2.0)::int END;
  PERFORM ledger_sync(NEW.assigned_to, NULL, NEW.due_date, 'task', NEW.id::text, pts,
                      'Tarefa: ' || NEW.title || CASE WHEN NEW.status = 'concluida' AND NOT task_on_time(NEW)
                                                      THEN ' (fora do prazo)' ELSE '' END);
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM refresh_challenge_scores(NEW.assigned_to);
    IF NEW.status = 'concluida' THEN PERFORM evaluate_achievements(NEW.assigned_to); END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_task_change AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_change();

CREATE OR REPLACE FUNCTION public.create_tasks(
  _title TEXT, _description TEXT, _category TEXT, _assignees UUID[], _dates DATE[],
  _due_time TIME DEFAULT NULL, _points INT DEFAULT 5
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g UUID := gen_random_uuid(); a UUID; d DATE; n INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'lider') THEN RAISE EXCEPTION 'Apenas a liderança cria tarefas'; END IF;
  IF COALESCE(array_length(_assignees, 1), 0) = 0 THEN RAISE EXCEPTION 'Escolha ao menos uma pessoa'; END IF;
  IF COALESCE(array_length(_dates, 1), 0) = 0 THEN RAISE EXCEPTION 'Escolha ao menos uma data'; END IF;
  IF array_length(_assignees, 1) * array_length(_dates, 1) > 600 THEN
    RAISE EXCEPTION 'Muitas tarefas de uma vez (máx. 600). Divida em partes.';
  END IF;
  FOREACH a IN ARRAY _assignees LOOP
    IF NOT can_manage_user(a) THEN RAISE EXCEPTION 'Você só pode atribuir tarefas a quem você gerencia'; END IF;
  END LOOP;

  FOREACH a IN ARRAY ARRAY(SELECT DISTINCT x FROM unnest(_assignees) AS x) LOOP
    FOREACH d IN ARRAY ARRAY(SELECT DISTINCT x FROM unnest(_dates) AS x ORDER BY x) LOOP
      INSERT INTO tasks (group_id, title, description, category, assigned_to, due_date, due_time, points, created_by)
      VALUES (g, trim(_title), NULLIF(trim(_description), ''), COALESCE(_category, 'rotina'), a, d, _due_time,
              COALESCE(_points, 5), auth.uid());
      n := n + 1;
    END LOOP;
    PERFORM notify_user(a, 'Nova tarefa: ' || trim(_title),
      CASE WHEN array_length(_dates, 1) = 1 THEN 'Para ' || to_char(_dates[1], 'DD/MM')
           ELSE array_length(_dates, 1) || ' datas a partir de ' || to_char((SELECT MIN(x) FROM unnest(_dates) x), 'DD/MM') END
      || ' · vale ' || COALESCE(_points, 5) || ' pts', 'task', jsonb_build_object('group_id', g));
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_task(_id UUID, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO t FROM tasks WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF t.assigned_to <> auth.uid() THEN RAISE EXCEPTION 'Esta tarefa é de outra pessoa'; END IF;
  IF t.status = 'concluida' THEN RETURN; END IF;
  UPDATE tasks SET status = 'concluida', completed_at = now(), completion_note = NULLIF(trim(_note), ''),
                   reviewed_by = NULL, reviewed_at = NULL
  WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_task(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO t FROM tasks WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF t.assigned_to <> auth.uid() AND NOT can_manage_user(t.assigned_to) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE tasks SET status = 'aberta', completed_at = NULL, completion_note = NULL WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_task(_id UUID, _decision TEXT, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO t FROM tasks WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT can_manage_user(t.assigned_to) THEN RAISE EXCEPTION 'Você não gerencia este colaborador'; END IF;
  IF t.assigned_to = auth.uid() AND NOT is_root(auth.uid()) THEN RAISE EXCEPTION 'Você não pode revisar a própria tarefa'; END IF;
  IF _decision = 'recusar' THEN
    IF COALESCE(trim(_note), '') = '' THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
    UPDATE tasks SET status = 'recusada', reviewed_by = auth.uid(), reviewed_at = now(), review_note = trim(_note)
    WHERE id = _id;
    PERFORM notify_user(t.assigned_to, 'Tarefa devolvida: ' || t.title, trim(_note), 'task_rejected',
                        jsonb_build_object('task_id', _id));
  ELSIF _decision = 'confirmar' THEN
    UPDATE tasks SET reviewed_by = auth.uid(), reviewed_at = now(), review_note = NULLIF(trim(_note), '')
    WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Decisão inválida';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tasks(_id UUID DEFAULT NULL, _group UUID DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NOT has_role(auth.uid(), 'lider') THEN RAISE EXCEPTION 'Apenas a liderança exclui tarefas'; END IF;
  IF _id IS NULL AND _group IS NULL THEN RAISE EXCEPTION 'Informe a tarefa'; END IF;
  DELETE FROM tasks
  WHERE ((_id IS NOT NULL AND id = _id) OR (_group IS NOT NULL AND group_id = _group))
    AND can_manage_user(assigned_to);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------
-- RESULTADOS DA LOJA (metas de venda + Encantômetro)
-- NSS = (Ótimo − Regular − Ruim − Péssimo) ÷ Total de votos. "Bom" é neutro.
-- ---------------------------------------------------------------------
ALTER TABLE public.app_settings
  ADD COLUMN nss_goal NUMERIC(5,1) NOT NULL DEFAULT 80,
  ADD COLUMN venda_simples_goal NUMERIC(5,1) NOT NULL DEFAULT 60;

CREATE TABLE public.store_daily_results (
  date DATE PRIMARY KEY,
  vendas NUMERIC(12,2) CHECK (vendas >= 0),
  meta_vendas NUMERIC(12,2) CHECK (meta_vendas >= 0),
  clientes INTEGER CHECK (clientes >= 0),
  meta_clientes INTEGER CHECK (meta_clientes >= 0),
  venda_simples_pct NUMERIC(5,2) CHECK (venda_simples_pct BETWEEN 0 AND 100),
  nss_otimo INTEGER NOT NULL DEFAULT 0 CHECK (nss_otimo >= 0),
  nss_bom INTEGER NOT NULL DEFAULT 0 CHECK (nss_bom >= 0),
  nss_regular INTEGER NOT NULL DEFAULT 0 CHECK (nss_regular >= 0),
  nss_ruim INTEGER NOT NULL DEFAULT 0 CHECK (nss_ruim >= 0),
  nss_pessimo INTEGER NOT NULL DEFAULT 0 CHECK (nss_pessimo >= 0),
  nss_total INTEGER GENERATED ALWAYS AS (nss_otimo + nss_bom + nss_regular + nss_ruim + nss_pessimo) STORED,
  nss NUMERIC(6,1) GENERATED ALWAYS AS (
    CASE WHEN nss_otimo + nss_bom + nss_regular + nss_ruim + nss_pessimo > 0
      THEN ROUND(100.0 * (nss_otimo - nss_regular - nss_ruim - nss_pessimo)
                 / (nss_otimo + nss_bom + nss_regular + nss_ruim + nss_pessimo), 1) END) STORED,
  ticket_medio NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN clientes > 0 THEN ROUND(vendas / clientes, 2) END) STORED,
  observacao TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_daily_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem resultados" ON public.store_daily_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lideranca lanca resultados" ON public.store_daily_results FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'lider'));
CREATE POLICY "Lideranca corrige resultados" ON public.store_daily_results FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lider')) WITH CHECK (public.has_role(auth.uid(), 'lider'));
CREATE POLICY "Admin exclui resultados" ON public.store_daily_results FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.stamp_store_result()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER stamp_store_result BEFORE INSERT OR UPDATE ON public.store_daily_results
  FOR EACH ROW EXECUTE FUNCTION public.stamp_store_result();

ALTER PUBLICATION supabase_realtime ADD TABLE public.store_daily_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- ---------------------------------------------------------------------
-- FUNÇÕES INTERNAS: o app não chama diretamente
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.ledger_sync(UUID, TEXT, DATE, TEXT, TEXT, INT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_user_level(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_streak(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.evaluate_achievements(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_challenge_scores(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_activity(UUID, TEXT, TEXT, TEXT, INT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
