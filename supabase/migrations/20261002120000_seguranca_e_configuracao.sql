-- =====================================================================
-- FASE 0 + CONFIGURAÇÃO DINÂMICA
-- 1. Equipes, configurações da loja e KPIs saem do código e vão p/ tabelas
-- 2. Ninguém sem login lê nada (antes: nomes e matrículas eram públicos)
-- 3. Admin não consegue se promover a root
-- 4. Membro não troca a própria equipe/matrícula
-- 5. Só líder/admin envia notificação (e só para quem ele gerencia)
-- 6. Cadastro público (signup) não ganha papel automaticamente
-- =====================================================================

-- ---------------------------------------------------------------------
-- EQUIPES
-- ---------------------------------------------------------------------
CREATE TABLE public.teams (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]{2,30}$'),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00754B' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon TEXT NOT NULL DEFAULT '⭐',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.teams (id, name, short_name, color, icon, sort_order) VALUES
  ('dna', 'DNA de Campeões', 'DNA', '#FFBF00', '🏆', 1),
  ('elite', 'Elite do Cuidado', 'Elite', '#0BB8DA', '💎', 2),
  ('alcateia', 'Alcateia', 'Alcateia', '#8C3CDD', '🐺', 3);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_team_id_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON UPDATE CASCADE;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem equipes" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam equipes" ON public.teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DA LOJA (linha única)
-- ---------------------------------------------------------------------
CREATE TABLE public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  store_name TEXT NOT NULL DEFAULT 'Drogasil Passos II',
  store_code TEXT DEFAULT '2638',
  circuit_name TEXT NOT NULL DEFAULT 'Circuito 2026',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  -- 0 = domingo, 1 = segunda. Uma única definição de semana para o app inteiro.
  week_starts_on SMALLINT NOT NULL DEFAULT 1 CHECK (week_starts_on IN (0, 1)),
  -- quantos dias para trás o colaborador ainda pode lançar (0 = só hoje)
  entry_window_days INTEGER NOT NULL DEFAULT 1 CHECK (entry_window_days BETWEEN 0 AND 7),
  -- pesos do Índice de Engajamento (somam 100)
  weight_execucao INTEGER NOT NULL DEFAULT 35 CHECK (weight_execucao >= 0),
  weight_compromissos INTEGER NOT NULL DEFAULT 20 CHECK (weight_compromissos >= 0),
  weight_campanhas INTEGER NOT NULL DEFAULT 20 CHECK (weight_campanhas >= 0),
  weight_constancia INTEGER NOT NULL DEFAULT 10 CHECK (weight_constancia >= 0),
  weight_desenvolvimento INTEGER NOT NULL DEFAULT 10 CHECK (weight_desenvolvimento >= 0),
  weight_reconhecimento INTEGER NOT NULL DEFAULT 5 CHECK (weight_reconhecimento >= 0),
  -- reconhecimento
  recognition_points_peer INTEGER NOT NULL DEFAULT 5 CHECK (recognition_points_peer BETWEEN 0 AND 100),
  recognition_points_leader INTEGER NOT NULL DEFAULT 15 CHECK (recognition_points_leader BETWEEN 0 AND 100),
  peer_recognitions_per_week INTEGER NOT NULL DEFAULT 3 CHECK (peer_recognitions_per_week BETWEEN 0 AND 20),
  recognition_target_per_week INTEGER NOT NULL DEFAULT 2 CHECK (recognition_target_per_week BETWEEN 1 AND 20),
  -- quiz
  quiz_pass_pct INTEGER NOT NULL DEFAULT 70 CHECK (quiz_pass_pct BETWEEN 1 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum_100 CHECK (
    weight_execucao + weight_compromissos + weight_campanhas + weight_constancia
    + weight_desenvolvimento + weight_reconhecimento = 100
  )
);
INSERT INTO public.app_settings (id) VALUES (true);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem configuracoes" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins alteram configuracoes" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- DEFINIÇÃO DOS KPIs (nome exibido, limite diário, pontos, meta padrão)
-- As 4 chaves continuam as mesmas; o resto é configurável.
-- ---------------------------------------------------------------------
CREATE TABLE public.kpi_definitions (
  key TEXT PRIMARY KEY CHECK (key IN ('ofex', 'apoio', 'soria', 'cadastro')),
  label TEXT NOT NULL,
  description TEXT,
  daily_max INTEGER NOT NULL DEFAULT 100 CHECK (daily_max BETWEEN 1 AND 10000),
  points_per_unit INTEGER NOT NULL DEFAULT 1 CHECK (points_per_unit BETWEEN 0 AND 100),
  default_daily_goal INTEGER NOT NULL DEFAULT 5 CHECK (default_daily_goal >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO public.kpi_definitions (key, label, sort_order) VALUES
  ('ofex', 'OFEX', 1), ('apoio', 'Apoio', 2), ('soria', 'Sorria', 3), ('cadastro', 'Cadastro', 4);

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem KPIs" ON public.kpi_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins alteram KPIs" ON public.kpi_definitions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------
-- "Hoje" no fuso da loja (o servidor roda em UTC)
CREATE OR REPLACE FUNCTION public.app_today()
RETURNS DATE LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (now() AT TIME ZONE COALESCE((SELECT timezone FROM app_settings LIMIT 1), 'America/Sao_Paulo'))::date
$$;

CREATE OR REPLACE FUNCTION public.app_local_date(_ts TIMESTAMPTZ)
RETURNS DATE LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_ts AT TIME ZONE COALESCE((SELECT timezone FROM app_settings LIMIT 1), 'America/Sao_Paulo'))::date
$$;

CREATE OR REPLACE FUNCTION public.my_team()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$;

-- O usuário logado pode gerenciar _target? (admin: todos; líder: sua equipe)
CREATE OR REPLACE FUNCTION public.can_manage_user(_target UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'lider')
      AND EXISTS (
        SELECT 1 FROM profiles viewer JOIN profiles member ON member.id = _target
        WHERE viewer.id = auth.uid() AND viewer.team_id IS NOT NULL AND viewer.team_id = member.team_id
      )
    )
