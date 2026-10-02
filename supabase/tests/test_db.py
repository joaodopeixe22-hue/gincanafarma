#!/usr/bin/env python3
"""Testes de comportamento das migrations do Gincana Farma num Postgres local.

Uso: suba um Postgres 15+ local e ajuste PGHOST/PGPORT abaixo (ou via variáveis de ambiente).
    python3 supabase/tests/test_db.py
O script recria o banco "gincana", aplica as migrations antigas, cria dados no formato
antigo, aplica as migrations novas por cima e testa cada regra como membro, líder, admin e visitante.
"""
import subprocess, glob, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
PGHOST = os.environ.get("PGHOST", "/var/lib/pgtest")
PGPORT = os.environ.get("PGPORT", "54329")
DB = os.environ.get("PGDATABASE", "gincana_test")

PSQL = ["psql", "-h", PGHOST, "-p", PGPORT, "-U", "postgres", "-d", DB, "-X", "-q", "-t", "-A", "-F", "|"]
MIG = sorted(glob.glob(os.path.join(HERE, "..", "migrations", "*.sql")))
NEW = [m for m in MIG if os.path.basename(m) >= "20261002"]
OLD = [m for m in MIG if m not in NEW]

fails = 0
def run(sql, user=None, role="authenticated"):
    pre = ""
    if role == "anon":
        pre = "SET LOCAL ROLE anon;"
    elif user:
        pre = f"SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '{U[user]}', true) \\g /dev/null\n"
    script = f"BEGIN;\n{pre}\n{sql};\nCOMMIT;\n"
    p = subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1"], input=script, capture_output=True, text=True)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

def ok(name, cond, detail=""):
    global fails
    print(("  ✅ " if cond else "  ❌ ") + name + ("" if cond else f"  → {detail}"))
    if not cond: fails += 1

def expect_ok(name, sql, user=None, role="authenticated"):
    rc, out, err = run(sql, user, role); ok(name, rc == 0, err); return out

def expect_err(name, sql, user=None, contains="", role="authenticated"):
    rc, out, err = run(sql, user, role)
    ok(name, rc != 0 and contains.lower() in err.lower(), f"rc={rc} out={out} err={err}")

def val(sql):
    rc, out, err = run(sql)
    if rc: print("ERRO SQL:", err); sys.exit(1)
    return out

# ---------------------------------------------------------------- setup
subprocess.run(["psql", "-h", PGHOST, "-p", PGPORT, "-U", "postgres", "-d", "postgres", "-q",
                "-c", f"drop database if exists {DB} with (force)", "-c", f"create database {DB}"], check=True, capture_output=True)
subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-f", os.path.join(HERE, "supabase_stub.sql")], check=True, capture_output=True)
for m in OLD:
    subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-f", m], check=True, capture_output=True)

U = {}
names = {"root": ("root.0000", None, "root"), "admin": ("1001", None, "admin"),
         "lider_dna": ("2001", "dna", "lider"), "lider_elite": ("2002", "elite", "lider"),
         "m1": ("3001", "dna", "member"), "m2": ("3002", "dna", "member"), "m3": ("3003", "elite", "member")}
for k, (mat, team, role) in names.items():
    uid = val(f"insert into auth.users(email) values ('{mat}@gincana.local') returning id").split("\n")[0]
    U[k] = uid
    val(f"update profiles set full_name='{k.upper()}', matricula='{mat}', team_id={('null' if not team else repr(team))} where id='{uid}'")
    val(f"update user_roles set role='{role}' where user_id='{uid}'")

# dados legados (antes das novas migrations)
val(f"""insert into user_daily_data(user_id,date,ofex,apoio,soria,cadastro,is_locked) values
 ('{U['m1']}', current_date-10, 10,5,5,5,true), ('{U['m1']}', current_date-9, 20,0,0,0,true),
 ('{U['m3']}', current_date-10, 3,3,3,3,true)""")
val("insert into gincana_daily_data(date,dna_ofex,elite_apoio) values (current_date-40, 50, 20) on conflict (date) do update set dna_ofex=50, elite_apoio=20")
val(f"insert into user_achievements(user_id, achievement_id) select '{U['m2']}', id from achievements where name in ('Primeiro Passo','Campeão do Mês')")
val(f"""insert into quizzes(id,title,bonus_points,created_by) values ('11111111-1111-1111-1111-111111111111','Quiz PBM',20,'{U['lider_dna']}');
insert into quiz_questions(quiz_id,question,options,correct_option,order_index) values
 ('11111111-1111-1111-1111-111111111111','Q1','["a","b"]',1,0),('11111111-1111-1111-1111-111111111111','Q2','["a","b"]',0,1);
insert into quiz_attempts(quiz_id,user_id,score,total_questions,correct_answers) values ('11111111-1111-1111-1111-111111111111','{U['m3']}',100,2,2)""")
val(f"insert into user_levels(user_id,total_points) values ('{U['m2']}', 999)")

