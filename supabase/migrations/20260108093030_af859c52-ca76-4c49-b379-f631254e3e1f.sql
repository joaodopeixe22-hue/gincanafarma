-- Líderes podem inserir conquistas para membros da própria equipe
CREATE POLICY "Leaders can grant achievements to team members"
ON public.user_achievements
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'lider'::app_role) AND 
  EXISTS (
    SELECT 1 
    FROM profiles viewer
    JOIN profiles member ON member.id = user_achievements.user_id
    WHERE viewer.id = auth.uid() 
    AND viewer.team_id = member.team_id
  )
);