# B-TRC-02 — relatório incremental do dev (eventos e telemetria veicular do Traccar)

> **Identidade:** `dev-trc02-opus` (NOVA). **Modelo:** Claude Opus 5.5 (`claude-opus-5-5`), nível menor declarado (§C7.6),
> cobrindo o Codex (ocupado). Não planejou, não criticou e não vota neste bloco.
> **Norma única:** plano v2 (`docs/revisoes/TRACCAR/B-TRC-02-plano.md`, cópia de `erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`)
> + emenda v2.1 (`B-TRC-02-emenda-v2.1.md`; onde muda a v2, prevalece). Respostas do dono: `B-TRC-02-respostas-do-dono.md`.
> **Worktree:** `C:/Users/AMP/w-trc02`, ramo `feat/traccar-b-trc-02`, head de partida `bf83cda8a9acdc92f05f29397d1860bed9be5388`.
> **Formato:** comando → saída resumida → veredito, por passo (P1). Seções `EM APURAÇÃO` ainda não medidas.

## Emendas do orquestrador (registradas conforme v2 §8 gate 3: "senão renumerar e anotar")

- **EO-1 (carimbos):** o carimbo `20260878000000` foi tomado pelo B-SAN3-02 (`20260878000000_invoice_complementary_title`, em
  revisão, mergeia antes). As migrações deste bloco ficam:
  - A = `prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql`
  - B = `prisma/migrations/20260880000000_validate_receipt_message_kind_check/migration.sql`
  Toda referência do plano (rollback, `_prisma_migrations`, testes G, M-E31/35/40, M-Q1-03/09, inspetor item (ii)) usa os nomes novos.
- **EO-2 (terreno Docker):** contêineres/redes com prefixo `dtrc02-` (cópia local do `teste-linux.sh` com `ID="dtrc02-…"`); ≤ 2 trabalhos
  Docker na máquina; memória de commit livre ≥ 3 GB medida antes de subir.

## Passo 0 — gate (§8, com R2-1 da emenda) e baseline

Medido em 2026-10-19, ref `origin/main` = `bf83cda8a9acdc92f05f29397d1860bed9be5388` (`git fetch -q origin` antes).

| # | Comando | Saída resumida | Veredito |
|---|---|---|---|
| 1 | `git cat-file -e origin/main:src/integrations/traccar/traccar-ingest.app.ts && git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md && echo ok` | `ok` | verde |
| 2 | `git diff --name-only 3fbcaea2 origin/main -- src/integrations/traccar src/modules/telemetry prisma docker-compose.traccar.yml infra/traccar 'scripts/traccar-*.mjs' 'tests/traccar-*.test.ts' .github/workflows/ci.yml tests/db-catalog-write-guard.test.ts | wc -l` | `0` | verde (nada do PERMITIDO mudou desde a ref do plano) |
| 3 | `git ls-tree -r --name-only origin/main prisma/migrations | grep -c -E '2026087[89]|20260880'` | `0`; última da ref = `20260877000000_backfill_work_order_assignment_from_active_dispatches`. O `20260878000000` está reservado ao B-SAN3-02 (em revisão, ramo `fix/faturamento-atomico-e-delta`) | renumerado pela **EO-1**: A = `20260879000000`, B = `20260880000000` |
| 4 | fixture real de evento | ver Passo 3 | (passo 3) |
| 5 | baseline N (abaixo) | 149 executados | ver abaixo |
| 6 | `df -h /c` → 18G livres; `docker ps --format '{{.Names}}' | grep -v '^erp-'` → vazio; `Get-CimInstance Win32_OperatingSystem` → FreePhys 7,10 GB, FreeVirtual 8,84 GB; `git worktree add C:/Users/AMP/w-trc02 -b feat/traccar-b-trc-02 origin/main` → head `bf83cda8`; `timeout -k 30 900 npm ci` → `added 326 packages`, ec 0; `test -L node_modules` → diretório real (sem junction); `DATABASE_URL=postgresql://build:build@localhost:5432/build npm run db:generate` → client gerado | ≥ 10 GB; 0 outro trabalho Docker; ≥ 3 GB de commit livre | verde |
| 7 (R2-1) | `git show origin/main:agent-orchestration/controle/decisoes.md | grep -n 'D-TRC02-'` → só l.3783 (`D-TRC02-RESPOSTAS`, "Q1 sim, Q2 sim e Q3 sim"); `grep -n -E 'D-TRC02-Q1|Q1-NAO'` → nada | **Q1 = SIM por `decisoes.md:3783-3784`, sem `D-TRC02-Q1-NAO*`** | **variante Q1 = SIM** (§Q1 + emenda v2.1) |
| 8 | idem, l.3785 (Q2 = sim; "Resolve P-TRC-DEMO-LOGIN-SEM-ORG-INERTE"); sem reversão | Q2 = SIM | **o passo do GRANT entra no demo** (§5.5) e H7 vale |