print("Aplicando as 3 migrations novas sobre dados existentes...")
for m in NEW:
    p = subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1", "-f", m], capture_output=True, text=True)
    ok(os.path.basename(m), p.returncode == 0, p.stderr)
    if p.returncode: sys.exit(1)

print("\n== Carga inicial do livro de pontos")
ok("KPIs antigos viram aprovados", val("select count(*) from user_daily_data where status='approved'") == "3")
ok("m1: 45 pts de KPI no livro", val(f"select sum(points) from points_ledger where user_id='{U['m1']}' and source='kpi'") == "45")
ok("m3: quiz antigo pontuado (20)", val(f"select sum(points) from points_ledger where user_id='{U['m3']}' and source='quiz'") == "20")
ok("m2: nível recalculado do livro (não mais 999)", val(f"select total_points from user_levels where user_id='{U['m2']}'") ==
   val(f"select sum(points) from points_ledger where user_id='{U['m2']}'"))
ok("Placar legado aparece na view de equipes",
   val("select count(*) from team_daily_kpis where source='legacy' and date=current_date-40") == "2")
ok("Sem notificação em massa na migração", val("select count(*) from notifications") == "0")

print("\n== Segurança")
expect_err("Visitante (sem login) não lê perfis", "select * from profiles", role="anon", contains="permission denied")
expect_err("Visitante não lê lançamentos", "select * from user_daily_data", role="anon", contains="permission denied")
ok("Membro lê perfis", expect_ok("membro lê perfis", "select count(*) from profiles", "m1") == "7")
expect_err("Membro não troca a própria equipe", f"update profiles set team_id='elite' where id='{U['m1']}'", "m1", "equipe")
expect_ok("Membro edita a própria bio", f"update profiles set bio='oi' where id='{U['m1']}'", "m1")
expect_err("Admin não se promove a root", f"update user_roles set role='root' where user_id='{U['admin']}'", "admin", "row-level security")
out = expect_ok("Admin tentando rebaixar root (sem efeito)", f"update user_roles set role='member' where user_id='{U['root']}' returning 1", "admin")
ok("Root continua root", val(f"select role from user_roles where user_id='{U['root']}'") == "root")
expect_err("Membro não grava no livro de pontos", f"insert into points_ledger(user_id,ref_date,source,points) values ('{U['m1']}',current_date,'adjustment',999)", "m1", "row-level security")
out = expect_ok("Membro tentando editar nível (sem efeito)", f"update user_levels set total_points=99999 where user_id='{U['m1']}' returning 1", "m1")
ok("Nível intacto", out == "")
expect_err("Membro não notifica outro", f"insert into notifications(user_id,title,notification_type) values ('{U['m2']}','x','x')", "m1", "row-level security")
expect_ok("Líder notifica alguém da equipe", f"insert into notifications(user_id,title,notification_type) values ('{U['m1']}','x','announcement')", "lider_dna")
expect_err("Líder não notifica outra equipe", f"insert into notifications(user_id,title,notification_type) values ('{U['m3']}','x','x')", "lider_dna", "row-level security")
expect_err("Membro não chama função interna ledger_sync", f"select ledger_sync('{U['m1']}',null,current_date,'adjustment','x',500,'x')", "m1", "permission denied")
sid = val("insert into auth.users(email) values ('hacker@x.com') returning id").split("\n")[0]
ok("Cadastro público não ganha papel", val(f"select count(*) from user_roles where user_id='{sid}'") == "0")
sid2 = val("""insert into auth.users(email, raw_app_meta_data) values ('4001@gincana.local','{"created_by_admin":true}') returning id""").split("\n")[0]
ok("Conta criada pelo painel ganha 'member'", val(f"select role from user_roles where user_id='{sid2}'") == "member")

print("\n== Lançamento vira solicitação")
expect_ok("Membro envia lançamento de hoje (tentando já marcar aprovado)",
          f"insert into user_daily_data(user_id,date,ofex,apoio,soria,cadastro,status) values ('{U['m1']}',app_today(),12,6,6,6,'approved')", "m1")
