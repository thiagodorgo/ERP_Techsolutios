# B-SAN3-20 — relatório do DEV

- Papel: DEV do bloco; não planejou, não criticou e não votará.
- Modelo: Codex (nível menor conforme mandato do bloco).
- Worktree: `C:/Users/AMP/w-san320`.
- Branch: `fix/cheque-x-baixa`.
- Base inicial: `origin/main@7ab2fe71d0d40c2be51a790f0d20893651cdf972`.
- PR: `#456` — aberto como **rascunho bloqueado**, sem autorização de merge.
- Plano: v3 final, lido integralmente com as críticas r1/r2 e a resposta literal do dono: **"A: só pela compensação (Recomendado)"**.
- Regra de parada: premissa do plano falsificada pelo código ou pela execução é registrada aqui com comando e saída; o DEV não improvisa remédio novo.

## Retomada (Claude Opus, cobrindo o Codex)

- **Quem:** `dev-san320-opus`, Claude **Opus** (nível menor, declarado — §C7.6). O dev anterior, Codex `gpt-5.6-sol`, caiu por **limite de uso** às 18:15Z de 24/10 (log `codex-dev-san3-20b.log`, fim: `You've hit your usage limit … try again at 7:19 PM`), no passo 4 da bateria (regressões `-db`). Regra do dono (24/10): *"vc tambem cobre que cair por limite"*. Não planejei, não critiquei e não voto.
- **Cópia de segurança antes de tocar:** `C:/Users/AMP/erp-pausa-2026-10-03/backup-san320-1816Z/`. Medido: `git diff > cur.diff; cmp cur.diff backup/nao-commitado.diff` → **iguais** (nada mudou entre o backup e a retomada).

### R0 — o que medi do parcial (P3: só vale o que tem comando registrado)

- **Terreno:** `git log --oneline -6` → `f4e6370e` (fix, local) · `aaad4fe1` (test, local) · `1260ab23` (empurrado) · … · `7ab2fe71` (base). `git status --short` → 11 modificados + 4 novos, iguais ao inventário do orquestrador. Container `dev-san320-pg` no ar (`docker ps`: `127.0.0.1:55433->5432/tcp`) — reaproveitado.
- **Baseline com a E1 (re-lido no log do Codex, comando e saída lá registrados):** depois do `prisma generate` sobre o schema-base (saída "Start by importing your Prisma Client", log l.~11788), o comando literal da Medição 2 → `[run-backend-tests] 9 arquivo(s) · 280 teste(s) · pass 280 · fail 0 · skipped 0` (log l.17626); `migrate deploy` + as 3 `-db` → `3 arquivo(s) · 30 teste(s) · pass 30 · fail 0 · skipped 0` (log l.18170). **Confere com o critério da E1 (280/280, 30/30).** Não re-executei o baseline na base: exigiria desfazer o código do bloco no worktree (proibido `stash`/`reset`) ou um segundo `npm ci`; o comando e a saída estão no log, e o `npm test` inteiro roda de novo no fim.
- **Escopo do parcial × §3.1/§3.2 do plano:** `git diff --stat 7ab2fe71` (commitado + árvore) → 31 arquivos, todos dentro do PERMITIDO. Ponto de atenção: o commit `f4e6370e` pôs `chequeRequiredError` em `src/modules/financial-entries/financial-entry.repository.ts` (**PROIBIDO** pelo §3.2); a árvore não commitada do Codex já o **devolvia** (a fábrica foi para `financial-entry.service.ts`). Medido: `git diff 7ab2fe71 -- src/modules/financial-entries/financial-entry.repository.ts` na árvore → **vazio**. Aproveitado; o arquivo proibido sai do PR com diff líquido zero.
- **Lido contra o desenho (D1′–D8):** migração (3 DDL + `BEGIN`/`COMMIT` + down no rodapé) e `schema.prisma` iguais ao §2.4; D1′ Prisma (`status: "registered"` no `where` de `update`/`softDelete`, P2003 pelo nome da constraint) e serviço (releitura → 404/422); D2/D3 (lançamento com `reserved.titleId`, `applyPaymentGuarded` + receita de classificação do `payTitle`, `restorePaymentGuarded` no bounce); D4 (`cheque_required` no `payTitle` depois de moeda e antes do período); D5 (ordem nova); D6; D8a/D8b (CAS de `changeStatus` com releitura/retentativa/`409`; `applyPayment` absoluto removido da interface, dos dois repositórios, do `TITLE_REPO_KIND`, do delegador e do harness).
- **Desvios achados no parcial (corrigidos por mim, dentro do plano, cada um com o item que manda):**
  1. **Memória de `update`/`softDelete` de cheque não era check-and-set síncrono** (D1′ e H10: "sem `await` entre ler e escrever, como `transition`"): o código fazia `await this.findById(...)` e só depois checava e gravava — uma `transition` intercalada nesse intervalo seria sobrescrita com o objeto velho. Passa a ler `this.cheques.get` e gravar no mesmo trecho síncrono, como `transition`.
  2. **Precedência do `POST /financial-entries`** (§1: "`400` de corpo → `400/422` de conta → `422 cheque_required` → `422 period_closed`"): o parcial recusava `check` **antes** de validar `direction`/`amount`/etc. Os campos do corpo passam a ser lidos antes da recusa (a conta continua primeiro, como na base).
  3. **Drill (K7/K12) fora da forma do plano:** T-D(f) simulava DDL numa tabela de brinquedo em `$transaction` (não lia a migração, não usava o `migrate deploy` real; M19 não ficaria vermelha); T-D(c) fazia down + `ROLLBACK`, não up → down → re-up (M20′ não ficaria vermelha); tudo na base compartilhada. Reescrito no molde do precedente mergeado `tests/work-order-invoicing-migration-drill-db.test.ts` (base própria por `CREATE DATABASE`, CLI real com `--config` temporário, k = 1..3, `resolve --rolled-back` + `deploy`).
  4. **Testes de concorrência ausentes:** T-K2d/T-K2e, T-K10a/b/c, T-K11a/b/h não existiam (os 5 `K11-db` do parcial são sequenciais). Escritos com barreira causal (vencedor segurado em tx própria, perdedor observado bloqueado em `pg_stat_activity`). E faltavam em memória T-K1d, T-K3c, T-K4 por HTTP, T-K5, T-K6b, T-K9a/c por HTTP, T-K10d, T-K11d, T-K11f.