**Variante que vale neste bloco: Q1 = SIM e Q2 = SIM (Q3 = SIM: os 38 alarmes).**

### Baseline N (H-9) — head `bf83cda8`, sem mudança de código

| Comando | Saída | Veredito |
|---|---|---|
| `bash teste-linux-dtrc02.sh C:/Users/AMP/w-trc02 'node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts) tests/telemetry.test.ts'` (container Linux, Postgres 16 + Redis 7 próprios, prefixo `dtrc02-`) | `# tests 149` `# pass 139` `# fail 10` `# skipped 0` | **N = 149** executados (igual ao plano: 132 + 17). Os 10 vermelhos: 9 de `traccar-dev-topology` (o container não tem o CLI do Docker — a suíte FALHA de propósito sem Docker) e 1 de `traccar-idempotency-db` (abaixo) |
| `timeout -k 10 180 node --test --import tsx tests/traccar-dev-topology.test.ts` (host Windows, com Docker) | `# tests 12` `# pass 12` `# fail 0` | verde — os casos que exigem Docker reexecutam isolados onde há Docker, como no 01 (v2 §9.7 passo 3) |
| `not ok 48 - idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização` | `actual [204, 503]` em `traccar-idempotency-db.test.ts:219` | **pré-existente** (código da `main`, nada mudado): uma das duas entregas concorrentes saiu 503 sob a carga do lote paralelo. Frequência medida abaixo (snapshot limpo de `bf83cda8` por `git archive`) |

| frequência: `git archive bf83cda8` num diretório limpo → `teste-linux-dtrc02.sh <snapshot> 'for i in 1 2 3; do node --test … tests/traccar-idempotency-db.test.ts; done; for i in 1 2 3; do node --test … $(ls tests/traccar-*-db.test.ts); done'` | isolada: 3× `# tests 9 # pass 9 # fail 0`; lote `-db` (6 arquivos): 3× `# tests 50 # pass 50 # fail 0` | **1 vermelho em 7 execuções** da suíte (1/4 no lote com as 16 suítes); pré-existente, fora do escopo (o bloco não toca a concorrência do 01). Se reaparecer nas rodadas do bloco, é registrado com N e forma, nunca "consertado" aqui |

## Passo 1 — comando do bloco e cópias

| Comando | Saída | Veredito |
|---|---|---|
| `cp` de `planos/B-TRC-02-plano.md`, `-plano-v1.md`, `-emenda-v2.1.md`, `-respostas-do-dono.md` e `revisoes/B-TRC-02-critica-{r1-opus,r1-flash,r2-opus}.md` para `docs/revisoes/TRACCAR/` | `md5sum` origem = cópia: plano `70bc6c22…`/emenda `47cbd9ca…` (2 iguais cada) | verde |
| `agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md` | criado (objetivo, regras do Traccar, escopo = v2 §7.1 ∪ §7.3 ∪ R3-4, bateria, EO-1) | verde |

## Passo 2 — topologia (H)

