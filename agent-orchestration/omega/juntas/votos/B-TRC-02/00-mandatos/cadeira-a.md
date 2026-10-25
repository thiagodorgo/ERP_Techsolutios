# Mandato — Cadeira (a) — banco, RLS, migração e arnês — B-TRC-02 ciclo 1 (junta de SEGURANÇA, Traccar)

## MEDIDO

Estado do PR 454 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança do ramo `origin/chore/mandato-refs-e-preflight` para a pasta própria deste redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/`, com o cwd no worktree do objeto; é o ciclo 1, nenhuma ata nomeia o PR e a ferramenta sai com ec 0, medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh 454`
```
# refs do PR #454 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-21T08:11Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-02
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      38504427a7b962545e559bd4d312b520b458ac42
merge-base:      539b078e311a5521b0d496ba5afae8f73acc43a0
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #454
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-trc02 ls-remote origin refs/heads/feat/traccar-b-trc-02`
```
38504427a7b962545e559bd4d312b520b458ac42	refs/heads/feat/traccar-b-trc-02
```

Os 14 check-runs do objeto estão concluídos e todos `success` (zero fora de `completed success`), em sete jobs com os dois gatilhos, medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/38504427a7b962545e559bd4d312b520b458ac42/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

O merge do B-TRC-01 (PR 426), que o plano v2 usa como base dos arquivos do 01 e do vermelho-controle no `src/` antigo, é o `merge commit` abaixo, lido pela mesma ferramenta; ela sai com ec 3 porque três atas casam o 426 e ela não escolhe, o que não é matéria desta junta, medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-21T08:11Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-01
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      9b93df5f6f2ab06d67ed1d39c8af20732c5c3429
merge-base:      40c3651f066278654e2c71df4c3b38e1d90994c8
merge commit:    c1485c94f3e99a33f5b8f6aec96a12bc922a237e
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (3 atas casam #426 no cabecalho — a ferramenta nao escolhe)
                 objeto declarado 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo1.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 2043c5840c8f60fe91538840aaefb3420a11cfe3 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo2.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado 7c220467f754341a699c18c241fa9965c1a35638 (agent-orchestration/omega/juntas/J-B-TRC-01-ciclo3.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md (mencao no corpo) @origin/main
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

```

Do merge-base ao objeto o ramo tem 28 commits de primeiro pai contados abaixo; depois da emenda v2.3 (`<objeto>~5`, 07:40), da emenda v2.4 (`<objeto>~4`, 08:51) e do registro das duas (`<objeto>~3`, 08:52), entraram o registro da transação explícita e da revisão da Q1 (`<objeto>~2`, 09:45), a M-E09 re-especificada (`<objeto>~1`, 09:50) e o registro das decisões do dono de 21/10 (`<objeto>`, 00:35); o registro que trouxe os corpos dos três jurados é das 05:55, ANTES das emendas, medido por: `cd C:/Users/AMP/w-trc02 && git rev-list --first-parent --count 539b078e311a5521b0d496ba5afae8f73acc43a0..38504427a7b962545e559bd4d312b520b458ac42; git log --first-parent --format='%ad %s' --date=format:'%m-%d %H:%M' 539b078e311a5521b0d496ba5afae8f73acc43a0..38504427a7b962545e559bd4d312b520b458ac42 | head -9 | cut -c1-96`
```
28
10-21 00:35 docs(registro): decisões do dono de 21/10 — C-10 guarda o evento sem despacho e m
10-20 09:50 test(traccar): M-E09 re-especificada na forma atual do evento e a injeção antiga p
10-20 09:45 docs(registro): D-TRC02-MIGRACAO-TRANSACAO-EXPLICITA, P-MIGRACOES-ANTERIORES-SEM-TRA
10-20 08:52 docs(registro): emendas v2.3 e v2.4 no D-TRC02-ESCOPO e 4 pendências nomeadas (B-TR
10-20 08:51 fix(traccar): inventário de acessos de plataforma com as chaves da telemetria, even
10-20 07:40 fix(traccar): migração A como transação explícita, down com guarda antes de qua
10-20 06:08 ci(traccar): um comentário só de total na lista curada, re-medido no ramo integrad
10-20 05:57 Merge remote-tracking branch 'origin/main' into feat/traccar-b-trc-02
10-20 05:55 docs(registro): B-TRC-02 — a Q1 revista pelo dono (D-TRC02-Q1-NAO), o escopo do bl
```

As duas migrações do bloco estão no objeto com os carimbos renumerados (o carimbo previsto no plano v2 é o do B-SAN3-02, que já está na base), cada nome uma vez; no merge-base só existe a do B-SAN3-02, medido por: `cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only 38504427a7b962545e559bd4d312b520b458ac42 prisma/migrations | grep -i -E '_vehicle_telemetry_events|_validate_receipt_message_kind_check|_invoice_complementary_title'; git ls-tree -r --name-only 539b078e311a5521b0d496ba5afae8f73acc43a0 prisma/migrations | grep -c -i -E '_vehicle_telemetry_events|_validate_receipt_message_kind_check|_invoice_complementary_title'`
```
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql
prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql
1
```

A migração A do objeto é uma transação explícita (emenda v2.3): `BEGIN;` na linha 18, `COMMIT;` na 93 e o cabeçalho do rodapé `-- down` na 95, que nomeia a invocação `psql -v ON_ERROR_STOP=1 --single-transaction`; nenhuma das duas migrações tem `GRANT`, e `scripts/db-runtime-role.sh` não mudou desde o merge-base, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | tr -d '\r' | grep -n -i -E '^(BEGIN|COMMIT);|^-- down' | cut -c1-150; git show 38504427a7b962545e559bd4d312b520b458ac42:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | grep -c -i -E '\bGRANT\b'; git show 38504427a7b962545e559bd4d312b520b458ac42:prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql | grep -c -i -E '\bGRANT\b'; git diff --name-only 539b078e311a5521b0d496ba5afae8f73acc43a0 38504427a7b962545e559bd4d312b520b458ac42 -- scripts/db-runtime-role.sh | wc -l`
```
18:BEGIN;
93:COMMIT;
95:-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>`:
0
0
0
```

As quatro suítes `-db` do bloco têm, contado o caso-sentinela de cada uma, 10, 7, 22 e 14 chamadas `test(` (9 + 6 + 21 + 13 = 49 casos de mérito); o G9 (drill) SAIU da suíte RLS, que cita "drill" uma única vez, no comentário do cabeçalho (linha 14) que aponta a casa nova; o drill vive agora em `tests/traccar-event-migration-drill-db.test.ts`, medido por: `cd C:/Users/AMP/w-trc02 && for t in traccar-event-rls-db traccar-event-migration-drill-db traccar-event-ingestion-db traccar-event-sample-db; do echo "$t $(git show 38504427a7b962545e559bd4d312b520b458ac42:tests/$t.test.ts | tr -d '\r' | grep -c -i -E '^\s*test\(')"; done; git show 38504427a7b962545e559bd4d312b520b458ac42:tests/traccar-event-rls-db.test.ts | grep -c -i 'drill'`
```
traccar-event-rls-db 10
traccar-event-migration-drill-db 7
traccar-event-ingestion-db 22
traccar-event-sample-db 14
1
```

As quatro suítes estão no bloco `SUITES=` do job `backend-postgres` do `ci.yml` do objeto, e o comentário do bloco declara o total do job medido 3× no ramo integrado: 463/463 (o corpo desta cadeira, escrito antes, diz 434), medido por: `git -C C:/Users/AMP/w-trc02 show 38504427a7b962545e559bd4d312b520b458ac42:.github/workflows/ci.yml | tr -d '\r' | grep -n -i -E 'SUITES=.*traccar-event|medido 3× no ramo integrado' | cut -c1-130`
```
298:          # 0 pulo, denominador constante; o drill leva ~2 min. Total do job, medido 3× no ramo integrado: 463/463, 0 pulo.
299:          SUITES="$SUITES tests/traccar-event-ingestion-db.test.ts"
300:          SUITES="$SUITES tests/traccar-event-sample-db.test.ts"
301:          SUITES="$SUITES tests/traccar-event-rls-db.test.ts"
302:          SUITES="$SUITES tests/traccar-event-migration-drill-db.test.ts"
```

O literal do inventário de DML do papel de runtime (T14a/b, linha 1016 de `tests/san3-05-runtime-role-guard-db.test.ts`) é 118 no merge-base e 119 no objeto (emenda v2.2, R-S2), medido por: `cd C:/Users/AMP/w-trc02 && git show 539b078e311a5521b0d496ba5afae8f73acc43a0:tests/san3-05-runtime-role-guard-db.test.ts | tr -d '\r' | sed -n '1016p' | grep -o -i -E '\|1[01][0-9]\$'; git show 38504427a7b962545e559bd4d312b520b458ac42:tests/san3-05-runtime-role-guard-db.test.ts | tr -d '\r' | sed -n '1016p' | grep -o -i -E '\|1[01][0-9]\$'`
```
|118$
|119$
```

Dos 15 arquivos de teste do Traccar que existiam no merge do B-TRC-01, 6 mudaram até o objeto (os 5 arnês `-db` e o contrato da posição, caso §9.4) e 9 estão byte a byte iguais, medido por: `cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only c1485c94f3e99a33f5b8f6aec96a12bc922a237e tests | grep -c -i -E 'traccar'; git diff --numstat c1485c94f3e99a33f5b8f6aec96a12bc922a237e 38504427a7b962545e559bd4d312b520b458ac42 -- $(git ls-tree -r --name-only c1485c94f3e99a33f5b8f6aec96a12bc922a237e tests | grep -i -E 'traccar')`
```
15
1	0	tests/traccar-binding-uniqueness-db.test.ts
1	1	tests/traccar-idempotency-db.test.ts
2	1	tests/traccar-position-contract.test.ts
1	0	tests/traccar-position-ingestion-db.test.ts
1	1	tests/traccar-quarantine-db.test.ts
1	1	tests/traccar-resolution-race-db.test.ts
```

A emenda v2.4 mudou o ratchet de acessos de plataforma do B-SAN3-05 (2 hunks: o mapa `NOVAS` e o literal L0, agora `ENABLE=112 FORCE=112`) e o serviço de ingestão (`5 4` desde `<objeto>~5`, a instanciação morta do evento), sem tocar gerador, fixtures, `src/database/rls.ts` nem `scripts/db-runtime-role.sh`; a emenda dá a esta cadeira a leitura dos motivos do `NOVAS` e o controle C5, que o relatório do dev declara não medido por ele, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:tests/san3-05-acessos-de-plataforma-guard.test.ts | tr -d '\r' | grep -n -i -o -E 'tabelas ENABLE=112 FORCE=112'; git diff --numstat 539b078e311a5521b0d496ba5afae8f73acc43a0 38504427a7b962545e559bd4d312b520b458ac42 -- tests/san3-05-acessos-de-plataforma-guard.test.ts; git diff 539b078e311a5521b0d496ba5afae8f73acc43a0 38504427a7b962545e559bd4d312b520b458ac42 -- tests/san3-05-acessos-de-plataforma-guard.test.ts | grep -c -i -E '^@@'; git diff --numstat 38504427a7b962545e559bd4d312b520b458ac42~5 38504427a7b962545e559bd4d312b520b458ac42 -- src/integrations/traccar/traccar-ingestion.service.ts; git diff --stat 539b078e311a5521b0d496ba5afae8f73acc43a0 38504427a7b962545e559bd4d312b520b458ac42 -- scripts/san3-05-acessos-de-plataforma.mjs tests/fixtures/san3-05-mutacoes src/database/rls.ts scripts/db-runtime-role.sh | wc -l; git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md | tr -d '\r' | grep -n -i -o -E 'a cadeira \(a\) lê os 7 motivos um a um|o atribui à cadeira \(a\)'; git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-dev.md | tr -d '\r' | grep -n -i -o -E 'C5 não foi medido por mim'`
```
287:tabelas ENABLE=112 FORCE=112
29	3	tests/san3-05-acessos-de-plataforma-guard.test.ts
2
5	4	src/integrations/traccar/traccar-ingestion.service.ts
0
151:a cadeira (a) lê os 7 motivos um a um
508:C5 não foi medido por mim
```

O parecer do DBA (`dba-trc02-opus`) NÃO está no objeto: vive fora dele, em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md`, com veredito final FAVORÁVEL na rodada 2, sobre `<objeto>~5` (o commit da emenda v2.3); de `<objeto>~5` ao objeto nenhum caminho de `prisma/` mudou, e os 13 caminhos que mudaram são os da emenda v2.4, da M-E09 e dos registros, medido por: `grep -n -i -o -E 'Veredito final \(rodada 2|FAVOR.{1,3}VEL\*\* — D1, R1 e R2 fechados|^\*\*FAVOR.{1,3}VEL\.\*\* D1, R1 e R2' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md; cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only 38504427a7b962545e559bd4d312b520b458ac42 agent-orchestration/omega/juntas/votos | grep -c -i 'B-TRC-02'; git log -1 --format=%s 38504427a7b962545e559bd4d312b520b458ac42~5 | cut -c1-70; git diff --name-only 38504427a7b962545e559bd4d312b520b458ac42~5 38504427a7b962545e559bd4d312b520b458ac42 -- prisma | wc -l; git diff --name-only 38504427a7b962545e559bd4d312b520b458ac42~5 38504427a7b962545e559bd4d312b520b458ac42`
```
3:Veredito final (rodada 2
3:FAVORÁVEL** — D1, R1 e R2 fechados
176:**FAVORÁVEL.** D1, R1 e R2
0
fix(traccar): migração A como transação explícita, down com guard
0
.github/workflows/ci.yml
agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md
agent-orchestration/controle/decisoes.md
agent-orchestration/controle/pendencias-indice.md
agent-orchestration/controle/pendencias.md
docs/revisoes/TRACCAR/B-TRC-02-dev.md
docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md
docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs
docs/revisoes/TRACCAR/B-TRC-02-evidencias/results-db-v23.jsonl
docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md
src/integrations/traccar/traccar-ingestion.service.ts
tests/san3-05-acessos-de-plataforma-guard.test.ts
tests/traccar-event-ingestion-db.test.ts
```

A decisão do dono `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` está no objeto: toda migração nova com mais de uma sentença e apenas DDL transacional leva `BEGIN;`/`COMMIT;` e drill por prefixo; `CONCURRENTLY` fica sozinho e declara a não-atomicidade. O guard de CI ainda pertence a bloco de ferramenta a nomear, e migrações antigas seguem na pendência declarada, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-MIGRACAO-COM-TRANSACAO-EXPLICITA|A regra:.*migração nova|Exceção:.*CONCURRENTLY|Guard de CI:'; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA|status:\*\* ABERTA' | tail -2`
```
3875:- **`D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"3=aprovo"***, à regra geral recomendada pelo planejador do `B-TRC-02` (emenda v2.3) depois de a mesma classe de defeito aparecer em dois blocos seguidos (`B-SAN3-02` C2-01 e `B-TRC-02` D1).
3876:  - **A regra:** toda migração nova com mais de uma sentença, e só de DDL transacional, leva `BEGIN;`/`COMMIT;` no próprio arquivo e um drill por prefixo (falha injetada após cada sentença, pelo `prisma migrate deploy` real).
3877:  - **Exceção:** migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.
3878:  - **Guard de CI:** um guard reprova migração nova que viole a regra. Ele é implementado por um bloco de ferramenta (regra (1) de `D-GOV-PROPORCIONAL`), dono a nomear; até lá, vale como regra do planejador e do DBA. As migrações antigas seguem pela `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`.
11600:## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA
11602:status:** ABERTA
```

A variante do código é Q1 = NÃO (decisão do dono de 19/10, `D-TRC02-Q1-NAO`, linha 3824 do `decisoes.md` do objeto); a cópia `docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md` NO OBJETO agora traz a seção "Revisão da Q1 pelo dono" ("TRC-02 Q1 = Não"), alinhada ao arquivo fora do repositório; a migração A do objeto não tem `fix_key` nem `position_sample`, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-TRC02-Q1-NAO. \(decisão do dono, 2026-10-19|"TRC-02 Q1 = Não"'; git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md | tr -d '\r' | grep -c -i -E 'Q1 *= *N.{1,3}O'; grep -n -i -o -E '^## Revis.{1,3}o da Q1 pelo dono|"TRC-02 Q1 = N.{1,3}o"' C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-respostas-do-dono.md; git show 38504427a7b962545e559bd4d312b520b458ac42:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | grep -c -i -E 'fix_key|position_sample'`
```
3824:D-TRC02-Q1-NAO` (decisão do dono, 2026-10-19
3824:"TRC-02 Q1 = Não"
1
9:## Revisão da Q1 pelo dono
11:"TRC-02 Q1 = Não"
0
```

O critério C-10 do plano v2 guarda o evento de viatura sem despacho, e a decisão do dono `D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` escolhe a opção A: guardar o evento para a viatura sem pessoa; guardar não é exibir. O corpo da cadeira C já exige E8 com 204 e uma linha e veta recusar ou quarentenar o evento. A pendência de LGPD continua sendo sobre a exibição futura no B-TRC-04, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:docs/revisoes/TRACCAR/B-TRC-02-plano.md | tr -d '\r' | grep -n -i -E '^\| C-10 \|' | cut -c1-140; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA|A decisão.*opção A.*guardar|O código já se comporta assim'; git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO|bloqueia:\*\* o início do .B-TRC-04'`
```
696:| C-10 | Evento não exige operador: viatura vinculada sem despacho → 204 e linha (guardar ≠ exibir; `P-TRC02-LGPD-TELEMETRIA-SEM-DE
3871:- **`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"1=a"***, em resposta à pergunta do orquestrador sobre o C-10, feita junto com o NÃO da Q1, como manda o §Q1.6 do plano.
3873:  - **A decisão:** opção A, **guardar**.
3874:  - **Efeito:** o evento fica gravado para a viatura, sem pessoa. Nenhuma tela o exibe; exibir fica para o `B-TRC-04`, sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`. O código já se comporta assim (C-10/E8 do plano v2), e nada muda.
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
11507:## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO
11512:bloqueia:** o início do `B-TRC-04
```

Os três corpos das cadeiras existem no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra; o arquivo inteiro DIFERE por construção do espelho, e por isso não se publica hash); nenhum deles menciona as emendas v2.3 e v2.4, o drill novo ou os casos T-M, porque o único commit que os tocou é o registro das 05:55. O corpo da cadeira C já exige E8: evento de viatura sem despacho resulta em 204 e uma linha, e classifica recusar ou quarentenar esse evento como bloqueio — portanto trata C-10 como guardar, medido por: `cd C:/Users/AMP/w-trc02 && for c in a-banco-rls-arnes b-superficie-escopo-registro c-contrato-evento-unidades; do diff <(git show "38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "38504427a7b962545e559bd4d312b520b458ac42:.agents/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; echo "menções a v2.3/v2.4/drill/T-M: $(git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-$c.md | grep -c -i -E 'v2\.3|v2\.4|migration-drill|T-M\(')"; done; git show 38504427a7b962545e559bd4d312b520b458ac42:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git log --format='%ad %s' --date=format:'%m-%d %H:%M' 38504427a7b962545e559bd4d312b520b458ac42 -- .claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md .claude/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md .claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | cut -c1-60`
```
IDENTICO corpo a-banco-rls-arnes
menções a v2.3/v2.4/drill/T-M: 0
IDENTICO corpo b-superficie-escopo-registro
menções a v2.3/v2.4/drill/T-M: 0
IDENTICO corpo c-contrato-evento-unidades
menções a v2.3/v2.4/drill/T-M: 0
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
10-20 05:55 docs(registro): B-TRC-02 — a Q1 revista pelo d
```

A pré-revisão Gemini Flash (`prerev-trc02-flash`, 2º revisor; subsídio, nunca insumo de voto) mediu um head ANTERIOR às emendas v2.3 e v2.4 (zero menções a elas ou ao drill) e escreveu "Nada achado" nas suas seções, medido por: `grep -c -i -E 'v2\.3|v2\.4|migration-drill' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md; grep -c -i 'Nada achado' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md`
```
0
12
```

A ferramenta de banco descartável nomeia contêineres e rede por um ID fixo `tl<epoch><pid>`, não aceita prefixo e roda `npm ci` e `prisma migrate deploy` dentro do contêiner sobre uma cópia do worktree sem `node_modules`, medido por: `grep -n -i -o -E 'ID="tl[^"]*"|--exclude=./node_modules|npm ci --no-audit|npx prisma migrate deploy' C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`
```
7:ID="tl$(date +%s)$$"
17:--exclude=./node_modules
17:npm ci --no-audit
17:npx prisma migrate deploy
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git -C C:/Users/AMP/w-trc02 show 38504427a7b962545e559bd4d312b520b458ac42:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

O parecer do porteiro do PR 426 (B-TRC-01), insumo do briefing pelo §10 (iv) do plano v2, está no objeto com o veredito abaixo; é A RE-VERIFICAR, nunca afirmação herdada, medido por: `cd C:/Users/AMP/w-trc02 && git show 38504427a7b962545e559bd4d312b520b458ac42:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md | tr -d '\r' | grep -n -i -o -E '\b(LIBERADO COM RESSALVA|BLOQUEADO)\b' | head -3`
```
72:LIBERADO COM RESSALVA
```

## HIPOTESE

Você é `jurado-trc02-a-opus`, identidade nova, executor Claude Code (subagente), modelo Claude Opus, nível menor declarado (§C7.6); o seu corpo canônico é `.claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md` no blob do objeto (o nome do corpo é o da cadeira, não o seu nome de sessão). MONOCULTURA, declarada: as quatro identidades desta junta, o dev, o DBA e este redator rodam em Claude Opus, por escolha do dono em 21/10 (~03:35 BRT), que respondeu à pergunta do orquestrador sobre quem ocupa as cadeiras com "3 em Claude Opus (Recomendado)" — o Codex volta às 05:13 BRT e a API do Gemini tem crédito; a escolha foi pela confiabilidade num gate de segurança (fato do orquestrador, que você registra como tal). Na primeira linha de `cadeira-a-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Opus esgotado: PARE sem votar e registre onde parou (§C7.6-bis). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2, as emendas v2.1 a v2.4, as respostas do dono, o relatório do dev, o parecer do DBA (fora do objeto) e a pré-revisão Flash (subsídio, nunca insumo de voto) e o parecer do porteiro do PR 426 (`agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md`, no objeto; §10 (iv) do plano v2) são **A RE-VERIFICAR**: no voto, o campo `dba_guardiao` nomeia cada convergência e cada divergência com o parecer (§A2), derruba com: `head -1 C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md | grep -i -E 'executor|modelo|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-trc02-parecer.md` do inspetor `inspetor-trc02-opus` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 454 colado acima, com 14 de 14 check-runs concluídos (head que andou bloqueia o início). Régua: bloco de ingestão do Traccar = junta de SEGURANÇA, unanimidade de 3 com veto (§C7 item 8(1)(4)); ciclo 1, em que todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); o parecer do DBA é obrigatório e não é 4ª cadeira; migração destrutiva é parada irredutível (§C7.5), não voto. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra decisão do dono (Q1 = NÃO, Q2 = SIM, Q3 = SIM, C-10 = opção A guardar, `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`) sem efeito novo, não cobre KPI (§C7 item 8(5)) nem matéria das cadeiras (b) e (c), e não abra os votos delas antes de gravar o seu; o voto declara `arquivos_medidos` (§C7 item 9 (0)). NOTA C-10: o evento de viatura sem despacho é GUARDADO por decisão expressa do dono em 21/10 (`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA`); guardar não é exibir. Julgue o objeto e a migração conforme as decisões medidas acima e registre-as no voto, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|dba_guardiao|arquivos_medidos|C-10|D-MIGRACAO' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-voto.json`

DIVERGÊNCIA corpo × objeto, registrada pelo §A2 e não consolidada em silêncio: o seu corpo foi escrito antes das emendas v2.3 e v2.4 (medido acima). Vale o corpo para o MÉTODO (sonda própria, B povoada, vermelho-controle, classes) e valem as emendas para o ALVO, nestes quatro pontos: (i) o drill não é mais o G9 da suíte RLS (que tem 9 casos de mérito, medido acima), e sim `tests/traccar-event-migration-drill-db.test.ts` (T-M(a) a T-M(f), k = 1..17), com a migração A em `BEGIN;`/`COMMIT;` e o rodapé `-- down` com a guarda em 1º; (ii) o total do `backend-postgres` é o 463 do comentário do `ci.yml`, não o 434 do corpo; (iii) o parecer do DBA não está em `votos/B-TRC-02` do objeto, e sim no arquivo de fora (medido acima), com rodada 2 sobre `<objeto>~5` (o commit da emenda v2.3) e nenhum caminho de `prisma/` mudado desde então; (iv) a emenda v2.4 dá a esta cadeira os motivos do mapa `NOVAS` (recusáveis um a um) e o controle C5. Registre na evidência como mediu cada ponto, derruba com: `grep -i -E 'divergência|T-M|463|NOVAS|C5|v2\.3|DBA' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`

Terreno: worktree exclusivo prefixado `C:/Users/AMP/w-jtrc02-a-`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa (o corpo sugere `C:/Users/AMP/w-jt2a`; vale este prefixo). Postgres 16 e Redis 7 DESCARTÁVEIS seus, contêiner e rede com prefixo `jtrc02-a-` e bases `jtrc02_a_<caso>`, publicados só em `127.0.0.1` numa porta alta testada antes; se usar `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh` (ID fixo `tl<epoch><pid>`, medido acima), copie-a para `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/` com o ID trocado para `jtrc02-a-tl<n>` e publique o diff. Antes de cada subida, de cada `npm ci` e de cada rodada: memória de commit livre de pelo menos 4 GB (P8), no máximo 2 trabalhos Docker na máquina contando o seu (excluídos os `erp-*`) e disco de pelo menos 10 GB; faltando qualquer um, espere com `sleep` limitado. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca os servidores públicos de demonstração do Traccar; nunca `prune` nem contêiner alheio. Sondas e scripts em `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/`, fora do worktree, com md5 e sem segredo (§C7 item 9). Variante de migração é CÓPIA num diretório temporário de migrações (nunca o arquivo real); mutação em arquivo real só no seu worktree, uma por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, com 0 resíduo do prefixo provado no fim, derruba com: `grep -i -E 'w-jtrc02-a-|jtrc02-a-|jtrc02_a_|junction|erp-|commit livre|4 GB|127.0.0.1|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`

Item 1 de 3 (isolamento por construção; item 1 do corpo, com a emenda v2.2 R-S2, a v2.3 no lugar do G9 e a v2.4): prove por execução, sob papel `NOSUPERUSER NOBYPASSRLS` e com o GUC: (a) a suíte RLS do objeto 9/9 de mérito, E13/E19 de `tests/traccar-event-ingestion-db.test.ts` e F8/F11 de `tests/traccar-event-sample-db.test.ts`, `skipped 0`; (b) a sua sonda com a organização B POVOADA sob o GUC de B, entregando pelo serviço do objeto um evento de cada `kind`, uma posição com atributos, a posição com atributos cheios FORA do despacho (só `quar` muda, 0 recibo, 0 `sample`), `tenantId` forjado nos atributos, a entrega repetida e o dispositivo não mapeado, com a tabela `entrega | desfecho | A | B | B igual ao semeado`; (c) `EXPLAIN (VERBOSE)` de `latestDeviceStatus`, de `latestIgnition` e do INSERT do evento sob o papel do runtime mostrando o filtro de política, e `42501` no INSERT com outra organização sob o GUC de A; (d) a FK de 4 colunas recusando V1×V2 e o vínculo trocado com `23503`, `relforcerowsecurity`, `pg_rules` 0, `prosecdef` igual ao de uma base em `B`, o guard do runtime com 0 escape, o inventário de DML do runtime como diferença de CONJUNTOS entre `B` e o objeto (esperado exatamente `{vehicle_telemetry_events}`, literal 118 → 119 medido acima) com um evento entregue sob o papel do runtime gravando 1 linha, e nenhum `GRANT`; (e) a migração A atômica pelo CLI REAL, com injeção PRÓPRIA (não a do T-M(e)): numa base sua no nível de `B`, cópia da A num diretório temporário com uma sentença que falha depois da k-ésima (k = 1..17), rodada por `npx prisma migrate deploy` com `--config` temporário, catálogo igual ao de antes em todo k, e convergência por `migrate resolve --rolled-back` + deploy com `migrate status` em dia; o down pela invocação do cabeçalho nas pontas A (volta ao catálogo de `B`, re-up converge, `_prisma_migrations` sem as duas do bloco e com a do B-SAN3-02) e B (para na guarda com `22P02` sem apagar nada); o upgrade de uma base em `B` aplicando exatamente as 2 migrações do bloco; e `tests/traccar-event-migration-drill-db.test.ts` 6/6 três vezes. Leia os motivos das chaves novas do mapa `NOVAS` um a um contra o código (cada uma roda sob o GUC de `withTenantRlsBudget`?) e recuse o que não se sustentar; rode o caso de `listByVehicle` sob os GUCs de A e de B. Vermelho-controle: B vista sob o GUC de B; o `EXPLAIN` por papel seu com `BYPASSRLS` sem o filtro; M-E40 e M-E23 vermelhas em banco novo; o seu contador de DML acusa um `REVOKE` seu; M-E51, M-E51b e M-E51c vermelhas pela sua injeção E pelo T-M(e), M-E52, M-E53 (pelo comportamento do T-M(c), não só pela forma; o dev registrou que o vermelho dele veio da forma) e M-E54h; a sua injeção aplicada depois do `COMMIT` deixa as 17 sentenças aplicadas (prova de que injeta), derruba com: `grep -i -E 'Item 1|9/9|canário|EXPLAIN|42501|23503|FORCE|pg_rules|prosecdef|119|GRANT|injeção própria|k=17|--config|resolve --rolled-back|22P02|ponta A|ponta B|NOVAS|listByVehicle|M-E40|M-E23|M-E51|M-E52|M-E53|M-E54h|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`

Item 2 de 3 (idempotência sob corrida, a amostra que não derruba e a Q1 ausente do banco; item 2 do corpo, com a v2.4 C5): prove E4 20× com barreira (por rodada 1 recibo `event`, 1 linha, 204 nas duas) e M-E10/M-E14 vermelhas; um só helper de savepoint com a lista fechada `{23514, 22003}` importada do módulo do objeto e um único `ROLLBACK TO SAVEPOINT vehicle_sample`; F9, F9′, F10 e F12 e uma forma PRÓPRIA de SQLSTATE fora da lista (por exemplo `23505` pela unicidade da amostra por recibo) relançando → 503 com nada gravado, sem `25P02` em caso nenhum; M-E31, M-E32, M-E46, M-E47 e M-E48 vermelhas; G8 com o CHECK do recibo exatamente `{'position','event'}`, `'position_sample'` recusado com `23514` e `convalidated = true`, e M-E26; a Q1 = NÃO no banco: 0 `fix_key`/`position_sample` no catálogo, no blob (0 na migração A, medido acima) e na árvore de testes, e a mesma posição sem despacho com atributos cheios entregue 2× com 1 item de quarentena (`delivery_count 2`), 0 recibo e 0 `sample`. Meça o controle C5 da emenda v2.4 §3, que o dev declarou não medido: no seu worktree, `insertVehicleSample` passando o client raiz ao `insertSample` deixa `tests/traccar-event-sample-db.test.ts` vermelho sob o papel sem bypass (o INSERT sem GUC recusado pelo `WITH CHECK`), com restauro provado. Vermelho-controle: M-E10 nas 20 rodadas; o logger-espião conta 1 `sample_discarded` em F10 e 1 `failed before commit` em F12(a); a releitura `::text` acusa um valor trocado; a busca de resíduo acusa uma coluna `fix_key` criada à mão num banco de CONTROLE seu, derruba com: `grep -i -E 'Item 2|E4|20×|barreira|23514|22003|F9|F10|F12|25P02|M-E10|M-E14|M-E31|M-E32|M-E46|M-E47|M-E48|G8|position_sample|M-E26|fix_key|delivery_count|C5|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`

Item 3 de 3 (CI, regressão e o arnês do 01; item 3 do corpo, com o total da v2.4): prove a forma do job `backend-postgres` do `ci.yml` do objeto três vezes em contêiner Linux seu, com `fail 0`, `skipped 0` e denominador constante e igual ao do comentário (463, medido acima), e as quatro suítes do bloco na lista `SUITES=`; leia a forma `backend` no check-run do objeto (o `npm test` inteiro em contêiner já derrubou a VM duas vezes neste bloco; localmente, só arquivo a arquivo, e queda de VM é infraestrutura, não achado), com o T9 do censo, T14a/b e o ratchet de acessos (35/35) verdes; `telemetry.test.ts` 17/17; os 9 arquivos de teste do 01 iguais aos do merge do B-TRC-01 e os 5 arnês pela régua R3-1 (medido acima: 6 mudaram, 5 arnês e o contrato da posição); M-E43 e M-E49 vermelhas. Se o 503 concorrente pré-existente de `traccar-idempotency-db` aparecer, re-meça a mesma forma em `B` com N e forma antes de classificá-lo `pre-existente`. Vermelho-controle: M-CI1 (uma suíte do bloco fora de `SUITES=` muda o denominador); o seu leitor de TAP acusa um `skipped` fabricado, derruba com: `grep -i -E 'Item 3|backend-postgres|463|skipped 0|SUITES|check-run|T9|T14|35/35|telemetry|17/17|R3-1|M-E43|M-E49|M-CI1|pre-existente|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `cadeira-a`: evidência em `cadeira-a-evidencia.md` após CADA item; `cadeira-a-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs no repositório: `cadeira-a-evidencia.md` e `cadeira-a-voto.json` em `C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas do ramo `origin/chore/mandato-refs-e-preflight` para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/` (única adaptação: a linha 211 do `mandato-preflight.sh`, `RAIZ=C:/Users/AMP/w-trc02`), executado com o cwd no worktree do objeto; o redator é `redator-trc02-opus` (Claude Opus, nível menor declarado); o `sed` troca, nos AVISOs, o número de migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>` (o número solto fora do caminho seria cobrado como SHA), medido por: `cd C:/Users/AMP/w-trc02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-v2/mandato-preflight.sh C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/00-mandatos/cadeira-a.md 454 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/(migration[.]sql)?#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #454 confere com a saida atual
COLAGEM    l.35-54: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.167
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.72
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.73
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.74
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.78
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.78

PRE-VOO OK — C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02/00-mandatos/cadeira-a.md
ec=0
```
