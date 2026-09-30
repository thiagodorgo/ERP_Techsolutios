# B-SAN3-05 — Crítica adversarial r2 (ÚLTIMA rodada) sobre o plano v2

- **Identidade:** `critico-b-san3-05` · papel `critico-adversarial` · rodada **r2** (instância nova, contexto limpo; nunca planejou nem desenvolveu o bloco).
- **Corpo:** `.claude/agents/critico-adversarial.md` em `origin/main@3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c` — `git show origin/main:.claude/agents/critico-adversarial.md | tr -d '\r' | md5sum` → `ae0a04610a6be1c1490c0c51e0489d91` (confere com o esperado).
- **Modelo em que roda:** Opus 5.5 (`claude-opus-5-5`). Papel `critico-adversarial` não é gate nem planejador; sem substituição a declarar.
- **Máquina:** `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 GNU/Linux` · Node `v20.20.2` (`PATH=/opt/node20/bin:$PATH`).
- **Alvo:** `docs/revisoes/SAN3/B-SAN3-05-plano.md` (v2, 1913 linhas) no ramo `docs/plano-b-san3-05`, head `c727156ddecda2c26258d67749c5bed21cc18d43`; crítica r1 no mesmo ramo; v1 em `c3f57e9`.
- **Cluster:** Postgres 16.13 descartável `127.0.0.1:54354` (banco `erp_critico_r2`), Redis `127.0.0.1:63854`.
- **Regra de papéis (§C7.4-bis):** este documento ACHA. Não propõe correção, não escreve plano, não escreve código de produto.

## 1. Fechamento dos 23 achados da r1

EM APURAÇÃO

## 2. Achados novos da v2 (e re-medição do que a v2 afirma)

Scratch: `/tmp/claude-0/-home-user-ERP-Techsolutios/2284c1af-ebcb-5671-92c9-9a61ff81a2fa/scratchpad/critico-r2/` (abaixo `$S2`).
Os apêndices foram extraídos do plano por `awk` e conferidos por md5 contra o declarado: Apêndice A `293b3746ad7e4dea1c11e16c794e7aa3`,
Apêndice B `6204643a81fb5d2305f09ff38b89f9de`, Apêndice C `189ddf8a093934cf1c1baa61ba80f5c8` (os três = o declarado e = os scripts do
planejador em `plano-v2/`); a trava do §2.2(a) extraída do plano = `plano-v2/guard-v2.sql` (`diff` vazio).

### 2.1 O gerador v2 e o ratchet — reproduz, e é cego a 9 formas novas fora do residual declarado

