# Mandato — Cadeira (a) — banco, RLS, migração e arnês — B-TRC-02 ciclo 2 (junta de SEGURANÇA, Traccar)

## MEDIDO

Estado do PR 454 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem mudança (a mesma do ciclo 1, do ramo `origin/chore/mandato-refs-e-preflight`) para a pasta própria deste redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`, com o cwd no worktree do objeto; é o ciclo 2: a ata do ciclo 1 cita o PR no corpo, a ferramenta não a reconhece como ata que se declara sobre ele e sai com ec 3 (NÃO DETERMINÁVEL), o que não é matéria desta junta (R7 do plano do ciclo 2), medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-refs.sh 454`
```
# refs do PR #454 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-24T19:52Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-02
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      42800d0dcece29c7e3a39476c9b40c917a66dfd0
merge-base:      7ab2fe71d0d40c2be51a790f0d20893651cdf972
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (mencao no corpo, sem cabecalho — 1 ata(s) citam #454 mas nenhuma se declara sobre ele)
                 agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

```

O ramo remoto aponta para o mesmo SHA que o PR declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-trc02 ls-remote origin refs/heads/feat/traccar-b-trc-02`
```
42800d0dcece29c7e3a39476c9b40c917a66dfd0	refs/heads/feat/traccar-b-trc-02
```

Todos os check-runs do objeto estão concluídos e `success` (zero fora de `completed success`); o total e os nomes estão na saída (o mandato exige concluídos, não um número), medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/42800d0dcece29c7e3a39476c9b40c917a66dfd0/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

O merge do B-TRC-01 (PR 426), que o plano v2 usa como base dos arquivos do 01 e do vermelho-controle no `src/` antigo, é o `merge commit` abaixo, lido pela mesma ferramenta; ela sai com ec 3 porque três atas casam o 426 e ela não escolhe, o que não é matéria desta junta, medido por: `cd C:/Users/AMP/w-trc02 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-24T19:52Z · repo: thiagodorgo/ERP_Techsolutios

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

Do merge-base NOVO ao objeto o ramo tem os commits de primeiro pai contados abaixo; os cinco últimos são o ciclo 2 — o registro do ciclo 1 (`<objeto>~4`), o merge da `main` (`<objeto>~3`, cujo segundo pai é o merge-base novo), o conserto (`<objeto>~2`), o relatório do dev (`<objeto>~1`) e o registro da nota b-3 pelo redator (`<objeto>`, que faltara no commit de registro do ciclo 1); `<objeto>~5` é o objeto julgado no ciclo 1, o mesmo que a ata do ciclo 1 declara, e `<merge-base>~1` é o merge-base do ciclo 1, medido por: `cd C:/Users/AMP/w-trc02 && git rev-list --first-parent --count 7ab2fe71d0d40c2be51a790f0d20893651cdf972..42800d0dcece29c7e3a39476c9b40c917a66dfd0; git log --first-parent --format='%ad %s' --date=format:'%m-%d %H:%M' 7ab2fe71d0d40c2be51a790f0d20893651cdf972..42800d0dcece29c7e3a39476c9b40c917a66dfd0 | head -6 | cut -c1-110; test "$(git rev-parse 42800d0dcece29c7e3a39476c9b40c917a66dfd0~3^2)" = "$(git merge-base 42800d0dcece29c7e3a39476c9b40c917a66dfd0 origin/main)" && echo 'segundo pai do merge = merge-base novo'; test "$(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md | tr -d '\r' | grep -i -E 'Objeto julgado' | grep -o -i -E '[0-9a-f]{40}')" = "$(git rev-parse 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5)" && echo 'objeto julgado na ata do ciclo 1 = <objeto>~5'; git merge-base --is-ancestor 7ab2fe71d0d40c2be51a790f0d20893651cdf972~1 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 && echo '<merge-base>~1 é ancestral do objeto do ciclo 1'`
```
33
10-24 16:37 docs(registro): critério da P-TRC-DEMO-LOGIN-SEM-ORG-INERTE passa a active × inactive (nota b-3,
10-24 16:01 docs(traccar): relatório do ciclo 2 — bateria, equivalência e mutações re-executadas (B-TRC-
10-24 15:26 fix(traccar): phaseTwoSteps sem o andaime da Q1 = SIM revertida e M-E16″ ancorada no passo 5 (B-
10-24 15:22 Merge remote-tracking branch 'origin/main' into feat/traccar-b-trc-02
10-24 15:13 docs(junta): B-TRC-02 ciclo 1 — votos, evidências, mandatos, quedas, ata e R-B-TRC-02-1
10-21 00:35 docs(registro): decisões do dono de 21/10 — C-10 guarda o evento sem despacho e migração nova
segundo pai do merge = merge-base novo
objeto julgado na ata do ciclo 1 = <objeto>~5
<merge-base>~1 é ancestral do objeto do ciclo 1
```

