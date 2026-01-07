-- Criar enum para tipos de papel
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Criar tabela de papéis de usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função de verificação de papel (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas da tabela gincana_daily_data
-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "Anyone can insert gincana data" ON public.gincana_daily_data;
DROP POLICY IF EXISTS "Anyone can update gincana data" ON public.gincana_daily_data;
DROP POLICY IF EXISTS "Anyone can view gincana data" ON public.gincana_daily_data;

-- Criar novas políticas
CREATE POLICY "Anyone can view gincana data"
ON public.gincana_daily_data
FOR SELECT
USING (true);

CREATE POLICY "Members and admins can insert gincana data"
ON public.gincana_daily_data
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
);

CREATE POLICY "Only admins can update gincana data"
ON public.gincana_daily_data
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete gincana data"
ON public.gincana_daily_data
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas da tabela gincana_goals
DROP POLICY IF EXISTS "Anyone can insert goals" ON public.gincana_goals;
DROP POLICY IF EXISTS "Anyone can update goals" ON public.gincana_goals;
DROP POLICY IF EXISTS "Anyone can view goals" ON public.gincana_goals;

CREATE POLICY "Anyone can view goals"
ON public.gincana_goals
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert goals"
ON public.gincana_goals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update goals"
ON public.gincana_goals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete goals"
ON public.gincana_goals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));