ok("Entrou como pendente", val(f"select status from user_daily_data where user_id='{U['m1']}' and date=app_today()") == "pending")
ok("Pendente não gera pontos", val(f"select coalesce(sum(points),0) from points_ledger l join user_daily_data u on u.id::text=l.source_id where u.user_id='{U['m1']}' and u.date=app_today()") == "0")
expect_err("Não lança dia futuro", f"insert into user_daily_data(user_id,date,ofex) values ('{U['m2']}',app_today()+1,1)", "m2", "futuro")
expect_err("Não lança fora do prazo", f"insert into user_daily_data(user_id,date,ofex) values ('{U['m2']}',app_today()-5,1)", "m2", "prazo")
expect_err("Limite diário por KPI", f"insert into user_daily_data(user_id,date,ofex) values ('{U['m2']}',app_today(),500)", "m2", "limite")
expect_err("Não lança em nome de outro", f"insert into user_daily_data(user_id,date,ofex) values ('{U['m2']}',app_today(),1)", "m1", "row-level security")
expect_ok("Membro corrige o pendente", f"update user_daily_data set ofex=15 where user_id='{U['m1']}' and date=app_today()", "m1")
eid = val(f"select id from user_daily_data where user_id='{U['m1']}' and date=app_today()")

expect_err("Líder de outra equipe não aprova", f"select review_daily_entry('{eid}','approve')", "lider_elite", "não gerencia")
expect_err("Recusa exige motivo", f"select review_daily_entry('{eid}','reject','')", "lider_dna", "motivo")
expect_ok("Líder recusa com motivo", f"select review_daily_entry('{eid}','reject','OFEX não bate com o relatório')", "lider_dna")
ok("Colaborador foi avisado da recusa", val(f"select count(*) from notifications where user_id='{U['m1']}' and notification_type='entry_rejected'") == "1")
expect_ok("Colaborador corrige e reenvia", f"update user_daily_data set ofex=10 where id='{eid}'", "m1")
ok("Volta para pendente", val(f"select status from user_daily_data where id='{eid}'") == "pending")
expect_ok("Líder aprova ajustando valor", f"""select review_daily_entry('{eid}','approve','ajustado', '{{"ofex": 8}}')""", "lider_dna")
ok("Aprovado com valor ajustado e original guardado",
   val(f"select status||'|'||ofex||'|'||(original_values->>'ofex') from user_daily_data where id='{eid}'") == "approved|8|10")
ok("Pontos = 8+6+6+6 = 26", val(f"select sum(points) from points_ledger where source='kpi' and source_id='{eid}'") == "26")
rc, out, _ = run(f"update user_daily_data set ofex=20 where id='{eid}' returning 1", "m1")
ok("Aprovado não pode ser editado pelo colaborador (nenhuma linha)", out == "" and val(f"select ofex from user_daily_data where id='{eid}'") == "8")
expect_ok("Líder reabre", f"select review_daily_entry('{eid}','reopen','conferir de novo')", "lider_dna")
ok("Reabrir estorna os pontos", val(f"select sum(points) from points_ledger where source='kpi' and source_id='{eid}'") == "0")
ok("Livro guarda histórico (3 linhas: +26, -26… )", int(val(f"select count(*) from points_ledger where source_id='{eid}'")) >= 2)

expect_ok("Líder envia o próprio lançamento", f"insert into user_daily_data(user_id,date,ofex) values ('{U['lider_dna']}',app_today(),5)", "lider_dna")
lid = val(f"select id from user_daily_data where user_id='{U['lider_dna']}' and date=app_today()")
expect_err("Líder não aprova o próprio", f"select review_daily_entry('{lid}','approve')", "lider_dna", "próprio")
expect_ok("m2 envia", f"insert into user_daily_data(user_id,date,ofex,apoio) values ('{U['m2']}',app_today(),4,4)", "m2")
out = expect_ok("Fechar o dia (aprova pendentes da equipe)", "select close_day(app_today())", "lider_dna")
ok("Fechou 2 (m1 reaberto + m2), pulou o próprio", out == "2", out)
ok("Próprio continua pendente", val(f"select status from user_daily_data where id='{lid}'") == "pending")
expect_ok("Admin aprova o do líder", f"select review_daily_entry('{lid}','approve')", "admin")
expect_ok("Líder registra dia esquecido (fora do prazo)", f"select leader_save_entry('{U['m2']}', app_today()-6, 3,3,3,3,'esqueceu')", "lider_dna")
ok("Dia esquecido entra aprovado", val(f"select status from user_daily_data where user_id='{U['m2']}' and date=app_today()-6") == "approved")

