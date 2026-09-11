# BRIEFING — junta do DELTA do `B-O6R-06`

> **O que esta junta julga:** o **delta** produzido DEPOIS da junta original — o merge absorvido, o conserto
> de isolamento da suíte e o registro. **O mérito NÃO se rejulga**: foi aprovado 3×0 em `J-B-O6R-06.md`, e o
> §C7.4 pune escalar sem defeito.

## §0 · Âncoras — medidas, não herdadas

| | |
|---|---|
| Worktree | `.claude/worktrees/b06` |
| Branch | `fix/billing-durability` |
| **Head julgado** | **MEÇA VOCÊ MESMO** — `gh pr view 385 --json headRefOid --jq '.headRefOid'` (equivalente: `git rev-parse HEAD` no worktree `b06`). **Não confie em literal nesta tabela:** o head avança a cada commit de registro, inclusive os que consertam este briefing. Quando ele foi escrito era `deff7bcc`; o commit que o acrescentou já o tornou `764a3b04`. **Cite no voto o head que VOCÊ mediu, com o comando.** É o §A7 aplicado a si mesmo. |
| PR | **#385** · `gh pr checks 385` → **7/7 pass** · `mergeable=MERGEABLE` |
| Head da junta original | `0f0a872a` (código) · ata em `005b522c` |
| Base absorvida | `origin/main` = `1b8319f9` (o merge é `cc579302`) |
| Baseline de teste | `2936/2938` (#380, `fe2748c8`) |

**Armadilha de shell, medida em 2026-09-09:** no git-bash do Windows o MSYS mangleia
`git show <rev>:<caminho>` (vira `rev\caminho`) e devolve `fatal`. Exporte **`MSYS_NO_PATHCONV=1`** antes, ou
um laço desatento lê o erro como "arquivo ausente" e fabrica achado.

## §1 · Composição e quórum

**Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca dinheiro). **Não** é 5/5.

**Identidades NOVAS, obrigatoriamente.** As seis do caso original (`jurado-06-*`, titulares e suplentes)
foram **SEPULTADAS** em `OBITUARIO-IDENTIDADES.md` §3.4 — classes `votou` e `nomeada-e-preparada`. O §1.2 do
obituário: *"não há reabilitação por tempo, por troca de bloco nem por 'o caso dela era outro'"*. O
precedente é do mesmo formato: o `B-O6R-ARNES` também fechou **APROVADO 3×0** e sepultou os seis.

**A composição, com os nomes:**

| Cadeira | Titular | Veto | Suplente |
|---|---|---|---|
| **C1 · banco / atomicidade / RLS** | `jurado-06d-banco-atomicidade-rls` | sim | `jurado-06d-suplente-banco-atomicidade-rls` |
| **C2 · invariante financeiro / rateio** | `jurado-06d-invariante-financeiro-rateio` | sim | `jurado-06d-suplente-invariante-financeiro-rateio` |
| **C3 · contrato / regressão / registro** | `jurado-06d-contrato-regressao-registro` | sim | `jurado-06d-suplente-contrato-regressao-registro` |

Criadas em 2026-09-09 pela `agente-fabrica`, nos dois espelhos, **depois** do bloqueio do inspetor. Espelho
conferido por execução: `node scripts/sync-agent-agents.mjs --check` → **`ec=0`, "OK — 35 agentes, espelho
consistente"**. Nenhuma tem `model:` fixado — cadeira de mérito herda o modelo da sessão; pin é só de gate.

**Plano de perda de jurado (P3):** cada cadeira tem suplente **novo**, nomeado acima. O suplente **não
herda medição nenhuma** — re-executa o briefing inteiro; conclusão sem comando registrado não é insumo.
Voto perdido **nunca** conta como aprovação, e a junta não fecha com menos de 3 votos de mérito.

## §2 · Plano de isolamento (obrigatório — sem ele o inspetor BLOQUEIA)

- Cada jurado que **mutar** usa worktree próprio; quem só lê e executa teste usa o `b06` sem escrever nele.
- **Cluster Postgres/Redis descartável POR JURADO.** A base viva `erp-postgres`/`erp-redis` **não é alvo,
  nem para leitura**.
- **Junction/symlink de `node_modules` entre worktrees é PROIBIDA** (§C7.1-ter(c)): cada worktree roda
  `npm ci` próprio; remoção só por `git worktree remove --force`.