| Comando | Saída | Veredito |
|---|---|---|
| `tests/traccar-event-topology.test.ts` escrito (H1–H9, emenda R3-2/R3-3); `node --test --import tsx --test-reporter=tap tests/traccar-event-topology.test.ts` | `SyntaxError … does not provide an export named 'TRACCAR_EVENT_INGEST_PATH'` — `# tests 1 # fail 1` | vermelho (a suíte importa a constante da rota, H1) |
| `TRACCAR_EVENT_INGEST_PATH = "/ingest/traccar/v1/events"` exportada de `traccar-ingest.app.ts`; mesmo comando | `# tests 9 # pass 3 # fail 6`: H1, H2, H4, H7, H8, H9 vermelhos | vermelho medido antes do overlay |
| overlay `docker-compose.traccar.yml`: `EVENT_FORWARD_URL: ${TRC_EVENT_FORWARD_URL:-http://api:3200/ingest/traccar/v1/events}`, `EVENT_FORWARD_HEADER: ${TRC_FORWARD_HEADER:?…}`, `EVENT_STATUS_ENABLE: "true"`, `STATUS_TIMEOUT: "60"` (S-E15/H-12, por ambiente — `traccar.xml` intocado); `traccar-sim` ganha `TRC_SIM_EXTRA` (parâmetros OsmAnd extras); `traccar-capture` ganha `TRC_CAPTURE_PATH` (imprime o caminho de toda requisição e, se definido, o corpo só desse caminho). Nenhum `ports` novo | `git diff --stat` → 20+/3− | — |
| suíte H de novo | `# tests 9 # pass 6 # fail 3` — vermelhos só H7 (o `GRANT` do demo nasce no passo 9), H8 (fixtures nascem no passo 3), H9 (linhas dos arnês nascem no passo 5b) | verde onde o passo alcança; vermelhos por desenho |
| `node --test --import tsx tests/traccar-dev-topology.test.ts` (host) | `# tests 12 # pass 12 # fail 0` | a topologia do 01 continua verde com o overlay novo |
| `node --test --import tsx tests/db-catalog-write-guard.test.ts` antes da entrada | `traccar-event-topology.test.ts: 5 ocorrência(s) … FORA da allowlist` | vermelho (P-14 confirmado) |
| H7 com menos menções: duas mensagens trocam "o GRANT" por "a concessão" (a agulha não muda); `grep -n -E 'GRANT'` → 3 (título, regex, mensagem) | entrada `["traccar-event-topology.test.ts", { count: 3, … }]` na `FROZEN_ALLOWLIST` (R3-4); guard de novo → `# pass 1 # fail 0 # skipped 1` (o `skipped` é o caso de banco, sem `DATABASE_URL` no host) | verde; `grep -c` de `REVOKE`/`OWNER TO`/`(CREATE|DROP|ALTER) ROLE` no arquivo do H7 = 0 |

**Desvio declarado (H9, R3-2):** a emenda pede "exatamente 5 arquivos" no predicado; mas as suítes `-db` NOVAS deste bloco
(`traccar-event-ingestion-db`, `-sample-db`, `-rls-db`, `-sample-quarantine-db`) também casam `tests/traccar-*-db.test.ts` e também
apagam recibos. A lista nominal do H9 é, portanto, as 5 do 01 **+** as 4 deste bloco (9), com o controle negativo do
`traccar-ingest-pool-db`. A propriedade é a mesma (vermelho por contagem quando um arnês novo aparece); só a lista cresce com o
que o próprio bloco cria.

## Passo 3 — captura das fixtures reais

| Comando | Saída | Veredito |
|---|---|---|
| `scripts/traccar-capture-fixture.mjs` ganha `--kind event` (mesmo teto, mesma sanitização, `down -v` sempre; `TRC_CAPTURE_PROJECT` para o nome do projeto) — editado por script com âncoras únicas; `node --check` → ok; topologia do 01 → `# pass 12 # fail 0` | diff 139+/5− | — |
| `docker ps … | grep -v '^erp-'` → só o meu `dtrc02-…` (baseline); `Win32_OperatingSystem` → FreeVirtual 7,80 GB | 2 trabalhos Docker, ambos meus; ≥ 3 GB | pode subir |
| `TRC_CAPTURE_PROJECT=dtrc02-capture timeout -k 30 900 node scripts/traccar-capture-fixture.mjs --kind event` | 13 passos OK; ec 0; `projeto derrubado (down -v --remove-orphans)`; `docker ps -a`/`docker network ls` sem `dtrc02-capture` | verde |
| fatos (headers, `event.id`, coordenadas, `eventTime` × `deviceTime`, 2ª entrega) | em `docs/revisoes/TRACCAR/B-TRC-02-evento-captura.md` | **H-1, H-3..H-7 e H-12 fechadas**; sem parada |
| suíte H de novo | `# tests 9 # pass 7 # fail 2` (H8 verde; H7 e H9 esperam os passos 9 e 5b) | verde onde o passo alcança |

## Passo 4 — contrato (A, B)

