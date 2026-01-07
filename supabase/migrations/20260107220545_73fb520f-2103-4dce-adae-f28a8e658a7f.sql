-- Atualizar funcao has_role para suportar hierarquia (root herda admin e member)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND (
      role = _role 
      OR (role = 'root' AND _role IN ('admin', 'member'))
      OR (role = 'admin' AND _role = 'member')
    )
  )
$$;

-- Funcao especifica para verificar se usuario é root
CREATE OR REPLACE FUNCTION public.is_root(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'root'
  )
$$;

-- Criar tabela de metricas individuais dos usuarios
CREATE TABLE public.user_daily_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  ofex integer DEFAULT 0 NOT NULL,
  apoio integer DEFAULT 0 NOT NULL,
  soria integer DEFAULT 0 NOT NULL,
  cadastro integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Habilitar RLS
ALTER TABLE public.user_daily_data ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver dados (para ranking)
CREATE POLICY "Anyone can view user daily data"
ON public.user_daily_data FOR SELECT
USING (true);

-- Membros podem inserir seus proprios dados
CREATE POLICY "Members can insert own daily data"
ON public.user_daily_data FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'member'));

-- Membros podem atualizar seus proprios dados
CREATE POLICY "Members can update own daily data"
ON public.user_daily_data FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'member'));

-- Admins podem gerenciar todos os dados
CREATE POLICY "Admins can manage all user daily data"
ON public.user_daily_data FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_daily_data_updated_at
  BEFORE UPDATE ON public.user_daily_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();