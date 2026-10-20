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

**Variante que vale neste bloco: Q1 = SIM e Q2 = SIM (Q3 = SIM: os 38 alarmes)** — **SUPERADA**: ver "Variante Q1 = NÃO" no fim
deste relatório (decisão do dono de 19/10, antes do merge).

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

**Terreno — teto de Docker estourado (registro, 19/10 ~23:00Z).** O orquestrador mediu 3 trabalhos Docker (teto 2) e 3,2 GB de
commit livre: eu estava com DOIS ao mesmo tempo — o container das mutações de banco (`dtrc02-17924499475569-*`) e o demo
(`dtrc02-demo-*`) —, mais um de outro agente (B-SAN3-02). Eu tinha medido "só o meu" antes de subir o demo, mas contei por
trabalho alheio e não limitei os MEUS a um. **Regra aplicada daqui em diante: no máximo UM trabalho Docker meu por vez.** O demo
já tinha terminado (falha no passo 19, abaixo) e foi derrubado na hora com o `down -v` do próprio compose (`docker ps -a` →
0 contêineres `dtrc02-demo`); o container das mutações seguiu sozinho.

| Comando | Saída | Veredito |
|---|---|---|
| `TRC_DEMO_PROJECT=dtrc02-demo TRC_DEMO_API_IMAGE=dtrc02-demo-api:local timeout -k 60 3600 node scripts/traccar-dev-demo.mjs --with-web` (1ª rodada) | passos 1–18 OK (inclui o 12 do 01 — agora contando só recibos `position` — e os novos 14–18: 1 `device_online`, ignição off→on = 1 `ignition_on` + 2 amostras, `alarm/sos`, reenvio do mesmo corpo = 1 linha, tipo forjado 204/0 linha, sem vínculo 202/1 episódio/0 linha); **FAIL 19**: "uma amostra nasceu do power=-1" | vermelho do ARRANJO |
| `psql … SELECT … FROM vehicle_telemetry_events WHERE kind='sample' ORDER BY occurred_at DESC LIMIT 3` (antes do `down -v`) | a amostra do fix com `power=-1`: `motion f, total_distance_m 0, power_mv NULL` | o produto está certo: o Traccar calcula `motion`/`totalDistance` em TODA posição, então a amostra existe; o parser descartou só a tensão fora do domínio. A asserção do passo do demo é que estava errada |
| correção do passo 19: exige 1 amostra nova **com `power_mv` NULL** | `node --check` ok | re-execução abaixo |
| 2ª rodada (head `65861398`) | 1–19 OK (19 verde com a asserção corrigida); **FAIL 20**: `spawnSync docker ENAMETOOLONG` — os 120 corpos em base64 num argumento estouram a linha de comando do Windows | defeito do SCRIPT; `down -v` na hora (0 contêineres `dtrc02-demo`) |
| correção: `postFromApi(route, [corpo], { repeat: 120 })` — o corpo vai UMA vez e é repetido dentro da api | `node --check` ok; H + topologia do 01 `# tests 21 # pass 21` | — |
| 3ª rodada, mesmo comando | **`[traccar-demo] VERDE`**, 24 passos: 1–13 do 01 intactos; 14 `device_online` = 1; 15 ignição off→on = 1 `ignition_on` + 2 amostras; 16 `alarm/sos` = 1; 17 o mesmo corpo 2× → 204,204 e 1 linha; 18 tipo forjado 204/0 linha e sem vínculo 202/1 episódio/0 linha; 19 `power=-1` → localização e amostra sem tensão; 20 **rajada: 110 de 120 posições com 429; evento depois: 204**; 21 tabela sem coluna de coordenada/JSON/nome, log da api sem segredo, sem coordenada, sem o tipo forjado, `"outcome":"ignored"` contado, md5 da OS igual; 22 Traccar em `::ffff:127.0.0.1:8082`, ingestão só em `172.31.250.10:3200`; **23 o passo nomeado do `GRANT` (Q2) → `login_without_org: active`** (fecha `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE`); 24 web em `127.0.0.1:18080` | **verde** |
| `docker compose -p dtrc02-demo … --profile tools --profile capture down -v --remove-orphans` | redes removidas; `docker ps -a \| grep -c dtrc02` → 0 | terreno limpo |

## Passo 10 — vermelho-controle

Retrato = `git archive HEAD` (`226aef21`) com o `src/` INTEIRO trocado pelo de `c1485c94` (merge do B-TRC-01); container Linux
`dtrc02-`, cada suíte isolada.