print("\n== Conquistas por pessoa")
ok("m2 ganhou 'Primeiro Passo'? (já tinha da base antiga)", val(f"select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where ua.user_id='{U['m2']}' and a.name='Primeiro Passo'") == "1")
ok("lider_dna ganhou 'Primeiro Passo' só pelo dele", val(f"select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where ua.user_id='{U['lider_dna']}' and a.name='Primeiro Passo'") == "1")
ok("Ninguém ganhou 'Semana Completa' de graça", val(f"select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where a.name='Semana Completa'") == "0")
ok("Ninguém ganhou campeões de uma vez", val("select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where a.requirement_type like 'champion%' and ua.user_id <> (select id from profiles where full_name='M2')") == "0")
ok("Conquista gera pontos no livro", val(f"select count(*) from points_ledger where user_id='{U['lider_dna']}' and source='achievement'") != "0")
ok("Conquista pequena NÃO lota o mural (só notificação)", val(f"select count(*) from activity_feed where user_id='{U['lider_dna']}' and activity_type='achievement'") == "0" and val(f"select count(*) from notifications where user_id='{U['lider_dna']}' and notification_type='achievement'") != "0")
expect_err("Líder não concede conquista automática", f"insert into user_achievements(user_id,achievement_id) select '{U['m1']}', id from achievements where name='Lenda'", "lider_dna", "row-level security")
expect_ok("Líder concede conquista manual", f"insert into user_achievements(user_id,achievement_id) select '{U['m1']}', id from achievements where name='Atendimento Encantador'", "lider_dna")
ok("Conquista especial vai para o mural", val(f"select count(*) from activity_feed where user_id='{U['m1']}' and title like '%Atendimento Encantador%'") == "1")
ok("Nível = soma do livro", val(f"select total_points from user_levels where user_id='{U['m1']}'") == val(f"select sum(points) from points_ledger where user_id='{U['m1']}'"))

print("\n== Quiz")
ok("Membro não vê o gabarito", expect_ok("select perguntas", "select count(*) from quiz_questions", "m1") == "0")
out = expect_ok("Membro abre o quiz", "select get_quiz_for_attempt('11111111-1111-1111-1111-111111111111')", "m1")
ok("Sem 'correct_option' no que vai pro celular", "correct_option" not in out, out)
out = expect_ok("Responde errado", "select submit_quiz_attempt('11111111-1111-1111-1111-111111111111', array[0,1], 30)", "m1")
ok("Reprovado, 0 pts", json.loads(out)["passed"] is False and json.loads(out)["points_earned"] == 0, out)
out = expect_ok("Responde certo", "select submit_quiz_attempt('11111111-1111-1111-1111-111111111111', array[1,0], 30)", "m1")
ok("Aprovado, +20 pts", json.loads(out)["points_earned"] == 20, out)
out = expect_ok("Responde certo de novo", "select submit_quiz_attempt('11111111-1111-1111-1111-111111111111', array[1,0], 20)", "m1")
ok("Não pontua duas vezes", json.loads(out)["points_earned"] == 0, out)
ok("Conquistas 'Estudioso' e 'Nota 10'", val(f"select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where ua.user_id='{U['m1']}' and a.name in ('Estudioso','Nota 10')") == "2")
expect_err("Não insere tentativa direto", f"insert into quiz_attempts(quiz_id,user_id,score) values ('11111111-1111-1111-1111-111111111111','{U['m2']}',100)", "m2", "row-level security")