| Comando | Saída | Veredito |
|---|---|---|
| `curl -sS --max-time 25 https://raw.githubusercontent.com/traccar/traccar/v6.16.0/src/main/java/org/traccar/model/{Position,Event}.java` → scratchpad; `grep -n 'ALARM_' Position.java`; `grep -n 'TYPE_' Event.java` | 38 `ALARM_*` (l.116-153); tipos l.42-72 → 9 conservados + 14 ignorados | catálogo medido na tag (Q3) |
| `tests/traccar-event-contract.test.ts` (A1–A17) e `tests/traccar-event-sample.test.ts` (B1–B11) escritos; `node --test --import tsx --test-reporter=tap <A> <B>` | `ERR_MODULE_NOT_FOUND … traccar-event.adapter.js` / `… vehicle-telemetry.bounds.js` — `# tests 2 # fail 2` | vermelho |
| código: `src/modules/telemetry/vehicle-telemetry.types.ts`, `vehicle-telemetry.bounds.ts` (fonte única dos limites; `normalizeVehicleTelemetry`), `src/integrations/traccar/traccar-telemetry-catalog.ts`, `traccar-event.schema.ts`, `traccar-event.adapter.ts`; `traccar-position.schema.ts` lê as 7 chaves de `position.attributes` → `telemetry` (+ `telemetryDiscarded`); `traccar-position.adapter.ts` → `TraccarPositionCommand.telemetry?` e `coordinate()` exportada | — | — |
| mesmo comando | `# tests 28 # pass 28 # fail 0` | verde |
| §9.4: `tests/traccar-position-contract.test.ts` — o título do caso l.88 passa ao da v2 e ganha `assert.deepEqual(cmd.telemetry, { ignition: true, odometerM: 99 })`; `git diff --numstat` → `2 1` (título trocado + 1 asserção); `node --test … traccar-position-contract.test.ts` | `# tests 13 # pass 13` | verde; os 12 outros casos intocados |
| `timeout -k 15 600 npm run check` | ec 0 | verde |

**Desvio declarado (§6.6, "não muda"):** `traccar-position.schema.ts` passa a **exportar** cinco helpers já existentes (`isObject`,
`assertNoReservedKeys`, `present`, `isoDate`, `positiveInteger`) e `UNIQUE_ID_PATTERN`, e a união `TraccarPayloadErrorReason` ganha 4
motivos do envelope de evento (`event_missing`, `event_id_invalid`, `type_invalid`, `alarm_missing`). A régua das chaves
reservadas, o `id` ignorado e os limites da posição não mudam; o parser de evento **reusa** a régua em vez de copiá-la (uma fonte).
O comentário de cabeçalho deixa de dizer "o objeto [attributes] é ignorado por inteiro", que deixou de ser verdade.

## Passo 5 — migração (G) e 5b (arnês do 01)

| Comando | Saída | Veredito |
|---|---|---|
| `tests/traccar-event-rls-db.test.ts` (G1–G10) escrito; retrato do worktree SEM as duas migrações → `teste-linux-dtrc02.sh <retrato> 'node --test … tests/traccar-event-rls-db.test.ts'` | `# tests 11 # pass 1 # fail 10` (G1–G6, G8–G10 vermelhos + o `after`; G7 verde — "nenhuma regra/função elevada nova" já é verdade sem a tabela) | vermelho medido |
| `prisma/migrations/20260879000000_vehicle_telemetry_events/migration.sql` (A: tabela, CHECKs literais do domínio de `vehicle-telemetry.bounds.ts`, FK de 4 colunas, índice `(tenant_id, fix_key) WHERE kind='sample'` — emenda R1-1 —, ENABLE+FORCE RLS, CHECK do recibo alargado NOT VALID, rodapé de rollback na ordem 1→5 com os nomes da EO-1); `20260880000000_validate_receipt_message_kind_check` (B: só `VALIDATE`); `prisma/schema.prisma` (modelo, `@@unique` de 4 colunas no recibo, reversas em `Tenant`/`Vehicle`/`VehicleTrackingBinding`/`TraccarIngressReceipt`) | `npx prisma validate` → válido; `npx prisma generate` ec 0; `npm run check` ec 0 | — |
| retrato COM as migrações → mesma suíte G | `# tests 10 # pass 10 # fail 0 # skipped 0` — inclui o **drill G9** (base própria `<db>_trc02_drill_*`: `migrate deploy` → as 2 em `_prisma_migrations` → os 6 comandos do rodapé na ordem → tabela ausente, índice do recibo ausente, CHECK só `'position'`, `_prisma_migrations` sem as duas → `DROP DATABASE`) | **verde** |
| 5b: as 5 linhas de §7.2 por script com âncora única; `git diff --numstat c1485c94 -- tests/traccar-<x>-db.test.ts` | idempotency `1 1` · resolution-race `1 1` · quarantine `1 1` · position-ingestion `1 0` · binding-uniqueness `1 0` → **5 `+`, 3 `−`** | conforme a régua R3-1 da emenda |