| Suíte | Saída com o `src/` do 01 | Veredito |
|---|---|---|
| A `traccar-event-contract` | `ERR_MODULE_NOT_FOUND … traccar-event.adapter.js` (`# fail 1`) | vermelho |
| B `traccar-event-sample` | `ERR_MODULE_NOT_FOUND … vehicle-telemetry.bounds.js` | vermelho |
| C `traccar-event-listener` / D `traccar-event-logs` | `SyntaxError … does not provide an export named 'TRACCAR_EVENT_INGEST_PATH'` | vermelho |
| E `traccar-event-ingestion-db` | `# tests 21 # fail 21` | vermelho |
| F `traccar-event-sample-db` | `# tests 14 # fail 14` | vermelho |
| I `traccar-event-sample-quarantine-db` | `# tests 15 # fail 15` | vermelho |
| G `traccar-event-rls-db` | `# tests 10 # pass 10` | verde **declarado**: G mede o BANCO (as migrações estão no retrato); o vermelho de G é o do passo 5 (retrato sem as 2 migrações: 9 de 10 vermelhos) |
| caso §9.4 de `traccar-position-contract` | `# tests 13 # pass 12 # fail 1` — `not ok 4 - contrato: attributes só alimenta a allowlist veicular …` | vermelho EXATAMENTE na asserção nova; os 12 outros casos do 01 verdes |

Nas suítes E/F/I o vermelho é `ERR_MODULE_NOT_FOUND` por caso (import dinâmico do arnês), não a asserção de cada critério: o
vermelho POR ASSERÇÃO de cada critério vem das mutações (passo 11), uma por propriedade. (Casos reais por suíte `-db`: E 20,
F 13, G 10, I 14; no vermelho-controle o `# tests` soma +1 pela falha do `after` de cada arquivo.)

## Passo 11 — mutações

Catálogo: `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs` (79 entradas: 61 do B-TRC-02 + 18 re-executadas do 01).
Executor: `run-mutations.mjs` — âncora ÚNICA no EOL do arquivo (checada em seco antes: só a `MUT-10@01` aparece 2×), `tsc --noEmit`
na forma mutada quando a edição toca `src/**/*.ts` (todas as que tocaram compilaram: `tsc 0`), os testes indicados, restauro por
BYTES com sha256 conferido (**79/79 `restoredOk`**). `host` = no worktree (35); `db` = DENTRO do container Linux, sobre a CÓPIA
do worktree, migração mutada numa base própria `trc02_mut` criada e derrubada por mutação (44). Resultados linha a linha:
`results-host.jsonl` e `results-db.jsonl` na mesma pasta.

**Antes das mutações, no mesmo container:** E+F+G+I = `# tests 57 # pass 57 # fail 0 # skipped 0` (I5 verde com o sentinela
corrigido); `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` sobre a base migrada →
ec 0 e ~~diff vazio~~ — **CORRIGIDO na variante final:** a leitura "vazio" estava errada (o trecho do log não imprimiu o
SQL). Medido de novo (head `79448602` e `origin/main`, contêineres separados, o mesmo comando): **146 linhas nos dois, md5
`34594a709a1169dbf70a5a6a87016459` idêntico**, e `grep -ciE "vehicle_telemetry|traccar|fix_key|position_sample"` = **0** — é deriva
PRÉ-EXISTENTE do repositório (`DropForeignKey` de `financial_entries`, `service_quote_items`, `service_quotes`…, FKs que vivem só em
migrações), e o bloco não acrescenta NENHUMA linha a ela (inclusive a FK de 4 colunas, que o schema modela).

| Grupo | Resultado |
|---|---|
| Mantidas da v1 (M-E01..07, 09..15, 17..29) | todas **vermelhas**, salvo **M-E13 — VERDE, mutação EQUIVALENTE**: sem o serializador `req`, o pino não consegue serializar o `IncomingMessage` cru (sonda: `"req":"[unable to serialize, circular reference is too complex to analyze]"`), logo nenhum header vaza — a mutação não cria o defeito que nomeia. A classe "serializador de allowlist" é medida pela **MUT-16@01** (os 3 serializadores fora), **vermelha** em `traccar-ingest-logs` e em D |
| M-E10 (ampliada) | vermelha: E4 com barreira |
| Novas v2 (M-E30..M-E45, + M-E37b) | todas **vermelhas**; M-E37 (evento → E19) e **M-E37b** (posição → F11) separadas porque a forma do plano só alcançava o caminho do evento — declarado |
| Novas v2.1 (M-E46..M-E50, + variantes `h`) | todas **vermelhas**; M-E43 e M-E49 medidas nos DOIS lados: o `after` do arnês do 01 falha (container) **e** o H9 (host) |
| Controles de lacuna (esperado VERDE) | **M-E33-ctl01**: o segredo do evento no `traccar.xml` deixa a guarda do 01 (`traccar-dev-topology`) VERDE — prova da lacuna que o H6 fecha (M-E33 vermelha no H6). **M-E48-ctlB**: o `::smallint` deixa o B9 VERDE — só o caminho de produção (F9/F9′, M-E48 vermelha) vê a borda |
| [Q1=SIM] M-Q1-01, 02′, 03, 05, 06, 07, 08, 09 | todas **vermelhas** (M-Q1-04 subsumida por M-E32, vermelha em F10 **e** I7) |
| Re-executadas do 01 (MUT-09, 11, 12, 13, 14, 16, 17, 18, 19, 20, 25, 32, 33, 38, 42, M-C1′) com os `tests` ampliados | todas **vermelhas**; **MUT-10@01 — NÃO MEDE** (a âncora `if (raced.payloadDigest === command.payloadDigest) {` passou a existir 2×: o passo 6 do evento repete o idioma) → re-derivada como **MUT-10′@01** com o `findReceipt(command)` da posição no contexto: **vermelha** |