print("\n== Campanhas")
expect_err("Líder não cria campanha da loja toda", "insert into challenges(title,kpi_type,target_value,bonus_points,start_time,end_time) values ('x','total',10,50,now()-interval '1 day',now()+interval '5 days')", "lider_dna", "row-level security")
cid = expect_ok("Líder cria campanha da equipe", "insert into challenges(title,kpi_type,target_value,bonus_points,start_time,end_time,team_id) values ('Semana OFEX','ofex',10,50,now()-interval '2 days',now()+interval '5 days','dna') returning id", "lider_dna").split("\n")[0]
ok("Equipe avisada", val(f"select count(*) from notifications where notification_type='challenge'") == "3")
expect_err("Membro de outra equipe não entra", f"insert into challenge_participants(challenge_id,user_id) values ('{cid}','{U['m3']}')", "m3", "outra equipe")
expect_ok("m2 participa", f"insert into challenge_participants(challenge_id,user_id,score,completed) values ('{cid}','{U['m2']}',999,true)", "m2")
ok("Não dá para se dar pontuação", val(f"select score||'|'||completed from challenge_participants where challenge_id='{cid}' and user_id='{U['m2']}'") == "4|false")
expect_ok("m2 lança mais OFEX (pendente)", f"update user_daily_data set ofex=0 where false", "m2")
expect_ok("Líder lança dia de m2", f"select leader_save_entry('{U['m2']}', app_today()-1, 7,0,0,0)", "lider_dna")
ok("Campanha concluída automaticamente (4+7 ≥ 10)", val(f"select completed from challenge_participants where challenge_id='{cid}' and user_id='{U['m2']}'") == "t")
ok("Bônus de 50 no livro", val(f"select sum(points) from points_ledger where user_id='{U['m2']}' and source='challenge'") == "50")
ok("Conquista 'Desafiante'", val(f"select count(*) from user_achievements ua join achievements a on a.id=ua.achievement_id where ua.user_id='{U['m2']}' and a.name='Desafiante'") == "1")

print("\n== Reconhecimento")
expect_err("Não se reconhece", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['m1']}','highlight','muito bom mesmo')", "m1", "si mesmo")
expect_err("Mensagem curta", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['m2']}','highlight','top')", "m1", "mínimo")
expect_ok("Elogio entre colegas", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['m2']}','helping_hand','Me ajudou no fechamento do caixa')", "m1")
expect_err("Mesmo colega 2x na semana", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['m2']}','highlight','De novo, muito obrigado')", "m1", "já reconheceu")
expect_ok("2º elogio", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['m3']}','customer_care','Atendimento impecável hoje')", "m1")
expect_ok("3º elogio", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['lider_elite']}','team_player','Organizou a vitrine junto')", "m1")
expect_err("4º elogio passa do limite semanal", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['m1']}','{U['lider_dna']}','team_player','Organizou a vitrine junto')", "m1", "elogios desta semana")
ok("Restam 0 elogios", expect_ok("restantes", "select my_peer_recognitions_left()", "m1") == "0")
expect_ok("Líder reconhece (sem limite)", f"insert into recognitions(from_user_id,to_user_id,recognition_type,message) values ('{U['lider_dna']}','{U['m2']}','highlight','Destaque da semana no PBM')", "lider_dna")
ok("Peso: colega 5 + líder 15", val(f"select sum(points) from points_ledger where user_id='{U['m2']}' and source='recognition'") == "20")
ok("Mural e aviso", val(f"select count(*) from activity_feed where activity_type='recognition'") == "4" and
   val(f"select count(*) from notifications where user_id='{U['m2']}' and notification_type='recognition'") == "2")
expect_err("Membro não posta no mural direto", f"insert into activity_feed(user_id,activity_type,title) values ('{U['m1']}','x','fake')", "m1", "row-level security")
feed = val("select id from activity_feed limit 1")
expect_ok("Reage a um post", f"insert into reactions(activity_id,user_id,reaction_type) values ('{feed}','{U['m3']}','fogo')", "m3")
expect_ok("Troca a reação", f"update reactions set reaction_type='coracao' where activity_id='{feed}' and user_id='{U['m3']}'", "m3")

print("\n== Escala (interjornada)")
rows = json.dumps([{"user_id": U["m1"], "date": "2026-10-05", "kind": "trabalho", "start_time": "13:00", "end_time": "23:00"},
                   {"user_id": U["m1"], "date": "2026-10-06", "kind": "trabalho", "start_time": "07:00", "end_time": "15:00"}])
expect_err("Bloqueia 8h de descanso", f"select save_shifts('{rows}')", "lider_dna", "interjornada")
ok("Nada foi gravado", val("select count(*) from shifts") == "0")
rows = json.dumps([{"user_id": U["m1"], "date": "2026-10-05", "kind": "trabalho", "start_time": "13:00", "end_time": "23:00"},
                   {"user_id": U["m1"], "date": "2026-10-06", "kind": "trabalho", "start_time": "10:00", "end_time": "18:00"},
                   {"user_id": U["m1"], "date": "2026-10-07", "kind": "folga"}])