**Desvios declarados:**
- **Relação reversa no recibo:** a v2 escreveu `telemetry_event VehicleTelemetryEvent?` (1:1). O Prisma exige, no lado que define a relação
  1:1, campos `@unique` — aqui seria um `@@unique` de 4 colunas na tabela nova, que não existe na migração (drift). Usei a reversa
  como lista (`telemetry_events VehicleTelemetryEvent[]`); a unicidade real continua sendo a do banco (`UNIQUE (tenant_id, receipt_id)`).
  O Prisma **aceitou** a relação de 4 colunas (`fields`/`references` com o `@@unique` de 4 colunas no recibo): a FK vive no schema e na
  migração, com o mesmo nome (`map: "vehicle_telemetry_events_receipt_fkey"`).
- **`prisma migrate diff`:** ainda não medido (a linha de controle do comando abortou o `set -e` do executor antes do diff); fica para a
  próxima rodada no container e para a cadeira (a).
- **G5** cobre, além dos 5 casos da v2, `ignition_on` com código de alarme, código fora da forma (`sos,powerCut`) e `kind` fora da lista.

**PRONTO PARA DBA** — migrações A e B escritas, drill G9 verde no container (2026-10-19, retrato do worktree). O parecer do
`agente-dba-guardiao` é do orquestrador; o dev segue para os passos seguintes.

## Passo 6 — ingestão de evento (E)

**Retomada (P7, 19/10 ~22:20Z).** O dev caiu por erro de rede no passo 6 e o PC reiniciou. Medido antes de confiar: head
`f45b6410`; não commitados `prisma/schema.prisma`, o serviço (só o `errorCode` novo), os 5 arnês, as 2 migrações, os 2 arquivos do
repositório da telemetria e a suíte G; `wc -l` + leitura do fim de cada arquivo → nenhum meio-escrito; `npx prisma generate` ec 0;
`npm run check` ec 0; o scratchpad (ferramenta `teste-linux-dtrc02.sh` e retratos) foi recriado.

| Comando | Saída | Veredito |
|---|---|---|
| código: `vehicle-telemetry.repository.ts` (porta) e `vehicle-telemetry-prisma.repository.ts` (`insertEvent`, `insertSample` com `ON CONFLICT ("tenant_id", "fix_key") WHERE "kind" = 'sample' DO NOTHING RETURNING id`, `latestDeviceStatus` com precedência fechada, `latestIgnition`, `listByVehicle`, `withSampleSavepoint` com `SAMPLE_DISCARD_SQLSTATES = {23514, 22003}`); repositório de ingestão por sujeito (`toIngressSubject`) e por `message_kind`; `ingestEvent` no serviço; `errorCode()` lê o SQLSTATE do adaptador | `npm run check` ec 0 | — |
| `tests/traccar-event-ingestion-db.test.ts` (E1–E19, com E5′) escrito; retrato = commit do passo 5 + o repositório/app/adaptador novos e o serviço ANTIGO → container | (junto de F e I) `# tests 47 # pass 6 # fail 41` | vermelho (`ingestEvent` não existe; nenhuma amostra) |
| retrato do worktree → container | E 19/19 verdes (no lote de 47: `# pass 46 # fail 1`, a falha é o I5, abaixo) | verde |
| as 6 suítes `-db` do 01 no mesmo container, com a tabela nova populada | `# tests 50 # pass 50 # fail 0 # skipped 0` | **C-20 verde**: os arnês do 01 sobrevivem à FK RESTRICT |

## Passo 7 — amostra (F) e 7b (I, Q1 = SIM)