**Total:** 79 executadas — 74 vermelhas, 2 controles verdes como esperado, 1 equivalente (M-E13, classe coberta pela MUT-16@01),
1 "não mede" do 01 substituída pela forma re-derivada (vermelha). M-E16′ não se aplica (só Q1 = NÃO).

## Passo 12 — lista curada da CI

`.github/workflows/ci.yml`, só o bloco `SUITES=` do job `backend-postgres`: entram, depois das 6 do 01, as suítes `-db` do bloco
com um comentário que diz o número medido (`P-TRC-CI-COMENTARIO-DENOMINADOR` segue ABERTA no registro: quem fecha é o registro,
não este relatório). Variante Q1 = SIM: 4 suítes, 448/448 3×.
**Variante final Q1 = NÃO: 3 suítes** (`traccar-event-ingestion-db`, `-sample-db`, `-rls-db`) — medido na forma do job (extraída do
próprio `ci.yml` por `ci-pg-form.cjs`; `npm run db:seed`; env do job) **3× = `# tests 434 # pass 434 # fail 0 # skipped 0`**,
denominador constante (= 391 da `main` + 43 casos `-db` novos: E 20 + F 13 + G 10; a emenda previa 433 — a diferença é o E5′, um
`test()` à parte).

**Re-medição no ramo integrado com a `main` (20/10, pedido do orquestrador).** O registrador integrou a `main` (head `27ebbdee`:
registro `ba64626d` + merge de `539b078e`, que trouxe as 2 suítes `-db` do B-SAN3-02 para a lista curada). O comentário ANTIGO do 01
("363/363 no total do job") tinha ficado ao lado do meu ("434/434 …"), com dois totais diferentes e uma pendência declarada fechada.

| Comando | Saída | Veredito |
|---|---|---|
| retrato `git archive 27ebbdee` → contêiner `dtrc02-` (1 trabalho meu; outro nenhum; 8,7 GB livres) → `ci-pg-form.cjs` (54 linhas `SUITES=`), `npm run db:seed`, env do job, 1× | `# tests 457 # pass 457 # fail 0 # cancelled 0 # skipped 0` | **457/457** |
| `ci.yml`: o comentário do 01 perde o total ("…= 48 casos nas 6 suítes)."); o do 02 diz "43 casos nas 3 suítes… Total do job, re-medido no ramo integrado com a main (27ebbdee, 1×): 457/457, 0 pulo." — UM total só, sem "fecha …" | `git diff --numstat` → `3 3` | um comentário de total; nenhuma pendência declarada fechada |

## Bateria §9.7

| # | Comando | Saída | Veredito |
|---|---|---|---|
| 1 | `timeout -k 15 600 npm run check` · `timeout -k 15 600 npm run lint` (host) | ec 0 · ec 0 | verde |
| 2 | `node --test --import tsx --test-reporter=tap tests/traccar-event-{contract,sample,listener,logs,topology}.test.ts` (host, com Docker para a H) | `# tests 54 # pass 54 # fail 0 # skipped 0` | **54** = o previsto (17+11+12+5+9) |
| 2′ | `node --test --import tsx tests/traccar-dev-topology.test.ts tests/db-catalog-write-guard.test.ts tests/auth-invariant-guards.test.ts` (host) | `# tests 25 # pass 24 # skipped 1` (o pulo é o caso de banco do guard de catálogo, sem `DATABASE_URL` no host; roda no container) | verde; guard 8 verde |
| 7 | `timeout -k 15 600 npm run build` · `node scripts/sync-agent-agents.mjs --check` · `node --check Kpis/app.js` | ec 0 · `[agents-sync] OK — 70 agentes, espelho consistente` · ec 0; `git diff --name-only origin/main...HEAD -- Kpis` → 0 | verde; `Kpis/` intocado |
| 7′ | `git diff --check origin/main...HEAD` | 1ª medida: espaço no fim de linha em `B-TRC-02-critica-r1-flash.md` (cópia) e linha em branco no fim de `B-TRC-02-emenda-v2.1.md` (cópia) → normalizados (`diff -w -B` contra os originais = vazio: só espaço); 2ª medida → ec 0 | verde |

