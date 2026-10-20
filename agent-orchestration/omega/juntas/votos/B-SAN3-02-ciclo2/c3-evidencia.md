executor: Claude Code subagente · identidade: jurado-san302c2-c3-opus · modelo: Claude Opus (nível menor, declarado) · objeto: 09b380dab54946e16303c8bae0e95bbaa0d667a5 · mandato_md5: 6548dbe1e53be32860b475320638da51 (md5sum cru do arquivo do mandato) · corpo carregado × blob do objeto (EOL-neutro, tr -d '\r' | md5sum): ca59eefb5ba6130dab4c80f47ecdaf9a = ca59eefb5ba6130dab4c80f47ecdaf9a → IDENTICO

# C3′ — evidência — B-SAN3-02 ciclo 2 (junta de DINHEIRO)

Insumos A RE-VERIFICAR (plano v2, plano do ciclo 2 `R-B-SAN3-02-1.md`, ata do ciclo 1, relatório do dev, parecer do DBA): nada herdado como fato.
Sondas e scripts citados aqui: `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c3/` (fora do worktree).

## Legalidade (2026-10-20T07:14Z)
- `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` → 09b380dab54946e16303c8bae0e95bbaa0d667a5
- `gh pr view 448 --json headRefOid,state` → 09b380da… OPEN
- `git fetch origin main; git rev-parse origin/main` → 7f07844c (andou 1 commit desde a merge-base, #452 KPI); `git merge-base origin/main <objeto>` → B = 9009e81be3c5a711584747428c55707a17afc009
- parecer do inspetor `insp-san302c2-parecer.md`: LIBERADO COM RESSALVA (R-A…R-E), nomeia C3′ = `jurado-san302c2-c3-opus`, worktrees `w-jsan302c2-c3-…` e `w-jsan302c2-c3b-…`, banco via `teste-linux.sh` (tl<epoch><pid>). Check-runs 14/14 completed success (re-medidos no item 1.4).
- Inelegibilidade: meu nome não consta da lista do corpo (planejador-san3-02-*, critico-san3-02-*, fabrica-san3-02-*, devs, inspetor, DBA, orquestrador, outras cadeiras). O inspetor gerou 83 tokens `*-san3-02*` e conferiu 0 colisão com os 5 nomes do ciclo 2.
- Não li votos de outras cadeiras deste ciclo (c1r-*, c2-* existem no diretório; não abertos).

## Item 1 — regressão por nome, suíte inteira e CI

### 1.0 Terreno
- P8 antes de qualquer subida (07:15Z): `Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory` → commit livre 6,63 GB (≥ 4 GB); `docker ps` → só `erp-postgres`/`erp-redis` (base viva, não tocada) → trabalhos Docker alheios = 0; disco C: 12,6 GB (≥ 10 GB).
- `git worktree add --detach C:/Users/AMP/w-jsan302c2-c3 09b380da…` + `npm ci --no-audit --no-fund` (ec 0, 326 pacotes; node_modules diretório real, sem junction). `git worktree add --detach C:/Users/AMP/w-jsan302c2-c3b 9009e81b…` + `npm ci` (ec 0). `prisma generate` em cada (DATABASE_URL fictício `127.0.0.1:1`, nenhuma conexão).
- Ferramentas próprias (fora do worktree): `tap-parse.mjs` (parser TAP por seção `=====BEGIN/END <tag>`), `name-compare.mjs` (comparador de nomes base × objeto), `run-named-mem.sh`.

### 1.1 Base por nome — memória (host, runner `scripts/run-backend-tests.mjs`, sem DATABASE_URL → runner declara memory)
Comando: `bash run-named-mem.sh <wt> <log>` na base (`base-named-mem.log`) e no objeto (`obj-named-mem.log`); depois `node tap-parse.mjs <log> <suíte>` e `node name-compare.mjs b-<s>.json o-<s>.json`.

| suíte | base tests/pass/fail/skip | objeto tests/pass/fail/skip | nomes da base ausentes/não-ok no objeto |
|---|---|---|---|
| work-order-invoicing | 16/16/0/0 | 35/35/0/0 | 0 |
| work-order-financials | 31/31/0/0 | 31/31/0/0 | 0 |
| financial-titles | 64/64/0/0 | 64/64/0/0 | 0 |
| financial-titles-routes | 15/15/0/0 | 15/15/0/0 | 0 |
| financial-title-source | 17/17/0/0 | 17/17/0/0 | 0 |
| financial-period-closes | 13/13/0/0 | 13/13/0/0 | 0 |
| financial-summary | 13/13/0/0 | 13/13/0/0 | 0 |
| financial-uow-memory | 8/8/0/0 | 9/9/0/0 | 0 |
| financial-uow-journal-classification | 35/35/0/0 | 46/46/0/0 | **1 AUSENTE**: `[P7] a cobertura do harness … 30 fixtures … + 3 test_reset` |
| financial-entries | 78/78/0/0 | 78/78/0/0 | 0 |
| work-order-financials-routes | 8/8/0/0 | 8/8/0/0 | 0 |

N medido na base: invoicing **16**, financials **31** (= o esperado do plano §12). Todo ec do runner = 0.

**O ausente é um renome do teste contador.** `git diff B HEAD -- tests/financial-uow-journal-classification.test.ts` (hunk `@@ -460,9 +534,10 @@`): o nome embute as contagens, que passam de `30 … + 3 test_reset` para `40 … + 4 test_reset`; as asserções vão de `assert.equal(exercidos, 30)`/`(testReset, 3)` para `40`/`4`, ou seja, fortalecidas e não enfraquecidas. No objeto ele existe e passa: `ok 45 - [P7] … 40 fixtures … + 4 test_reset`. O relatório do dev NÃO traz o par antigo → novo: `grep -n -i '30 fixtures|40 fixtures|cobertura do harness' B-SAN3-02-dev.md` = 0; só diz `journal 46/46 (35 + 11)`. O **plano §3 D4**, que prevalece sobre o corpo, declara a mudança: "o comentário de contagem passa de 13+10+10 para 13+10+10+11", e 13+10+10+11 = 44 = 40 write/read + 4 test_reset. → **nota, não bloqueia**: o renome está declarado no plano, e a asserção ficou mais forte.

**Asserção enfraquecida, hunk a hunk:** `git diff --stat B HEAD -- tests/` dá 6 arquivos, +1958 e −7. As 7 linhas removidas são estas:
- `financial-uow-memory`, 1 linha: o `return { uow: createMemoryFinancialUnitOfWork({titles, entries, cheques, periodCloses}) … }` vira o mesmo objeto + `workOrderItems`. É dependência.
- `financial-uow-journal-classification`, 6 linhas: o comentário "TRÊS"→"QUATRO", a desestruturação de `repos()`, o `return` do `seed` (expandido com item) e as 3 linhas do contador (30/3 → 40/4, fortalecido).
- `work-order-invoicing.test.ts`: 0 linhas removidas.
- `financial-entries.test.ts`: +3 linhas (import e a dependência `workOrderItems` na construção da UoW de falha), igual ao §6.1.

Nenhuma asserção sobre comportamento antigo foi enfraquecida. **Veredito parcial 1.1 (memória): VERDE.**

**Vermelho-controle 1.1:**
- (a) Parser: `vc-tap.log`, cópia da seção `work-order-financials` mais `not ok 99 - fabricado-falha` e `ok 100 - fabricado-pulo # SKIP fabricado` → `pontos 33 failed ["fabricado-falha"] skipped ["fabricado-pulo"]`. Contou os dois.
- (b) Comparador: `vc-o.json` = o objeto com 1 nome removido e 1 renomeado sem par → `problemas` = exatamente 2 AUSENTE (o removido e o renomeado), ec 1.

O controle passou.

## Item 3 — o contrato não muda para quem já usa (medido antes da cauda do item 1, que roda no contêiner; P1 por item)

Sonda PRÓPRIA `sonda-contrato.mts`: app real `createApp(new MemoryCoreSaasAdapter(core))` em `listen(0, 127.0.0.1)`, 2 organizações, headers `x-tenant-id/x-user-id/x-role`. A auditoria só grava em `prisma` (`recordRequestAuditBestEffort` retorna cedo em memory), então a sonda lê os metadados na FRONTEIRA do controller: `audit-hook.mjs`/`audit-hook-impl.mjs`/`audit-stub.mjs` trocam o módulo `audit-request-context.js` só quando o importador é `work-order-financial.controller`, e o resto recebe o módulo real. Comparador próprio: `keys-compare.mjs`.
Comando (em cada worktree): `WT=<wt> OUT=<json> node --import tsx --import file:///…/audit-hook.mjs …/sonda-contrato.mts` → `SONDA OK casos=17` na base (`sonda-c3b.json`) e no objeto (`sonda-c3.json`); depois `node keys-compare.mjs sonda-c3b.json sonda-c3.json`.

| caso | base → objeto (código, reason) | chaves |
|---|---|---|
| 1º faturamento | 201 → 201 | corpo `{currency,data,invoicedItemCount,invoicedTotal}` igual; `data` só **+parentTitleId** (= null no objeto); sem tenant no corpo |
| replay sem delta | 409 `already_invoiced` → igual | `{error}` igual |
| OS sem itens | 422 `nothing_to_invoice` → igual | igual |
| título removido (DELETE 200) + itens carimbados | 422 `nothing_to_invoice` → igual | igual |
| competência fechada, com itens | 422 `period_closed` → igual | igual |
| **T-PREC2** replay em mês fechado | 409 `already_invoiced` → **409 `already_invoiced`** | igual |
| **T-PREC3** OS vazia em mês fechado | 422 `nothing_to_invoice` → **422 `nothing_to_invoice`** | igual |
| OS de outra organização | 404 `work_order_not_found` → igual | igual; o corpo não contém id da OS, valor nem tenant A (`vaza_id_ou_valor=false`) |
| OS cancelada (`POST /cancel` 200) | 422 `work_order_cancelled` → igual | igual |
| `due_date` inválida | 400 `invalid_due_date` → igual | igual |
| item depois do 1º faturamento | **409 `already_invoiced` → 201** complementar, `parentTitleId` = id do original (`parent_e_o_original=true`), `amount` 30, `invoicedItemCount` 1 | mudança AUTORIZADA (Q1) |
| `PATCH` de item carimbado | 422 `item_invoiced` → igual | igual |
| `DELETE` de item carimbado | 422 `item_invoiced` → igual | igual |
| `GET /financial-titles` | 200 → 200 | `{items,pagination}` igual; o item só ganha **+parentTitleId** (null no original) |
| `GET /financial-titles/:id` | 200 → 200 | `data` só **+parentTitleId** (null) |
| `POST /financial-titles` com `parent_title_id` e `work_order_id` | 201 → 201 | `parentTitleId` null e `workOrderId` null no objeto: ignorados; `data` só +parentTitleId |
| auditoria `work_order.invoiced` | base: n=3, chaves `{currency,invoicedItemCount,titleId}` → objeto: n=4, chaves `{complementary,currency,invoicedItemCount,titleId}` | só **+complementary** (valores false/true); proibidos (`amount`, `party_name`, `partyName`, `tenant_id`, `tenantId`, `token`, `path`, `bucket`) = 0; id de outra organização = 0 |

- **Precedência:** é IDÊNTICA à da base nos dois casos do plano (T-PREC2, T-PREC3) e em todos os outros casos com código. A única mudança de código ou `reason` é o caso da Q1. A mudança que a l.148 do corpo admitiria não existe, e nada precisou dessa exceção.
- **Códigos novos:** `git diff B HEAD -- src/`, com cada `reason` novo contado no plano. `invoice_items_changed` (plano 7×), `invoice_transient_conflict` (8×) e `invalid_parent_title_reference` (6×) estão todos declarados no §4/D5 ou na emenda v2.1 B1. `work_order_already_invoiced` já existia na base. Nenhum código novo fica fora do plano.

**Vermelho-controle 3:**
- (a) A sonda distingue base de objeto no caso "item depois do 1º faturamento": 409 → 201. As colunas não são idênticas.
- (b) Comparador: `vc-sonda.json` é o objeto com `invoicedItemCount` removido e `tenant_id` a mais no 1º faturamento. Resultado: `{"removidas":["invoicedItemCount"],"adicionadas":["tenant_id"]}` e `chaves_proibidas ["tenant_id"]`. Acusou os dois.
- (c) **M13** (apaguei as 2 linhas `parentTitleId: title.parentTitleId ?? null,` de `financial-title.dto.ts` no meu worktree): a sonda acusa `-parentTitleId` em 5 casos (1º faturamento, complementar, GET lista, GET :id, POST). Restauro: `git hash-object` = `46b1439c…` = `git rev-parse HEAD:…dto.ts`.
- (d) **M14** (`amount: result.totalAmount` nos metadados do controller): a sonda acusa `aud: adicionadas ["amount"], proibidos_presentes ["amount"]`. Restauro: `011711e8…` = blob.
- Depois do restauro, `git status --porcelain` está vazio.

**Veredito parcial item 3: VERDE.** Nenhum código ou `reason` mudou sem declaração, nenhuma chave foi removida, nenhum vazamento, e o replay segue 409.

## Item 2 — escopo fechado, registro APPEND, espelho e mutações (a amostra M29 vai em 2.5, no contêiner)

### 2.1 (a) Diff do BLOCO, `B..objeto` (51 caminhos), contra o PERMITIDO EXTRAÍDO
Comando: `git diff --name-status 9009e81b 09b380da > diff-B-obj.txt` (51 linhas). O PERMITIDO foi EXTRAÍDO por parse das tabelas §6.1 (plano v2) e §7.1 (`R-B-SAN3-02-1.md`), lidas do blob do objeto (`git show <obj>:…`). Classificador próprio `classify.mjs`, rodado como `MODO=bloco node classify.mjs plano-obj.md r1-obj.md diff-B-obj.txt`: 44 padrões permitidos e 17 proibidos nominais do §6.2 (até "**Travas", que é parágrafo de outros blocos). O §C4 gerado é `prisma/**`, `migrations/**`, `infra/**`, `.env*`, lockfiles, `pubspec*` e `Kpis/**`.
- **46 de 51** estão no PERMITIDO e fora de qualquer PROIBIDO nominal: os 13 `src/` (a Q3 só nos 3 `financial-uow`), 6 `tests/`, `ci.yml`, `RBAC_MATRIX.md`, `decisoes.md`, `pendencias.md`, 6 corpos de jurado (`.claude` + `.agents`), 6 `docs/revisoes/SAN3/B-SAN3-02-*` e 12 arquivos de `votos/B-SAN3-02/`.
- **2 caem no §C4 `prisma/**` e são autorizados pela Q2:** `prisma/schema.prisma` e UMA migração nova (`20260878000000_invoice_complementary_title`). `git diff --name-only B O -- prisma/` = só esses 2. O diff do `schema.prisma` tem 2 hunks, os dois dentro de `model FinancialTitle` (coluna `parent_title_id` + `@@unique` auxiliar + comentário), e nenhum outro modelo. A `20260811000000` não aparece no diff.
- **3 ficam fora do PERMITIDO**, e são registro, sem efeito no produto:
  - `agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo1.md`: a ata, que o plano §9 nomeia ("Ata: `agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo<n>.md`"). Autorizada pelo plano fora da tabela.
  - `agent-orchestration/omega/reprovacoes/R-B-SAN3-02-1.md`: o registro de reprovação que o CLAUDE.md §C7.4 exige (`omega/reprovacoes/R-<entrega>-<ciclo>.md`). Ver 2.2.
  - `agent-orchestration/controle/pendencias-indice.md`: índice GERADO. Ver 2.3.
- **`ci.yml`:** `git diff B O -- .github/workflows/ci.yml` dá 1 hunk `@@ -297,6 +297,8 @@` com exatamente `+SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"` e `+…migration-drill-db.test.ts` no job `backend-postgres`, e 0 linhas removidas. O resto é byte-igual.
- **`RBAC_MATRIX.md`:** `git diff -U0` = `@@ -122 +122 @@`, só a l.122. `--word-diff=porcelain`: só a frase de idempotência (índice parcial → anti-refaturamento por item + 1 original + complementar). Nenhuma permissão mudou.
- **Testes, hunk a hunk (ver 1.1):** `financial-entries` só +3 (a dependência); `financial-uow-*` só a D4 e o contador; `financial-titles*` e `work-order-financials` intocados.
- **PROIBIDO vazio:** nenhuma das 51 linhas casa com os 17 nominais do §6.2 (`src/modules/work-orders/**`, `financial-entries/**`, `cheques/**`, `financial-period-closes/**`, `financial-accounts/**`, `service-quotes/**`, `checklists/**`, `src/database/**`, `src/app.ts`, `src/config/**`, `prisma/seed*`, `frontend/**`, `mobile/**`, `Kpis/**`, `infra/**`, `scripts/**`, `tests/helpers/**`). No §C4: 0 `.env*`, 0 lockfile, 0 `package*.json`, 0 `Kpis/`.
- **Vermelho-controle:** a lista fabricada `vc-lista.txt` traz `src/database/rls.ts` (acusado X=`src/database/**`), `Kpis/kpis-latest.json` (X=`Kpis/**`, C4), uma 2ª migração `20260999000000_outra` (P=null, C4=`prisma/**`) e `pendencias.md` com 1 linha removida, essa acusada pelo detector de APPEND (`numstat` coluna 2 > 0 → `REMOVIDA: …pendencias.md 1`). Os quatro foram acusados.

**Veredito parcial 2.1: VERDE.**

### 2.2 (b) Incremento próprio do ciclo 2 (`8e6a6c29..09b380da^1` = `c2f9811f`), 16 caminhos
`git diff --name-status 8e6a6c29 c2f9811f` dá 16 linhas. `MODO=inc node classify.mjs …` usa o §7.1 (8 padrões) e o §7.2 (15 proibidos: `src/**`, `schema.prisma`, os testes antigos, `ci.yml`, `docs/deployment.md`, `scripts/**`, `Kpis/**`, `.claude/agents/**`, `.agents/agents/**` …). Resultado: 14 dentro do §7.1, 0 em PROIBIDO do §7.2, e 2 fora do §7.1, que são a ata `J-B-SAN3-02-ciclo1.md` e o `R-B-SAN3-02-1.md`, os dois registro (ver abaixo). Código: só 2 arquivos (a migração e o drill).
- **Migração.** As sentenças sem comentário nem branco, comparando `8e6a6c29` com o objeto, diferem SÓ por `> BEGIN;` (1ª) e `> COMMIT;` (última): `diff` ec 1 com exatamente essas 2 linhas, e esse ec 1 é também o controle do comparador. As 6 sentenças do down, extraídas depois de `^-- down`, são idênticas nos dois (`diff` ec 0, 6 `;`). `BEGIN;`/`COMMIT;` são a 1ª e a última sentença. O cabeçalho do down segue numa linha só, `-- down (MANUAL…psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>…)` (l.48).
- **Drill:** `numstat` +234 −5. As 5 linhas removidas são o import de `readFileSync` e o antigo `upStatements()`, e o que entrou foi `rawStatements()`, `upStatements()` com forma, `variantWithFailureAfter`, os ajudantes de base e o T-D(f). É o que o §7.1 permite.
- **`B-SAN3-02-dev.md`:** +58 −0 (APPEND). Votos, mandatos e quedas do ciclo 1 em `votos/B-SAN3-02/`: +0 removidas.
- **Classificação com motivo:**
  - **Ata do ciclo 1** em `omega/juntas/`: registro do orquestrador, nomeado pelo plano §9; o §7.1 só cita a ata genericamente na linha de `votos/`. Nota, sem efeito.
  - **`R-B-SAN3-02-1.md` versionado como arquivo próprio, e o `# ANEXO D` AUSENTE do plano:** `git show <obj>:docs/revisoes/SAN3/B-SAN3-02-plano.md | grep -c '^# ANEXO D'` = 0. O §7.1 mandava APPEND do Anexo D ao plano ("= este arquivo"). O conteúdo está versionado no objeto, no caminho que o §C7.4 do contrato exige; o que falta é a cópia no plano. É um **desvio de registro**, sem efeito no produto nem na rastreabilidade (o arquivo existe, com o mesmo texto) → **nota**, não bloqueia.
  - **Revisor independente do ciclo 2 AUSENTE:** `git grep -l -i -E 'rev-san302-c2-(agyopus|opus)' <obj>` = só o próprio `R-B-SAN3-02-1.md`; nenhum artefato de revisão do ciclo 2 em `erp-pausa-2026-10-03/revisoes/` (o inspetor recontou 0). O §9 do plano do ciclo 2 previa o revisor "antes da junta". Efeito medido: as verificações que caberiam a ele estão todas re-medidas nesta junta — o diff de 2 arquivos e as 6 sentenças byte-iguais aqui; o T-D(f) 3× e a M29 no 1.3/2.5; o resto pela C2′. Em bloco de dinheiro, a régua é a junta completa (§C7 item 8(1)), não o revisor. É um passo de orquestração pulado, não um defeito do diff → **nota/pendência de registro**, não bloqueia. A ata deve registrar a ausência.

**Veredito parcial 2.2: VERDE COM NOTAS** (Anexo D e revisor ausentes).

### 2.3 (c) O merge da `origin/main` (`09b380da`, pais `c2f9811f` e `9009e81b` = B)
- `git merge-tree --write-tree --name-only c2f9811f 9009e81b` dá CONFLICT em `decisoes.md` e `pendencias-indice.md`, e marcadores também em `pendencias.md`. `git diff --name-only <árvore-automática> 09b380da^{tree}` = esses 3 arquivos, e só eles: o merge tem conteúdo próprio SÓ na resolução.
- Linhas removidas pelo merge: `decisoes.md` 0 contra `c2f9811f` e 0 contra B; `pendencias.md` 0 e 0. Linhas do objeto que não existem em nenhum dos dois pais (`comm -23` ordenado e sem CR): 0 em `decisoes.md` e 0 em `pendencias.md`. A resolução só tirou marcadores de conflito e uniu os dois lados.
- **`pendencias-indice.md` × o gerador:** copiei `gerar-indice-pendencias.py` e `pendencias.md` do blob do objeto para a árvore descartável `jsan302c2-c3/gen-indice/` (`git -c core.autocrlf=false show`) e rodei `python agent-orchestration/controle/gerar-indice-pendencias.py` nela: `590 cabecalhos / 579 IDs`, ec 0. `cmp gerado indice-do-objeto` → **IGUAL byte a byte**. As linhas "perdidas" (14 contra o ramo, 7 contra a main) são contadores regenerados, não conteúdo nem lixo de conflito.
- **Vermelho-controle:** `vc-indice.md` (o índice do objeto com a l.20 apagada) dá `cmp` ec 1.
- **Registro APPEND, bloco inteiro** (`git diff --numstat B O -- agent-orchestration/controle/ agent-orchestration/docs/status-geral.md agent-orchestration/codex/log-execucao.md`): `decisoes.md` +11 −0, `pendencias.md` +41 −0, `pendencias-indice.md` +12 −7 (gerado, IGUAL ao gerador). `status-geral.md` e `log-execucao.md` não estão no diff. 0 linhas removidas em registro digitado.
- **Normas (ref = objeto, `decisoes.md`):** `D-GOV-PROPORCIONAL` → l.2940 (e CLAUDE.md l.345); `D-Ω4-C2` → l.609; `D-Ω4-C1` → l.610; `REGISTRO-SAN3-CONFLITOS` → l.2316; `D-SAN3-02-TITULO-COMPLEMENTAR` → l.3765, com ***"sim para tudo"*** e "revê o MECANISMO da `D-Ω4-C2`" (l.3765), e a nota "o motivo e a `D-Ω4-C1` não mudam" (l.3810). Q1–Q4 com as palavras do dono (l.3811). `P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED`: ausente na ref (0 em `pendencias.md`) e, pelo item 3, desnecessária; a norma ausente não se aplica.
- **Pendências `P-Ω4-3-INVOICE-ATOMIC` (l.1081), `-INVOICE-TOCTOU-DELETE` (l.1102) e `-REFATURAR-DELTA` (l.1058):** todas com `status: ABERTA` no objeto e no índice. Nenhuma consta como FECHADA, então não há fechamento sem teste. O plano §10 deixa o fechamento para o pós-merge (PR #/merge sha).

**Veredito parcial 2.3: VERDE.**

### 2.4 Espelho e mutações
- `node scripts/sync-agent-agents.mjs --check` no meu worktree do objeto: `OK — 76 agentes, espelho consistente.` ec 0.
- **Vermelho-controle:** árvore descartável `jsan302c2-c3/vc-espelho/` (cópia de `scripts/sync-agent-agents.mjs`, `.claude/` e `.agents/`). Intacta, ec 0. Com 1 linha apensada a `.agents/…/jurado-san302-c3-regressao-e-contrato.md`, `DIVERGE: …` e ec 1. Árvore removida; `git status --porcelain` do worktree = 0.
- **Contagem de mutações no relatório do dev:** `grep -o -E '\bM[0-9]+[a-z]?(′|″)?' B-SAN3-02-dev.md | sort -u` dá 36 tokens. Tirando `M4b`/`M4c`, que são nomes de teste (T-M4b/T-M4c), ficam 34; com M11 e M11b contados como um identificador (M11 1ª forma equivalente → M11b), ficam **33** = 30 do ciclo 1 + M29/M29b/M29c. Cada uma tem teste e resultado na tabela, e os comandos estão por lote (`mutar.py spec_mem.py` na memória; `lote.sh`/`lote2.sh` no contêiner, l.221/236).
- **As três contagens do objeto:** Anexo B do plano = 30; `R-B-SAN3-02-1.md` l.142 = "24 → **27**"; relatório do dev = **33/33**. O "24 → 27" do plano do ciclo 2 parte da base errada (24 da v2 sem a v2.1/v2.2), e o próprio dev aponta o erro de aritmética (l.238). O corpo cobra "18 (M1…M16)", texto anterior às emendas; vale o plano (30 + 3). → **nota de registro**, sem efeito.
- **Amostra reexecutada (escolha minha):** **M3** (memória, ciclo 1) e **M29** (ciclo 2, em 2.5).
  - **M3:** no meu worktree, `sed` troca `if (invoicedItemCount !== items.length) {` por `if (false && …)` em `work-order-financial.service.ts` (1 ocorrência); `node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts` → ec 1, `not ok 18 - [B-SAN3-02][T-A3] …`, **pass 34 · fail 1**, igual ao relatório ("VERMELHA 1/35"). Restauro `git hash-object` = `1d944e52…` = blob.

## Item 1 (continuação: a cauda medida no contêiner, depois dos itens 3 e 2)

### 1.2 Suíte inteira no objeto (check, lint, build, npm test na forma do job `backend`)
- **Host, worktree do objeto** (o job `backend` roda `npm run db:generate` antes do `check`): sem o client gerado, `npm run check` dá ec 2 (269 `error TS`, `@prisma/client has no exported member` — ambiente, não produto). Depois de `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npm run db:generate` (ec 0): `npm run check` ec **0**, `npm run lint` ec **0**, `npm run build` ec **0**. O `dist/` foi apagado logo depois.
- **`npm test` na forma do job `backend`**: `bash …/ferramentas/teste-linux.sh C:/Users/AMP/w-jsan302c2-c3 "$(cat cmd-obj.sh)"`, ID **`tl179248111267270`** (meu; contêineres `-pg`/`-redis`/`-run`, rede própria, sem porta publicada). O ambiente é o do blob do `ci.yml`: `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL`/`REDIS_URL` do cluster próprio, `npm ci` + `prisma generate` + `prisma migrate deploy` dentro do contêiner. O runner declara: `CORE_SAAS_PERSISTENCE=memory — herdado do ambiente`. P8 antes: commit livre 7,27 GB, 0 trabalhos alheios, disco 13 GB.
- Parser (`node tap-parse.mjs obj-container.log npmtest`): **tests 3762 · pass 3751 · fail 9 · skipped 2**; runner: `327 arquivo(s) · 3762 teste(s) · pass 3751 · fail 9 · skipped 2`.
  - **Skips nomeados (2) = o orçamento nomeado no runner** (`SKIP_BUDGET_DB = 2`, l.~90): "toda permissão do catálogo existe na tabela `permissions` do banco" e "os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções)".
  - **As 9 falhas são TODAS de `tests/traccar-dev-topology.test.ts`**, com o erro `B-TRC-01 topologia: não foi possível executar "docker compose" (spawnSync docker ENOENT)`: o contêiner da ferramenta não tem o binário `docker`. A origem do arquivo é `c1485c94 2026-10-18 feat(traccar)… (B-TRC-01) (#426)` (`git log --diff-filter=A`), e `git diff --name-only B HEAD -- tests/traccar-dev-topology.test.ts docker-compose* infra/` = 0, ou seja, fora do diff do bloco. Os mesmos 9 nomes estão **`ok`** nos dois check-runs `backend` da CI do objeto (jobs 118472540942 e 118472525167). → `pre-existente` de ambiente, com origem e data (B-TRC-01, 2026-10-18), verde no log do job `backend` da CI do objeto. **Não reprova** (§C7.1-ter(a)).
  - **Conjunto de nomes contêiner × CI do objeto:** 3762 = 3762. As únicas 7 diferenças de nome são o mascaramento de segredo do log do GitHub (`***` no lugar de `Bearer token` / `--password=x`); afora isso, os conjuntos são idênticos.
- **Denominador da CI** (pelo parser dos logs baixados com `gh api …/actions/jobs/<id>/logs`):
  - `backend` do objeto: 3762/3760/0/2 nos 2 gatilhos, com os mesmos 2 skips nomeados. `backend` de B: 3708/3706/0/2.
  - Delta +54 = invoicing memória +19, uow-memory +1, journal +11, atomic-db +17 e drill +6.

**Veredito parcial 1.2: VERDE.** Fail 0 no que o bloco toca; as 9 falhas são de ambiente, pré-existentes e verdes na CI; skips = 2, nomeados.

### 1.1-bis Regressões `-db` do financeiro (§7.6 passo 4), por nome, base × objeto (cluster descartável)
- Objeto: o mesmo `tl179248111267270`. Base: `bash teste-linux.sh C:/Users/AMP/w-jsan302c2-c3b "$(cat cmd-base.sh)"`, das 07:44 às 07:47Z, ec 0; antes de subir: 0 trabalhos alheios, commit livre 8,04 GB, disco 13 GB. Rodei `node --test --import tsx --test-reporter=tap tests/<s>.test.ts` em cada suíte, separada por marcador, e comparei com `name-compare.mjs`.

| suíte | base | objeto | nomes da base ausentes ou não-ok |
|---|---|---|---|
| financial-title-invariants-db | 15/15/0/0 | 15/15/0/0 | 0 |
| financial-pay-title-atomic-db | 4/4/0/0 | 4/4/0/0 | 0 |
| cheque-clear-bounce-atomic-db | 11/11/0/0 | 11/11/0/0 | 0 |
| financial-entry-reverse-restore-db | 8/8/0/0 | 8/8/0/0 | 0 |
| financial-entry-delete-reverse-race-db | 9/9/0/0 | 9/9/0/0 | 0 |
| financial-period-close-write-race-db | 6/6/0/0 | 6/6/0/0 | 0 |
| pg-barrier-scoped-db | 2/2/0/0 | 2/2/0/0 | 0 |
| financial-period-lock-guard | 2/2/0/0 | 2/2/0/0 | 0 |

**Veredito parcial: VERDE.**

### 1.3 Suítes `-db` novas, 3 vezes seguidas no meu cluster (`tl179248111267270`)
| rodada | `work-order-invoicing-atomic-db` | `work-order-invoicing-migration-drill-db` | nomes reais (fonte) × TAP |
|---|---|---|---|
| r1 | 17/17/0/0 | 6/6/0/0 (com o **T-D(f)**) | `check-newdb.mjs`: ok 23 de 23, 0 skip, 0 fail |
| r2 | 17/17/0/0 | 6/6/0/0 | ok 23 de 23 |
| r3 | 17/17/0/0 | 6/6/0/0 | ok 23 de 23 |

O denominador fica estável (17 e 6) nas 3 rodadas, com 0 skip e 0 fail. Os nomes vêm da fonte do objeto (`test("…")` sem o caso `exige DATABASE_URL`): 17 + 6 = 23.

**Vermelho-controle 1.3 — as suítes novas contra o `src/` de B:**
- Montagem: no meu worktree da base (`w-jsan302c2-c3b`), copiei do objeto `prisma/schema.prisma`, a migração `20260878000000` e as 2 suítes novas, com `git hash-object` = blob do objeto nos 4 arquivos (`d4dd5dbe`, `663d4071`, `e892e820`, `7ba02c80`). O `src/` ficou o de B (`work-order-financial.service.ts` = `4dcf12b1` = blob de B). Rodei `bash teste-linux.sh <c3b> "$(cat cmd-vcB.sh)"`, das 07:48 às 07:50Z.
- **`atomic-db` contra o src de B: 17 tests · 4 pass · 13 fail.** As 13 são todas funcionais (`AssertionError`, `Missing expected rejection`, ou o 409 `WORK_ORDER_FINANCIAL_CONFLICT` "already been invoiced" do código antigo), nenhuma de import. Falham T-A2, T-A4, T-R1, T-R2, T-R2b, T-R4, T-Z2, T-Z3, T-C1d, T-C6, T-C9d, T-RLS e T-C8d. Passam 4, e cada uma tem razão:
  - **T-C5-db**: INSERT cru, mede o índice da migração, não o src.
  - **T-K4b**: o `markInvoiced` já tinha `invoiced_at: null` na base Ω4-3; é guarda de regressão.
  - **T-Z1**: o `zero` da base já respeitava o carimbo.
  - **T-A4b**: na base, o 2º original também acaba em 409 `already_invoiced`, pelo caminho antigo.
- **`migration-drill-db` contra o src de B: 6/6 passam.** A suíte não importa nada de `src/` (só `node:*` e o CLI do Prisma) e mede a MIGRAÇÃO, que é do bloco. Quem a deixa vermelha são as mutações da migração: veja a M29 em 2.5.
- Restauro do `c3b`: `git checkout -- prisma/schema.prisma` (`d67db69a` = blob de B) e remoção dos 3 caminhos copiados; `git status --porcelain` = 0. O worktree da base foi removido em seguida com `git worktree remove --force` (R-D).

**Veredito parcial: VERDE.**

### 1.4 CI do objeto (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`, mais os logs dos jobs)
- **Objeto `09b380da`: total 14, todos `completed`/`success`** (7 jobs × push e pull_request: docker, backend-postgres, authority-portal, owner-portal, flutter, frontend, backend). **B `9009e81b`: total 8**, 7 success e `deploy` skipped.
- **`backend-postgres` do objeto** (jobs 118472541118 e 118472524931; o log foi baixado e o carimbo de tempo tirado): **414/414/0/0** nos dois, e `testes pulados: 0` (o guard de zero skip passou; job `success`). B (118470235588): 391/391/0/0. **Δ = +23**, exatamente os 17 do `atomic-db` mais os 6 do `drill`.
- **As 2 suítes novas executaram com banco no `backend-postgres`:** `check-newdb.mjs` sobre o TAP do log dá **ok 23 de 23** nos dois gatilhos. Cada nome real das duas suítes, o `[T-D(f)] para k = 1..6 …` entre eles, aparece como `ok`, sem `# SKIP`.
- **`backend` do objeto:** 3762/3760/0/2 nos dois gatilhos, com os 2 skips nomeados do orçamento; os 9 `traccar:` dão `ok`. B: 3708/3706/0/2.

**Veredito parcial 1.4: VERDE.**

**Item 1 — veredito: VERDE.** Há uma nota não bloqueante, o renome declarado no plano D4 do teste contador do harness (30/3 → 40/4, com a asserção mais forte), e um `pre-existente` de ambiente: os 9 `traccar-dev-topology` sem binário `docker` no contêiner da ferramenta, origem B-TRC-01 (2026-10-18), verdes na CI do objeto.

## Item 2 (continuação)

### 2.5 Amostra do ciclo 2: **M29** (sem `BEGIN;`/`COMMIT;`), reexecutada por mim
- Mutação aplicada na CÓPIA `/w` do contêiner (o arquivo do meu worktree não é tocado): `bash teste-linux.sh C:/Users/AMP/w-jsan302c2-c3 "$(cat cmd-m29.sh)"`, das 07:51 às 07:54Z, ec 0. Antes de subir: 0 trabalhos alheios, commit livre 7,83 GB, disco 13 GB.
- `sed -i -E '/^(BEGIN|COMMIT);\r?$/d' <migração>`: sha256 `807b685e…` → `64c71665…`, com BEGIN/COMMIT indo de 2 para 0.
- **Drill sob M29: 6 tests · 1 pass · 5 fail.**
  - **T-D(f) not ok**: `k=1: depois do deploy falho o catálogo é o de ANTES…`, `+ column: 1 / - column: 0`. É o C2-01 reproduzido, igual ao relatório ("k=1 `column 1`").
  - **T-D(b)** fica vermelho pela forma.
  - **T-D(d)/(c)/(e)** caem na cascata da base compartilhada, que o relatório do dev descreve na l.244.
  - **T-D(a) ok.**
- **Restauro:** a cópia volta para sha256 `807b685e…` (= o de antes) e `git diff --quiet` dá 0. Na mesma execução, o **drill-controle rodado depois do restauro dá 6/6**.
- No host, o arquivo do worktree: `git hash-object` = `663d4071…` = `git rev-parse HEAD:<migração>`; `git status --porcelain` = 0.
- **A mutação declarada pelo dev reproduz.**

**Irmão de ec 1 para as provas de igualdade:**
- `diff` up C1×O: ec 1 com as 2 linhas, e o controle do down está em 2.2.
- `cmp` do índice: ec 1 com a linha fabricada a menos.
- `sync --check`: ec 1 com a cópia divergente.
- `git diff --quiet`, que só usei no restauro da M29: a mutação ativa muda o sha256 da cópia (`64c71665` ≠ `807b685e`), ou seja, havia diferença antes do restauro.

**Item 2 — veredito: VERDE COM NOTAS** (não bloqueiam): `# ANEXO D` ausente do plano (o R-file está versionado); revisor independente do ciclo 2 ausente (as checagens dele foram re-medidas pela junta); as três contagens de mutações divergem no registro (30 / "24→27" / 33), sem efeito.

## Fechamento (07:55Z)
- O objeto foi re-resolvido no fim pelas duas fontes: `09b380dab54946e16303c8bae0e95bbaa0d667a5`, **NÃO andou**. `origin/main` = `7f07844c`, igual ao início. Check-runs `[14, 0]` (total, não-verdes).
- **Teardown.**
  - Hashes conferidos por `git hash-object` = blob em dto, controller, service e migração; o schema da base também confere.
  - `git status --porcelain` = 0 nos dois worktrees, antes de removê-los.
  - Contêineres e redes `tl1792…` e `jsan302c2-c3` = 0, porque o trap da ferramenta os removeu nas 4 subidas.
  - `git worktree remove --force` em `w-jsan302c2-c3b` (07:50Z) e `w-jsan302c2-c3` (07:55Z); `git worktree list` = 0.
  - Removidos `dist/`, `gen-indice/` e `vc-espelho/`.
  - Base viva intocada. Disco livre ao fim: 14 GB.
  - Nada commitado.
- **Veredito:** item 1 VERDE · item 2 VERDE COM NOTAS · item 3 VERDE → **APROVADO** (detalhes e achados N1–N4 e PE1 em `c3-voto.json`).

VOTO: APROVADO — regressão, escopo e contrato íntegros no objeto 09b380da; notas N1–N4 (registro/processo) e PE1 (ambiente pré-existente, verde na CI) não bloqueiam.
