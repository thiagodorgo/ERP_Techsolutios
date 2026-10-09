# Mandato — dev-b-san3-05-sucessor-2 (Codex, local) — B-SAN3-05 (tarefa LOCAL, ramo fix/runtime-role-sem-bypass)

## MEDIDO

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-05-plano.md`
```
1121
```

O ramo contem a origin/main inteira (merge-base igual a origin/main) no instante do mandato medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

Os arquivos que o ramo muda contra origin/main antes do trabalho medido por: `git diff --name-only origin/main HEAD | paste -sd" "`
```
.gitattributes agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docker-compose.prod.yml docs/deployment.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md scripts/db-runtime-role.sh scripts/san3-05-acessos-de-plataforma.mjs src/config/env.ts src/database/rls.ts src/database/runtime-role.bootstrap.ts src/database/runtime-role.ts src/modules/cloud-charges/cloud-charge-prisma.repository.ts src/modules/cloud-usage/cloud-usage-prisma.repository.ts src/server.ts tests/fixtures/san3-05-mutacoes/Ma_alias.ts tests/fixtures/san3-05-mutacoes/Mb_destructure.ts tests/fixtures/san3-05-mutacoes/Mc_element.ts tests/fixtures/san3-05-mutacoes/Md_tx_sem_setter.ts tests/fixtures/san3-05-mutacoes/Me_root_dentro_wrapper.ts tests/fixtures/san3-05-mutacoes/Mf_new_como_argumento.ts tests/fixtures/san3-05-mutacoes/Mg_subclasse.ts tests/fixtures/san3-05-mutacoes/Mh_funcao_livre_client.ts tests/fixtures/san3-05-mutacoes/Mi_sql_em_constante.ts tests/fixtures/san3-05-mutacoes/Mj_campo_arrow.ts tests/fixtures/san3-05-mutacoes/Mk_fabrica_param_tx.ts tests/fixtures/san3-05-mutacoes/Ml_mutacao_do_plano.ts tests/fixtures/san3-05-mutacoes/Mm_getter_prisma.ts tests/fixtures/san3-05-mutacoes/Mn_membro_nao_previsto.ts tests/fixtures/san3-05-mutacoes/Mo_tx_param_helper.ts tests/fixtures/san3-05-mutacoes/Mp_this_client_fora_de_classe_injetada.ts tests/fixtures/san3-05-mutacoes/Mq_updateManyAndReturn.ts tests/fixtures/san3-05-mutacoes/N01_destructure_renomeado.ts tests/fixtures/san3-05-mutacoes/N02_alias_do_delegate.ts tests/fixtures/san3-05-mutacoes/N03_new_via_namespace.ts tests/fixtures/san3-05-mutacoes/N04_import_renomeado.ts tests/fixtures/san3-05-mutacoes/N05_setter_condicional.ts tests/fixtures/san3-05-mutacoes/N06_setter_no_cliente_errado.ts tests/fixtures/san3-05-mutacoes/N07_delegate_como_argumento.ts tests/fixtures/san3-05-mutacoes/N08_subclasse_via_namespace.ts tests/fixtures/san3-05-mutacoes/N09_setter_em_comentario.ts tests/fixtures/san3-05-mutacoes/N10_any.ts tests/production-runtime-gates.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts tests/san3-05-runtime-role-bootstrap.test.ts
```

A linha do bloco no plano-mestre da rodada medido por: `grep -ic "B-SAN3-05" docs/revisoes/SAN3/PLANO_SAN3.md`
```
5
```

## HIPOTESE

O papel e o desenvolvedor do B-SAN3-05, identidade nova dev-b-san3-05-sucessor-2 (nenhuma das que planejaram ou criticaram as versoes
  1, 2 e 3 do plano, nem os devs de nuvem dev-b-san3-05 e dev-b-san3-05-sucessor-1), rodando LOCALMENTE no Codex em GPT-6 Astra,
  porque o dono tirou o resto do dev da nuvem (bloqueio do classificador de seguranca tres vezes no mesmo trecho, secao ENCERRAMENTO
  DA NUVEM do relatorio), suspendeu o Fable ate o reinicio do limite semanal e habilitou o Codex neste projeto (2026-10-03); declara na
  1a linha da sua secao do relatorio o papel, a identidade, o modelo e o mandato_md5 deste arquivo (EOL-neutro) derruba com: `grep -ic 'sucessor-2' agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md`

A retomada e por P3: o relatorio agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md e roteiro, nao conclusao; o
  sucessor re-executa primeiro o que esta registrado nas secoes 0 a 7 e na RETOMADA do sucessor-1 (o codigo E1 a E6 e os testes T1 a
  T4 e T10 a T13), compara a saida, declara cada divergencia, e so entao mede a cauda: T5 a T9, T8b a T8d, T14 (a e b) e T15 em
  tests/san3-05-runtime-role-guard-db.test.ts (novo), a entrada A21 da FROZEN_ALLOWLIST, a rodada de mutacoes A1 a A24, a bateria do
  secao 8, o npm test real para o KPI, o E8 e o secao 10, tudo pelo plano v3 docs/revisoes/SAN3/B-SAN3-05-plano.md sem corte; toda
  divergencia medida entre o plano e o terreno vira falsificacao escrita no relatorio, nunca desvio silencioso derruba com: `git diff --name-only origin/main HEAD | grep -icE '^(prisma|mobile|frontend|\.github|\.claude|\.agents)/|^(CLAUDE|AGENTS)\.md$|package-lock'`

A prova e a bateria do secao 8 executada de verdade num cluster Postgres descartavel proprio desta maquina (porta livre provada,
  nunca a base viva erp-postgres 5432 nem o erp-redis 6379), com o papel de runtime real criado pelo script v3 (NOSUPERUSER
  NOBYPASSRLS), N e forma publicados; a senha do papel nunca passa por argv, log, relatorio, fixture com valor real nem variavel de
  ambiente gravada em arquivo; as 27 fixtures de mutacao do Apendice D exercidas e cada criterio do secao 7 visto vermelho com a sua
  mutacao; o guard tests/db-catalog-write-guard.test.ts intocado e verde derruba com: `grep -icE 'senha|password' agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md`

O KPI (secao 9) e recontado contra o que a origin/main publicar no instante do commit, com as trilhas que o bloco nao tocou
  carregadas com nota, os campos de commit de merge e de head aprovado nulos na autoria, e Kpis/app.js so por node
  scripts/kpi-freeze.mjs; depois do push final o dev abre o PR em RASCUNHO no GitHub (gh pr create --draft) e para; CI, inspetor, junta
  (unanimidade de 3, secao 10 do plano) e porteiro sao do orquestrador, nao do dev derruba com: `git log -1 --format=%s -- Kpis/kpis-latest.json | grep -ic 'san3-05'`

O terreno e LOCAL (Windows 11, Git Bash e PowerShell; checkout CRLF com core.autocrlf=true; nunca git config sem --worktree):
  worktree proprio no ramo fix/runtime-role-sem-bypass em caminho curto, criado depois de o orquestrador liberar o ramo, com npm ci
  proprio sem junction e prisma generate com DATABASE_URL so no ambiente do comando; a 1a secao traz uname -a, node -v, git rev-parse
  HEAD e git rev-parse origin/main; nunca tail -f nem leitura sem fim; timeout em tudo que executa; a maquina e compartilhada com
  outras juntas (worktrees w-j4c*, w-insp401c*, w-s11k2*), que ninguem toca derruba com: `grep -ic 'uname' agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md`

Os commits sao Conventional Commits SEM nenhuma linha de atribuicao, com autor thiagodorgo, com git diff --cached --check em linha
  propria antes de cada um; o push e so para o ramo fix/runtime-role-sem-bypass, fast-forward; nunca main, nunca merge na main, nunca
  force; o relatorio e incremental com hora UTC em cada secao, commitado e empurrado a cada entrega; sob PAUSA, termina o comando em
  curso, grava a secao PAUSA (head, feito, falta, proximo comando, meio-escritos), commita, empurra e para sozinho (P7) derruba com: `git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'`

## MEDIDO

Pre-voo deste mandato no head do ramo, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local (sem PR: sem colagem do refs) medido por: `bash scripts/mandato-preflight.sh <este-mandato>; echo ec=$?`
```
AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)

PRE-VOO OK — C:/Users/AMP/w-nuv05d/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev-sucessor-2.md
ec=0
head=243380db30026485d799ab2cc9c3791ffd1ea582
utc=2026-10-03T17:06:45Z
```
