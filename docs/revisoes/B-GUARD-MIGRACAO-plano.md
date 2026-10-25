# B-GUARD-MIGRACAO — Trava de CI: migração nova com várias sentenças leva `BEGIN;`/`COMMIT;` no próprio arquivo

> **Papel:** `planejador-mestre` (TOPO). **Modelo efetivo:** Fable 5.1 (`claude-fable-5-1`), o do frontmatter — sem
> fallback. **Data:** 2026-10-24. **Ref medida:** `origin/main` `c76ec481` (worktree só-leitura `C:/Users/AMP/w-plan21`,
> detached); os PRs abertos por `git show origin/<ramo>:<caminho>` — #454 `origin/feat/traccar-b-trc-02` `42800d0d`,
> #456 `origin/fix/cheque-x-baixa` `a0f5aabc`. Nada editado, nada commitado, sem `npm ci`, sem Docker.
> **Decisão que rege:** `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (dono, 2026-10-21, *"3=aprovo"*) — vive HOJE só no ramo do
> #454 (`decisoes.md:3875`), junto da `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA` (`pendencias.md:11602`); na `main`
> `c76ec481` as duas ainda não existem (`grep -c` → 0 e 0).
> **Tipo:** bloco de FERRAMENTA → governança proporcional, regra (1) de `D-GOV-PROPORCIONAL`: **um revisor independente
> + CI verde**; sem inspetor, sem ata, sem porteiro, sem KPI (congelado). Pressa do dono: o plano é objetivo.
> **Estado deste arquivo:** COMPLETO (gravado por partes; nenhuma seção em apuração).

## §0 — MEDIDO × HIPÓTESE
**M** = medido (comando → saída). **H** = hipótese (com o comando que a derruba). Contador de sentenças usado: script
descartável no scratchpad que tira comentários `--`/`/* */`, respeita `'...'` e dollar-quote (`$$`, `$tag$`) e divide por
`;` de topo — o mesmo algoritmo que o guard terá (§2.2).

### 0.1 O inventário de migrações na `main` `c76ec481`
| # | Fato | Tipo | Comando → saída |
|---|---|---|---|
| 1 | **113** migrações, todas com `migration.sql`; nenhum `migration_lock.toml` rastreado | M | `find prisma/migrations -mindepth 1 -maxdepth 1 -type d \| wc -l` → 113; `find … -name migration.sql \| wc -l` → 113; `git ls-files prisma \| grep -v migration.sql` → só `schema.prisma` e 4 seeds |
| 2 | **105** têm mais de uma sentença (excluídos `BEGIN`/`COMMIT`); **8** têm exatamente uma | M | contador → `{"total":113,"multi":105,"single":8,…}`; as 8 de 1 sentença: `20260731`, `20260808`, `20260816`, `20260817`, `20260856`, `20260863`, `20260875`, `20260877` (esta é 1 bloco `DO $$…$$`) |
| 3 | **1** tem `BEGIN;`…`COMMIT;` nas pontas: `20260878000000_invoice_complementary_title` (B-SAN3-02, 6 sentenças dentro) | M | `grep -liE '^\s*BEGIN\s*;' prisma/migrations/*/migration.sql` → 1; contador → `20260878… 8 6 BEGIN` |
| 4 | **15** arquivos contêm a palavra `BEGIN` — 14 delas DENTRO de corpo plpgsql (`$$ … BEGIN … END $$`), não são controle de transação | M | `grep -lE '\bBEGIN\b' … \| wc -l` → 15, contra 1 em topo. **Consequência:** um guard por `grep` erraria; o splitter TEM de respeitar dollar-quote |
| 5 | **11** arquivos usam dollar-quote; **6** têm bloco `DO $$` de topo (`20260868`, `869`, `870`, `872`, `873`, `877`) | M | `grep -lE '\$\$\|\$[A-Za-z_]+\$' … \| wc -l` → 11; contador coluna `DO` |
| 6 | **0** migrações com DDL NÃO transacional em código. As 3 ocorrências de `CONCURRENTLY` (`20260857:30-35`, `20260860:29-31`, `20260878:5,12`) estão em COMENTÁRIO (nota de ops "aplicar fora de banda") | M | `grep -nEi 'CONCURRENTLY\|ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE\|VACUUM\|ALTER\s+SYSTEM\|CREATE\s+DATABASE\|TABLESPACE\|REINDEX\|DETACH\s+PARTITION' …` → 3 linhas, todas iniciadas por `--`; contador `nonTxCount: 0` |
| 7 | **0** enums no schema → o Prisma nunca gerou `ALTER TYPE … ADD VALUE` aqui (os "enums" são `CHECK (… IN (…))`) | M | `grep -cE '^enum ' prisma/schema.prisma` → 0 |
| 8 | A fronteira natural é o carimbo **`20260878000000`**: 112 migrações são anteriores (todas sem transação explícita), 1 é igual (já conforme). A pendência do #454 já a nomeia assim ("anteriores à 20260878") | M | `ls prisma/migrations \| awk '$0 < "20260878000000"' \| wc -l` → 112 |
| 9 | Datas de entrada (1º commit que adicionou o arquivo): `20260873` 2026-10-10 (#389) · `20260874/875/876` 2026-10-18 (B-TRC-01) · `20260877` 2026-10-18 · `20260878` 2026-10-20 (#448) | M | `git log --diff-filter=A --format='%h %ad %s' --date=short -- prisma/migrations/<m>*/migration.sql` |
| 10 | Prisma `^7.8.0` (`prisma` e `@prisma/client`), `prisma.config.ts` na raiz; Node ≥ 20 | M | `node -e 'require("./package.json")…'` → `^7.8.0`; `ls prisma.config.*` |

### 0.2 Os PRs abertos que trazem migração nova (o guard tem de ficar verde neles)
| # | Fato | Tipo | Comando → saída |
|---|---|---|---|
| 11 | **#454** (B-TRC-02, `MERGEABLE`) traz `20260879000000_vehicle_telemetry_events` (**17** sentenças entre `BEGIN`/`COMMIT`, sem `CONCURRENTLY`; `NOT VALID` na linha 91) e `20260880000000_validate_receipt_message_kind_check` (**1** sentença: `ALTER TABLE … VALIDATE CONSTRAINT`, sem `BEGIN`) + drill `tests/traccar-event-migration-drill-db.test.ts` (554 linhas; k = 1..17) | M | `gh pr view 454 --json files`; contador sobre `git show origin/feat/traccar-b-trc-02:<sql>` → `20260879… 19 17 BEGIN` · `20260880… 1 1 -` |
| 12 | **#456** (B-SAN3-20, `MERGEABLE`) traz `20260881000000_cheque_title_link` (**3** sentenças entre `BEGIN`/`COMMIT`) + drill `tests/cheque-title-link-migration-drill-db.test.ts` (447 linhas; k = 1..3) + fixture `tests/fixtures/prisma-migrate-diff-baseline.sql` | M | contador → `20260881… 5 3 BEGIN`; `gh pr view 456 --json files` |
| 13 | Os dois PRs tocam `.github/workflows/ci.yml` (lista curada do `backend-postgres`), `controle/decisoes.md`, `controle/pendencias.md` e `pendencias-indice.md` | M | `gh pr view 45x --json files \| grep -E 'controle\|ci.yml'` |
| 14 | Com os dois mergeados, o conjunto "novo" (≥ fronteira) será {`878`, `879`, `880`, `881`}: 3 multi-sentença COM `BEGIN`/`COMMIT` e drill nomeado; 1 de sentença única (isenta). **Guard proposto = 0 violações** nos três estados (main, main+#454, main+#454+#456) | M (pelo contador, mesma regra) | tabela acima |

### 0.3 Os drills que existem (referência do que "drill por prefixo" significa aqui)
| # | Fato | Tipo | Onde |
|---|---|---|---|
| 15 | `tests/work-order-invoicing-migration-drill-db.test.ts` (537 linhas, `main`): base própria por `CREATE DATABASE … TEMPLATE template0`; `prisma migrate deploy` em processo filho (`prisma/build/index.js`, `--config` temporário); **T-D(f)** = para k = 1..6, variante com falha injetada (`42P01`, tabela inexistente) depois da k-ésima DDL → `catalogState()` igual ao ANTES; `migrate resolve --rolled-back <nome>` + `deploy` convergem. Lê `BEGIN`/`COMMIT` do PRÓPRIO arquivo (`upStatements()`, linhas 110-118) com splitter simples (`split(/;\s*\n/)` após remover linhas `--`) — serve para UMA migração conhecida, **não** para o repositório (fato 4) | M | `:1-35`, `:341-535`, `:409-432` |
| 16 | O drill do B-TRC-02 (#454) e o do B-SAN3-20 (#456) são CÓPIAS do arnês acima, mudando constantes e `catalogState` (nomes de tabela/índice/CHECK específicos). Três cópias de ~450-550 linhas | M | cabeçalhos `:13-33` dos dois arquivos no ramo |
| 17 | O motivo da regra — `prisma migrate deploy` 7.8 executa sentença a sentença em autocommit; falha após a k-ésima deixa 1..k aplicadas (P3018) e o redeploy quebra (42701) — está MEDIDO pelos drills (T-D(f) do B-SAN3-02, T-M(e) do B-TRC-02) e registrado no cabeçalho de `20260878…/migration.sql:7-12`. **Não re-medido aqui** (sem Docker no terreno) | M (alheio) / não re-executado | `20260878…/migration.sql:7-12`; drill `:28-33` |

### 0.4 Onde um guard roda hoje (precedentes do repositório)
| # | Fato | Tipo | Onde |
|---|---|---|---|
| 18 | `npm test` = `node scripts/run-backend-tests.mjs`: expande `tests/*.test.ts` **em JS** (só arquivos de topo: `entry.isFile() && endsWith(".test.ts")`), força TAP, falha com 0 arquivo ou `# tests 0`. Funciona no Windows do dono e no CI | M | `scripts/run-backend-tests.mjs:1-60, :225-245` |
| 19 | O job `backend` do CI roda `npx prisma migrate deploy` → `npm run check` → `npm test` → `npm run build` com Postgres 16 + Redis de serviço; um teste em `tests/` entra no gate SEM tocar `ci.yml` | M | `.github/workflows/ci.yml:88-105` |
| 20 | Guards estáticos já existem como `tests/*.test.ts` lendo o disco: `permission-catalog-migration-parity.test.ts` (varre `prisma/migrations/`, **fronteira congelada que só encolhe** — `PERMISSOES_HERDADAS_DO_SEED`, "ESTA LISTA NÃO CRESCE"), `agents-mirror-guard.test.ts` (executa o script real `scripts/sync-agent-agents.mjs --check`), `npm-test-runner-guard.test.ts` (importa funções do script e as roda contra fixtures), `db-catalog-write-guard.test.ts` (detector lexical com trava de contagem) | M | `tests/permission-catalog-migration-parity.test.ts:1-60`; `agents-mirror-guard.test.ts:44`; `npm-test-runner-guard.test.ts:16, :250` |
| 21 | Fixtures de mutação já vivem em `tests/fixtures/<bloco>/` (`san3-05-mutacoes/Ma_alias.ts …`); nenhum `*.test.ts` sob `tests/fixtures/` (o runner não entra em subpastas) | M | `ls tests/fixtures/san3-05-mutacoes`; `find tests/fixtures -name '*.test.ts'` → 0 |
| 22 | `main` `c76ec481`: check-runs `backend`, `backend-postgres`, `frontend`, `owner-portal`, `authority-portal`, `flutter`, `docker` = `success` | M | `gh api repos/…/commits/c76ec481/check-runs` |
| 23 | Suíte backend no marco de 24/10: **3760/3762** (KPI `#457`) | M | título do commit `c76ec481` |

### 0.5 Hipóteses (declaradas; nenhuma sustenta o desenho)
- **H1.** `prisma migrate deploy` NÃO confere checksum de migração já aplicada (logo reescrever as 112 antigas com `BEGIN`/`COMMIT` não quebraria deploy em base existente); `migrate dev` reclama. Derruba-se com um drill: editar uma aplicada numa base própria e rodar `deploy`. **Fora deste bloco** — é da `P-MIGRACOES-ANTERIORES…`; o guard é agnóstico (não exige nem proíbe reescrever as antigas).
- **H2.** Um `ALTER TYPE … ADD VALUE` futuro (PG ≥ 12 aceita dentro de transação, mas o valor não é usável na mesma tx) seria o 2º caso real de exceção. Sem enum no schema (fato 7), é teórico; o guard o trata como não transacional por segurança.

## §1 — Objetivo · ator · fluxo · contrato
**Objetivo.** Nenhuma migração NOVA com mais de uma sentença chega à `main` sem `BEGIN;`/`COMMIT;` nas pontas do próprio
`migration.sql`, e nenhuma com DDL não transacional chega acompanhada ou sem declarar a não-atomicidade. O que hoje é
regra de planejador/DBA (duas reprovações seguidas: B-SAN3-02 C2-01, B-TRC-02 D1) vira **mecanismo**: um teste
determinístico em `npm test`, sem banco, < 1 s, vermelho no PR que introduz o defeito.

**Ator.** O dev de qualquer bloco futuro que crie migração; o revisor independente; o `inspetor-de-terreno-da-junta` e o
porteiro (que ganham um comando de 1 linha). Nenhum usuário final; nenhuma rota.

**Fluxo origem → destino.** `prisma/migrations/<carimbo>_<slug>/migration.sql` (disco, árvore do PR) → `scripts/
migration-transaction-guard.mjs` (classifica cada migração e emite violações) → `tests/migration-transaction-guard.test.ts`
(executa o guard sobre `prisma/migrations/` real + sobre fixtures de mutação) → `npm test` local e job `backend` do CI →
PR vermelho/verde.

**Contrato (as regras, com ID; é o que o guard imprime).** Para cada diretório `d` de `prisma/migrations/`, com `S` = suas
sentenças de topo (comentários fora; `'…'` e dollar-quote respeitados; CRLF normalizado):
| ID | Regra | Resultado |
|---|---|---|
| G0 | `d` sem `migration.sql` | vermelho |
| G1 | `carimbo(d) < 20260878000000` ⇒ `d ∈ ANTERIORES` (lista congelada de 112 nomes); e todo nome da lista existe no disco | vermelho se `d` tem carimbo antigo e não está na lista ("migração nova com carimbo antigo"), ou se um nome da lista sumiu/foi renomeado ("histórico reescrito") |
| G2 | `d` NOVA (não está em ANTERIORES), sem DDL não transacional, `|S| > 1` ⇒ `S[0] = BEGIN`, `S[fim] = COMMIT`, e nenhum `BEGIN/COMMIT/END/ROLLBACK/SAVEPOINT/START TRANSACTION` entre eles | vermelho com `n`, 1ª e última sentença achadas |
| G3 | `d` NOVA com alguma sentença não transacional ⇒ `|S| = 1` ("fica sozinha no arquivo") | vermelho: "divida em migração própria" |
| G4 | idem ⇒ sem `BEGIN`/`COMMIT` (falharia em runtime: "cannot run inside a transaction block") | vermelho |
| G5 | idem ⇒ existe linha `-- NAO-ATOMICA: <motivo>` com motivo ≥ 20 caracteres não brancos | vermelho: "declare a não-atomicidade e o plano de aplicação" |
| G6 | `d` NOVA sob G2 (multi, transacional) ⇒ seu nome aparece literalmente em pelo menos um `tests/*-migration-drill-db.test.ts` | vermelho: "falta o drill por prefixo" |
| G7 | linha `-- NAO-ATOMICA:` presente em migração SEM DDL não transacional | vermelho: "declaração usada como opt-out" |
Migração NOVA de **1 sentença transacional** (ex.: `20260880`, `20260877`) → isenta de G2 e G6 (a decisão é "mais de uma
sentença"). `BEGIN`/`COMMIT` em volta de 1 sentença → tolerado (inócuo). Formas aceitas: exatamente `BEGIN` e `COMMIT`
(maiúsculas/minúsculas indiferentes). `START TRANSACTION`/`END`/`BEGIN TRANSACTION` → vermelho G2 com a mensagem "use
`BEGIN;`/`COMMIT;`" — uma forma só, a que a decisão escreveu e a que se procura por `grep`.

**DDL não transacional (constante `DDL_NAO_TRANSACIONAL`, cada item com o motivo em comentário):** `CREATE INDEX
CONCURRENTLY` · `DROP INDEX CONCURRENTLY` · `REINDEX … CONCURRENTLY` · `ALTER TYPE … ADD VALUE` (H2) · `VACUUM` ·
`ALTER SYSTEM` · `CREATE/DROP DATABASE` · `CREATE/DROP TABLESPACE` · `ALTER TABLE … DETACH PARTITION … CONCURRENTLY` ·
`CREATE/DROP SUBSCRIPTION`. Acrescentar item = PR de ferramenta com fixture.

**Saída do CLI** (`node scripts/migration-transaction-guard.mjs [dirMigracoes] [--tests dirTests]`): uma linha por
violação `G<n> <dir>: <detalhe com N e o que foi achado>` + rodapé `migrações: <t> · anteriores: <a> · novas: <n> ·
violações: <v>`; `exit 1` se `v > 0`. Sem argumentos usa `prisma/migrations/` e `tests/` da raiz do repo. **Códigos HTTP,
payloads, 404/422/409: não se aplicam** — este bloco não tem rota, modelo nem migração.

**Modelagem.** Nenhuma: zero mudança em `prisma/schema.prisma`, zero migração nova, zero reescrita das 112 antigas (elas
seguem pela `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`, dono a nomear; o guard as reconhece pela lista e não as
julga). Não há `up/down`, Decimal, timestamptz nem delete lógico a decidir.

## §2 — Desenho (as 5 escolhas, com motivo)
### 2.1 "Nova" × "antiga": fronteira por carimbo **E** lista congelada de nomes
- `FRONTEIRA = "20260878000000"` (fato 8): a 1ª migração que já cumpre a regra e a que a pendência do #454 nomeia.
- `ANTERIORES` = os **112** nomes `< FRONTEIRA` hoje em `prisma/migrations/` (gerados por `ls prisma/migrations | awk '$0 <
  "20260878000000"'`, colados na constante, com `length === 112` assertado). Precedente: `PERMISSOES_HERDADAS_DO_SEED` — "ESTA
  LISTA NÃO CRESCE; só encolhe".
- Por que os dois e não só o carimbo: carimbo sozinho deixa a brecha "migração nova batizada com carimbo antigo" (o Prisma
  aplica qualquer diretório ausente de `_prisma_migrations`, mesmo com carimbo menor). Com a lista, carimbo antigo + nome fora
  da lista = vermelho (G1). Por que não só a lista: o carimbo torna a leitura óbvia e a mensagem de erro curta.
- A lista **só encolhe**: quando a `P-MIGRACOES-ANTERIORES…` sanear uma antiga (ou decidir não sanear), o bloco dela remove
  o nome e o guard passa a julgá-la. Nome removido da lista com conteúdo sem `BEGIN` → G2 vermelho — é o ratchet. Histórico
  **não é reescrito** por este bloco.

### 2.2 Splitter consciente, não `grep`
Fatos 4 e 5 matam o `grep`: 14 `BEGIN` vivem dentro de `$$ … $$`, 6 migrações são um único `DO $$` e 11 usam dollar-quote.
O splitter do guard: remove `-- …` e `/* … */`; pula `'…'` (com `''`); pula `$tag$ … $tag$`; divide por `;` de topo; apara e
descarta vazios; normaliza `\r\n`. É o algoritmo do contador do §0 (mesma saída: 113/105/8/1/0). Fica como função exportada
(`splitStatements(sql)`) para o teste provar com fixtures (M4, M16 do §4). O splitter do drill (`split(/;\s*\n/)`) **não**
é reaproveitado: serve a um arquivo conhecido, não ao repositório.

### 2.3 A exceção é ESTRUTURAL, não um marcador de opt-out
A decisão só prevê uma exceção: "migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade". O guard a
reconhece pelo **conteúdo** (sentença casa com `DDL_NAO_TRANSACIONAL`) e exige três coisas ao mesmo tempo: sozinha (G3), sem
`BEGIN`/`COMMIT` (G4), declarada com motivo (G5: `-- NAO-ATOMICA: <≥ 20 caracteres>`). Como não vira brecha: a declaração
**não desliga nada** — uma migração transacional multi-sentença com a linha `-- NAO-ATOMICA:` continua exigindo `BEGIN`/
`COMMIT` **e** fica vermelha por uso indevido (G7). Não existe marcador genérico "ignore este arquivo": quem precisar de
multi-sentença sem transação (ex.: backfill em lotes) leva a necessidade ao dono como decisão e o guard ganha o caso num PR
de ferramenta, com fixture. Pergunta Q1 ao dono (§6).

### 2.4 Drill: o guard exige a EXISTÊNCIA nomeada; a correção continua humana — recomendação
Opções medidas: (a) só a transação; (b) transação + drill existente por nome (G6); (c) drill GENÉRICO por prefixo (uma
suíte `-db` que, para toda migração nova com `BEGIN`/`COMMIT`, injeta falha após cada sentença pelo `migrate deploy` real e
compara um snapshot genérico do catálogo — `pg_class`/`pg_constraint`/`pg_index`/`pg_policy`/`information_schema.columns` —
antes × depois; substituiria as 3 cópias de ~500 linhas). **Recomendo (b) neste bloco e (c) como bloco seguinte**:
- (b) custa ~20 linhas, roda sem banco e pega o modo de falha mais provável — **esquecer** o drill. Limite declarado (D-007):
  prova que um arquivo `tests/*-migration-drill-db.test.ts` cita o nome da migração; não prova que ele injeta falha por
  prefixo nem que compara estado. Isso é do revisor (checklist no comando do bloco: "o drill tem laço k = 1..n com `migrate
  deploy` real e `resolve --rolled-back`?").
- (c) é o mecanismo de verdade, mas é suíte `-db` com processos filhos, `CREATE DATABASE` por k e crescimento linear (hoje 26
  deploys para 878+879+881; cada bloco soma 5-20); precisa de teto/rotação, entrada na lista curada do `ci.yml` (que os dois
  PRs abertos editam) e medição 3×. Sob pressa, é bloco próprio: `B-DRILL-GENERICO-POR-PREFIXO`, pendência aberta por este
  PR (§6). Pergunta Q2/Q3 ao dono.

### 2.5 Onde roda: teste em `tests/` lido pelo `npm test` (+ CLI), não etapa do `ci.yml`
1. Roda **na máquina do dev** (Windows incluído — o runner expande em JS, fato 18) antes do push; etapa de `ci.yml` só roda
   no GitHub. 2. Entra no job `backend` sem tocar `ci.yml` — que os dois PRs abertos editam (fato 13): zero conflito. 3. É
   testável: o teste importa `auditMigration`/`splitStatements` do script e roda as mutações do §4 em fixtures (precedente
   `npm-test-runner-guard.test.ts`). 4. Fica sob os guards anti-verde-vazio do runner. 5. Sem banco → determinístico. O
   **CLI** (`node scripts/migration-transaction-guard.mjs`) existe para inspetor/porteiro e para uma eventual etapa de
   `ci.yml` futura (como `sync-agent-agents.mjs --check`) — **não** neste bloco.

## §3 — Arquivos tocados (caminhos exatos; regra do espelho = módulo de referência)
| Arquivo | Ação | Modelo (espelho) |
|---|---|---|
| `scripts/migration-transaction-guard.mjs` | **novo** — zero dependência; exporta `FRONTEIRA`, `ANTERIORES` (112), `DDL_NAO_TRANSACIONAL`, `splitStatements(sql)`, `auditMigration({ name, sql, drillSources })`, `auditMigrationsDir(dir, { testsDir })`; `main()` só quando executado direto (`import.meta.url === pathToFileURL(process.argv[1]).href`) | `scripts/run-backend-tests.mjs` (funções exportadas + `main()` costurado), `scripts/sync-agent-agents.mjs` (`--check`, saída de 1 linha por divergência, `exit 1`) |
| `tests/migration-transaction-guard.test.ts` | **novo** — (i) roda `auditMigrationsDir` sobre `prisma/migrations/` real → 0 violações, `anteriores === 112`, `novas ≥ 1`; (ii) higiene da lista: `ANTERIORES.length === 112`, todos `< FRONTEIRA`, todos existem no disco, nenhum duplicado; (iii) uma asserção por mutação do §4 sobre `tests/fixtures/migration-guard/`; (iv) `drillSources` em memória para G6/G7; (v) executa o CLI real como processo filho sobre uma fixture vermelha e assere `status === 1` (propagação do código de saída) | `tests/permission-catalog-migration-parity.test.ts` (fronteira congelada), `tests/npm-test-runner-guard.test.ts` (importa do script; CLI em processo filho) |
| `tests/fixtures/migration-guard/<Mxx_slug>/migration.sql` | **novos** — um `.sql` por mutação (§4); só `.sql`, nenhum `*.test.ts` (o runner não entra em subpastas — fato 21 — mas a regra fica escrita) | `tests/fixtures/san3-05-mutacoes/` |
| `docs/deployment.md` | **editar** — seção curta "Migrações: transação explícita (D-MIGRACAO-COM-TRANSACAO-EXPLICITA)": a regra, a exceção, o formato `-- NAO-ATOMICA:`, a recuperação (`migrate resolve --rolled-back` + `deploy`), o comando do guard | seções existentes do mesmo arquivo (`:20`, `:110-136`) |
| `CLAUDE.md` §C4 **e** `AGENTS.md` (mesma frase) | **editar (1 frase, opcional — Q4)** — "Migração nova com mais de uma sentença leva `BEGIN;`/`COMMIT;` no arquivo e drill por prefixo; DDL não transacional fica sozinha e declara `-- NAO-ATOMICA:`; guard: `node scripts/migration-transaction-guard.mjs` (`D-MIGRACAO-COM-TRANSACAO-EXPLICITA`)." | regra do espelho `D-INTEROP-CLAUDE-CODEX` (alterou um, altera o outro no mesmo PR) |
| `agent-orchestration/codex/comandos/B-GUARD-MIGRACAO.md` | **novo** — comando do bloco no `comando-template.md`, com a checklist do revisor (§5) | comandos irmãos da pasta |
| `agent-orchestration/controle/decisoes.md` | **editar** — sob `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`: "guard entregue por `B-GUARD-MIGRACAO` (PR #N): regras G0-G7, fronteira `20260878000000`, lista de 112" | append |
| `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` | **editar** — `P-MIGRACOES-ANTERIORES…`: o guard está entregue, resta o saneamento/decisão das 112 (dono a nomear); **nova** `P-DRILL-GENERICO-POR-PREFIXO` (BAIXA, dono `B-DRILL-GENERICO-POR-PREFIXO`) | append |
| `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/docs/status-geral.md` | **editar** — 1 linha cada | append |

### Escopo PERMITIDO
Só os caminhos da tabela. Leitura de `prisma/migrations/**` (nunca escrita). Leitura de `tests/*-migration-drill-db.test.ts`.

### Escopo PROIBIDO
`prisma/**` (nenhuma migração nova, nenhuma reescrita das 112, nenhum `schema.prisma`) · `.github/workflows/**` (os dois PRs
abertos editam `ci.yml`; a etapa de CI dedicada fica para depois) · `package.json`/lockfiles (zero dependência — `§C7` item
1 exigiria junta de 5) · `Kpis/**` (congelado) · `src/**`, `frontend/**`, `mobile/**` · `.claude/agents/**` e `.agents/**`
· qualquer edição nos drills existentes (`tests/*-migration-drill-db.test.ts`) · `tests/fixtures/prisma-migrate-diff-baseline.sql`
(do #456).

## §4 — Critérios de aceite (cada um com a mutação que o deixa VERMELHO) · baseline
**Baseline N:** testes que exercem esta propriedade hoje = **0** (nenhum guard; a regra vive em comentário e em 3 drills que
só olham a própria migração). **Meta M ≥ 2N → M ≥ 16 casos** (lista abaixo). Suíte backend: 3760/3762 no marco (fato 23) →
≈ 3778 após o bloco. Convenção das fixtures: `Mxx_<slug>/migration.sql`, nome do diretório interno com carimbo ≥ fronteira
quando o caso é "nova" (ex.: `20260999000000_caso`), e com carimbo antigo quando o caso é G1.
| # | Critério (o que fica VERDE) | Mutação / fixture que fica VERMELHA (regra) |
|---|---|---|
| A1 | `auditMigrationsDir("prisma/migrations")` → 0 violações; `anteriores = 112`; `novas = 1` (na `main`; 4 após #454/#456) | **M1** cópia da `20260878…` sem a linha `BEGIN;` → G2 ("n = 6, 1ª sentença: `ALTER TABLE …`") |
| A2 | `BEGIN`/`COMMIT` têm de estar nas PONTAS | **M2** com `BEGIN` e sem `COMMIT` → G2; **M3** sentença DEPOIS do `COMMIT` → G2 |
| A3 | controle de transação no MEIO é vermelho | **M4** `BEGIN; A; COMMIT; BEGIN; B; COMMIT;` → G2 |
| A4 | `BEGIN` dentro de `$$ … $$` não conta (splitter) | **M5** `CREATE FUNCTION … $$ BEGIN … END $$;` + `ALTER TABLE …;` sem `BEGIN` de topo → G2 (e a fixture com `BEGIN;` de topo em volta → verde) |
| A5 | `;` dentro de string/comentário não divide | **M6** `COMMENT ON COLUMN x IS 'a; b';` + outra sentença, com `BEGIN`/`COMMIT` → verde, `n = 2`; **M7** só `-- BEGIN;` em comentário → G2 |
| A6 | antiga (nome na lista) sem `BEGIN` → verde | **M8** cópia literal de `20260874…` (29 sentenças) sob o nome da lista → verde; o MESMO conteúdo sob nome `20260874000000_x` (fora da lista) → G1 |
| A7 | nova de 1 sentença sem `BEGIN` → verde | **M9** cópia de `20260880…` com carimbo novo → verde (isenta de G2 e G6) |
| A8 | exceção estrutural completa → verde | **M10** `CREATE INDEX CONCURRENTLY …;` sozinha + `-- NAO-ATOMICA: índice em tabela volumosa; aplicar fora da janela, ver docs/deployment.md` → verde |
| A9 | exceção sem declaração → vermelho | **M11** = M10 sem a linha → G5; **M12** `-- NAO-ATOMICA: x` → G5 (motivo curto) |
| A10 | não transacional acompanhada → vermelho | **M13** `CONCURRENTLY` + `ALTER TABLE` no mesmo arquivo → G3 |
| A11 | não transacional em transação → vermelho | **M14** `BEGIN; CREATE INDEX CONCURRENTLY …; COMMIT;` → G4 |
| A12 | `ALTER TYPE … ADD VALUE` é não transacional | **M15** sozinho sem declaração → G5 |
| A13 | declaração como opt-out → vermelho | **M16** multi-sentença transacional com `-- NAO-ATOMICA: …` e sem `BEGIN` → G2 **e** G7 |
| A14 | drill nomeado | **M17** nova multi com `BEGIN`/`COMMIT` e `drillSources = []` → G6; com `drillSources = ["…\"20260999000000_caso\"…"]` → verde |
| A15 | higiene da lista | `ANTERIORES.length === 112`; remover um nome do disco (fixture dir sem ele) → G1 "histórico reescrito" |
| A16 | código de saída | CLI em processo filho sobre `tests/fixtures/migration-guard/M1_…` → `status 1` e 1 linha `G2 …`; sobre `prisma/migrations` → `status 0` |
| A17 | `migration.sql` ausente | **M18** diretório vazio → G0 |

## §5 — Bateria · dev · revisor · fluxo de PR · conflitos
### 5.1 Bateria exata (ordem; tudo na raiz do worktree do bloco, com `npm ci` próprio — nunca junction)
1. `npm run check` → 0 erros.
2. `node scripts/migration-transaction-guard.mjs` → rodapé `migrações: 113 · anteriores: 112 · novas: 1 · violações: 0`,
   `exit 0` (após rebase sobre #454/#456: `116 · 112 · 4 · 0`).
3. `node scripts/migration-transaction-guard.mjs tests/fixtures/migration-guard/M1_sem_begin/` → 1 linha `G2 …`, `exit 1`
   (prova manual de um vermelho; as demais mutações rodam dentro do teste).
4. `npm test -- tests/migration-transaction-guard.test.ts` → todos os casos (≥ 16) verdes, 0 pulados.
5. `npm test` (suíte inteira, modo `memory` resolvido pelo runner) → verde; contagem registrada no PR.
6. `npm run build` → verde.
7. `git diff --check` → limpo; `git status --short` só os caminhos do §3.
8. CI do SHA do PR: `backend`, `backend-postgres`, `frontend`, `owner-portal`, `authority-portal`, `flutter`, `docker` = `success`
   (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`).
9. Limpeza §C5 (1 linha no fechamento).

### 5.2 Papéis (D-IAS-EXTERNAS-PRIMEIRO)
- **Dev:** **Argon pelo Antigravity** (nível menor), com vigia (`feedback-braco-externo-precisa-de-vigia`). Prompt simples
  (regra (3) de `D-GOV-PROPORCIONAL`): este plano + `scripts/run-backend-tests.mjs` + `tests/permission-catalog-migration-parity.test.ts`
  + `tests/npm-test-runner-guard.test.ts` como referências explícitas. Se o Argon cair por limite: Codex (Sol); se ambos:
  Claude termina e declara.
- **Revisor independente (obrigatório, não é o Gemini sozinho):** **Codex (Sol)** ou **Claude (Opus)**, quem não escreveu nem
  planejou. O Gemini só como 2º revisor, achado conferido. Checklist do revisor (vai no comando do bloco): (a) rodou os itens
  2-4 da bateria e colou a saída; (b) a lista `ANTERIORES` tem 112 nomes e é IGUAL a `ls prisma/migrations | awk '$0 <
  "20260878000000"'` na `main`; (c) cada mutação do §4 existe como fixture/asserção e fica vermelha pelo ID certo (não por
  outro motivo — ex.: M14 cai em G4, não em G3); (d) nenhum caminho do escopo proibido no diff; (e) `docs/deployment.md`
  descreve a mesma regra que o código (sem divergir em forma: `BEGIN;`/`COMMIT;`, `-- NAO-ATOMICA:`); (f) `CLAUDE.md` e
  `AGENTS.md` com a mesma frase, se Q4 = sim.
- **Sem** inspetor, junta, porteiro, crítico (não é bloco de invariante) nem KPI.

### 5.3 Fluxo de PR
Ramo `chore/guard-migracao-b-guard-migracao` a partir de `origin/main`; commits `chore(ci): …`/`test(migrations): …`/
`docs(deployment): …`; PR squash, `--delete-branch`; corpo com objetivo, DoD, "como testar" (itens 2-4), bateria colada,
ID do bloco; nota "KPI congelado (`D-GOV-PROPORCIONAL` (5))".

### 5.4 Conflitos com #454 (B-TRC-02) e #456 (B-SAN3-20) — e a ordem recomendada
| Ponto | Situação | Decisão |
|---|---|---|
| Código do guard × migrações deles | 0 violações nos 3 estados (fato 14): `879` 17 sentenças com `BEGIN`/`COMMIT` + drill que cita o nome; `880` 1 sentença (isenta); `881` 3 com `BEGIN`/`COMMIT` + drill | nada a mudar; o guard não bloqueia nenhum dos dois |
| `ci.yml` | ambos editam a lista curada; este bloco **não toca** | sem conflito |
| `decisoes.md`, `pendencias.md`, `pendencias-indice.md` | ambos apensam no fim; este bloco também; **a decisão e a pendência que este bloco referencia só existem no ramo do #454** | **Recomendação (Q5): abrir o ramo DEPOIS do merge do #454** — senão o registro deste bloco recria a decisão (duplicata) ou aponta para texto inexistente na `main`. Se a pressa exigir abrir antes: fazer o CÓDIGO (script, teste, fixtures, docs) já, e o commit de registro só após `git rebase origin/main` com o #454 dentro. #456 pode mergear antes ou depois: não há dependência |
| `tests/fixtures/` | #456 adiciona `prisma-migrate-diff-baseline.sql` na raiz da pasta; este bloco cria a subpasta `migration-guard/` | sem conflito |
| Drills deles | lidos, nunca editados (escopo proibido) | — |

## §6 — Riscos · rollback · perguntas ao dono · registro
### 6.1 Riscos e mitigação
| # | Risco | Mitigação (no bloco) |
|---|---|---|
| R1 | Falso vermelho por splitter ingênuo (`BEGIN` em plpgsql, `;` em string, dollar-quote) | splitter consciente (§2.2); fixtures M5-M7; e o teste roda o guard sobre as **113 reais** — regressão contra o próprio histórico a cada `npm test` |
| R2 | CRLF no Windows muda a forma das sentenças | `\r\n → \n` antes de dividir (como os drills fazem); fixture com CRLF opcional |
| R3 | Brecha "nova com carimbo antigo" | lista congelada + G1 (§2.1) |
| R4 | Brecha "declaração como opt-out" | G7 + exceção só por conteúdo (§2.3) |
| R5 | A lista de 112 vira dívida esquecida | só encolhe; dono nomeado na `P-MIGRACOES-ANTERIORES…`; o guard não permite crescer (`length === 112` assertado — mudar exige editar o teste, ato consciente) |
| R6 | Prisma futuro passar a rodar em transação única | `BEGIN`/`COMMIT` explícitos continuam corretos (nested → warning, não erro) e o guard não depende do Prisma; se um dia a regra cair, cai por decisão, não por deriva |
| R7 | G6 por texto pode ser enganado (citar o nome sem drill real) | limite declarado (D-007); checklist do revisor; mecanismo de verdade é o bloco seguinte (`B-DRILL-GENERICO-POR-PREFIXO`) |
| R8 | Conflito de registro com #454 | ordem recomendada em §5.4 |
| R9 | Lista de DDL não transacional incompleta | constante única com comentário por item; acrescentar = PR de ferramenta com fixture; hoje 0 ocorrências reais (fato 6) |

### 6.2 Rollback
Reverter o PR (squash único): remove script, teste, fixtures e as linhas de docs/registro. Nenhum efeito em banco, nenhum
arquivo de `prisma/**` tocado, nenhuma dependência. Risco de rollback: nulo.

### 6.3 Perguntas ao dono (cada uma com recomendação; o dev pode começar pelo código enquanto o dono responde)
- **Q1 — Exceção genérica?** Além da estrutural (DDL não transacional sozinha + `-- NAO-ATOMICA:`), quer um marcador que aponte
  um `D-…` em `decisoes.md` para liberar multi-sentença sem transação? **Recomendo NÃO agora**: nenhum caso real existe (fato 6),
  e todo marcador é a brecha que a regra quer fechar; quando o caso aparecer, vira decisão + PR de ferramenta.
- **Q2 — O guard exige drill?** **Recomendo SIM, pela existência nomeada (G6)** — barato, pega o esquecimento, limite declarado;
  a correção do drill fica com o revisor. Alternativa "só a transação" deixa a metade da decisão sem mecanismo.
- **Q3 — Drill genérico por prefixo neste bloco ou no seguinte?** **Recomendo no seguinte** (`B-DRILL-GENERICO-POR-PREFIXO`,
  pendência aberta por este PR): é suíte `-db`, com processos filhos, entrada no `ci.yml` (em conflito com #454/#456) e teto de
  crescimento a desenhar — dobra o bloco e a pressa é sair com a trava.
- **Q4 — Uma frase no `CLAUDE.md` §C4 (+ `AGENTS.md`) neste bloco?** **Recomendo SIM**: é onde planejador e DBA leem; custa 2
  linhas espelhadas e o revisor confere a paridade.
- **Q5 — Abrir só depois do merge do #454?** **Recomendo SIM** (a decisão e a pendência vivem lá). Se o #454 passar de 1 dia,
  abrir já e deixar o commit de registro para a rebase.

### 6.4 Registro (no PR do bloco; sem porteiro, sem KPI)
`decisoes.md` (status do guard sob a decisão) · `pendencias.md` (+ índice: `P-MIGRACOES-ANTERIORES…` atualizada;
`P-DRILL-GENERICO-POR-PREFIXO` nova, BAIXA) · `codex/comandos/B-GUARD-MIGRACAO.md` · `log-execucao.md` · `status-geral.md`.

### 6.5 DoD do bloco
- [ ] Só os caminhos do §3; nada do proibido.
- [ ] Bateria §5.1 verde e colada no PR (itens 2-4 com saída literal).
- [ ] ≥ 16 casos novos, cada mutação vermelha pelo ID certo; `prisma/migrations` real → 0 violações.
- [ ] `ANTERIORES` = 112 nomes, iguais ao `ls … | awk` na `main`.
- [ ] Revisor independente (Codex ou Claude) aprovou com a checklist; CI verde no SHA.
- [ ] Registro §6.4 feito; limpeza §C5 reportada em 1 linha.

---

## Resposta do dono às 5 perguntas do §6.3 (24/10, ~22:45 BRT)
Resposta literal: ***"Aceito as recomendações, mas vc cobre o codex nessa rodada"*** — Q1 sem exceção genérica (só a estrutural `-- NAO-ATOMICA:`); Q2 o guard exige drill nomeado; Q3 drill genérico em bloco seguinte; Q4 uma frase no CLAUDE.md §C4 + AGENTS.md; Q5 o bloco abre depois do merge do #454. Os papéis do Codex nesta rodada (dev, revisor) passam ao Claude.