| Comando | Saída | Veredito |
|---|---|---|
| `tests/traccar-event-sample-db.test.ts` (F1–F12 + F9′ = 13) e `tests/traccar-event-sample-quarantine-db.test.ts` (I1–I12, com I6′ e I6″ = 14) escritos | vermelhos no retrato com o serviço antigo (o lote de 47 acima) | vermelho |
| passo 7 da posição: `withSampleSavepoint` (um savepoint `vehicle_sample`, os dois caminhos); 7b: gate ÚNICO na closure `quarantined(reason)` (`binding && command.telemetry && this.sampleOnQuarantineReasons.has(reason)`), `SAMPLE_ON_QUARANTINE_REASONS` com os 3 motivos de operador, costura `sampleOnQuarantineReasons` no construtor (sem variável de ambiente), `sampleWithoutOperator` (recibo `position_sample` + amostra; `skip` desfaz o recibo; `divert` = 409 `owned_elsewhere`) | F 13/13 verdes; **F10 verde** (204, posição gravada, 0 amostra, `sample_discarded` `23514`) → **H-10 fecha**: `ROLLBACK TO SAVEPOINT` por `$executeRaw` no `$transaction` interativo do Prisma 7.8 recupera a transação; F12 verde (`23503` e `Error` → 503, nada gravado); F9/F9′ verdes (2^53−1 e 1 000 000 mV entram pelo SQL de produção e saem iguais) | verde |
| I no mesmo lote | 13/14; **I5 vermelho**: `actual [0,1,0,1]` no caso (2) | defeito do ARRANJO do teste: para aquecer a dica "sem atributos" passei `undefined`, e o parâmetro default (`ATTRIBUTES`) entrou no lugar — a posição de aquecimento (sem despacho) gravou, corretamente, uma amostra. Sentinela trocado para `null`; re-execução no passo 12 |

**Desvios declarados:**
- **I6 e I6′ são dois `test()`** (a v2 os contava como um): a suíte I tem 14 casos, não 13.
- **F4** ganhou a asserção "0 linhas `sample_discarded`": sem ela, a M-E18 (amostra sempre) seria engolida pelo savepoint (CHECK de
  medidas = domínio) e o teste não morderia.
- **G3** passou a semear um recibo de A com a viatura de B (o recibo do 01 não tem FK para `vehicles` — `P-TRC02-RECIBO-VINCULO-VIATURA-FK`):
  sem isso a FK de 4 colunas recusava a linha antes e a M-E24 (FK simples da viatura) não morderia.
- **`errorCode()`** do serviço passa a devolver o SQLSTATE da causa do adaptador antes do `code` de topo (`P2010`); o log
  "failed before commit" do 01 passa a trazer o SQLSTATE real. Nenhum teste do 01 dependia do `P20xx` (medido por `grep`).

## Passo 8 — listener e logs (C, D)

| Comando | Saída | Veredito |
|---|---|---|
| `traccar-ingest.app.ts`: fábrica única `mountIngestRoute(path, limiter, prepare)` para as duas rotas (mesma ordem 1–7), `deps.eventLimiter ?? deps.limiter`, `deps.ingestEvent` (ausente → rota inexistente), `ignored` → 204 + `request.log.info({ outcome: "ignored", reason })`; `createTraccarIngestAppFromEnv` cria DOIS limitadores com os mesmos valores de ambiente | `npm run check` ec 0; as 10 suítes sem banco do 01 + A + B: `# tests 98 # pass 98` | — |
| `tests/traccar-event-listener.test.ts` (C1–C12) | `# tests 12 # pass 12` (C11 inclui o app de PRODUÇÃO num processo filho com `TRACCAR_INGEST_BURST=1` e banco inalcançável: posição, posição=429, evento≠429, evento=429) | verde |
| `tests/traccar-event-logs.test.ts` (D1–D5) | `# tests 5 # pass 5` | verde |

**Desvio declarado (ordem testes-primeiro):** C e D foram escritos DEPOIS do código do app, que nasceu junto do serviço no passo 6
(as duas rotas dependem da mesma fábrica). O vermelho delas fica provado pelo vermelho-controle (passo 10) e pelas mutações M-E05,
M-E11, M-E12, M-E13, M-E36, M-E44 e as do 01 re-executadas com a suíte C (passo 11). A segunda metade do D5 da v2
("`sample_discarded` com `code` e sem valor de atributo") é asserida no F10 (chaves da linha = `["code", "outcome"]`).

## Passo 9 — demo

EM APURAÇÃO

## Passo 10 — vermelho-controle

EM APURAÇÃO

## Passo 11 — mutações

EM APURAÇÃO

## Passo 12 — lista curada da CI

EM APURAÇÃO

## Bateria §9.7

EM APURAÇÃO

## Limpeza

EM APURAÇÃO