- **Aproveitado sem mudança:** baseline (log), fixture K12 (`tests/fixtures/prisma-migrate-diff-baseline.sql`, gerada antes de editar schema/migração, commit `aaad4fe1` antes de `f4e6370e`; sha256 conferido em R1 abaixo), migração, schema, código de produto exceto os itens 1–2, os 26 testes de memória e os 7 + 5 `-db` do parcial.

### R1 — código: os dois desvios de produto corrigidos (comando → saída → veredito)

- `src/modules/cheques/cheque.repository.ts`: `update`/`softDelete` em memória passam a ler `this.cheques.get` e gravar no mesmo trecho síncrono (D1′/H10). `src/modules/financial-entries/financial-entry.service.ts` (`create`): corpo inteiro lido antes da recusa `cheque_required` (§1). Efeito colateral declarado: para **qualquer** método, um corpo inválido passa a responder `400` antes de `422 period_closed` (antes, `direction`/`amount` inválidos com período fechado davam `period_closed`) — é a precedência que o §1 escreve, a mesma que o `payTitle` já tinha.
- `npm test -- tests/cheque-title-link.test.ts` → `1 arquivo(s) · 38 teste(s) · pass 38 · fail 0 · skipped 0` (26 do parcial + 12 novos: T-K1d, T-K3c, T-K6b, T-K10d(+T-K10e mem), T-K11d, T-K11e intercalado, T-K11f, T-K4a/b/c HTTP, T-K5 HTTP ×2, T-K9a HTTP, T-K9c HTTP; e T-K1f com a precedência do fast-fail, T-K2b com T-K8d). **Veredito:** verde.
- Nota (T-K1d): título e conta só aceitam `BRL` pelas portas públicas (`currency must be BRL.`, medido); a conta `USD` entra direto no repositório de memória para exercitar a guarda — a guarda é rede para quando houver outra moeda.
- Nota (T-K9c, auditoria): em memória `recordRequestAuditBestEffort` retorna sem gravar (`env.CORE_SAAS_PERSISTENCE !== "prisma"`, `audit-request-context.ts` l.39); os metadados são o literal fixo `{direction, status}` de `cheque.controller.ts`, que o bloco não toca (`git diff --quiet 7ab2fe71 -- src/modules/cheques/cheque.controller.ts src/modules/cheques/cheque.routes.ts` → exit 0, conferido na bateria).

