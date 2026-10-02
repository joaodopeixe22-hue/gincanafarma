-- Dados de demonstração (fictícios) para testar as telas
DO $$
DECLARE
  u RECORD; d DATE; i INT; uid UUID;
  people JSONB := '[
    ["root.0000","Root Admin",null,"root"],
    ["1001","Gustavo (Admin)",null,"admin"],
    ["2001","Marina Souza","dna","lider"],
    ["2002","Rafael Costa","elite","lider"],
    ["2003","Juliana Alves","alcateia","lider"],
    ["3001","Ana Beatriz","dna","member"],
    ["3002","Bruno Lima","dna","member"],
    ["3003","Gabriela Dias","dna","member"],
    ["3004","Camila Rocha","elite","member"],
    ["3005","Diego Martins","elite","member"],
    ["3006","Elisa Ramos","alcateia","member"],
    ["3007","Felipe Nunes","alcateia","member"]
  ]';
  p JSONB;
BEGIN
  FOR p IN SELECT * FROM jsonb_array_elements(people) LOOP
    INSERT INTO auth.users (email, raw_app_meta_data) VALUES ((p->>0) || '@gincana.local', '{"created_by_admin": true}') RETURNING id INTO uid;
    UPDATE public.profiles SET full_name = p->>1, matricula = p->>0, team_id = p->>2 WHERE id = uid;
    UPDATE public.user_roles SET role = (p->>3)::app_role WHERE user_id = uid;
  END LOOP;
END $$;

-- Escala da semana (28/09 a 04/10) — 3x1, dois turnos
INSERT INTO public.shifts (user_id, date, kind, start_time, end_time)
SELECT p.id, d::date,
  CASE WHEN ((extract(doy from d)::int + row_number() over (partition by d order by p.matricula)) % 4) = 0 THEN 'folga' ELSE 'trabalho' END,
  CASE WHEN ((extract(doy from d)::int + row_number() over (partition by d order by p.matricula)) % 4) = 0 THEN NULL
       WHEN p.matricula::text ~ '[13579]$' THEN '07:00'::time ELSE '13:00'::time END,
  CASE WHEN ((extract(doy from d)::int + row_number() over (partition by d order by p.matricula)) % 4) = 0 THEN NULL
       WHEN p.matricula::text ~ '[13579]$' THEN '15:20'::time ELSE '23:00'::time END
FROM public.profiles p, generate_series(date '2026-09-28', date '2026-10-04', interval '1 day') d
WHERE p.matricula ~ '^[23]';

-- Lançamentos aprovados nos dias trabalhados até ontem
INSERT INTO public.user_daily_data (user_id, date, ofex, apoio, soria, cadastro, status, team_id, reviewed_by, reviewed_at, created_at, submitted_at)
SELECT s.user_id, s.date,
  3 + (abs(hashtext(s.user_id::text || s.date)) % 7),
  2 + (abs(hashtext(s.date || s.user_id::text)) % 6),
  1 + (abs(hashtext('s' || s.user_id::text || s.date)) % 5),
  2 + (abs(hashtext('c' || s.user_id::text || s.date)) % 8),
  'approved', p.team_id,
  (SELECT id FROM public.profiles WHERE matricula = '1001'), now(),
  ((s.date + time '20:30') AT TIME ZONE 'America/Sao_Paulo'), ((s.date + time '20:30') AT TIME ZONE 'America/Sao_Paulo')
FROM public.shifts s JOIN public.profiles p ON p.id = s.user_id
WHERE s.kind = 'trabalho' AND s.date BETWEEN date '2026-09-28' AND date '2026-10-01'
  AND NOT (p.matricula = '3005' AND s.date = date '2026-09-30');

-- Hoje: alguns pendentes, um recusado
INSERT INTO public.user_daily_data (user_id, date, ofex, apoio, soria, cadastro, status, team_id, created_at, submitted_at)
SELECT p.id, date '2026-10-02', 6, 4, 2, 5, 'pending', p.team_id, now(), now()
FROM public.profiles p WHERE p.matricula IN ('3001','3002','3004','3006','2001');
INSERT INTO public.user_daily_data (user_id, date, ofex, apoio, soria, cadastro, status, team_id, review_note, reviewed_by, reviewed_at, created_at, submitted_at)
SELECT p.id, date '2026-10-01', 25, 3, 1, 4, 'rejected', p.team_id, 'OFEX diferente do relatório (deu 12)',
  (SELECT id FROM public.profiles WHERE matricula = '2001'), now(), now(), now()
FROM public.profiles p WHERE p.matricula = '3003'
ON CONFLICT (user_id, date) DO UPDATE SET status = 'rejected', ofex = 25, review_note = EXCLUDED.review_note;

-- Metas individuais
INSERT INTO public.member_goals (user_id, period_type, kpi_type, target_value)
SELECT p.id, 'daily', k, v FROM public.profiles p, (VALUES ('ofex', 6), ('apoio', 4), ('soria', 3), ('cadastro', 5)) g(k, v)
WHERE p.matricula IN ('3001', '3002', '3003');