| 6 | forma do job `backend-postgres` 3× (container; `ci-pg-form.cjs` extrai o `run:` do passo "Route suites against PostgreSQL" do `ci.yml` do retrato — 53 linhas `SUITES=` —, `npm run db:seed`, env do job) | 3× `# tests 448 # pass 448 # fail 0 # cancelled 0 # skipped 0` | **verde, denominador constante 448** (= 391 da `main` + os 57 casos `-db` novos; a emenda previa 446 com 109 testes — o bloco tem 111, I6′ e E5′ separados) |
| 3 | `node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts)` (container) | `# tests 243 # pass 229 # fail 14` — os 14 são os casos que EXIGEM o CLI do Docker (9 de `traccar-dev-topology`, 5 da H), que falham de propósito sem Docker | 243 = 132 do 01 + 111 do bloco (≥ 241 previsto); os 14 reexecutados no host: verdes (2 e 2′ acima) |
| 4 | regressão (§9.7 passo 4) na 1ª tentativa | 44 vermelhos — **artefato meu**: rodou depois da forma do `backend-postgres` com `CORE_SAAS_PERSISTENCE=prisma` exportado, e essas suítes são da forma `backend` (memória) | refeita abaixo na forma certa |
| 4 (main) | a mesma regressão, forma `backend` (memória), num retrato limpo da `origin/main` | `# tests 408 # pass 408` | baseline |

**Queda da VM do Docker (~00:10Z, aviso do orquestrador).** A memória de commit do Windows chegou a 0,2 GB e a VM do WSL/Docker
reiniciou no meio do `npm test` do retrato da `main` (`error waiting for container: unexpected EOF`, ec 125). O contêiner da 2ª
metade (o retrato do head, `dtrc02-179245550710630-*`) subiu sozinho depois e foi derrubado por mim com `docker rm -f -v` +
`docker network rm` (resíduo `dtrc02-*` = 0), porque o retrato já estava velho (anterior à correção do T8, abaixo). Antes de subir
de novo: commit livre medido ≥ 3 GB (`FreeVirtualMemory` = 4,6 GB).

**`npm test` (forma `backend`) — 1ª medida no head `232f728a`:** `# tests 3808 # pass 3785 # fail 21 # skipped 2` (os 2 pulos são
os nomeados da paridade RBAC). Dos 21: 14 = os casos que exigem o CLI do Docker; 7 a classificar contra a `main`:
`o6r07c-census-guard` T8, T9, T13; `san3-05-runtime-role-guard-db` "o papel de runtime não contorna FORCE RLS"; e 3 do censo
no host (ambiente Windows, não reproduzem no container). **T8 e T9 são deste bloco** (abaixo).

**T8/T9 do censo do 07c-a (`tests/helpers/o6r07c-census.ts`):** o censo faz análise de contaminação a partir de `.type` e trata
como "despacho por tipo" tudo que deriva dele.
- **T8** acusou `TRACCAR_EVENT_TYPE_TO_KIND[type]` (o `Object.freeze(...)` impedia o censo de enumerar as chaves) e o `case undefined`
  do `switch`. **Corrigido no código, do jeito que o guard pede:** o mapa vira literal `as const satisfies …` (enumerável) e o `switch`
  vira comparações com `undefined` (o censo ignora) e com `"alarm"` (literal resolvido). M-E04 re-ancorada na forma nova.
- **T9** acusa `EVENT_TYPE_PATTERN.test(type)` em `traccar-event.schema.ts` como "curinga por regex". É VALIDAÇÃO de formato (A10:
  `type` fora de `^[A-Za-z]{1,32}$` → 422), não despacho. A lista de curingas aceitos (`CURINGAS_ACEITOS`) vive em
  `tests/helpers/o6r07c-census.ts`, **FORA do PERMITIDO** deste bloco. Contornar o detector (montar o teste do padrão de outro jeito
  só para ele não ver) seria fugir de um ratchet — a mesma classe que a emenda R3-3 proibiu para o `GRANT`. **Não toquei o arquivo.**
  Pedido ao orquestrador: emenda de escopo de UMA linha (`"src/integrations/traccar/traccar-event.schema.ts: EVENT_TYPE_PATTERN.test(type)"`
  em `CURINGAS_ACEITOS`, com o motivo), no molde da R3-4. Até lá, o job `backend` da CI fica vermelho no T9.

**Segunda tentativa (~00:30–00:50Z):** o `npm ci` do contêiner do head morreu por rede (`npm error network read ETIMEDOUT`,
ec 3); o da `main` instalou e a VM do Docker **caiu de novo no meio do `npm test` completo** (`unexpected EOF`, ec 125). As duas
quedas foram na mesma etapa — a suíte inteira em paralelo, a mais pesada. **Decisão:** não repito o `npm test` inteiro no contêiner
(derruba a VM que os outros agentes usam); a forma `backend` completa fica para o job da CI, e eu classifico os vermelhos medidos
rodando SÓ os arquivos deles, no head e na `main`. Resíduo `dtrc02-*` depois da queda: 0; commit livre 5,9 GB.

**Classificação por arquivo (container, head `22cd524b` × retrato limpo da `origin/main`):**