- **`git clean` é PROIBIDO em toda forma.**
- **O reset é no BANCO, nunca no schema.** `DROP SCHEMA public CASCADE; CREATE SCHEMA public` destrói o
  `GRANT USAGE ON SCHEMA public TO PUBLIC` que o `initdb` cria e que o `prisma migrate deploy` **não repõe**
  — e `auth-login-candidates-fn-db` cai com `42501 permission denied for schema public` sob papel
  `NOSUPERUSER`. Use `DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` + `migrate deploy`; confira por
  `select nspacl from pg_namespace where nspname='public'` → `{pg_database_owner=UC/...,=U/pg_database_owner}`.

## §3 · Separação de papéis (§C7.4-bis) — registro verificável, não declaração de orquestrador

| Papel | Quem | Prova |
|---|---|---|
| **Quem ACHOU** o defeito de isolamento | o **orquestrador**, medindo `npm test` no head `cc579302` | `Kpis/kpis-latest.json` → `metrics.backend_tests.note` (as 5 execuções sujas, com N e forma) |
| **Quem PLANEJOU** o conserto | workflow de 4 planejadores + 4 críticos adversariais, sintetizado | plano em `scratchpad`; a prescrição (janela reservada + `importId` + isca + guard) está reproduzida no §4 abaixo |
| **Quem DESENVOLVEU** | agente `general-purpose` dedicado, que **não achou** e **não planejou** | `tests/helpers/o6r06-cost-fixtures.ts`, `tests/o6r06-cost-summary-sum-db.test.ts`, `tests/o6r06-janela-reservada-guard.test.ts` no commit `deff7bcc` |
| **Quem JULGA** | as três cadeiras **novas** desta junta | este briefing |

**Nenhum agente ocupou dois papéis.** O orquestrador achou e **não** consertou; o dev implementou e **não**
julgou a validade do achado.

## §4 · O que entrou no delta

**(a) Merge de `origin/main` (`cc579302`).** Seis conflitos. Três de acréscimo puro (`pendencias.md`,
`status-geral.md`, `kpis-history.md`) resolvidos mantendo os dois lados (§A2). `kpis-history.json`: os dois
lados backfillaram o #380 — a entrada do 07b vem da main **verbatim** (hash completo, superset de campos) e o
b06 contribui **uma** entrada. `kpis-latest.json` reconstruído da main com só os deltas do B06. `app.js`
regenerado por `scripts/kpi-freeze.mjs`.