-- Agenda
INSERT INTO public.tasks (title, category, assigned_to, due_date, due_time, points, status, completed_at, created_by)
SELECT t.title, t.cat, p.id, t.d, t.tm, t.pts, t.st,
  CASE WHEN t.st = 'concluida' THEN ((t.d + time '18:00') AT TIME ZONE 'America/Sao_Paulo') END,
  (SELECT id FROM public.profiles WHERE matricula = '2001')
FROM public.profiles p,
 (VALUES ('Conferir PVPS do corredor 3', 'rotina', date '2026-10-02', time '18:00', 10, 'aberta'),
         ('Repor gôndola de dermocosméticos', 'operacional', date '2026-10-02', NULL::time, 5, 'concluida'),
         ('Treinamento GLP-1 (vídeo 15 min)', 'treinamento', date '2026-10-01', NULL::time, 15, 'concluida'),
         ('Abordagem PBM no caixa', 'campanha', date '2026-09-30', NULL::time, 5, 'aberta')) t(title, cat, d, tm, pts, st)
WHERE p.matricula ~ '^3';

-- Campanha
INSERT INTO public.challenges (title, description, challenge_type, kpi_type, target_value, bonus_points, start_time, end_time, is_active, created_by)
VALUES ('Semana do Cadastro', 'Cada cadastro STIX conta. Meta: 30 na semana.', 'individual', 'cadastro', 30, 60,
        '2026-09-28 03:00+00', '2026-10-05 02:59+00', true, (SELECT id FROM public.profiles WHERE matricula = '1001')),
       ('Vitrine impecável', 'Líder valida quem manteve a exposição em dia.', 'individual', 'manual', NULL, 25,
        '2026-09-28 03:00+00', '2026-10-05 02:59+00', true, (SELECT id FROM public.profiles WHERE matricula = '1001'));
INSERT INTO public.challenge_participants (challenge_id, user_id)
SELECT c.id, p.id FROM public.challenges c, public.profiles p
WHERE c.title = 'Semana do Cadastro' AND p.matricula IN ('3001', '3002', '3004', '3006', '3007');

-- Quiz
INSERT INTO public.quizzes (id, title, description, bonus_points, time_limit_seconds, created_by)
VALUES ('22222222-2222-2222-2222-222222222222', 'PBM e Venda Simples', 'Revisão rápida do programa de benefícios', 20, 120,
        (SELECT id FROM public.profiles WHERE matricula = '2001'));
INSERT INTO public.quiz_questions (quiz_id, question, options, correct_option, order_index) VALUES
 ('22222222-2222-2222-2222-222222222222', 'Por que pedir o CPF na venda?', '["Exigência burocrática","Liberar descontos de PBM e acumular pontos para o cliente","Só para cadastro interno"]', 1, 0),
 ('22222222-2222-2222-2222-222222222222', 'No Encantômetro, um voto "Bom":', '["Soma no NSS","É neutro: entra só no total de votos","Subtrai do NSS"]', 1, 1),
 ('22222222-2222-2222-2222-222222222222', 'Interjornada mínima entre turnos (CLT art. 66):', '["8 horas","11 horas","12 horas"]', 1, 2);
INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total_questions, correct_answers)
SELECT '22222222-2222-2222-2222-222222222222', id, 100, 3, 3 FROM public.profiles WHERE matricula IN ('3004', '3006');

-- Reconhecimentos
INSERT INTO public.recognitions (from_user_id, to_user_id, recognition_type, message, is_public, from_leader)
SELECT (SELECT id FROM public.profiles WHERE matricula = f), (SELECT id FROM public.profiles WHERE matricula = t), ty, msg, true, fl
FROM (VALUES ('3002', '3001', 'helping_hand', 'Segurou o caixa sozinha no pico das 18h para eu almoçar.', false),
             ('2001', '3003', 'customer_care', 'Cliente voltou só para elogiar o atendimento dela.', true),
             ('3006', '3007', 'team_player', 'Organizou a vitrine comigo e ainda ensinou o PVPS.', false)) r(f, t, ty, msg, fl);

-- Resultados da loja (setembro e 01/10)
INSERT INTO public.store_daily_results (date, vendas, meta_vendas, clientes, meta_clientes, venda_simples_pct, nss_otimo, nss_bom, nss_regular, nss_ruim, nss_pessimo)
SELECT d::date, 24000 + (abs(hashtext(d::text)) % 9000), 28000, 480 + (abs(hashtext('c' || d)) % 120), 520,
       48 + (abs(hashtext('v' || d)) % 15), 30 + (abs(hashtext('o' || d)) % 15), 6 + (abs(hashtext('b' || d)) % 5),
       abs(hashtext('r' || d)) % 3, abs(hashtext('u' || d)) % 2, 0
FROM generate_series(date '2026-09-01', date '2026-10-01', interval '1 day') d;

UPDATE public.profiles SET has_completed_tour = true;