| Arquivo | head | `main` | Conclusão |
|---|---|---|---|
| regressão §9.7 passo 4 (forma `backend`, memória) | `# tests 408 # pass 408` | `408/408` | verde, igual |
| `tests/o6r07c-census-guard.test.ts` | `# tests 32 # pass 31 # fail 1` — só **T9**: `CURINGA-ESTATICO: src/integrations/traccar/traccar-event.schema.ts:100: EVENT_TYPE_PATTERN.test(type)` (T8 e T13 verdes depois da correção) | `32/32` | **deste bloco** — PEDIDO DE EMENDA 1 (abaixo) |
| `tests/san3-05-runtime-role-guard-db.test.ts` | `# tests 12 # pass 10 # fail 2` — `T14a/b`: esperado `…\|0\|0\|118`, veio `…\|0\|0\|119` | `12/12` | **deste bloco**, consequência legítima: o número é a contagem de objetos de `public` que `scripts/db-runtime-role.sh` concede ao papel de runtime; a tabela nova é a 119ª. O B-TRC-01 moveu este mesmo literal quando criou as suas tabelas (`git log -S'\|118$'` → `c1485c94`). PEDIDO DE EMENDA 2 |
| `traccar-event-contract` / `traccar-event-ingestion-db` (catálogo reescrito) | `17/17` · `20/20` | — | verde |
| M-E04 re-ancorada (`if (eventKind === undefined) {…`) | `tsc 0`, `# tests 37 # pass 35`, exit 1 | — | **vermelha** |

**PEDIDOS DE EMENDA DE ESCOPO (para o orquestrador; NÃO aplicados — os dois arquivos estão fora do PERMITIDO):**
1. `tests/helpers/o6r07c-census.ts`, em `CURINGAS_ACEITOS`: uma entrada
   `"src/integrations/traccar/traccar-event.schema.ts: EVENT_TYPE_PATTERN.test(type)"` — motivo: validação de FORMATO do `event.type`
   (A10: fora de `^[A-Za-z]{1,32}$` → 422), não despacho por prefixo; o despacho do evento é o mapa literal enumerável (T8 verde).
2. `tests/san3-05-runtime-role-guard-db.test.ts:1016`: `118` → `119` — motivo: a tabela `vehicle_telemetry_events` recebe DML do papel de
   runtime pelos default privileges (é o desenho do §6.1; nenhuma concessão nova, nenhuma função).
Sem as duas, o job `backend` da CI fica vermelho em T9 e T14a/b. Contornar qualquer um dos dois detectores no código seria fugir
de um ratchet (a classe que a emenda R3-3 proibiu); por isso o pedido e não o contorno.

| 8 | demo (passo 9 acima) | 3ª rodada VERDE; `down -v` | verde |

## Variante Q1 = NÃO — decisão do dono de 19/10 (antes do merge)

**Ordem do orquestrador (~01:15Z), com as palavras do dono: "TRC-02 Q1 = Não".** A Q1 passa de SIM para NÃO ANTES do merge; vale o
§Q1.7 da v2 com a R2-5 da emenda ("o NÃO antes do merge continua sendo §Q1.7"). O registro em `decisoes.md` é do orquestrador — não
feito aqui. **Variante do código a partir do commit `498c4e26`: Q1 = NÃO, Q2 = SIM, Q3 = SIM.**

| Onde (lista do §Q1.7) | O que saiu | Medida |
|---|---|---|
| migração A | a coluna `fix_key`, o CHECK `vehicle_telemetry_events_fix_key_check`, o índice `vehicle_telemetry_events_sample_fix_key`, o literal `'position_sample'` do CHECK do recibo (fica `('position','event')`); cabeçalho declara a variante | `grep fix_key\|position_sample` → 0 |
| `prisma/schema.prisma` | `fix_key String?` e os comentários `[Q1=SIM]` (recibo agora diz `('position','event')`) | `prisma validate` ok; `grep` → 0 |
| `traccar-ingestion.service.ts` | `SAMPLE_ON_QUARANTINE_REASONS`, a costura `sampleOnQuarantineReasons`, o gate na closure `quarantined()`, `sampleWithoutOperator` (42 linhas), o `fixKey` da amostra e o ramo `skip` do caminho aceito | `grep` → 0 |
| `vehicle-telemetry*.ts`, repositório de ingestão | `'position_sample'` do tipo `TraccarMessageKind`; `fixKey` e o `ON CONFLICT (tenant_id, fix_key)` de `insertSample` (vira INSERT simples: o `UNIQUE (tenant_id, receipt_id)` basta); `withSampleSavepoint` sem `skip`/`divert` (só RELEASE ou ROLLBACK TO + classificação R4-2) | `npm run check` ec 0 |
| testes | `tests/traccar-event-sample-quarantine-db.test.ts` inteiro (`git rm`); F3 recupera "0 amostra" (e 0 recibo de qualquer tipo); F1 sem `fix_key`; F9 sem `fix_key` nos INSERTs literais; G5/G6 sem `fix_key`; G8 passa a exigir que `'position_sample'` seja RECUSADO (`23514`) e ausente do CHECK; H9 sem a suíte I na lista nominal (8 arquivos) | sem banco: `# tests 68 # pass 68` (+1 pulo do caso de banco do guard de catálogo) |
| `.github/workflows/ci.yml` | a linha `SUITES="$SUITES tests/traccar-event-sample-quarantine-db.test.ts"`; o comentário passa a "3 suítes" e o denominador é re-medido | abaixo |
| mutações | as 8 M-Q1-*; entra a **M-E16′** (a closure `quarantined()` grava recibo `'position'` + amostra → F3 vermelho POR CONTAGEM); M-E32/M-E47 deixam de citar a suíte I; M-E27 re-ancorada (a linha `"fix_key" TEXT` não existe mais) | 72 entradas (35 host + 37 banco); âncoras únicas salvo a `MUT-10@01` conhecida |
| `API_CONTRACTS.md` | a nota da Q1; entra "posição em quarentena não conserva amostra (Q1 = NÃO)" | — |