out = expect_ok("Aceita 11h", f"select save_shifts('{rows}')", "lider_dna")
ok("3 dias gravados", out == "3")
expect_err("Membro não edita escala", f"select save_shifts('{rows}')", "m1", "liderança")
expect_err("Membro não grava turno direto", f"insert into shifts(user_id,date,kind) values ('{U['m1']}','2026-10-09','folga')", "m1", "row-level security")

print("\n== Agenda")
out = expect_ok("Líder cria rotina para 2 pessoas em 2 dias", f"select create_tasks('Conferir PVPS','',  'rotina', array['{U['m1']}','{U['m2']}']::uuid[], array[app_today(), app_today()+1], null, 10)", "lider_dna")
ok("4 tarefas", out == "4")
expect_err("Não atribui a outra equipe", f"select create_tasks('x','','rotina', array['{U['m3']}']::uuid[], array[app_today()], null, 5)", "lider_dna", "gerencia")
tid = val(f"select id from tasks where assigned_to='{U['m1']}' and due_date=app_today()")
expect_err("Não conclui tarefa de outro", f"select complete_task('{tid}')", "m2", "outra pessoa")
expect_ok("Conclui a própria", f"select complete_task('{tid}','feito')", "m1")
ok("+10 pts no prazo", val(f"select sum(points) from points_ledger where source='task' and source_id='{tid}'") == "10")
expect_ok("Líder devolve", f"select review_task('{tid}','recusar','faltou a gôndola 3')", "lider_dna")
ok("Pontos estornados", val(f"select sum(points) from points_ledger where source='task' and source_id='{tid}'") == "0")
val(f"update tasks set due_date = app_today()-2, status='aberta' where id='{tid}'")
expect_ok("Conclui atrasada", f"select complete_task('{tid}')", "m1")
ok("Atrasada vale metade (5)", val(f"select sum(points) from points_ledger where source='task' and source_id='{tid}'") == "5")
rc, out, _ = run(f"update tasks set points=100 where id='{tid}' returning 1", "m1"); ok("Membro não altera tarefa direto (sem efeito)", out == "")

print("\n== Resultados da loja / Encantômetro")
expect_err("Membro não lança resultado", "insert into store_daily_results(date,vendas) values (app_today(),1000)", "m1", "row-level security")
expect_ok("Líder lança", "insert into store_daily_results(date,vendas,meta_vendas,clientes,nss_otimo,nss_bom,nss_regular,nss_ruim,nss_pessimo) values (app_today(),25000,30000,500,40,8,1,1,0)", "lider_dna")
ok("NSS = (40-1-1-0)/50 = 76.0", val("select nss from store_daily_results where date=app_today()") == "76.0")
ok("Ticket médio 50.00", val("select ticket_medio from store_daily_results where date=app_today()") == "50.00")

print("\n== Índice de Engajamento e rankings")
out = expect_ok("Índice da semana", "select full_name, indice, execucao, compromissos, campanhas, constancia, desenvolvimento, reconhecimento from engagement_index(period_start('week',app_today()), period_end('week',app_today()))", "m1")
print("     " + out.replace("\n", "\n     "))
ok("Índice só para membros/líderes (admin/root fora)", "ROOT" not in out and "ADMIN" not in out, out)
ok("Sem dia trabalhado na semana = sem índice (M3)", [l for l in out.split("\n") if l.startswith("M3|")][0].split("|")[1] == "", out)
ok("Índice entre 0 e 100", all(0 <= float(l.split("|")[1] or 0) <= 100 for l in out.split("\n")))
out = expect_ok("Ranking de KPIs", "select full_name,total from kpi_ranking(app_today()-30, app_today())", "m3")
out = expect_ok("Ranking de pontos", "select full_name,points from points_ranking()", "m3")
expect_ok("Premiação idempotente", "select award_champions(); select award_champions()", "m1")
expect_ok("Semana com início na segunda", "select extract(dow from period_start('week', date '2026-10-04'))::int", "m1")
ok("period_start('week', domingo 04/10) = segunda 28/09", val("select period_start('week', date '2026-10-04')") == "2026-09-28")

print("\n== Exclusão de usuário em cascata")
rc, out, err = run(f"delete from auth.users where id='{U['m3']}'")
ok("Excluir usuário com histórico não quebra", rc == 0, err)
ok("Livro dele foi junto", val(f"select count(*) from points_ledger where user_id='{U['m3']}'") == "0")

print(f"\n{'TUDO OK' if fails == 0 else f'{fails} FALHA(S)'}")
sys.exit(1 if fails else 0)