### R2 — barreiras `-db` (K2d, K2e, K5, K10a/b/c/e, K11a/b/c/h)

- `DATABASE_URL=<dev-san320> CORE_SAAS_PERSISTENCE=prisma npm test -- tests/cheque-title-link-atomic-db.test.ts` → `15 teste(s) · pass 15 · fail 0 · skipped 0` (7 do parcial + T-K2d, T-K2e, T-K5 ×2, T-K10a, T-K10b, T-K10c, T-K10e). **H3 medida:** no T-K2d o `clear` perdedor é observado bloqueado com o texto `financial_titles` (o `UPDATE` condicional), não no `INSERT` do lançamento; sem `40P01`.
- `… npm test -- tests/financial-title-status-cas-db.test.ts`, **3 execuções** → `9 · pass 9 · fail 0 · skipped 0` nas três (5 do parcial + T-K11a, T-K11b, T-K11c, T-K11h). **H11 medida:** T-K11a/b dão `422 invalid_status_transition`; T-K11h dá a retentativa vencedora (1 vencedor) e `409 title_status_conflict` (3 mudanças forçadas).
- **Corrigido no parcial:** o teste `K11-db: changeStatus do repositório casa o estado lido` chamava `repo.changeStatus({ …, titleId })` — o campo é `financialTitleId`; com `undefined` o `where` do Prisma ignora o id e casa pelo tenant (verde por acaso, um título por tenant). Passa a `financialTitleId`.
- **Arnês do T-K11h (medido):** o 2º vencedor (W2) precisa de predicado que aceite a versão **visível** no snapshot (`status IN ('open','scheduled')`); com `status = 'scheduled'` o scan descarta a tupla `open` e W2 nunca entra na fila (`0 !== 1`, 1ª execução). E o perdedor que re-checa e casa 0 linhas fica com a linha travada até o fim da sua transação (EvalPlanQual trava a versão nova antes de re-checar) — W2 só anda depois do commit dela, como o teste espera.
- **F-DEV-02 (nota de execução sobre o §2.5, não sobre o remédio):** a linha "`PATCH title_id` × `deposit` … deposit → `409 transition_conflict`" não se realiza: com o PATCH vencendo, o `deposit` bloqueia no `UPDATE … WHERE status='registered'`, a re-checagem vê a tupla nova (ainda `registered`, agora com `title_id`) e **passa** — o PATCH não muda o status. É o resultado sequencial (PATCH depois deposit = os dois valem), que é o que a própria P2 do §2.5 manda ("o perdedor recebe o erro do caso sequencial"). Medido no T-K10b (ordem 2: deposit `fulfilled`, cheque `deposited` com `title_id`). Nenhum remédio novo; o teste prende o comportamento medido. `409` do deposit só existe em deposit × deposit (fora do par).

### R3 — drill K7 + K12 reescrito no molde do precedente