**Contagens previstas × reais (sem Q1):** testes novos — previsto 96 (v2.1 §5.4); **real 97** (54 sem banco + E 20 + F 13 + G 10; E5′ é um
`test()` à parte). Pendência que volta a existir por §Q1.7 (registro do orquestrador): `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` (dono
B-TRC-03).

| Comando | Saída | Veredito |
|---|---|---|
| mutações do host afetadas pela reversão (`run-mutations.mjs <wt> host "M-E35,M-E48-ctlB,M-E43h,M-E49h,M-E34,M-E50"`) | M-E34, M-E35, M-E43h, M-E49h, M-E50 **vermelhas**; M-E48-ctlB **verde como esperado**; 6/6 `restoredOk` (as 6 linhas novas estão no fim de `results-host.jsonl`; as 35 anteriores são da variante Q1 = SIM) | ok |
| 1º contêiner da bateria Q1 = NÃO (head `30853d25`) | `npm ci` morreu por rede (`ECONNRESET` no registry), ec 3 — nada medido | refazer; a cópia do executor passa a tentar o `npm ci` 3× antes de desistir |
| contêiner das 37 mutações de banco (mesmo retrato `30853d25`) | **36 vermelhas + 1 "não mede"** (a `MUT-10@01`, âncora 2× como antes; a `MUT-10′@01` re-derivada: vermelha); **M-E16′ vermelha** (F3 por contagem); 37/37 `restoredOk`; resultados em `results-db-q1nao.jsonl` (o `results-db.jsonl` anterior é a variante Q1 = SIM, guardado como histórico). O `ec=2` do executor saiu DEPOIS do `MUTFIM`: eu editei a cópia do script enquanto o bash a lia; resíduo `dtrc02-*` conferido = 0 | verde (toda propriedade morde) |
| 2º contêiner da bateria | `n: unbound variable` — erro de escape meu na retentativa do `npm ci` (o `$n` expandido pelo shell de fora); corrigido (`\$n`, conferido por `od -c`) | refazer |

| 3º/4º contêiner | o 3º: `ok: unbound variable` (o mesmo erro de escape no `$ok`); corrigido e conferido por `od -c`. O 4º (retrato `30853d25`): ok | — |
| E + F + G (drill G9 incluso) | `# tests 43 # pass 43 # fail 0 # skipped 0` | **verde** |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | ec 0; 146 linhas, md5 idêntico ao da `origin/main`; 0 menção às tabelas/colunas do bloco | sem deriva NOVA (a de 146 linhas é pré-existente; ver a correção no passo 11) |
| forma do `backend-postgres` 3× | `434/434` ×3, 0 pulo | **verde** (passo 12) |
| `$(ls tests/traccar-*.test.ts)` no Linux | `# tests 229 # pass 215 # fail 14` — os 14 que exigem o CLI do Docker | 229 = 132 do 01 + **97** do bloco; os 14 verdes no host (abaixo) |
| regressão §9.7 passo 4 (forma `backend`) | `408/408` | verde, igual à `main` |
| `o6r07c-census-guard` · `san3-05-runtime-role-guard-db` · `db-catalog-write-guard` | `31/32` (só T9) · `10/12` (só T14a/b: `…\|0\|0\|119`) · `5/5` | T9 e T14a/b = os **2 PEDIDOS DE EMENDA** de escopo (passo "Bateria §9.7"), inalterados pela reversão |
| host: `npm run check` · `lint` · `build` | ec 0 · ec 0 · ec 0 | verde |
| host: A+B+C+D+H | `# tests 54 # pass 54` | verde |
| host: `traccar-dev-topology` + `auth-invariant-guards` (guard 8) + `traccar-position-contract` | `# tests 36 # pass 36` | verde |
| `node scripts/sync-agent-agents.mjs --check` · `git diff --check origin/main...HEAD` · `node --check Kpis/app.js` · `git diff --name-only origin/main...HEAD -- Kpis \| wc -l` | `OK — 70 agentes` · ec 0 · ec 0 · 0 | verde; `Kpis/` intocado |
| escopo: `git diff --name-only origin/main...HEAD` contra o PROIBIDO (§7.4: `src/app.ts`, `portal-app.ts`, `frontend/`, `mobile/`, `notifications/`, `work-orders/`, `field-dispatch/`, `field-location/`, `rls.ts`, `src/infra/`, `package*.json`, `Kpis/`, `docker-compose.prod.yml`, `db-runtime-role.sh`) | 0 arquivo | PROIBIDO vazio; o diff está em §7.1 ∪ §7.3 ∪ R3-4 + as cópias de registro em `docs/revisoes/TRACCAR/` |
| os 9 testes do 01 que não podem mudar (`git diff --quiet c1485c94 HEAD -- …`) · os 5 arnês (`--numstat`) | 9× "igual" · `1 1`,`1 1`,`1 1`,`1 0`,`1 0` | régua R3-1 (5 `+`, 3 `−`) |