```
$ cd /home/user/wt-critico-r2 && PATH=/opt/node20/bin:$PATH node $S2/gerador-apA.mjs . > $S2/gen-head.txt ; ec=0
$ diff <(saída colada no Apêndice A) $S2/gen-head.txt  → IDÊNTICA (L1 720 · 48 chaves · sha1 147d41c2… · L2b 65)
# arnês $S2/mut.sh: cópia de src+prisma SEM node_modules; mutação em src/modules/zz-mut/mut.ts; comm contra as 48 chaves do head
CONTROLE sem mutação → novas=0 sumidas=0 VERDE
as 17 fixtures do Apêndice D (extraídas verbatim) → 17/17 VERMELHO (+1 cada)   · "sumida" (sítio 7, prisma → prisma as never) → novas=1 sumidas=1 VERMELHO
```
Veredito parcial: **o que a v2 afirma sobre as 17 reproduz.** Agora as formas que NÃO estão nas 17 e NÃO estão no residual
declarado do §0.4 ("acessor dinâmico `prisma[nome]`, `Object.values(prisma)`, SQL cru montado fora do arquivo e client obtido por
caminho que não passe por um nome de acessor Prisma") — todas obtêm o client **pelo nome do acessor** ou instanciam a classe crua
**pelo nome da classe**:

```
$S2/novas/N01_destructure_renomeado.ts   const { cloudUsageEvent: ev } = prisma; ev.findMany({})                         → novas=0 VERDE
$S2/novas/N02_alias_do_delegate.ts       const ev = prisma.cloudUsageEvent; ev.findMany({})                              → novas=0 VERDE
$S2/novas/N03_new_via_namespace.ts       import * as cu from "…cloud-usage-prisma.repository.js"; new cu.PrismaCloudUsageRepository(prisma).listEvents({}) → VERDE
$S2/novas/N04_import_renomeado.ts        import { PrismaCloudUsageRepository as UsageRepo }; new UsageRepo(prisma).listEvents({})                        → VERDE
$S2/novas/N05_setter_condicional.ts      prisma.$transaction(async (tx) => { if (tenantId) await setTenantRlsContext(tx, tenantId); return tx.cloudUsageEvent.findMany({}) }) → VERDE
$S2/novas/N06_setter_no_cliente_errado.ts prisma.$transaction(async (tx) => { await setTenantRlsContext(prisma, id); return tx.cloudUsageEvent.findMany({}) })          → VERDE
$S2/novas/N07_delegate_como_argumento.ts paginate(prisma.cloudUsageEvent) com paginate(d) { return d.findMany({take:50}) } → VERDE
$S2/novas/N08_subclasse_via_namespace.ts class Sub extends cc.PrismaCloudChargeRepository {}; new Sub(prisma).listTenantCharges("x")           → VERDE
$S2/novas/N09_setter_em_comentario.ts    $transaction cujo corpo só tem o COMENTÁRIO "sem setTenantRlsContext( aqui"       → VERDE
```
**9/9 VERDES** (saída em `$S2/novas-results.txt`). Mecanismo, lido no Apêndice A: L1 só reconhece acessor por **nome** (`accessorToTable.has(target.name.text)`
ou identificador literalmente chamado `cloudUsageEvent`), então delegate renomeado/aliased/passado como argumento some (N01, N02, N07); L2 só
reconhece `new <Identificador>` cujo texto é o nome da classe (`ts.isIdentifier(node.expression) && injectedClasses.has(...)`) e `extends` pelo
texto (`t.expression.getText(sf)` = `cc.PrismaCloudChargeRepository` ≠ `PrismaCloudChargeRepository`), então namespace, import renomeado e
subclasse via namespace somem (N03, N04, N08); e `$transaction` é absolvido por **regex de texto** (`CONTEXT_SETTERS.test(before)`) — qualquer
ocorrência textual de `setTenantRlsContext(` antes do sítio, inclusive num `if` que não executa, com o client errado, ou num comentário, vira
`SOB-CONTEXTO` (N05, N06, N09). N05 é **a forma exata do defeito original do item 10** (ramo sem `tenantId`). A prova dinâmica de que N05/N06
leem sem GUC está em 2.2.

### 2.2 EM APURAÇÃO — prova dinâmica de N05/N06; T11 como guard da propriedade

### 2.3 O `db-catalog-write-guard` reprova as suítes que o próprio plano manda escrever, e o arquivo que resolve isso está fora do §6

```
$ sed -n 62,69p tests/db-catalog-write-guard.test.ts   → padrões: CREATE ROLE · DROP ROLE · ALTER ROLE · GRANT · REVOKE · OWNER TO
$ sed -n 144,158p …                                     → walkTestFiles(TESTS_ROOT) recursivo, todo *.ts sob tests/ (fixtures incluídas)
# sonda TEMPORÁRIA tests/san3-05-runtime-role-guard-db.test.ts com a forma mínima que T7/T8 exigem (1 CREATE ROLE, 1 GRANT), removida por trap:
$ PATH=/opt/node20/bin:$PATH node --test --import tsx --test-name-pattern='ratchet de catálogo' tests/db-catalog-write-guard.test.ts
not ok 1 - ratchet de catálogo: …
    san3-05-runtime-role-guard-db.test.ts: 2 ocorrência(s) de escrita de catálogo FORA da allowlist — escritor novo. … registre o arquivo aqui com motivo
# fail 1
$ git status --short | wc -l → 0   (sonda removida)
$ sed -n 324,352p tests/helpers/auth-identity-fixture.ts → createEphemeralRole só cria "NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT"; não há função do arnês para SUPERUSER, GRANT de pertença, OWNER TO nem CREATE DATABASE
```
O §8 manda T7 (papel `SUPERUSER NOBYPASSRLS` "criado pelo arnês sob `withRoleCatalogLock`"), T8 (`GRANT bypass TO efêmero` / `REVOKE`),
T8b (`OWNER TO efêmero`, `GRANT dono TO efêmero`) e T14 (7 cenários com `CREATE ROLE p3_mig`, `ALTER ROLE … SUPERUSER BYPASSRLS`, `GRANT`,
`OWNER TO`) em `tests/san3-05-runtime-role-guard-db.test.ts`; e diz (l.856-858) que "os que criam papel/banco entram no ratchet
`db-catalog-write-guard` com contagem congelada (ou pedem ao arnês…)". As duas saídas exigem editar `tests/db-catalog-write-guard.test.ts`
(a `FROZEN_ALLOWLIST`) ou `tests/helpers/auth-identity-fixture.ts` — **nenhum dos dois está no PERMITIDO do §6** ("PERMITIDO (e nada mais)":
`tests/production-runtime-gates.test.ts` · `tests/san3-05-*.test.ts` · `tests/fixtures/san3-05-mutacoes/**`). E a bateria do §8 (l.875) roda
`tests/db-catalog-write-guard.test.ts` como regressão. Logo: ou o dev sai do escopo, ou omite T7/T8/T8b/T14 (A2–A5, A17 sem teste), ou burla
o guard lexical (o próprio guard documenta o buraco `["GRANT","SELECT"].join(" ")`, l.46) — as três reprovam. É a classe do F1 da r1
(critério impossível dentro do próprio escopo). **Achado F2-01.**


## 3. Critérios A1–A20 × mutação × teste

EM APURAÇÃO

## 4. Decisão de posse → recusa × §11 / compose / CI

EM APURAÇÃO

## 5. Tabela de achados

EM APURAÇÃO

## 6. Tabela de fechamento r1

EM APURAÇÃO

## 7. Veredito

EM APURAÇÃO

## 8. Limpeza do cluster

EM APURAÇÃO
