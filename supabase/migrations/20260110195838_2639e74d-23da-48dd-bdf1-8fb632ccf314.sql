-- Adicionar coluna para rastrear conclusão do tour
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_completed_tour BOOLEAN DEFAULT false;