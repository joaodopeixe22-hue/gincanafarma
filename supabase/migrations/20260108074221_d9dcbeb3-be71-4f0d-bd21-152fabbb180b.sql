-- Criar tabela de metas individuais para membros
CREATE TABLE public.member_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('ofex', 'apoio', 'soria', 'cadastro', 'total')),
  target_value INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_type, kpi_type)
);

-- RLS
ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;

-- Membros podem ver suas próprias metas
CREATE POLICY "Users can view own goals"
ON public.member_goals FOR SELECT
USING (user_id = auth.uid());

-- Líderes/Admins podem ver metas de membros da mesma equipe
CREATE POLICY "Leaders can view team goals"
ON public.member_goals FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'lider'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles viewer 
      JOIN profiles member ON member.id = member_goals.user_id
      WHERE viewer.id = auth.uid()
      AND viewer.team_id = member.team_id
    )
  )
);

-- Líderes/Admins podem inserir metas para membros da mesma equipe
CREATE POLICY "Leaders can insert team goals"
ON public.member_goals FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'lider'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles viewer 
      JOIN profiles member ON member.id = member_goals.user_id
      WHERE viewer.id = auth.uid()
      AND viewer.team_id = member.team_id
    )
  )
);

-- Líderes/Admins podem atualizar metas de membros da mesma equipe
CREATE POLICY "Leaders can update team goals"
ON public.member_goals FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'lider'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles viewer 
      JOIN profiles member ON member.id = member_goals.user_id
      WHERE viewer.id = auth.uid()
      AND viewer.team_id = member.team_id
    )
  )
);

-- Líderes/Admins podem deletar metas de membros da mesma equipe
CREATE POLICY "Leaders can delete team goals"
ON public.member_goals FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'lider'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles viewer 
      JOIN profiles member ON member.id = member_goals.user_id
      WHERE viewer.id = auth.uid()
      AND viewer.team_id = member.team_id
    )
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_member_goals_updated_at
BEFORE UPDATE ON public.member_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();