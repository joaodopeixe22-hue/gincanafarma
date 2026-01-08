-- Criar função de agregação dos dados da equipe
CREATE OR REPLACE FUNCTION public.aggregate_team_daily_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team_id TEXT;
  team_ofex INTEGER;
  team_apoio INTEGER;
  team_soria INTEGER;
  team_cadastro INTEGER;
  target_date DATE;
BEGIN
  -- Pegar a data do registro (novo ou antigo dependendo da operação)
  target_date := COALESCE(NEW.date, OLD.date);
  
  -- Buscar o team_id do usuário
  SELECT team_id INTO user_team_id
  FROM profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Se o usuário não tem equipe, não faz nada
  IF user_team_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular totais de todos os membros da equipe para o dia
  SELECT 
    COALESCE(SUM(udd.ofex), 0),
    COALESCE(SUM(udd.apoio), 0),
    COALESCE(SUM(udd.soria), 0),
    COALESCE(SUM(udd.cadastro), 0)
  INTO team_ofex, team_apoio, team_soria, team_cadastro
  FROM user_daily_data udd
  JOIN profiles p ON p.id = udd.user_id
  WHERE p.team_id = user_team_id
    AND udd.date = target_date;
  
  -- Atualizar ou inserir na gincana_daily_data baseado na equipe
  IF user_team_id = 'dna' THEN
    INSERT INTO gincana_daily_data (date, dna_ofex, dna_apoio, dna_soria, dna_cadastro)
    VALUES (target_date, team_ofex, team_apoio, team_soria, team_cadastro)
    ON CONFLICT (date) DO UPDATE SET
      dna_ofex = EXCLUDED.dna_ofex,
      dna_apoio = EXCLUDED.dna_apoio,
      dna_soria = EXCLUDED.dna_soria,
      dna_cadastro = EXCLUDED.dna_cadastro,
      updated_at = now();
      
  ELSIF user_team_id = 'elite' THEN
    INSERT INTO gincana_daily_data (date, elite_ofex, elite_apoio, elite_soria, elite_cadastro)
    VALUES (target_date, team_ofex, team_apoio, team_soria, team_cadastro)
    ON CONFLICT (date) DO UPDATE SET
      elite_ofex = EXCLUDED.elite_ofex,
      elite_apoio = EXCLUDED.elite_apoio,
      elite_soria = EXCLUDED.elite_soria,
      elite_cadastro = EXCLUDED.elite_cadastro,
      updated_at = now();
      
  ELSIF user_team_id = 'alcateia' THEN
    INSERT INTO gincana_daily_data (date, alcateia_ofex, alcateia_apoio, alcateia_soria, alcateia_cadastro)
    VALUES (target_date, team_ofex, team_apoio, team_soria, team_cadastro)
    ON CONFLICT (date) DO UPDATE SET
      alcateia_ofex = EXCLUDED.alcateia_ofex,
      alcateia_apoio = EXCLUDED.alcateia_apoio,
      alcateia_soria = EXCLUDED.alcateia_soria,
      alcateia_cadastro = EXCLUDED.alcateia_cadastro,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger na tabela user_daily_data
CREATE TRIGGER on_user_daily_data_change
  AFTER INSERT OR UPDATE OR DELETE ON user_daily_data
  FOR EACH ROW
  EXECUTE FUNCTION aggregate_team_daily_data();