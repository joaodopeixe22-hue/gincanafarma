-- Adicionar coluna matricula na tabela profiles
ALTER TABLE public.profiles ADD COLUMN matricula TEXT UNIQUE;

-- Criar índice para busca rápida por matrícula
CREATE INDEX idx_profiles_matricula ON public.profiles(matricula);