$$;

-- Primeiro dia da semana/mês que contém _ref, segundo a configuração
CREATE OR REPLACE FUNCTION public.period_start(_period TEXT, _ref DATE)
RETURNS DATE LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _period
    WHEN 'day' THEN _ref
    WHEN 'week' THEN _ref - ((EXTRACT(DOW FROM _ref)::int - (SELECT week_starts_on FROM app_settings LIMIT 1) + 7) % 7)
    WHEN 'month' THEN date_trunc('month', _ref)::date
  END
$$;

CREATE OR REPLACE FUNCTION public.period_end(_period TEXT, _ref DATE)
RETURNS DATE LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _period
    WHEN 'day' THEN _ref
    WHEN 'week' THEN public.period_start('week', _ref) + 6
    WHEN 'month' THEN (date_trunc('month', _ref) + interval '1 month - 1 day')::date
  END
$$;

-- Notificação in-app (uso interno, pelo servidor)
CREATE OR REPLACE FUNCTION public.notify_user(
  _user UUID, _title TEXT, _message TEXT, _type TEXT, _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notifications (user_id, title, message, notification_type, metadata)
  SELECT _user, _title, _message, _type, COALESCE(_metadata, '{}'::jsonb)
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = _user)
$$;

-- ---------------------------------------------------------------------
-- NINGUÉM SEM LOGIN ACESSA NADA
-- Todas as políticas existentes passam a valer só para usuários logados,
-- e o papel "anon" perde acesso direto às tabelas e funções.
-- ---------------------------------------------------------------------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND 'public' = ANY (roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

-- Funções internas: só o servidor (triggers/outras funções) chama
REVOKE EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM authenticated;

-- ---------------------------------------------------------------------
-- PAPÉIS: admin não vira root, não mexe em root
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Autenticados veem papeis" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins gerenciam papeis (exceto root)" ON public.user_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND (NOT public.is_root(user_id) OR public.is_root(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (role <> 'root' OR public.is_root(auth.uid()))
    AND (NOT public.is_root(user_id) OR public.is_root(auth.uid()))
  );

-- ---------------------------------------------------------------------
-- PERFIL: membro edita nome/foto/bio, mas não equipe nem matrícula
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() nulo = servidor (edge functions com service role)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
      RAISE EXCEPTION 'Somente administradores podem alterar a equipe';
    END IF;
    IF NEW.matricula IS DISTINCT FROM OLD.matricula THEN
      RAISE EXCEPTION 'Somente administradores podem alterar a matrícula';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ---------------------------------------------------------------------
-- NOTIFICAÇÕES: só líder (para sua equipe) ou admin cria
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Lideres notificam quem gerenciam" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_user(user_id));

-- ---------------------------------------------------------------------
-- CADASTRO PÚBLICO NÃO GANHA PAPEL
-- Só contas criadas pelo painel (edge function create-user, que marca
-- app_metadata.created_by_admin) recebem o papel "member".
-- Recomenda-se também desligar "Allow new users to sign up" no Auth.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  IF COALESCE(NEW.raw_app_meta_data ->> 'created_by_admin', 'false') = 'true' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- METAS POR EQUIPE: leitura só logado (já coberto acima), mantém admin
-- ---------------------------------------------------------------------

-- Realtime das novas tabelas de configuração
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
