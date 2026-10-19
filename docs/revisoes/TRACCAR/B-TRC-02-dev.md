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

EM APURAÇÃO: frequência do vermelho pré-existente (`baseline-flake.txt`).

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

EM APURAÇÃO

## Passo 4 — contrato (A, B)

EM APURAÇÃO

## Passo 5 — migração (G) e 5b (arnês do 01)

EM APURAÇÃO

## Passo 6 — ingestão de evento (E)

EM APURAÇÃO

## Passo 7 — amostra (F) e 7b (I, Q1 = SIM)

EM APURAÇÃO

## Passo 8 — listener e logs (C, D)

EM APURAÇÃO

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