**A COLISÃO, que é o item de mérito deste merge:** a base comum (`fe2748c8`) publicava `blocks_completed`
**161**. O `B-GOV-ELENCO-ENXUTO` (#381) subiu para **162** na main; o `B-O6R-06`, partindo da **mesma** base,
também escreveu **162**. Ficar com qualquer lado publicaria 162 e **sumiria com um bloco entregue**. Valor
com os dois na main: **163**. E o guard pegou o desdobramento: a entrada do B06 no *histórico* dizia 162 e
estava datada antes do `-ENXUTO`, embora mergue depois — redatada e reordenada; a série ficou monotônica
161 → 161 (o `B-GOV-ELENCO`, que **não** mergeou, corretamente não move) → 162 → 163.

**(b) Conserto de isolamento.** Três arquivos, **zero linha de `src/`**.
A colisão era **bidirecional**: `buildLineItemWhere` (`aws-cur-prisma.repository.ts:193-208`) aceita
`import_id` e fecha uma direção; `listCostLineItems` (`cloud-cost-allocation-prisma.repository.ts:208-212`)
faz **overlap puro de período, sem `import_id`** — só a **janela reservada** fecha as duas.
`O6R06_JANELA_RESERVADA = 2028-02`, escolhida por **presença** (2026 ocupado: junho n=209, julho n=319; 2028
não aparece em literal de data nenhum em `tests/**`). Mais escopo por `importId` em S1/S3′/S4/S10, **isca**
(2º import na mesma janela que não pode mover o número) no lugar da linha que viraria tautologia em S4,
teardown dos **dois** ids, vaza-metro S11 e guard estático novo (4 casos).

**(c) Registro.** Parecer de regularização do porteiro cobrindo #382/#383/#384; duas linhas de `status:` que
contradiziam o próprio cabeçalho; reincidência de `P-GOV-CAMINHO-REPO-SESSAO`; índice regenerado; os três PRs
no `status-geral.md`; e a **fundamentação da ata corrigida** (a §9 citava `§C7.1-quater`, inexistente em ref).

## §5 · Escopo

**PERMITIDO no delta:** `tests/o6r06-cost-summary-sum-db.test.ts` · `tests/helpers/o6r06-cost-fixtures.ts` ·
`tests/o6r06-janela-reservada-guard.test.ts` · `Kpis/*` · `agent-orchestration/**`.

**PROIBIDO:** `src/**` · `prisma/**` · `frontend/**` · `mobile/**` · `.github/**` · `scripts/**` ·
`tests/o6r06-allocation-basis-rls-db.test.ts`.

**REPROVAÇÃO POR CONSTRUÇÃO** — cobrar qualquer um destes é reprovar sem defeito: mudança em `src/`; o ramo
`completed` de `scripts/reconcile-checklist-usage.ts` (bloqueado por decisão do crítico, `R2-A`); baixar
`--test-concurrency` (esconde a classe); o **assento permanente** (norma inexistente em ref — §A7); e
`P-O6R-SUITES-DB-SEM-TEARDOWN`, que é `pre-existente` com dono a nomear.

## §6 · Bateria — com N e forma, porque sem forma a contagem não vale

| medição | forma declarada | resultado |
|---|---|---|
| `backend_tests` | `npm test` com **banco recriado antes de cada execução**, `CORE_SAAS_PERSISTENCE=memory`, cluster descartável, `ec` lido do processo | **N=3, três idênticos: 2997 · pass 2995 · fail 0 · skipped 2, `ec=0`** |
| Δ | por arquivo | **+59** = +54 da autoria (15+6+6+6+4+10+7) +5 do conserto (4 do guard + S11); 2938+59 = 2997 |
| F1 (determinística) | arquivo sozinho, com e sem escopo | verde **3/3** com · vermelho **3/3** sem |
| F2 (a colisão) | par das duas suítes, 5× | **5/5 `ec=0`**; vermelho-controle **1 em 5** no head intocado, mesmo comando |
| CI | `gh pr checks 385` | **7/7 pass** |
| guards de KPI | execução | 16/16 e 6/6 |

**A forma mudou, e isso é correção de método do orquestrador.** Sem recriar o banco o número **não
reproduz**: 5 execuções consecutivas contra o mesmo banco deram **5 vermelhos em quatro famílias**. Duas
hipóteses foram **refutadas por execução**: *nível de paralelismo* (em `--test-concurrency=4` as falhas
ficaram **determinísticas**, o que refuta) e *regressão do conserto* (a suíte de rateio passa **10/10** em
banco novo e nem importa o helper alterado). Causa real: `P-O6R-SUITES-DB-SEM-TEARDOWN`.

## §7 · A RE-VERIFICAR — o que a ata anterior AFIRMA e que NÃO entra como fato

> **§C7.1-bis item 2.1.** Nada abaixo é insumo. É afirmação de terceiro, a ser medida por você.

- **A RE-VERIFICAR:** *"a unidade faturável nasce na mesma transação da run"* — a ata afirma; meça no código
  do head, não no texto.
- **A RE-VERIFICAR:** *"a trilha divergência→ciência fica 0 → 0"* — a ata publica o censo `{completeRun: 1,
  registerDivergence: 0, acknowledgeRun: 0}`. Refaça o censo.
- **A RE-VERIFICAR:** *"`billing.meterCompletion` é obrigatório e o `tsc` recusa um 4º chamador"* — prove por
  **mutação**, não por leitura.
- **A RE-VERIFICAR:** *"o resumo soma no banco, sem teto de 10.000, e a acumulação em float fechou junto"*.
- **A RE-VERIFICAR:** *"18 das 20 mutações aplicadas e revertidas, todas vermelhas"*.
- **A RE-VERIFICAR:** o `0 fail` do `npm test` publicado na autoria — a **cadeira permanente já o reprovou**
  (N=1, não reproduziu), e o §9.1 da ata registra a correção. **Não herde nem a afirmação original nem a
  correção**: meça.
- **A RE-VERIFICAR:** *"o mérito foi aprovado 3×0"* — é verdade registrada, mas o que ela autoriza é **não
  rejulgar o mérito**; não autoriza tomar as conclusões técnicas da ata como medidas suas.

## §8 · Falhas declaradas do orquestrador — confira se contaminaram algo

1. **Convoquei seis identidades SEPULTADAS** para votar este delta. O `inspetor-de-terreno-da-junta`
   BLOQUEOU a junta por isso (2026-09-09). Corrigido: obituário §3.4 e identidades novas.
2. **Convoquei uma cadeira citando `§C7.1-quater`**, seção inexistente em ref. O ato foi determinação escrita
   do dono (§A1.1) e segue válido; a **citação** era falsa e virou correção explícita na §9 da ata.
3. **Dois alarmes falsos de medição**, ambos de procedimento meu, ambos refutados por execução e registrados
   no `note` do KPI: resíduo de banco lido como classe sistêmica, e reset de *schema* em vez de *banco*.
4. **A junta do delta não tinha briefing** — este arquivo existe porque o inspetor cobrou.