A decisão do dono de 24/10, `D-TOPO-E-O-CLAUDE`, está gravada no `decisoes.md` do objeto com as palavras literais do dono (o papel de topo é do Claude no lugar do Codex Astra, e o Claude cobre quem cair por limite), medido por: `git -C C:/Users/AMP/w-trc02 show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-TOPO-E-O-CLAUDE. \(decisão do dono, 2026-10-24\)|sempre trocar o astra por vc|vc tambem cobre que cair por limite'`
```
3902:D-TOPO-E-O-CLAUDE` (decisão do dono, 2026-10-24)
3902:sempre trocar o astra por vc
3902:vc tambem cobre que cair por limite
```

O registro do ciclo 1 está no objeto (commit `<objeto>~4`): a ata, a reprovação, as quedas (P6, duas linhas de agente), os votos, as evidências, o parecer e a evidência do inspetor, os quatro mandatos do ciclo 1 e a cópia do plano do ciclo 2; a ata registra o veredito REPROVADO, e o voto da (b) traz o achado `bloqueia`, medido por: `cd C:/Users/AMP/w-trc02 && for p in agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md agent-orchestration/omega/reprovacoes/R-B-TRC-02-1.md agent-orchestration/omega/juntas/votos/B-TRC-02/00-quedas.md agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-voto.json agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-voto.json agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-c-evidencia.md agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-c-voto.json agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-evidencia.md docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md; do git cat-file -e "42800d0dcece29c7e3a39476c9b40c917a66dfd0:$p" && echo "PRESENTE $p" || echo "AUSENTE $p"; done; echo "mandatos do ciclo 1: $(git ls-tree --name-only 42800d0dcece29c7e3a39476c9b40c917a66dfd0 agent-orchestration/omega/juntas/votos/B-TRC-02/00-mandatos/ | wc -l)"; echo "linhas de queda: $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/votos/B-TRC-02/00-quedas.md | grep -c -i -E '^\| .jurado-trc02-')"; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md | tr -d '\r' | grep -n -i -o -E '^\*\*REPROVADO\.\*\*'; echo "bloqueia no voto da (b): $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-voto.json | grep -c -i -E '"bloqueia"')"`
```
PRESENTE agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md
PRESENTE agent-orchestration/omega/reprovacoes/R-B-TRC-02-1.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/00-quedas.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-voto.json
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-evidencia.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-b-voto.json
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-c-evidencia.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-c-voto.json
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md
PRESENTE agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-evidencia.md
PRESENTE docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md
mandatos do ciclo 1: 4
linhas de queda: 2
65:**REPROVADO.**
bloqueia no voto da (b): 1
```

O conserto do ciclo 2 (commit `<objeto>~2`) mudou em `src/` uma só linha de numstat (`5 7` no serviço de ingestão); no objeto, `locked` e `let binding` somem do serviço (controle: o objeto do ciclo 1 os tem) e a fase 2 da POSIÇÃO lê `const binding = bindings[0]!` como a do EVENTO (duas linhas); no catálogo de mutações a `M-E16′` saiu e a `M-E16″` entrou, e o resultado do dev em `results-db-c2.jsonl` registra cada mutação com o código de saída e as falhas do TAP, medido por: `cd C:/Users/AMP/w-trc02 && git diff --numstat 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- src/; echo "locked/let binding no objeto: $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:src/integrations/traccar/traccar-ingestion.service.ts | grep -c -i -E '\blocked\b|let binding')"; n=$(git grep -h -c -i -E '\blocked\b|let binding' 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 -- src/integrations/traccar/traccar-ingestion.service.ts); echo "locked/let binding em <objeto>~5: ${n:-0}"; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:src/integrations/traccar/traccar-ingestion.service.ts | grep -n -i -E 'const binding = bindings.0.!'; a=$(git grep -h -c -i -E "id: .M-E16'.," 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 -- docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs); b=$(git grep -h -c -i -E "id: .M-E16''.," 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 -- docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs); echo "M-E16' / M-E16'' em <objeto>~5: ${a:-0} / ${b:-0}"; echo "M-E16' / M-E16'' no objeto: $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs | grep -c -i -E "id: .M-E16'.,") / $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs | grep -c -i -E "id: .M-E16''.,")"; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-evidencias/results-db-c2.jsonl | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const l of s.split(String.fromCharCode(10)).filter(Boolean)){const o=JSON.parse(l);console.log(o.id+' exit='+o.exit+' tsc='+o.tsc+' fail='+(o.tap&&o.tap.fail)+' expectGreen='+o.expectGreen)}})"`
```
5	7	src/integrations/traccar/traccar-ingestion.service.ts
locked/let binding no objeto: 0
locked/let binding em <objeto>~5: 6
302:    const binding = bindings[0]!;
411:    const binding = bindings[0]!;
M-E16' / M-E16'' em <objeto>~5: 1 / 0
M-E16' / M-E16'' no objeto: 0 / 1
M-E09 exit=1 tsc=0 fail=16 expectGreen=false
M-E17 exit=1 tsc=0 fail=9 expectGreen=false
M-E18 exit=1 tsc=0 fail=1 expectGreen=false
M-E22 exit=1 tsc=0 fail=1 expectGreen=false
M-E37b exit=1 tsc=0 fail=1 expectGreen=false
M-E38 exit=1 tsc=0 fail=3 expectGreen=false
M-E16'' exit=1 tsc=0 fail=1 expectGreen=false
MUT-10′@01 exit=1 tsc=0 fail=1 expectGreen=false
```

As sondas e saídas dos jurados caídos do ciclo 1 (roteiro P3) estão em disco, FORA do objeto, com o número de arquivos abaixo por pasta; a evidência da (a) no objeto tem as seções contadas abaixo e a da (c) só as linhas contadas, medido por: `cd C:/Users/AMP/erp-pausa-2026-10-03 && for d in jtrc02-a jtrc02-b jtrc02-c; do echo "$d $(ls $d | wc -l)"; done; echo "seções da evidência (a): $(git -C C:/Users/AMP/w-trc02 show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md | grep -c -i -E '^##')"; echo "linhas da evidência (c): $(git -C C:/Users/AMP/w-trc02 show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-c-evidencia.md | wc -l)"`
```
jtrc02-a 56
jtrc02-b 19
jtrc02-c 2
seções da evidência (a): 21
linhas da evidência (c): 13
```

As duas migrações do bloco estão no objeto com os carimbos renumerados (o carimbo previsto no plano v2 é o do B-SAN3-02, que já está na base), cada nome uma vez; no merge-base só existe a do B-SAN3-02, medido por: `cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only 42800d0dcece29c7e3a39476c9b40c917a66dfd0 prisma/migrations | grep -i -E '_vehicle_telemetry_events|_validate_receipt_message_kind_check|_invoice_complementary_title'; git ls-tree -r --name-only 7ab2fe71d0d40c2be51a790f0d20893651cdf972 prisma/migrations | grep -c -i -E '_vehicle_telemetry_events|_validate_receipt_message_kind_check|_invoice_complementary_title'`
```
prisma/migrations/20260878000000_invoice_complementary_title/migration.sql
prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql
prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql
1
```

A migração A do objeto é uma transação explícita (emenda v2.3): `BEGIN;` na linha 18, `COMMIT;` na 93 e o cabeçalho do rodapé `-- down` na 95, que nomeia a invocação `psql -v ON_ERROR_STOP=1 --single-transaction`; nenhuma das duas migrações tem `GRANT`, e `scripts/db-runtime-role.sh` não mudou desde o merge-base, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | tr -d '\r' | grep -n -i -E '^(BEGIN|COMMIT);|^-- down' | cut -c1-150; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | grep -c -i -E '\bGRANT\b'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql | grep -c -i -E '\bGRANT\b'; git diff --name-only 7ab2fe71d0d40c2be51a790f0d20893651cdf972 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- scripts/db-runtime-role.sh | wc -l`
```
18:BEGIN;
93:COMMIT;
95:-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>`:
0
0
0
```