**Contagens finais (variante Q1 = NÃO):** critérios 27 (C-01..C-27; os C-Q1-* saem); **testes novos 97** (A 17 · B 11 · C 12 · D 5 · H 9 ·
E 20 · F 13 · G 10); baseline N = 149 executado; meta 2N = 298 **não atingida** — déficit declarado (`P-TRC02-DEFICIT-2N`), a régua
critério → teste → mutação vale; **mutações**: 72 no catálogo (35 host + 37 banco; 54 do B-TRC-02 + 18 re-executadas do 01), todas
vermelhas salvo: 2 controles de lacuna verdes como esperado, a M-E13 equivalente (classe coberta pela MUT-16@01) e a MUT-10@01 "não
mede" (substituída pela MUT-10′@01, vermelha); `backend-postgres` **434**.

## Emenda v2.2 de ESCOPO — os dois pedidos APROVADOS e aplicados

Norma: `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md` (planejador `planejador-trc02-escopo-fable`; cópia do
`planos/B-TRC-02-emenda-v2.2-escopo.md` com espaço de fim de linha normalizado — `diff -w -B` contra o original = vazio). Retomada
depois do reinício do VS Code (P3/P7): head medido `aa266f01`; árvore limpa; o log da rodada no contêiner (`s.log` no scratchpad) já
tinha terminado (`MUTFIM`, ec 0) antes da queda — nada a refazer, só a registrar.

| Régua | Comando | Saída | Veredito |
|---|---|---|---|
| R-S1 / b-S1 | `git diff --numstat 6a87c3da..6192b5e8 -- tests/helpers/o6r07c-census.ts` + a linha `+` | `1 0`; a linha exata da §5.1 (`"src/integrations/traccar/traccar-event.schema.ts: EVENT_TYPE_PATTERN.test(type)", // B-TRC-02: …`), entre a entrada `…_signatureQQ` e o `].map(` de `CURINGAS_ACEITOS` | conforme |
| R-S2 / b-S2 | `git diff --numstat … -- tests/san3-05-runtime-role-guard-db.test.ts` + as linhas `−/+` | `1 1`; só o literal `118$` → `119$` da l.1016 | conforme |
| b-S4 | `git diff --stat … -- tests/o6r07c-census-guard.test.ts scripts/db-runtime-role.sh` | vazio | PROIBIDO intocado |
| b-S5 | `git grep -n -E '\.exec\((event\.)?type\)' HEAD -- src/integrations/traccar` · `git grep -n -F 'EVENT_TYPE_PATTERN.test(type)' HEAD -- …/traccar-event.schema.ts` | 0 linha · 1 linha | sem evasão do detector |
| commits | `6192b5e8` (código: os 2 arquivos) · `aa266f01` (registro: cópia da emenda; l.9 e l.30 do comando do bloco; M-S1…M-S7 no catálogo) | — | §5.5 |

**§6 — controle e mutações** (contêiner Linux `dtrc02-`, retrato do worktree em `aa266f01`; cada mutação aplicada na CÓPIA, `tsc`
quando toca `src/`, migração mutada em base própria `trc02_mut`, restauro por hash; Docker: só este trabalho meu, 7,7 GB livres).
Linhas completas em `B-TRC-02-evidencias/results-escopo-v2.2.jsonl`.

| Id | Esperado (§6) | Medido | Veredito |
|---|---|---|---|
| **C-S0** | census `32/32` · san3-05 `12/12` | `# tests 32 # pass 32 # fail 0` · `# tests 12 # pass 12 # fail 0` | **T9 e T14a/b VERDES** com a emenda |
| M-S1 (curinga novo no mesmo arquivo) | T9 vermelho | `tsc 0`; `31/32`, `not ok` = T9 | vermelha |
| M-S2 (mesmo texto em outro arquivo: `/^[A-Za-z]{1,32}$/.test(parsed.type)` no adaptador) | T9 vermelho | `tsc 0`; `31/32`, T9 | vermelha |
| M-S3 (entrada R-S1 removida) | T9 vermelho | `31/32`, T9 | vermelha — o verde vem DESTA entrada |
| M-S4 (regex `/^[A-Za-z-]{1,33}$/`) | census verde, contrato vermelho | `tsc 0`; `48/49` — o único `not ok` é do contrato ("… type fora do padrão → 422"); o censo passou inteiro | conforme: limite DECLARADO (o regex é guardado pelo contrato) |
| M-S4′ (regex `/^(ignitionOn\|alarm)$/`) | contrato vermelho | `tsc 0`; `13/17` (`deviceOnline` aceito, `tipo fora do catálogo → ignored`, …) | vermelha |
| M-S5 (`.exec(type) === null` + entrada removida) | census VERDE (buraco do detector) | `tsc 0`; `32/32` | verde como esperado — prova do buraco `.exec` (`P-07C-CENSO-EXEC`); b-S5 o fecha por grep |
| M-S6 (`CREATE TABLE "zz_mutacao_trc02"` na migração A, base própria) | T14a/b vermelho (veio 120) | `migrateStatus 0`; `10/12`, `not ok` = T14a/b | vermelha |
| M-S7 (`AND c.relname <> 'vehicle_telemetry_events'` no script do papel, só na cópia) | T14a/b vermelho (veio 118) | `10/12`, T14a/b | vermelha |

