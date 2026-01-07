-- Insert 16 new KPI daily achievements (4 levels x 4 KPIs)

-- OFEX achievements
INSERT INTO public.achievements (name, description, category, icon, points, requirement_type, requirement_value, is_trophy) VALUES
('Primeiro Passo OFEX', 'Alcançou 5+ pontos OFEX em um dia', 'kpi', 'circle', 10, 'kpi_daily_ofex', 5, false),
('OFEX em Evolução', 'Alcançou 10+ pontos OFEX em um dia', 'kpi', 'circle-dot', 20, 'kpi_daily_ofex', 10, false),
('Destaque OFEX', 'Alcançou 15+ pontos OFEX em um dia', 'kpi', 'star', 35, 'kpi_daily_ofex', 15, false),
('Elite OFEX', 'Alcançou 20+ pontos OFEX em um dia', 'kpi', 'medal', 50, 'kpi_daily_ofex', 20, true);

-- APOIO achievements
INSERT INTO public.achievements (name, description, category, icon, points, requirement_type, requirement_value, is_trophy) VALUES
('Primeiro Passo APOIO', 'Alcançou 5+ pontos APOIO em um dia', 'kpi', 'circle', 10, 'kpi_daily_apoio', 5, false),
('APOIO em Evolução', 'Alcançou 10+ pontos APOIO em um dia', 'kpi', 'circle-dot', 20, 'kpi_daily_apoio', 10, false),
('Destaque APOIO', 'Alcançou 15+ pontos APOIO em um dia', 'kpi', 'star', 35, 'kpi_daily_apoio', 15, false),
('Elite APOIO', 'Alcançou 20+ pontos APOIO em um dia', 'kpi', 'medal', 50, 'kpi_daily_apoio', 20, true);

-- SORIA achievements
INSERT INTO public.achievements (name, description, category, icon, points, requirement_type, requirement_value, is_trophy) VALUES
('Primeiro Passo SORIA', 'Alcançou 5+ pontos SORIA em um dia', 'kpi', 'circle', 10, 'kpi_daily_soria', 5, false),
('SORIA em Evolução', 'Alcançou 10+ pontos SORIA em um dia', 'kpi', 'circle-dot', 20, 'kpi_daily_soria', 10, false),
('Destaque SORIA', 'Alcançou 15+ pontos SORIA em um dia', 'kpi', 'star', 35, 'kpi_daily_soria', 15, false),
('Elite SORIA', 'Alcançou 20+ pontos SORIA em um dia', 'kpi', 'medal', 50, 'kpi_daily_soria', 20, true);

-- CADASTRO achievements
INSERT INTO public.achievements (name, description, category, icon, points, requirement_type, requirement_value, is_trophy) VALUES
('Primeiro Passo CADASTRO', 'Alcançou 5+ pontos CADASTRO em um dia', 'kpi', 'circle', 10, 'kpi_daily_cadastro', 5, false),
('CADASTRO em Evolução', 'Alcançou 10+ pontos CADASTRO em um dia', 'kpi', 'circle-dot', 20, 'kpi_daily_cadastro', 10, false),
('Destaque CADASTRO', 'Alcançou 15+ pontos CADASTRO em um dia', 'kpi', 'star', 35, 'kpi_daily_cadastro', 15, false),
('Elite CADASTRO', 'Alcançou 20+ pontos CADASTRO em um dia', 'kpi', 'medal', 50, 'kpi_daily_cadastro', 20, true);