- `… npm test -- tests/cheque-title-link-migration-drill-db.test.ts` → `6 teste(s) · pass 6 · fail 0 · skipped 0`. Saídas: `[drill] base própria san320_drill_<…>: migrate deploy em ~15 s`; `[drill K12] diff atual: 72 sentenças; fixture: 72; a mais: 0; a menos: 0`; `[drill T-D(f)] k=1/2/3: atômico e convergente` (~7 s cada).
- Casos: T-D(a) catálogo (coluna `uuid` anulável, `pg_get_constraintdef` = `FOREIGN KEY (tenant_id, title_id) REFERENCES financial_titles(tenant_id, id) … ON DELETE RESTRICT`, índice btree `(tenant_id, title_id)`, linha aplicada em `_prisma_migrations`); T-D(b) down → legado sem a coluna (um apagado) → up ec 0, 2 linhas com `title_id` NULL; T-D(c) up → down do rodapé em transação única → `{column:0, fk:0, index:0}` → re-up → `{1,1,1}`; T-D(d′)/K12 delta sentença a sentença contra a fixture; T-D(e) `relrowsecurity`/`relforcerowsecurity` e `23503` para título de outra organização; T-D(f) k = 1..3 pelo CLI real com `--config` temporário, P3009, `resolve --rolled-back`, `deploy`.
- **Contagem da fixture:** `grep -c -E '^(ALTER|CREATE|DROP)'` = **76 linhas** (o número do plano, F32); normalizada por sentença = **72** (sentenças multi-linha têm mais de uma linha que começa por `ALTER`). Os dois lados passam pela mesma normalização; a comparação é por conjunto de sentenças.
- **Windows (EBUSY):** o `after` do precedente remove o diretório temporário do `--config` com `rmSync` simples; aqui deu `EBUSY` duas vezes (com `maxRetries: 20` também). Medido: o diretório fica livre em **~4,7 s**; o `after` passa a tentar por até 60 s e imprime o tempo. Nota: o precedente (`work-order-invoicing-migration-drill-db`) tem o mesmo `rmSync` e deixou dois diretórios `san302-drill-*` no `%TEMP%` desta máquina quando a sessão do Codex caiu no meio dele (15:14–15:15) — não são deste bloco; a remoção deles foi negada pelo classificador desta sessão e fica para o orquestrador.

### R4 — registro: um erro de registro do parcial corrigido, e o que o §5.5 pedia

- **Erro achado e desfeito:** a árvore do Codex marcava **`P-Ω4-3-INVOICE-LEASTPRIV`** (rota de faturamento sem `work_order_financials:read`, outra pendência, l.1117) como "FECHADA em B-SAN3-20" com a evidência deste bloco. Medido: `grep -n "^## P-" pendencias.md` → a linha editada (l.1121) fica sob `## P-Ω4-3-INVOICE-LEASTPRIV` (l.1117); `P-Ω4-7-DUPLA-CONTAGEM` está na l.1389 e seguia ABERTA. Desfeito (a LEASTPRIV volta ao texto da base, ABERTA) e a `P-Ω4-7-DUPLA-CONTAGEM` passa a FECHADA — "vale no merge, depois da junta de dinheiro" — com a evidência e o limite (por linha de cheque). `python agent-orchestration/controle/gerar-indice-pendencias.py` → `601 cabecalhos / 590 IDs | {'FECHADA': 151, 'ABERTA': 447, 'SEM-STATUS': 3}`; a `DUPLA-CONTAGEM` está na seção `## FECHADAS — 151` do índice e a `LEASTPRIV` entre as abertas.
- **`API_CONTRACTS.md`:** os ids de contrato seguem o plano (`financial_title_mutation@2026-10-21.b-san3-20`, apenso a `@2026-08-20.b-o6r-02-f6`; `financial_entry_undo@2026-10-21.b-san3-20`, sucede `@2026-09-02.b-o6r-02-c5`) — o parcial os tinha renomeado para `@2026-10-24` e apagado a referência ao anterior; as linhas de `/cheques` e `/clear`/`/bounce` ganham os códigos de §1; a do `/status` diz quando sai `409` (estado mudado duas vezes). `git grep` de ids de contrato em `tests src scripts` → vazio (nenhum teste prende o texto).
- **`decisoes.md`:** a entrada `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` (do parcial, com a resposta literal do dono) ganha a nota §A7 sobre `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (medido: `git grep` em `origin/main@7ab2fe71` → vazio; `git show 38504427:…decisoes.md | grep -n` → l.3875) e o ponteiro para a enumeração do §2.5; o item (2) de `REGISTRO-SAN3-CONFLITOS` ganha a linha "Revisto por …" (apenso; o texto anterior não muda). Apensado depois do último apêndice da `main` (`7ab2fe71`: o arquivo termina em `D-SAN3-04B-PAINEL-PROPRIO`).
- **`PLANO_SAN3.md`:** item 22 marcado "FECHADO pelo `B-SAN3-20` no merge do PR #456", no molde do item 12.
- `log-execucao.md`, `status-geral.md` e o comando `B-SAN3-20-cheque-x-baixa.md`: uma linha cada sobre a retomada.

## P1 — pré-voo

### Medição 0 — retomada pela Emenda E1

- **Comando:** `npm run db:generate` sem `DATABASE_URL`.
- **Saída resumida:** exit 1, `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`.
- **Veredito:** tentativa ambiental incompleta; `prisma.config.ts` exige a variável até para gerar o cliente. Nenhum arquivo versionado foi alterado pelo comando.

- **Comando:** criação do Postgres 16 descartável `dev-san320-pg` em `127.0.0.1:55433`, seguida de `DATABASE_URL=<dev-san320> npm run db:generate` sobre o `schema.prisma` da base.
- **Saída resumida:** Prisma Client 7.8.0 gerado em `node_modules/@prisma/client`; exit 0.
- **Veredito:** passo −1 da Emenda E1 concluído sobre o schema-base, sem tocar em `src`, `tests`, `prisma`, contratos ou registros.

- **Comando:** repetição literal do baseline de memória da Medição 2.
- **Saída resumida:** 9 arquivos; `# tests 280`, `# pass 280`, `# fail 0`, `# skipped 0`; exit 0.
- **Veredito:** baseline de memória restaurado exatamente ao esperado pela Emenda E1.

