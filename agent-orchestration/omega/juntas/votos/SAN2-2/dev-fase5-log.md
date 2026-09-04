# dev-san2-2 — Fase 5: suite backend completa (diario de execucao)

Worktree: `c:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r`
Branch: `fix/san2-2-guard-espelho-ci` · head na largada: `2e4985b`
Regra: numero sem comando executado nao e fato.

---

## Passo 0 — terreno

Comando: `git rev-parse HEAD` + `git branch --show-current` + `docker ps`
Saida:
- head = `2e4985b11cb970f25fded81737ded94566a4de2a`, branch = `fix/san2-2-guard-espelho-ci` (bate com o mandato)
- `san2-2-pg` 0.0.0.0:56432->5432 Up 2 hours (par descartavel do bloco)
- `san2-2-redis` 0.0.0.0:56379->6379 Up 2 hours
- `erp-postgres` 5432 / `erp-redis` 6379 — base VIVA, NAO tocada (nem leitura)

Veredito parcial: terreno correto; alvo e a porta 56432.

---

## Passo 1 — pre-condicoes da forma canonica 3 (CONFIRMADAS, nao presumidas)

### 1.a — `db:generate` ja feito neste worktree

```
$ ls -la node_modules/.prisma/client/index.d.ts
-rw-r--r-- 1 AMP 197121 15222397 Aug 30 11:48 node_modules/.prisma/client/index.d.ts
```
Cliente Prisma gerado **hoje as 11:48** (o orquestrador rodou). NAO regenerei — a pre-condicao ja estava
satisfeita e regenerar seria mutacao sem necessidade.

### 1.b — `migrate deploy` ja aplicado no banco DESCARTAVEL

```
$ export DATABASE_URL="postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public"
$ echo "DATABASE_URL=$DATABASE_URL"
DATABASE_URL=postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public
$ npx prisma migrate status
Datasource "db": PostgreSQL database "erp_techsolutions", schema "public" at "localhost:56432"
103 migrations found in prisma/migrations
Database schema is up to date!
EXIT=0
```

O `DATABASE_URL` foi ecoado **no mesmo comando**, imediatamente antes do `migrate status` — a prova de que o
alvo e a porta **56432**, nao a base viva 5432. Estado: **103 migrations aplicadas, schema up to date**.
Nao rodei `migrate deploy` de novo: `status` ja atesta o que a Fase 2 deixou.

### 1.c — nao ha `.env` neste worktree que pudesse redirecionar para a base viva

```
$ ls -la .env
ls: cannot access '.env': No such file or directory
```
Isto importa: `src/config/env.ts` carrega o `.env` do repositorio e CONGELA o snapshot no import
(documentado em `scripts/run-backend-tests.mjs`). Sem `.env` na arvore, nao existe caminho pelo qual a
suite aponte para `erp-postgres`. A variavel exportada e a unica fonte.

### 1.d — a definicao da canonica 3 NAO e minha, esta escrita no runner

`scripts/run-backend-tests.mjs` documenta, no proprio codigo:
- `CORE_SAAS_PERSISTENCE` **nao exportada** -> o runner define `memory` no processo FILHO (o que a CI faz
  no job `backend`); exportada -> o runner RESPEITA o valor.
- `SKIP_BUDGET_DB = 2`, com os dois pulos **nomeados no codigo**: os dois testes de
  `tests/permission-catalog-db-parity.test.ts`, gated por `RBAC_DB_PARITY != "1"`.

Ou seja: os 2 pulos esperados nao sao folclore de ata — estao nomeados na fonte. Vou conferir **pelo nome**
na saida TAP, nao pela contagem.

---

## Passo 2 — `npm test` na forma canonica 3 (execucao 1)

### 2.a — higiene do ambiente ANTES do run

```
$ env | grep -E "^(DATABASE_URL|CORE_SAAS_PERSISTENCE|RBAC_DB_PARITY|REDIS_URL)="
(vazio — exit 1)
```
O shell nao herdou nenhuma dessas variaveis. A unica que existe no processo do teste e a que eu exporto.

### 2.b — comando exato (env ecoado DENTRO do arquivo de saida, nao so aqui)

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:56432/erp_techsolutions?schema=public"
unset CORE_SAAS_PERSISTENCE RBAC_DB_PARITY
{ echo "DATABASE_URL=$DATABASE_URL"
  echo "CORE_SAAS_PERSISTENCE=[${CORE_SAAS_PERSISTENCE-<ausente>}]"
  echo "RBAC_DB_PARITY=[${RBAC_DB_PARITY-<ausente>}]"; } > "$S/npm-test.r1.tap"
npm test >> "$S/npm-test.r1.tap" 2>&1 ; echo "EXIT=$?" >> ...
```

Saida em `<scratchpad>/san2-2-f5/npm-test.r1.tap` — a evidencia bruta vive em DISCO, nao no meu contexto.
(status: run disparado em background; resultado no proximo passo do diario)

### 2.c — RESULTADO (transcrito do TAP pelo orquestrador; o agente caiu antes de escrever)

> **Proveniência.** O `dev-san2-2` disparou o run, gravou a saída em disco e **caiu** (erro novo:
> `Connection refused`, não o `server_error` do dia). O TAP é **artefato do comando dele** — o
> orquestrador só transcreve. E o número foi **reproduzido de forma independente por outros dois
> agentes**, que rodaram a suíte por conta própria durante a verificação adversarial.

```
$S/san2-2-f5/npm-test.r1.tap   (dev-san2-2)          # tests 2609 · pass 2607 · fail 0 · skipped 2 · EXIT=0
$S/verif-npm-test.tap          (verificador KPI)     # tests 2609 · pass 2607 · fail 0 · skipped 2 · EXIT=0
$S/adv-npm-test.tap            (verificador pendências) # tests 2609 · pass 2607 · fail 0 · skipped 2 · EXIT=0
```

Os três com o mesmo cabeçalho de env gravado DENTRO do arquivo:
`DATABASE_URL=…localhost:56432/erp_techsolutions` · `CORE_SAAS_PERSISTENCE=[<ausente>]` ·
`RBAC_DB_PARITY=[<ausente>]` — a **canônica 3**, como o runner a define.

**N=3, três agentes independentes, resultado idêntico.** É mais forte do que o mandato pedia (N=1).

**Os 2 pulos são os do orçamento**, nomeados:

```
ok 1646 - toda permissão do catálogo existe na tabela `permissions` do banco  # SKIP RBAC_DB_PARITY não é "1"
ok 1647 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS     # SKIP RBAC_DB_PARITY não é "1"
```

Batem com `SKIP_BUDGET_DB = 2` do `scripts/run-backend-tests.mjs`. **Nenhum pulo inesperado.**

**Aritmética fechada:** baseline oficial **2595/2597** + os **12 casos** de `agents-mirror-guard`
(Fase 1) = **2607/2609**. O previsto e o medido coincidem — e coincidem **depois** da medição, não antes.

**Veredito da Fase 5: VERDE.** O número que a Fase 4 vai publicar é **2607/2609, fail 0, skipped 2**.