As quatro suítes `-db` do bloco têm, contado o caso-sentinela de cada uma, 10, 7, 22 e 14 chamadas `test(` (9 + 6 + 21 + 13 = 49 casos de mérito); o G9 (drill) SAIU da suíte RLS, que cita "drill" uma única vez, no comentário do cabeçalho (linha 14) que aponta a casa nova; o drill vive agora em `tests/traccar-event-migration-drill-db.test.ts`, medido por: `cd C:/Users/AMP/w-trc02 && for t in traccar-event-rls-db traccar-event-migration-drill-db traccar-event-ingestion-db traccar-event-sample-db; do echo "$t $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:tests/$t.test.ts | tr -d '\r' | grep -c -i -E '^\s*test\(')"; done; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:tests/traccar-event-rls-db.test.ts | grep -c -i 'drill'`
```
traccar-event-rls-db 10
traccar-event-migration-drill-db 7
traccar-event-ingestion-db 22
traccar-event-sample-db 14
1
```

As quatro suítes estão no bloco `SUITES=` do job `backend-postgres` do `ci.yml` do objeto, e o comentário do bloco declara o total do job medido 3× no ramo integrado: 463/463 (o corpo desta cadeira, escrito antes, diz 434), medido por: `git -C C:/Users/AMP/w-trc02 show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.github/workflows/ci.yml | tr -d '\r' | grep -n -i -E 'SUITES=.*traccar-event|medido 3× no ramo integrado' | cut -c1-130`
```
298:          # 0 pulo, denominador constante; o drill leva ~2 min. Total do job, medido 3× no ramo integrado: 463/463, 0 pulo.
299:          SUITES="$SUITES tests/traccar-event-ingestion-db.test.ts"
300:          SUITES="$SUITES tests/traccar-event-sample-db.test.ts"
301:          SUITES="$SUITES tests/traccar-event-rls-db.test.ts"
302:          SUITES="$SUITES tests/traccar-event-migration-drill-db.test.ts"
```

O literal do inventário de DML do papel de runtime (T14a/b, linha 1016 de `tests/san3-05-runtime-role-guard-db.test.ts`) é 118 no merge-base e 119 no objeto (emenda v2.2, R-S2), medido por: `cd C:/Users/AMP/w-trc02 && git show 7ab2fe71d0d40c2be51a790f0d20893651cdf972:tests/san3-05-runtime-role-guard-db.test.ts | tr -d '\r' | sed -n '1016p' | grep -o -i -E '\|1[01][0-9]\$'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:tests/san3-05-runtime-role-guard-db.test.ts | tr -d '\r' | sed -n '1016p' | grep -o -i -E '\|1[01][0-9]\$'`
```
|118$
|119$
```

Dos 15 arquivos de teste do Traccar que existiam no merge do B-TRC-01, 6 mudaram até o objeto (os 5 arnês `-db` e o contrato da posição, caso §9.4) e 9 estão byte a byte iguais, medido por: `cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only c1485c94f3e99a33f5b8f6aec96a12bc922a237e tests | grep -c -i -E 'traccar'; git diff --numstat c1485c94f3e99a33f5b8f6aec96a12bc922a237e 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- $(git ls-tree -r --name-only c1485c94f3e99a33f5b8f6aec96a12bc922a237e tests | grep -i -E 'traccar')`
```
15
1	0	tests/traccar-binding-uniqueness-db.test.ts
1	1	tests/traccar-idempotency-db.test.ts
2	1	tests/traccar-position-contract.test.ts
1	0	tests/traccar-position-ingestion-db.test.ts
1	1	tests/traccar-quarantine-db.test.ts
1	1	tests/traccar-resolution-race-db.test.ts
```