- **Comando:** `DATABASE_URL=<dev-san320> npx prisma migrate deploy`, seguido de `DATABASE_URL=<dev-san320> CORE_SAAS_PERSISTENCE=prisma npm test -- tests/cheque-clear-bounce-atomic-db.test.ts tests/financial-pay-title-atomic-db.test.ts tests/financial-title-invariants-db.test.ts`.
- **Saída resumida:** 113 migrações aplicadas; 3 arquivos; `# tests 30`, `# pass 30`, `# fail 0`, `# skipped 0`; exit 0.
- **Veredito:** baseline PostgreSQL verde e sem pulos; autorizado seguir ao passo 1 do plano.

### Medição 3 — fixture do drift antes de qualquer edição de schema/migração

- **Comando:** `DATABASE_URL=<dev-san320> npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` sobre a base com as 113 migrações, materializado em `tests/fixtures/prisma-migrate-diff-baseline.sql`.
- **Saída resumida:** 76 linhas de sentença iniciadas por `ALTER|CREATE|DROP`; SHA-256 `592908e92be1f3a0402ff715c6c8f499c8bb052fa104f0f095ba220d3ef5ff64`.
- **Veredito:** fixture K12 criada antes de qualquer alteração em `prisma/schema.prisma` ou migração, conforme passo 1.

### Medição 1 — terreno e dependências

- **Comando:** `git status --short --branch; git rev-parse HEAD; git rev-parse --abbrev-ref HEAD; git rev-parse origin/main`.
- **Saída resumida:** árvore limpa; branch `fix/cheque-x-baixa`; `HEAD` e `origin/main` iguais a `7ab2fe71d0d40c2be51a790f0d20893651cdf972`.
- **Veredito:** terreno correto para iniciar o bloco.

- **Comando:** `npm ci` no worktree próprio.
- **Saída resumida:** `added 326 packages`; exit 0; aviso de engine opcional de `@prisma/streams-local`; auditoria reportou 42 vulnerabilidades preexistentes. Nenhum lockfile foi editado.
- **Veredito:** dependências próprias instaladas; junction de `node_modules` não usada.

### Medição 2 — baseline obrigatório antes de editar `src`

- **Comando:** `npm test -- tests/cheques.test.ts tests/financial-entries.test.ts tests/financial-titles.test.ts tests/financial-titles-routes.test.ts tests/financial-uow-memory.test.ts tests/financial-uow-journal-classification.test.ts tests/financial-entry-link-census.test.ts tests/financial-entry-undo-owners.test.ts tests/financial-summary.test.ts`.
- **Saída resumida:** runner declarou `CORE_SAAS_PERSISTENCE=memory` e 9 arquivos; `# tests 280`, `# pass 249`, `# fail 31`, `# skipped 0`, exit 1. As 31 falhas começaram nos testes de rota e repetiram `SyntaxError: The requested module '@prisma/client' does not provide an export named 'Prisma'`.
- **Veredito:** **VERMELHO — PARADA**. O §3.3 passo 0 do plano diz literalmente: baseline `280/280`; “vermelho aqui = parar e devolver”. Nenhum arquivo de `src`, `tests`, `prisma`, contrato ou registro operacional foi editado.
- **Próximo comando após emenda aprovada do plano:** se a emenda autorizar a preparação do cliente Prisma antes do baseline, executar `npm run db:generate` e então repetir exatamente o comando acima. O DEV não antecipou essa decisão porque a ordem vigente põe `npm run db:generate` somente no passo 1, depois da fixture e da migração.

