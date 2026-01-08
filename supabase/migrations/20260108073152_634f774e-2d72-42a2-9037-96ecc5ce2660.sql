-- Atualizar função has_role para incluir hierarquia com líder
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
      OR (role = 'root' AND _role IN ('admin', 'lider', 'member'))
      OR (role = 'admin' AND _role IN ('lider', 'member'))
      OR (role = 'lider' AND _role = 'member')
    )
  )
$$;