A emenda v2.4 mudou o ratchet de acessos de plataforma do B-SAN3-05 (2 hunks: o mapa `NOVAS` e o literal L0, agora `ENABLE=112 FORCE=112`) e o serviço de ingestão (`5 4` de `<objeto>~5~5` ao objeto do ciclo 1, `<objeto>~5`: a instanciação morta do evento; o ciclo 2 mexeu de novo no mesmo arquivo, em `phaseTwoSteps`, medido acima), sem tocar gerador, fixtures, `src/database/rls.ts` nem `scripts/db-runtime-role.sh`; a emenda dá a esta cadeira a leitura dos motivos do `NOVAS` e o controle C5, que o relatório do dev declara não medido por ele, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:tests/san3-05-acessos-de-plataforma-guard.test.ts | tr -d '\r' | grep -n -i -o -E 'tabelas ENABLE=112 FORCE=112'; git diff --numstat 7ab2fe71d0d40c2be51a790f0d20893651cdf972 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- tests/san3-05-acessos-de-plataforma-guard.test.ts; git diff 7ab2fe71d0d40c2be51a790f0d20893651cdf972 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- tests/san3-05-acessos-de-plataforma-guard.test.ts | grep -c -i -E '^@@'; git diff --numstat 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5~5 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 -- src/integrations/traccar/traccar-ingestion.service.ts; git diff --stat 7ab2fe71d0d40c2be51a790f0d20893651cdf972 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- scripts/san3-05-acessos-de-plataforma.mjs tests/fixtures/san3-05-mutacoes src/database/rls.ts scripts/db-runtime-role.sh | wc -l; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.4-acessos.md | tr -d '\r' | grep -n -i -o -E 'a cadeira \(a\) lê os 7 motivos um a um|o atribui à cadeira \(a\)'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-dev.md | tr -d '\r' | grep -n -i -o -E 'C5 não foi medido por mim'`
```
287:tabelas ENABLE=112 FORCE=112
29	3	tests/san3-05-acessos-de-plataforma-guard.test.ts
2
5	4	src/integrations/traccar/traccar-ingestion.service.ts
0
151:a cadeira (a) lê os 7 motivos um a um
509:C5 não foi medido por mim
```

O parecer do DBA (`dba-trc02-opus`) NÃO está no objeto: vive fora dele, em `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md`, com veredito final FAVORÁVEL na rodada 2, sobre `<objeto>~5~5` (o commit da emenda v2.3, cinco commits antes do objeto do ciclo 1); de lá ao objeto do ciclo 2 nenhum caminho de `prisma/` mudou (o ciclo 2 também não toca `prisma/`), medido por: `grep -n -i -o -E 'Veredito final \(rodada 2|FAVOR.{1,3}VEL\*\* — D1, R1 e R2 fechados|^\*\*FAVOR.{1,3}VEL\.\*\* D1, R1 e R2' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-dba-parecer.md; cd C:/Users/AMP/w-trc02 && git ls-tree -r --name-only 42800d0dcece29c7e3a39476c9b40c917a66dfd0 | grep -c -i 'B-TRC-02-dba'; git log -1 --format=%s 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5~5 | cut -c1-70; git diff --name-only 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5~5 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- prisma | wc -l`
```
3:Veredito final (rodada 2
3:FAVORÁVEL** — D1, R1 e R2 fechados
176:**FAVORÁVEL.** D1, R1 e R2
0
fix(traccar): migração A como transação explícita, down com guard
0
```

A decisão do dono `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` está no objeto: toda migração nova com mais de uma sentença e apenas DDL transacional leva `BEGIN;`/`COMMIT;` e drill por prefixo; `CONCURRENTLY` fica sozinho e declara a não-atomicidade. O guard de CI ainda pertence a bloco de ferramenta a nomear, e migrações antigas seguem na pendência declarada, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-MIGRACAO-COM-TRANSACAO-EXPLICITA|A regra:.*migração nova|Exceção:.*CONCURRENTLY|Guard de CI:'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA|status:\*\* ABERTA' | tail -2`
```
3875:- **`D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"3=aprovo"***, à regra geral recomendada pelo planejador do `B-TRC-02` (emenda v2.3) depois de a mesma classe de defeito aparecer em dois blocos seguidos (`B-SAN3-02` C2-01 e `B-TRC-02` D1).
3876:  - **A regra:** toda migração nova com mais de uma sentença, e só de DDL transacional, leva `BEGIN;`/`COMMIT;` no próprio arquivo e um drill por prefixo (falha injetada após cada sentença, pelo `prisma migrate deploy` real).
3877:  - **Exceção:** migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.
3878:  - **Guard de CI:** um guard reprova migração nova que viole a regra. Ele é implementado por um bloco de ferramenta (regra (1) de `D-GOV-PROPORCIONAL`), dono a nomear; até lá, vale como regra do planejador e do DBA. As migrações antigas seguem pela `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`.
11602:## P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA
11604:status:** ABERTA
```

A variante do código é Q1 = NÃO (decisão do dono de 19/10, `D-TRC02-Q1-NAO`, no `decisoes.md` do objeto, linha na saída); a cópia `docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md` NO OBJETO traz a seção "Revisão da Q1 pelo dono" ("TRC-02 Q1 = Não"), alinhada ao arquivo fora do repositório; a migração A do objeto não tem `fix_key` nem `position_sample`, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-TRC02-Q1-NAO. \(decisão do dono, 2026-10-19|"TRC-02 Q1 = Não"'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md | tr -d '\r' | grep -c -i -E 'Q1 *= *N.{1,3}O'; grep -n -i -o -E '^## Revis.{1,3}o da Q1 pelo dono|"TRC-02 Q1 = N.{1,3}o"' C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-respostas-do-dono.md; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql | grep -c -i -E 'fix_key|position_sample'`
```
3824:D-TRC02-Q1-NAO` (decisão do dono, 2026-10-19
3824:"TRC-02 Q1 = Não"
1
9:## Revisão da Q1 pelo dono
11:"TRC-02 Q1 = Não"
0
```

O critério C-10 do plano v2 guarda o evento de viatura sem despacho, e a decisão do dono `D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` escolhe a opção A: guardar o evento para a viatura sem pessoa; guardar não é exibir. O corpo da cadeira C já exige E8 com 204 e uma linha e veta recusar ou quarentenar o evento. A pendência de LGPD continua sendo sobre a exibição futura no B-TRC-04, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:docs/revisoes/TRACCAR/B-TRC-02-plano.md | tr -d '\r' | grep -n -i -E '^\| C-10 \|' | cut -c1-140; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -E 'D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA|A decisão.*opção A.*guardar|O código já se comporta assim'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -o -E '^## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO|bloqueia:\*\* o início do .B-TRC-04'`
```
696:| C-10 | Evento não exige operador: viatura vinculada sem despacho → 204 e linha (guardar ≠ exibir; `P-TRC02-LGPD-TELEMETRIA-SEM-DE
3871:- **`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"1=a"***, em resposta à pergunta do orquestrador sobre o C-10, feita junto com o NÃO da Q1, como manda o §Q1.6 do plano.
3873:  - **A decisão:** opção A, **guardar**.
3874:  - **Efeito:** o evento fica gravado para a viatura, sem pessoa. Nenhuma tela o exibe; exibir fica para o `B-TRC-04`, sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`. O código já se comporta assim (C-10/E8 do plano v2), e nada muda.
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
11509:## P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO
11514:bloqueia:** o início do `B-TRC-04
```

Os três corpos das cadeiras existem no objeto e, descontados o frontmatter e o bloco de adaptação Codex do espelho, são IDÊNTICOS entre `.claude/agents/especialistas/` e `.agents/agents/especialistas/` (comparação EOL-neutra; o arquivo inteiro DIFERE por construção do espelho, e por isso não se publica hash); nenhum deles menciona as emendas v2.3 e v2.4, o drill novo ou os casos T-M, porque o único commit que os tocou é o registro das 05:55 de 20/10; os arquivos de especialistas são byte a byte os do objeto do ciclo 1 (nenhuma fábrica no ciclo 2); os corpos citam a M-E16′ (linhas por corpo abaixo), que o ciclo 2 tirou do catálogo; o corpo da cadeira C exige E8 (evento de viatura sem despacho resulta em 204 e uma linha) e trata C-10 como guardar, medido por: `cd C:/Users/AMP/w-trc02 && for c in a-banco-rls-arnes b-superficie-escopo-registro c-contrato-evento-unidades; do diff <(git show "42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "42800d0dcece29c7e3a39476c9b40c917a66dfd0:.agents/agents/especialistas/jurado-trc02-$c.md" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; echo "menções a v2.3/v2.4/drill/T-M: $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/especialistas/jurado-trc02-$c.md | grep -c -i -E 'v2\.3|v2\.4|migration-drill|T-M\(')"; echo "linhas que citam M-E16: $(git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/especialistas/jurado-trc02-$c.md | grep -c -i -E 'M-E16')"; done; git diff --quiet 42800d0dcece29c7e3a39476c9b40c917a66dfd0~5 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- .claude/agents/especialistas .agents/agents/especialistas && echo 'especialistas iguais aos do objeto do ciclo 1'; git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:.claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | tr -d '\r' | grep -n -i -E 'E8\. Viatura vinculada|Evento de viatura sem despacho recusado'; git log --format='%ad %s' --date=format:'%m-%d %H:%M' 42800d0dcece29c7e3a39476c9b40c917a66dfd0 -- .claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md .claude/agents/especialistas/jurado-trc02-b-superficie-escopo-registro.md .claude/agents/especialistas/jurado-trc02-c-contrato-evento-unidades.md | cut -c1-60`
```
IDENTICO corpo a-banco-rls-arnes
menções a v2.3/v2.4/drill/T-M: 0
linhas que citam M-E16: 3
IDENTICO corpo b-superficie-escopo-registro
menções a v2.3/v2.4/drill/T-M: 0
linhas que citam M-E16: 3
IDENTICO corpo c-contrato-evento-unidades
menções a v2.3/v2.4/drill/T-M: 0
linhas que citam M-E16: 16
especialistas iguais aos do objeto do ciclo 1
497:- Evento de viatura sem despacho recusado ou levado à quarentena: `bloqueia`, `não grave` (C-10 é objetivo do bloco).
10-20 05:55 docs(registro): B-TRC-02 — a Q1 revista pelo d
```

A pré-revisão Gemini Flash (`prerev-trc02-flash`, 2º revisor; subsídio, nunca insumo de voto) mediu um head ANTERIOR às emendas v2.3 e v2.4 (zero menções a elas ou ao drill) e escreveu "Nada achado" nas suas seções; o ciclo 2 não teve pré-revisão, medido por: `grep -c -i -E 'v2\.3|v2\.4|migration-drill' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md; grep -c -i 'Nada achado' C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-TRC-02-prerevisao-flash.md`
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

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no objeto, medido por: `git -C C:/Users/AMP/w-trc02 show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
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

O parecer do porteiro do PR 426 (B-TRC-01), insumo do briefing pelo §10 (iv) do plano v2, está no objeto com o veredito abaixo; é A RE-VERIFICAR, nunca afirmação herdada, medido por: `cd C:/Users/AMP/w-trc02 && git show 42800d0dcece29c7e3a39476c9b40c917a66dfd0:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md | tr -d '\r' | grep -n -i -o -E '\b(LIBERADO COM RESSALVA|BLOQUEADO)\b' | head -3`
```
72:LIBERADO COM RESSALVA
```

## HIPOTESE

Você é `jurado-trc02-c2-a-pro`, identidade nova, executor Gemini CLI pela API, com a chave do agente (`run-gemini-visivel.ps1 -Model gemini-3.1-pro-preview`), teto de US$ 5 por disparo, modelo `gemini-3.1-pro-preview` (nível menor declarado: o Gemini Pro equivale ao nível menor, §C7.6, `D-GEMINI-PRO-NIVEL-CODEX`, e entra pela API com teto, `D-GEMINI-PRO-API-TETO`); o seu corpo canônico é `.claude/agents/especialistas/jurado-trc02-a-banco-rls-arnes.md` no blob do objeto NOVO (o nome do corpo é o da cadeira, não o seu nome de sessão). COMPOSIÇÃO FINAL do ciclo 2, declarada (decisão do orquestrador de 24/10, sob a ordem do dono "use o Argon" e o pedido de pressa; troca a tabela do §4 do plano do ciclo 2): inspetor `insp-trc02-c2-argon` e cadeira (b) `jurado-trc02-c2-b-argon` no Antigravity `gemini-4-argon` — o mesmo modelo com identidades distintas, e o inspetor não julga mérito; cadeira (a) `jurado-trc02-c2-a-pro` no Gemini CLI pela API, `gemini-3.1-pro-preview`, teto de US$ 5 por disparo; cadeira (c) `jurado-trc02-c2-c-opus` em Claude Opus, subagente do orquestrador (o Codex está em limite de uso; regra do dono de 24/10: o Claude cobre braço que caiu por limite), a cadeira não-Gemini da junta, com veto na unanimidade; dev `dev-trc02-c2-argon` no Argon (o mesmo modelo da (b) e do inspetor, identidades distintas, declarado na ata — R6 do plano do ciclo 2). São 3 executores nas 3 cadeiras, nenhum revisor único, unanimidade com veto; duas das três cadeiras são da família Gemini, e a leitura de `D-GEMINI-SEGUNDO-REVISOR` ("nunca revisor único") que sustenta isso é do orquestrador, declarada para a ata. O Claude só cobre esgotamento, declarado (neste ciclo, já: estes mandatos, escritos por `redator-trc02-c2-opus`, Claude Opus, cobrindo o `redator-trc02-c2-sol` em limite de uso, e a cadeira (c), no lugar do Codex); o topo é do Claude (`D-TOPO-E-O-CLAUDE`, medida acima). Esgotamento: teto do disparo ou cota da API esgotados (ou 429, fila parada) — termine o comando em curso, grave `## PAUSA <hora UTC>` na evidência (P7) e pare SEM votar; o orquestrador lança um sucessor em Claude Opus, subagente com identidade nova e `model: "opus"` explícito, que re-executa o seu roteiro (P3), com a substituição declarada no artefato e na ata; Opus esgotado: PARA (§C7.6-bis). Na primeira linha de `cadeira-a-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) e o veredito IDENTICO/DIVERGE do corpo que você carregou contra o blob do objeto, EOL-neutro (nunca `md5sum` cru sob `core.autocrlf=true`). Se o seu nome coincidir com algum inelegível do mandato do inspetor, pare. O plano v2, as emendas v2.1 a v2.4, as respostas do dono, o relatório do dev (com a seção do ciclo 2), o parecer do DBA (fora do objeto), a pré-revisão Flash (subsídio, nunca insumo de voto), o parecer do porteiro do PR 426 (`agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md`, no objeto; §10 (iv) do plano v2), o plano do ciclo 2 (`docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md`), a ata e a reprovação do ciclo 1 são **A RE-VERIFICAR**: no voto, o campo `dba_guardiao` nomeia cada convergência e cada divergência com o parecer do DBA (§A2), derruba com: `head -1 C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md | grep -i -E 'executor|gemini-3.1-pro|mandato_md5|IDENTICO|DIVERGE'`

A legalidade vem antes do mérito: parecer `insp-trc02-c2-parecer.md` do inspetor `insp-trc02-c2-argon` com LIBERADO ou LIBERADO COM RESSALVA nomeando você, seu executor, seu worktree e seu terreno de banco; o objeto continua sendo o head do PR 454 colado acima, com todos os check-runs concluídos (head que andou bloqueia o início). Régua: bloco de ingestão do Traccar = junta de SEGURANÇA, unanimidade de 3 com veto (§C7 item 8(1)(4)); ciclo 2 = o ÚLTIMO em que todo `bloqueia` com escopo `dentro-do-bloco` reprova, grave ou não (§C7 item 8(2)); a partir do ciclo 3 só bloqueia defeito de produto grave. O parecer do DBA é obrigatório e não é 4ª cadeira; migração destrutiva é parada irredutível (§C7.5), não voto. Todo achado declara gravidade, classe, escopo, N e forma; `pre-existente` exige evidência de origem ou data e pendência com dono (§C7.1-ter(a)) e não reprova; escopo sem evidência conta como `dentro-do-bloco`; "não consigo medir" item seu é REPROVADO; não proponha correção (§C7.4-bis), não reabra decisão do dono (Q1 = NÃO, Q2 = SIM, Q3 = SIM, C-10 = opção A guardar, `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`) sem efeito novo, não cobre KPI (§C7 item 8(5)) nem matéria das cadeiras (b) e (c), e não abra os votos delas antes de gravar o seu; o voto declara `arquivos_medidos` (§C7 item 9 (0)) e o campo `objeto` igual ao `git ls-remote origin refs/heads/feat/traccar-b-trc-02` no fim. NOTA C-10: o evento de viatura sem despacho é GUARDADO por decisão expressa do dono em 21/10 (`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA`); guardar não é exibir. Julgue o objeto e a migração conforme as decisões medidas acima e registre-as no voto, derruba com: `grep -i -E 'legalidade|A RE-VERIFICAR|gravidade|classe|escopo|dba_guardiao|arquivos_medidos|objeto|C-10|D-MIGRACAO' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-voto.json`

§C7 item 9 e roteiro P3: o ciclo 1 não deixou voto seu a carregar — a cadeira (a) do ciclo 1 (`jurado-trc02-a-opus`) caiu com o voto EM APURAÇÃO (quedas medidas acima) —, logo esta cadeira é REFEITA do zero no objeto novo, com a régua do ciclo 2. A evidência dela no objeto (`agent-orchestration/omega/juntas/votos/B-TRC-02/cadeira-a-evidencia.md`, seções contadas acima) e as sondas em disco (`C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/`, arquivos contados acima) são ROTEIRO de re-execução barata, nunca conclusão herdada: copie as sondas para a sua pasta, confira cada uma contra o hash registrado na evidência antes de rodar (sonda alterada é sonda nova, não roteiro), re-execute cada comando registrado sobre o objeto NOVO (não sobre `<objeto>~5`), compare a saída com a registrada e só então meça a cauda que a cadeira caída declarou faltar (o `runtime-role` do B-SAN3-05, o guard 8, a aditiva com recibos `position`, o parecer do DBA e o T-M sob as M-E5x). Saída divergente se mede de novo; o que a evidência concluiu sem comando visível NÃO é insumo, inclusive parcial favorável. A ata registra, por cadeira, `refeita` e o que você re-executou × mediu de novo, derruba com: `grep -i -E 'item 9|refeita|P3|roteiro|re-execut|jtrc02-a|cauda|runtime-role|guard 8|T-M' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

DIVERGÊNCIA corpo × objeto, registrada pelo §A2 e não consolidada em silêncio: o seu corpo foi escrito antes das emendas v2.3 e v2.4 e não mudou no ciclo 2 (medido acima). Vale o corpo para o MÉTODO (sonda própria, B povoada, vermelho-controle, classes) e valem as emendas e o plano do ciclo 2 para o ALVO, nestes pontos: (i) o drill não é mais o G9 da suíte RLS (que tem 9 casos de mérito, medido acima), e sim `tests/traccar-event-migration-drill-db.test.ts` (T-M(a) a T-M(f), k = 1..17), com a migração A em `BEGIN;`/`COMMIT;` e o rodapé `-- down` com a guarda em 1º; (ii) o total do `backend-postgres` é o 463 do comentário do `ci.yml`, não o 434 do corpo; (iii) o parecer do DBA não está no objeto, e sim no arquivo de fora (medido acima), com rodada 2 sobre `<objeto>~5~5` (o commit da emenda v2.3) e nenhum caminho de `prisma/` mudado desde então; (iv) a emenda v2.4 dá a esta cadeira os motivos do mapa `NOVAS` (recusáveis um a um) e o controle C5; (v) do ciclo 2: o corpo cita a `M-E16′`, ancorada na closure `quarantined()`, que saiu do catálogo; vale o corpo para a PROPRIEDADE (a quarentena nunca guarda amostra) e o catálogo do objeto para a ÂNCORA, a `M-E16″` no passo 5 (medido acima); (vi) `phaseTwoSteps` perdeu `let binding`/`locked` (numstat `5 7`, medido acima), sem mudança de comportamento declarada pelo plano do ciclo 2 — as suítes `-db` da posição verdes no objeto novo são a sua prova; (vii) o merge-base é o novo (medido acima), e o merge da `main` não toca `src/`, `tests/` nem `prisma/`. Registre na evidência como mediu cada ponto, derruba com: `grep -i -E 'divergência|T-M|463|NOVAS|C5|v2\.3|DBA|M-E16|phaseTwoSteps|merge-base' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

Terreno (plano do ciclo 2 §4.3): worktree exclusivo `C:/Users/AMP/w-jt2c2-a`, no objeto, com `npm ci` próprio e zero junction de `node_modules` (§C7.1-ter(c)), removido só por `git worktree remove --force` depois de conferir que nenhum processo o usa (o corpo sugere `C:/Users/AMP/w-jt2a`; vale este). Postgres 16 e Redis 7 DESCARTÁVEIS seus, contêineres `jt2c2-a-pg` e `jt2c2-a-redis` (rede com o prefixo `jt2c2-a-`) e bases `jt2c2_a_<caso>`, publicados só em `127.0.0.1` numa porta alta testada antes; se usar `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh` (ID fixo `tl<epoch><pid>`, medido acima), copie-a para `C:/Users/AMP/erp-pausa-2026-10-03/jt2c2-a/` com o ID trocado para `jt2c2-a-tl<n>` e publique o diff. Antes de cada subida, de cada `npm ci` e de cada rodada: memória de commit livre de pelo menos 4 GB (P8), no máximo 2 trabalhos Docker na máquina contando o seu (excluídos os `erp-*`) e disco de pelo menos 10 GB; faltando qualquer um, espere com `sleep` limitado. Nunca a base viva (`erp-postgres`, `erp-redis`) nem as portas 5432, 6379, 3000, 5173, 5050 e 8899; nunca os servidores públicos de demonstração do Traccar; nunca `prune` nem contêiner alheio. Sondas e scripts em `C:/Users/AMP/erp-pausa-2026-10-03/jt2c2-a/`, fora do worktree, com md5 e sem segredo; a pasta `C:/Users/AMP/erp-pausa-2026-10-03/jtrc02-a/` do ciclo 1 não se escreve. Variante de migração é CÓPIA num diretório temporário de migrações (nunca o arquivo real); mutação em arquivo real só no seu worktree, uma por vez, com âncora única e prova de aplicação (CRLF incluso), restauro provado por `git hash-object <arquivo>` igual a `git rev-parse <objeto>:<arquivo>`; teardown só do que é seu, com 0 resíduo do prefixo provado no fim, derruba com: `grep -i -E 'w-jt2c2-a|jt2c2-a-|jt2c2_a_|junction|erp-|commit livre|4 GB|127.0.0.1|5432|6379|3000|5173|5050|8899|hash-object|teardown' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

Item 1 de 3 (isolamento por construção; item 1 do corpo, com a emenda v2.2 R-S2, a v2.3 no lugar do G9 e a v2.4): prove por execução, sob papel `NOSUPERUSER NOBYPASSRLS` e com o GUC: (a) a suíte RLS do objeto 9/9 de mérito, E13/E19 de `tests/traccar-event-ingestion-db.test.ts` e F8/F11 de `tests/traccar-event-sample-db.test.ts`, `skipped 0`; (b) a sua sonda com a organização B POVOADA sob o GUC de B, entregando pelo serviço do objeto um evento de cada `kind`, uma posição com atributos, a posição com atributos cheios FORA do despacho (só `quar` muda, 0 recibo, 0 `sample`), `tenantId` forjado nos atributos, a entrega repetida e o dispositivo não mapeado, com a tabela `entrega | desfecho | A | B | B igual ao semeado`; (c) `EXPLAIN (VERBOSE)` de `latestDeviceStatus`, de `latestIgnition` e do INSERT do evento sob o papel do runtime mostrando o filtro de política, e `42501` no INSERT com outra organização sob o GUC de A; (d) a FK de 4 colunas recusando V1×V2 e o vínculo trocado com `23503`, `relforcerowsecurity`, `pg_rules` 0, `prosecdef` igual ao de uma base em `B`, o guard do runtime com 0 escape, o inventário de DML do runtime como diferença de CONJUNTOS entre `B` e o objeto (esperado exatamente `{vehicle_telemetry_events}`, literal 118 → 119 medido acima) com um evento entregue sob o papel do runtime gravando 1 linha, e nenhum `GRANT`; (e) a migração A atômica pelo CLI REAL, com injeção PRÓPRIA (não a do T-M(e)): numa base sua no nível de `B`, cópia da A num diretório temporário com uma sentença que falha depois da k-ésima (k = 1..17), rodada por `npx prisma migrate deploy` com `--config` temporário, catálogo igual ao de antes em todo k, e convergência por `migrate resolve --rolled-back` + deploy com `migrate status` em dia; o down pela invocação do cabeçalho nas pontas A (volta ao catálogo de `B`, re-up converge, `_prisma_migrations` sem as duas do bloco e com a do B-SAN3-02) e B (para na guarda com `22P02` sem apagar nada); o upgrade de uma base em `B` aplicando exatamente as 2 migrações do bloco; e `tests/traccar-event-migration-drill-db.test.ts` 6/6 três vezes. Leia os motivos das chaves novas do mapa `NOVAS` um a um contra o código (cada uma roda sob o GUC de `withTenantRlsBudget`?) e recuse o que não se sustentar; rode o caso de `listByVehicle` sob os GUCs de A e de B. Vermelho-controle: B vista sob o GUC de B; o `EXPLAIN` por papel seu com `BYPASSRLS` sem o filtro; M-E40 e M-E23 vermelhas em banco novo; o seu contador de DML acusa um `REVOKE` seu; M-E51, M-E51b e M-E51c vermelhas pela sua injeção E pelo T-M(e), M-E52, M-E53 (pelo comportamento do T-M(c), não só pela forma; o dev registrou que o vermelho dele veio da forma) e M-E54h; a sua injeção aplicada depois do `COMMIT` deixa as 17 sentenças aplicadas (prova de que injeta), derruba com: `grep -i -E 'Item 1|9/9|canário|EXPLAIN|42501|23503|FORCE|pg_rules|prosecdef|119|GRANT|injeção própria|k=17|--config|resolve --rolled-back|22P02|ponta A|ponta B|NOVAS|listByVehicle|M-E40|M-E23|M-E51|M-E52|M-E53|M-E54h|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

Item 2 de 3 (idempotência sob corrida, a amostra que não derruba e a Q1 ausente do banco; item 2 do corpo, com a v2.4 C5): prove E4 20× com barreira (por rodada 1 recibo `event`, 1 linha, 204 nas duas) e M-E10/M-E14 vermelhas; um só helper de savepoint com a lista fechada `{23514, 22003}` importada do módulo do objeto e um único `ROLLBACK TO SAVEPOINT vehicle_sample`; F9, F9′, F10 e F12 e uma forma PRÓPRIA de SQLSTATE fora da lista (por exemplo `23505` pela unicidade da amostra por recibo) relançando → 503 com nada gravado, sem `25P02` em caso nenhum; M-E31, M-E32, M-E46, M-E47 e M-E48 vermelhas; G8 com o CHECK do recibo exatamente `{'position','event'}`, `'position_sample'` recusado com `23514` e `convalidated = true`, e M-E26; a Q1 = NÃO no banco: 0 `fix_key`/`position_sample` no catálogo, no blob (0 na migração A, medido acima) e na árvore de testes, e a mesma posição sem despacho com atributos cheios entregue 2× com 1 item de quarentena (`delivery_count 2`), 0 recibo e 0 `sample`. Meça o controle C5 da emenda v2.4 §3, que o dev declarou não medido: no seu worktree, `insertVehicleSample` passando o client raiz ao `insertSample` deixa `tests/traccar-event-sample-db.test.ts` vermelho sob o papel sem bypass (o INSERT sem GUC recusado pelo `WITH CHECK`), com restauro provado. Vermelho-controle: M-E10 nas 20 rodadas; o logger-espião conta 1 `sample_discarded` em F10 e 1 `failed before commit` em F12(a); a releitura `::text` acusa um valor trocado; a busca de resíduo acusa uma coluna `fix_key` criada à mão num banco de CONTROLE seu, derruba com: `grep -i -E 'Item 2|E4|20×|barreira|23514|22003|F9|F10|F12|25P02|M-E10|M-E14|M-E31|M-E32|M-E46|M-E47|M-E48|G8|position_sample|M-E26|fix_key|delivery_count|C5|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

Item 3 de 3 (CI, regressão e o arnês do 01; item 3 do corpo, com o total da v2.4): prove a forma do job `backend-postgres` do `ci.yml` do objeto três vezes em contêiner Linux seu, com `fail 0`, `skipped 0` e denominador constante e igual ao do comentário (463, medido acima), e as quatro suítes do bloco na lista `SUITES=`; leia a forma `backend` no check-run do objeto (o `npm test` inteiro em contêiner já derrubou a VM duas vezes neste bloco; localmente, só arquivo a arquivo, e queda de VM é infraestrutura, não achado), com o T9 do censo, T14a/b e o ratchet de acessos (35/35) verdes; `telemetry.test.ts` 17/17; os 9 arquivos de teste do 01 iguais aos do merge do B-TRC-01 e os 5 arnês pela régua R3-1 (medido acima: 6 mudaram, 5 arnês e o contrato da posição); M-E43 e M-E49 vermelhas. Se o 503 concorrente pré-existente de `traccar-idempotency-db` aparecer, re-meça a mesma forma em `B` com N e forma antes de classificá-lo `pre-existente`. Vermelho-controle: M-CI1 (uma suíte do bloco fora de `SUITES=` muda o denominador); o seu leitor de TAP acusa um `skipped` fabricado, derruba com: `grep -i -E 'Item 3|backend-postgres|463|skipped 0|SUITES|check-run|T9|T14|35/35|telemetry|17/17|R3-1|M-E43|M-E49|M-CI1|pre-existente|vermelho' C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `cadeira-a`: evidência em `cadeira-a-evidencia.md` após CADA item; `cadeira-a-voto.json` nasce esqueleto com os três itens EM APURAÇÃO e o campo `arquivos_medidos`, cada item gravado ao ser medido, e fecha antes da mensagem final de 1 linha; sucessor de identidade nova re-executa os comandos registrados e só então mede a cauda; três itens exatos; PAUSA grava head, feito, falta, próximo comando e arquivos meio-escritos e para. Queda vai a `00-quedas.md` deste diretório (P6, pelo orquestrador); no máximo 2 jurados em paralelo (P5). Únicos outputs no repositório: `cadeira-a-evidencia.md` e `cadeira-a-voto.json` em `C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/`; nunca commit, derruba com: `test -f C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/cadeira-a-voto.json`

## MEDIDO

Pré-voo deste mandato com as ferramentas copiadas sem mudança da pasta do ciclo 1 (as do ramo `origin/chore/mandato-refs-e-preflight`, com a única adaptação do ciclo 1: a linha 211 do `mandato-preflight.sh`, `RAIZ=C:/Users/AMP/w-trc02`) para a pasta própria do redator `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`, executado com o cwd no worktree do objeto; o redator é `redator-trc02-c2-opus` (Claude Opus, nível menor declarado), que cobre o `redator-trc02-c2-sol` (Codex), em limite de uso; o `sed` troca, nos AVISOs, o número de migração pelo marcador `<corrida>` e o caminho dela pelo marcador `<migracao>` (o número solto fora do caminho seria cobrado como SHA) e troca o nome do campo reservado da ferramenta, que o AVISO do ec 3 do `mandato-refs.sh 454` repete, pelo marcador `<campo reservado da ferramenta>` (o nome do campo é token reservado fora da colagem, checagem 7), medido por: `cd C:/Users/AMP/w-trc02 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-preflight.sh C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/00-mandatos/cadeira-a.md 454 2>&1 | sed -E -e "s#prisma/migrations/2026[0-9]+_[a-z_]+/(migration[.]sql)?#<migracao>#g" -e "s#'2026[0-9]+'#'<corrida>'#g" -e "s#approved_he[a-a]d#<campo reservado da ferramenta>#g"; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-22: refs do PR #454 confere com a saida atual
COLAGEM    l.37-56: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.129
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.130
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.131
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.135
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.135
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '<corrida>' em <migracao> — l.211
AVISO      <campo reservado da ferramenta> NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/mandato-refs.sh 454' para ver o que a ferramenta viu.

PRE-VOO OK — C:/Users/AMP/w-trc02/agent-orchestration/omega/juntas/votos/B-TRC-02-ciclo2/00-mandatos/cadeira-a.md
ec=0
```