8/8 `restoredOk`; `docker ps -a | grep -c dtrc02` → 0 depois da rodada. **Limite do registro:** o executor guarda o título do caso
vermelho, não o texto do `assert.match`; o valor `120`/`118` das M-S6/M-S7 está previsto pelo mecanismo (§4.2 da emenda) e o vermelho
no T14a/b — o único caso que lê essa coluna — está medido.

**`npm test` (forma `backend`) completo:** NÃO repetido no contêiner (derrubou a VM duas vezes — "Segunda tentativa", acima); a §5.5
da própria emenda manda deixá-lo para o check-run do head empurrado (b-S7). Os dois guards que o bloco tinha deixado vermelhos estão
verdes (C-S0); o resto da forma `backend` não mudou desde a classificação por arquivo.

## Limpeza

| Comando | Saída |
|---|---|
| `docker ps -a \| grep -c dtrc02` · `docker network ls \| grep -c dtrc02` · `docker volume ls \| grep -c dtrc02` | 0 · 0 · 0 (todo contêiner/rede do bloco derrubado — os do executor pelo `trap`, os do demo pelo `down -v`) |
| `docker rmi dtrc02-demo-api:local dtrc02-demo-migrate:latest dtrc02-demo-web:latest` | 3 imagens do demo removidas (≈ 2,2 GB) |
| retratos `snap-*` do scratchpad desta sessão | removidos (só os meus) |
| `dist/` do worktree (gitignored, do `npm run build`) | removido |
| `df -h /c` | 14 GB livres |

**Worktree `C:/Users/AMP/w-trc02` MANTIDO** (com o `node_modules` próprio, sem junction): o mandato proíbe push/PR por mim, e o
orquestrador precisa dele para empurrar o ramo `feat/traccar-b-trc-02`. A remoção (`git worktree remove --force`) fica para depois do
push. Base viva (`erp-postgres`/`erp-redis`) e as portas 5432/6379/3000/5173/5050/8899 nunca foram tocadas.

## Para o orquestrador — pendências e decisões a registrar (não gravei em `controle/`)

- **Dois pedidos de emenda de escopo** (uma linha cada; sem eles o job `backend` fica vermelho em T9 e T14a/b) — texto exato na seção
  "Bateria §9.7".
- **Decisão do dono** "TRC-02 Q1 = Não" (19/10) → `D-TRC02-Q1-NAO` e a pendência que volta por §Q1.7: `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA`
  (dono B-TRC-03). Com Q1 = NÃO, `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` (emenda §1.8) deixa de existir (não há recibo `position_sample`).
- **Evidência para o registro decidir** (quem fecha pendência é o registro, não este relatório): `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE`
  (demo `--with-web`: `login_without_org: active`, H7 verde), `P-TRC-CI-COMENTARIO-DENOMINADOR` (comentário único com o total
  re-medido no ramo integrado, 457/457; o registro a mantém ABERTA), `P-TRC02-LIMITADOR-POR-ROTA` (C8/C11 verdes, M-E36 vermelha).
- **Continuam com dono** (v2 §12): `P-TRC02-LIMITES-POR-ROTA-PROD`, `P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM`,
  `P-TRC02-RECIBO-VINCULO-VIATURA-FK`, `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO` (agora só para o evento sem despacho, C-10),
  `P-TRC02-COMMANDRESULT-IGNORADO`, `P-TRC02-STATUS-TIMEOUT-PROD`, `P-TRC02-DEFICIT-2N`.
- **Vermelho pré-existente medido no baseline:** `traccar-idempotency-db` "duas entregas idênticas concorrentes" saiu 503 em 1 de 7
  execuções (lote paralelo); 0/6 nas re-execuções. Fora do escopo; registrar com N e forma.
- **Terreno:** 2 quedas da VM do Docker durante o `npm test` completo no contêiner (a forma inteira derruba a VM de 10 GB): a forma
  `backend` completa fica para a CI; aqui foi medida arquivo a arquivo.
- **Parecer do `agente-dba-guardiao`:** PRONTO PARA DBA desde o passo 5; a migração A mudou com a reversão (sai `fix_key`, o índice
  parcial e o `'position_sample'` do CHECK) — o parecer deve ser sobre o head final.