## Critérios K1–K12

- **K1:** `tests/cheque-title-link.test.ts` e `tests/cheque-title-link-atomic-db.test.ts`: vínculo, DTO, filtro, posse, direção, estado, saldo e FK composta; verde (memória 9 casos direcionados; DB K1 1/1).
- **K2:** compensação vinculada liquida título e cria uma única ponta; parcial, pago antes e apagado antes fecham corretamente; verde em memória e DB.
- **K3:** bounce restaura `paid_amount`/status e cria contrapartida sem `titleId`; verde em memória e DB.
- **K4:** `/pay(check)` e lançamento avulso `check` recusam `422 cheque_required`, com precedência testada; verde em memória.
- **K5:** os caminhos pagar primeiro/compensar primeiro estão cobertos pelos casos K2/K4; roteiro isolado ainda será registrado na bateria final.
- **K6:** compensação vinculada é imutável nas duas rotas e a precedência agora é `cheque_entry_immutable`; verde em memória e DB.
- **K7:** drill de catálogo, legado nulo, down transacional, RLS e falha injetada k=1..3: 6/6 verde.
- **K8:** `CHEQUE_FIELD_CLASS.titleId`, censo/harness e `npm run check`: verdes; `applyPayment` saiu do contrato absoluto.
- **K9:** não vazamento cross-tenant e money gate cobertos em memória; verdes.
- **K10:** repositórios Prisma fazem UPDATE/DELETE com `status=registered` e o serviço relê/classifica zero linhas; casos sequenciais verdes; prova concorrente entra na rodada DB final.
- **K11:** CAS de status, liquidação incremental, restauração e transições sequenciais: 5/5 DB e casos de memória verdes.
- **K12:** diff normalizado após a migração é idêntico à fixture prévia de 76 sentenças; verde no drill.

### Execuções desta etapa

- `npm test -- tests/cheque-title-link.test.ts` → 26/26, 0 falha, 0 skip.
- regressão financeira de 9 arquivos após D8 → 279/279, 0 falha, 0 skip; a diferença nominal para o baseline 280 é a remoção intencional do caso do membro absoluto `applyPayment` no harness.
- `DATABASE_URL=<dev-san320> ... tests/cheque-title-link-atomic-db.test.ts` → 7/7.
- `DATABASE_URL=<dev-san320> ... tests/financial-title-status-cas-db.test.ts` → 5/5.
- `DATABASE_URL=<dev-san320> ... tests/cheque-title-link-migration-drill-db.test.ts` → 6/6.
- `npm run check` → verde.

## Bateria completa

Em andamento. Os resultados finais e as três rodadas com denominador constante serão apensados antes de deixar o PR pronto.

## Falsificações de premissa

### F-DEV-01 — `npm ci` próprio não deixa o baseline de memória executável no estado esperado

- **Premissa do plano:** depois de `npm ci`, o passo 0 roda antes de qualquer edição e entrega `280/280`; `npm run db:generate` aparece somente no passo 1, depois de gerar a fixture e aplicar a nova migração.
- **Comando que falsificou:** o comando integral da Medição 2.
- **Saída:** `249/280`, 31 falhas, todas pela ausência do export `Prisma` em `@prisma/client` durante importação das rotas.
- **Impacto:** não é possível cumprir simultaneamente a ordem do plano e o baseline esperado sem uma emenda que autorize gerar o cliente Prisma antes do passo 0, ou outra correção explicitamente planejada.
- **Ação do DEV:** parou no ponto exato, sem improvisar remédio e sem iniciar K1–K12.

## Limpeza

- A limpeza da sessão anterior foi confirmada antes da retomada. Um novo container descartável `dev-san320-pg`, em `127.0.0.1:55433`, foi criado para esta execução e será removido após a bateria final.
- `git diff --check` será repetido no fechamento.
- Base viva `erp-postgres`/`erp-redis` e portas 5432/6379 não foram tocadas.
- `node_modules` próprio preservado conforme §C5; nenhum artefato de build foi produzido.
