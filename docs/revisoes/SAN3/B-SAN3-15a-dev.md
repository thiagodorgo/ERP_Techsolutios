# Diário do dev — B-SAN3-15a (estoque real do técnico e a contagem do web; itens 35 a 37, primeira parte)

- **Autor:** `dev-15a-cl`, Claude Opus 5.5, subagente da sessão, nível menor, **identidade de dev declarada**.
- **Exceção declarada** (§C7 itens 6 e 11(6)): as duas contas Codex estão sem cota semanal até 16/11, a API está
  reservada para verificação (com teto do dia) e o Antigravity está no limite de 5 h. Por isso o dev é Claude e a
  **pré-revisão e a conferência serão de outro modelo**, pela API.
- **Verificador:** a definir pelo orquestrador (pré-revisão de outro modelo, pela API).
- Não escrevi o plano nem o critiquei.
- **Plano:** `plano-B-SAN3-15-v2.md` (só o 15a), com a Emenda 1 (requisitos da crítica r2). As emendas prevalecem.
- **Respostas do dono** (11/11, "Sim, todas (Recomendado)", `D-DONO-TODAS-RECOMENDACOES-1111`): vale a recomendação
  de cada pergunta do §9 — 1(a), 2(a), 3(a), 4(a) e 5(a). Sob 5(a), o gerente sem cadastro de profissional usa o
  estoque da base.
- Toda hora vem de `date` (fuso de São Paulo).

## Terreno

- Worktree próprio `C:/Users/thiag/w-15a`, ramo `fix/mobile-estoque-real-do-tecnico`, criado de `origin/main` =
  `da12fec6058876490649017e62b6e8c0e647a292` (#541) às 10:51 de 11/11. `npm ci` próprio (sem junction),
  `prisma generate`.
- `gh pr view 534 --json state` às 10:52: **OPEN**. Pela trava do plano (A-06), a **F4** (banco do aparelho,
  `app_database.dart`) espera o merge do #534; o servidor e o web começam já.
- Maquete `prestador-atendimento-3opcoes.reference.html`: **não existe** na `origin/main` (`git ls-tree` às 10:52).
  A **F4ui** espera a maquete aprovada (plano §6).

## Fatias

### F0a — vermelho-controle (servidor), 10:57–11:24

- **Âncoras (§3, `git grep -F -c` em `src`, `mobile/flutter_app/lib` e `frontend/src`, `origin/main` `da12fec6`):** todas as
  ÂNCORAS NOVAS do 15a deram **0**, salvo duas, declaradas:
  - `return { custodyType: "base" };` (a M-C3 do 15b) dá **1** hoje, em `src/modules/inventory/inventory.service.ts:511`
    (o `resolveCustody` do corpo do movimento). A âncora da M-C3 é **por arquivo**: no arquivo novo
    `inventory.actor-custody.ts` ela é única (1). Quem aplica a M-C3 nomeia o arquivo.
  - `this.location = 'Van-01',` (a M-A10) dá **1** hoje (`prestador_models.dart:11`), como o plano diz ("hoje 1").
- **Testes novos do servidor** (escritos ANTES do código; rodados na `main` `da12fec6`):
  - `tests/bsan315-technician-stock.test.ts` (memória, arnês de rota de `tests/stock-custody.test.ts`):
    `node --test --import tsx tests/bsan315-technician-stock.test.ts` → `# tests 9 · pass 0 · fail 9`. T-B1 a T-B7 e T-B9
    vermelhos por **404** (a rota não existe; o preparo do cenário — itens, perfis, viatura, LINK — passou); T-B10 vermelho
    porque `createActorOperatorProfileResolver` não existe.
  - `tests/bsan315-technician-stock-db.test.ts` (Postgres, papel efêmero `NOSUPERUSER NOBYPASSRLS`): a suíte não existia
    (vermelho-controle do plano: "a suíte não existe"); os casos chamam `technicianStock`/`listCustodyBalances`, que não
    existem na `main`.
- **Ciclo de importação (HIPÓTESE do §2.2):** `inventory.actor-custody.ts` importa `WORK_ORDER_MUTATION_SCOPE` de
  `work-order.types.ts` (que só importa tipos). `npm run check` verde; o `inventory.service.ts` já importava
  `work-orders/work-order.service.js` antes do bloco. **Sem ciclo novo.** `src/modules/work-orders/**` fica fora do diff.
- **App (T-A1 a T-A10, T-M1, T-M1b):** ficam para a F4, que espera o merge do #534 (a migração v16 → v17 do T-M1 é medida
  sobre a `main` com o #534). **Declarado:** a parte do app da F0a anda junto da F4.
- **Web (T-W1, T-W2):** escritos e medidos vermelhos na F7 (abaixo).
- **Sondas da crítica (P3):** a I4a (`X-Tenant-Id` em memória → 200) foi re-executada pelo T-B3 (ii-a): 200, `custody: null`,
  `items: []` depois do código; na `main`, 404 (a rota não existia). A I2c (7 mutações do servidor) é re-executada na F9a,
  com as mutações do plano no código real. A I2d (M-W1) na F7/F9a.

### F1 — rota, serviço, resolvedor e repositórios (ramos 1 e 3), 11:00–11:25

- **Onde cada âncora mora** (cada uma com `grep -cF` = 1 no arquivo nomeado):
  - `src/modules/inventory/inventory.repository.ts` (memória): M-A1 `movement.custodyOperatorProfileId === custody.custodyOperatorProfileId`
    (em `isSameProfessionalCustody`) e M-A23 `if (balance.custodyType !== "base") continue;` (no laço dos baldes de
    `listCustodyBalances`).
  - `src/modules/inventory/inventory-prisma.repository.ts` (Prisma): M-A8 `custody_operator_profile_id: custody.custodyOperatorProfileId,`
    e, para a BASE (N-04), `custody_type: custody.custodyType,` — a mutação do Prisma da filtragem da BASE, que chamo
    **M-A23b** (dona: T-DB1b). No Prisma a ausência de `custodyOperatorProfileId` (BASE) não filtra o perfil: a BASE é só
    o `custody_type`, e por isso apagar essa linha mostra X, Y e W ao gerente.
  - `src/modules/inventory/inventory.service.ts`: M-A3 `const profile = await this.references.resolveActorOperatorProfile?.(actor);`,
    M-A7 `if (!item || !item.isActive) continue;`, M-A2 `.filter((entry) => entry.available > 0)` (em `technicianStock`) e
    M-A24 `if (error instanceof OperatorProfileError && error.reason === "invalid_uuid") return undefined;` (em
    `createActorOperatorProfileResolver`).
  - `src/modules/inventory/inventory.actor-custody.ts`: M-A4 `if (profile && profile.isActive) {`, M-A22
    `if (hasTenantWideRole(actor)) {`, e as âncoras do 15b M-C1 `return { custodyType: "professional", custodyOperatorProfileId: profile.id };`
    e M-C3 `return { custodyType: "base" };`.
  - `src/modules/inventory/inventory.dto.ts`: M-A6 `label: custody.label,`.
  - `src/modules/inventory/inventory.routes.ts`: M-A5 `requirePermission(TECHNICIAN_STOCK_PERMISSION),`.
- **N-01:** o resolvedor converte toda falha que não seja "sem cadastro" ou `invalid_uuid` em
  `InventoryError(503, "STOCK_UNAVAILABLE", "custody_lookup_unavailable", <texto neutro>)`. O T-B10 confere 503 e que o
  corpo não traz `db down`. (O tratador genérico de rota mandaria um `Error` cru como **400 com a mensagem**:
  `src/modules/core-saas/routes/http.ts:51-58`; por isso a conversão é no resolvedor.)
- **N-12:** `hasTenantWideRole` = `actor.roles.some((role) => WORK_ORDER_MUTATION_SCOPE[role] === "tenant_wide")`.
- **Censo (T-B8):** `node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json`
  → `chaves vivas: 511 | VIOLAÇÕES: 0`; `git diff --stat` do instantâneo = **1 chave** (`ROTA GET /api/v1/mobile/technician/stock`,
  classe `LEITURA`, +4 linhas).
- **Contrato:** `technician_stock@2026-11.b-san3-15a` em `API_CONTRACTS.md` §3.10 (linha da tabela + bloco) e a linha do
  `docs/claude-code-handoff/API_CONTRACTS.md`.
- **Regressão (memória):** `node --test --import tsx tests/stock-custody.test.ts tests/inventory.test.ts tests/inventory-items-routes.test.ts tests/stock-movements-routes.test.ts tests/inventory-write-paths-guard.test.ts tests/o6r07c-census-guard.test.ts`
  → `# tests 85 · pass 85 · fail 0 · skipped 0`.
- **Commit da F1 sem o ramo 2** (o `if (hasTenantWideRole(actor))`): no commit da F1 (`24e57cb5` depois do rebase), `bsan315-technician-stock`
  dá 7/9 (T-B9 e a parte "base" do T-B6 vermelhos, como esperado: são da F1g).

### F1g — o ramo 2 (Pergunta 5 (a): o gerente sem cadastro usa a BASE), 11:26

- Resposta do dono: 5(a) (`D-DONO-TODAS-RECOMENDACOES-1111`). O ramo 2 de `resolveActorStockCustody` volta; o rótulo
  é "Base da organização".
- `node --test --import tsx tests/bsan315-technician-stock.test.ts` → `# tests 9 · pass 9 · fail 0` (T-B4 e T-B9 verdes,
  inclusive o ator `[field_technician, manager]` sem cadastro, da N-12).

### F1db — a suíte de banco, 3× na forma do job, o `EXPLAIN` e a linha do `SUITES=`, 11:15–11:30

- **Terreno:** Postgres 16 descartável próprio `dev15a-pg` em `127.0.0.1:55525` (porta conferida livre com `docker ps` e
  `netstat -ano | grep LISTEN` antes de subir; memória de commit livre 16,0 GB; disco 177,8 GB). `npx prisma migrate deploy`
  e `npm run db:seed`, como o job `backend-postgres`.
- **Forma do job:** `CORE_SAAS_PERSISTENCE=prisma JWT_SECRET=dev-only-change-me JWT_EXPIRES_IN=15m LOG_LEVEL=silent RBAC_DB_PARITY=1`
  e `node --test --import tsx tests/bsan315-technician-stock-db.test.ts tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-units-db.test.ts tests/inventory-unique-backstops-db.test.ts tests/inventory-migration-drill-db.test.ts`.
  - rodada 1: `# tests 58 · pass 58 · fail 0 · skipped 0`;
  - rodada 2: `# tests 58 · pass 58 · fail 0 · skipped 0`;
  - rodada 3: `# tests 58 · pass 58 · fail 0 · skipped 0`.
  - A suíte do bloco: 6 casos em cada rodada (T-DB0 postura, T-DB1, T-DB1b, T-DB2, T-DB2b, T-DB3). Denominador constante.
- **Papel efêmero:** os serviços rodam no cliente de um papel `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`); o T-DB0
  confere `rolsuper=false, rolbypassrls=false` e `relforcerowsecurity=true` em `stock_movements`, `operator_profiles` e
  `inventory_items`. No T-DB2b o **app real** roda sobre o mesmo papel (o `src/database/prisma.ts` usa `globalThis.prisma`).
- **T-DB2b — forma MEDIDA diferente da HIPÓTESE do plano (desvio declarado, pede emenda escrita):** o plano previa **403**
  (HIPÓTESE) e, se medisse 200, a asserção viraria "200, `custody: null`, `items: []`". Medido: **200 com a custódia do
  próprio tecA** (`{"custody":{"kind":"professional","label":"Técnico A"},"items":[X: 5]}`). Motivo, por leitura: com JWT, o
  `attachAuthenticatedActor` (`src/modules/auth/middleware/authenticated-actor.middleware.ts:47-54`) fixa o
  `tenantId` do token e o `X-Tenant-Id` não entra; o RBAC persistente resolve o papel do tecA na org A. **Nenhum dado da org B
  e nenhuma custódia alheia** aparecem (a propriedade). O caso prende a forma medida (200 e exatamente `[X: 5]`), a mesma do
  T-B3 (ii-b) em memória. **Pergunta ao orquestrador:** ratificar a forma por emenda (a alternativa "200 vazio" do plano
  não se aplica: o cabeçalho não muda a organização).
- **`EXPLAIN (ANALYZE, BUFFERS)`** (A-10; dados sintéticos numa transação desfeita: 1 organização, 50 perfis, 400 itens,
  40.000 movimentos, `ANALYZE`; script em `erp-pausa-2026-10-03/revisoes/dev-15a-cl-evidencia/explain-15a.sql`):
  - custódia profissional (um perfil): `Index Scan using stock_movements_custody_lookup_idx`, `Index Cond: (tenant_id = …)
    AND (custody_type = 'professional') AND (custody_operator_profile_id = $0)`, 534 linhas, **593 buffers** (a tabela
    inteira tem 655 páginas), 0,84 ms. O índice começa por `[tenant_id, item_id, …]`: as condições de custódia são
    conferidas DENTRO do índice, mas sem salto; a leitura percorre a fatia da organização no índice.
  - BASE: `Seq Scan on stock_movements` (1/3 das linhas qualifica), 13.333 linhas, 655 buffers, 8,6 ms.
  - **Conclusão:** é varredura da organização (pelo índice no perfil; sequencial na BASE). Abre-se
    `P-SAN3-15-INDICE-CUSTODIA-POR-PERFIL` (desempenho, BAIXA, dono a nomear), **sem migração neste bloco** (A-10).
- **CI (A-08):** a linha `SUITES="$SUITES tests/bsan315-technician-stock-db.test.ts"`, com comentário, depois de
  `inventory-migration-drill-db` no job `backend-postgres`. A leitura no log do job fica para a pré-revisão
  (`gh run view <run> --job backend-postgres --log | grep -E 'bsan315-technician-stock-db|# (tests|fail|skipped) '`).

### F7 — web: o fechamento sem a contagem mostra erro (P13), 11:27–11:32

- **Skills:** `ts-frontend-full` (implementação) e `ui-ux-pro-max` (revisão). Tela-modelo: a própria gaveta
  `CycleCountSessionDrawer.tsx`, que já mostra o erro do adaptador no `Alert` "Ação não concluída"; **o componente não muda**
  (a mensagem não pediu), nem layout, componente ou paleta novos.
- **Vermelho-controle** (teste escrito antes do código, `frontend/tests/bsan315-contagem-fechamento.test.tsx`, na `main`):
  `node --test --import tsx tests/bsan315-contagem-fechamento.test.tsx` → `# tests 2 · pass 0 · fail 2`. T-W1:
  `Missing expected exception: corpo {"data":{}}`. T-W2: a gaveta mostrava `Concluída … Relatório de variância … Variância
  total +0 · 0 ajuste(s) gerado(s)` (a classe da sonda da C4 do B-SAN3-01).
- **Conserto** (`cycle-counts.adapter.ts`): a ÂNCORA NOVA `if (!cycleCount) throw new CycleCountResponseError("close_without_entity");`
  no lugar do literal "concluida"; a classe `CycleCountResponseError` com a frase "O servidor não confirmou o fechamento da
  contagem. Recarregue a lista para ver a situação atual."; o ramo explícito da classe no topo de `interpretCycleCountError`.
- **Depois:** `bsan315-contagem-fechamento` 2/2; com `inventory.smoke`, `estoque-custodia` e `inventory.adapter`:
  `# tests 41 · pass 41 · fail 0 · skipped 0`. `npm --prefix frontend run check` verde.
- `frontend/package.json`: só o acréscimo de `tests/bsan315-contagem-fechamento.test.tsx` ao fim do `test:smoke` (186 → 187
  arquivos).
- **Lateral, pré-existente:** o texto técnico cru das outras exceções (`if (error instanceof Error && error.message) return
  { message: error.message };`) segue; vai para `P-WEB-CONTAGEM-ERRO-CRU` (BAIXA, dono `B-INV-CONTAGEM`).

### F9a (parte servidor e web) — mutações aplicadas, medidas e revertidas, 11:31–11:55

Regra (§3): texto exato; `grep -cF` = 1 no arquivo antes de aplicar (o roteiro aborta se não for 1); roda **só** o
teste-dono (`--test-name-pattern`); vermelho por **asserção**; o arquivo volta ao conteúdo commitado e `git status` fica
limpo depois de cada uma. Roteiro e saídas TAP fora do repositório (`erp-pausa-2026-10-03/revisoes/dev-15a-cl-evidencia/driver.py` e `M-*.tap`).

| Mutação | Arquivo | Troca | Dono | Resultado |
|---|---|---|---|---|
| M-A1 | `inventory.repository.ts` | `movement.custodyOperatorProfileId === custody.custodyOperatorProfileId` → `true` | T-B1 | **vermelho** (AssertionError: aparece `BSAN-Y01:3`, do tecB) |
| M-A2 | `inventory.service.ts` | `.filter((entry) => entry.available > 0)` → `.filter(() => true)` | T-B2 | **vermelho** (AssertionError: o item zerado aparece) |
| M-A3 | `inventory.service.ts` | o resolvedor recebe `{ ...actor, userId: String(query.userId ?? actor.userId) }` | T-B3 | **vermelho** (AssertionError: o tecA vê `BSAN-Y01:3` em vez de `BSAN-X01:5`) |
| M-A4 | `inventory.actor-custody.ts` | `if (profile && profile.isActive) {` → `if (profile) {` | T-B4 | **vermelho** (AssertionError: `custody` = professional "Técnico Inativo") |
| M-A22 | `inventory.actor-custody.ts` | `if (hasTenantWideRole(actor)) {` → `if (true) {` | T-B4 | **vermelho** (AssertionError: o técnico sem cadastro vê a BASE) |
| M-A23 | `inventory.repository.ts` | apagar `if (balance.custodyType !== "base") continue;` | T-B9 | **vermelho** (AssertionError: W:2, X:5, Y:3 na BASE do gerente) |
| M-A23b (N-04) | `inventory-prisma.repository.ts` | apagar `custody_type: { equals: custody.custodyType },` | T-DB1b | **vermelho** (AssertionError: W, X e Y na BASE do gerente, no Postgres) |
| M-A24 | `inventory.service.ts` | `if (error instanceof OperatorProfileError && error.reason === "invalid_uuid") return undefined;` → `return undefined;` | T-B10 | **vermelho** (AssertionError: `expected: 503`, veio 200) |
| M-A5 | `inventory.routes.ts` | apagar `requirePermission(TECHNICIAN_STOCK_PERMISSION),` | T-B5 | **vermelho** (AssertionError: 200 onde se espera 403) |
| M-A6 | `inventory.dto.ts` | acrescentar `operatorProfileId: custody.custodyOperatorProfileId,` depois de `label: custody.label,` | T-B6 | **vermelho** (AssertionError: chave `operatorProfileId` a mais) |
| M-A7 | `inventory.service.ts` | `if (!item || !item.isActive) continue;` → `if (!item) continue;` | T-B7 | **vermelho** (AssertionError: o item desativado aparece) |
| M-A8 | `inventory-prisma.repository.ts` | apagar `custody_operator_profile_id: custody.custodyOperatorProfileId,` | T-DB1 | **vermelho** (AssertionError: `BSAN-Y…:3` do tecB aparece, no Postgres) |
| M-A9 | `tests/fixtures/o6r07c-classificacao-vias.json` | apagar a entrada `ROTA GET /api/v1/mobile/technician/stock` | censo T1 | **vermelho** (T1 e T14 do `o6r07c-census-guard`) |
| M-W1 | `frontend/src/modules/inventory/cycle-counts.adapter.ts` | a âncora vira o `return { cycleCount: { … status: "concluida" … }, report: buildVarianceReport([], undefined) };` | T-W2 (e T-W1) | **vermelho** (T-W1 e T-W2) |

- **Desvio declarado (âncora da M-A23b):** a 1ª tentativa abortou com `ANCORA count=2` — `custody_type: custody.custodyType,`
  também existe em `saldoOfCustodyLocked`. A linha do filtro da BASE de `listCustodyBalances` passou a
  `custody_type: { equals: custody.custodyType },` (mesmo SQL), commit `c20e44a2` (depois do rebase); a M-A23b rodou com essa âncora (count 1).
  O plano não nomeava a âncora do Prisma (a N-04 manda nomear o arquivo e ter uma mutação por repositório).
- **Sondas da crítica (P3):** a I2c (7 mutações do servidor num protótipo) foi re-executada como as 13 mutações do servidor
  acima, no código real; todas vermelhas. A I2d (M-W1) vermelha. A I4a (`X-Tenant-Id` em memória → 200) = T-B3 (ii-a).
- **Mutações do app** (M-A10 a M-A18, M-A17b, M-A20, M-A25, M-A26) ficam para a F4/F4ui.

### Rebase e registro, 12:15

- `git rebase origin/main` sobre `c95ad4fd` (#536), sem conflito (o #536 não toca `src/modules/inventory/**`; em
  `src/modules/work-orders/work-order.types.ts` ele não muda o `WORK_ORDER_MUTATION_SCOPE`, conferido por `git diff`).
- **Registro (plano §4.1):**
  - `pendencias.md`: `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` **FECHADA**; `P-MOBILE-ESTOQUE-TECNICO-FABRICADO`
    **parcial** (o servidor entrou; o app fecha com a F4 — não a fecho antes, porque o teste de encerramento dela pede
    "app mostra vazio honesto"); apenso a `P-MOBILE-ROTAS-SEM-SERVIDOR`; novo dono `B-INV-CONTAGEM` para
    `P-O6R-B04-OPEN-NO-TETO-DO-TIMEOUT` e `P-O6R-B04-UI-STATUS-FECHANDO`; novas `P-SAN3-15-QTD-FRACIONADA`,
    `P-SAN3-15-CUSTODIA-VIATURA`, `P-MOBILE-ESTOQUE-MODULO-SEMENTE`, `P-WEB-CONTAGEM-ERRO-CRU` e
    `P-SAN3-15-INDICE-CUSTODIA-POR-PERFIL` (o `EXPLAIN` pediu). Índice regenerado pelo gerador
    (`gerar-indice-pendencias.py`): 863 → 868 cabeçalhos, 657 → 661 abertas; na `main` limpa o gerador não dá diff.
  - `decisoes.md`: `REGISTRO-SAN3-CONFLITOS — B-SAN3-15` (C1 a C7) e as respostas do §9.
  - `PLANO_SAN3.md`: as linhas `B-SAN3-15a` e `B-SAN3-15b` sob a do `B-SAN3-15`, e a trava do §6 (`04a` → `15a` → `15b`;
    `frontend/src/modules/inventory/**` `15a` → `B-INV-CONTAGEM`; `app_database.dart` #534 → `15a` → `15b`).
  - Comando `agent-orchestration/codex/comandos/B-SAN3-15a-estoque-real.md`.
- **KPI congelado** (§C7 item 8(5)): `Kpis/**` intocado.

### Bateria (head `e6278ac1`, rebase sobre `c95ad4fd`), 12:15–13:15

- **Local:** `npm run check` ✓ · `npm run lint` ✓ · `npm run build` ✓ · `git diff --check origin/main...HEAD` ✓ ·
  `npm --prefix frontend run check` ✓ · `npm --prefix frontend run build` ✓ (44,8 s) · `npm --prefix frontend run test:smoke`
  → `# tests 1730 · pass 1730 · fail 0 · skipped 0` (linha de base 1728 + 2) · `tests/san3-05-acessos-de-plataforma-guard.test.ts`
  (ratchet de acessos a tabelas FORCE) → 35/35.
- **`npm test` local (Windows, 16 núcleos):** a 1ª tentativa, sobre um banco descartável não semeado e Redis próprio
  `dev15a-redis` (127.0.0.1:56525), pendurou em `tests/ass-05-vault-routes.test.ts` (o `stop()` espera um `exit` que não
  vem) e deu `statement timeout` no `ass-03-metering-db` (T-MED-db-14), sob 15 arquivos em paralelo; parei a rodada. A 2ª,
  no CI local a 2 CPUs (`ferramentas/ci-github.sh`, tag `dev15a`), teve de novo o `statement timeout` no T-MED-db-11 e era
  lenta demais (594 de ~2.800 pontos em 30 min); parei-a quando o GitHub concluiu e removi os 3 containers dela pelo
  rótulo. **Nos dois casos o arquivo é anterior ao bloco e alheio a ele** (`subscription-billing/metering`), e no GitHub
  os dois casos passaram (`ok 87 - T-MED-db-11`, `ok 90 - T-MED-db-14`). Precedente: `B-SAN3-23-dev.md` (mesma classe:
  teto de tempo sob carga, verde isolado).
- **Aceite pela forma real (§C7.11(3)) — CI do push, run `43053284995`, head `e6278ac1`, todos os 8 jobs `success`:**
  - `backend`: `# tests 5093 · pass 5091 · fail 0 · skipped 2` (linha de base na `main` `c95ad4fd`, run `43035742812`:
    5078 · 5076 · 0 · 2 → **+15** = 9 de memória + 6 do `-db`, que no job `backend` roda com `DATABASE_URL`); `ok … [T-B1]`,
    `[T-B9]`, `[T-B10]` no log.
  - `backend-postgres`: `# tests 509 · pass 509 · fail 0 · skipped 0` (linha de base 503 → **+6**); `bsan315-technician-stock-db`
    no log; a linha `# [T-DB2b] forma medida … status 200 …` impressa.
  - `frontend`: `# tests 1730 · pass 1730 · fail 0 · skipped 0`; `ok 132 - [T-W1]`, `ok 133 - [T-W2]`; o nome
    `bsan315-contagem-fechamento` no comando do `test:smoke` (`grep -c` = 1).
  - `flutter`: `+1119: All tests passed!` (o app não foi tocado neste PR; igual à linha de base).
- **Push antes do PR (desvio de ordem, declarado):** empurrei o ramo às 12:56, antes de a suíte local terminar, para que o
  CI do GitHub (o juiz) corresse em paralelo; o PR só foi aberto com os 8 jobs verdes.

### Limpeza (§C5)

- Removidos: `frontend/dist/` e `dist/` do worktree (build), os 3 containers do CI local `ci-dev15a-*` (pelo rótulo), as
  bases de drill que a rodada local deixou no `dev15a-pg` (nenhuma sobrou), os processos `node` da rodada parada.
  **Mantidos, por ordem do mandato:** o worktree `C:/Users/thiag/w-15a` e os containers `dev15a-pg` (55525) e
  `dev15a-redis` (56525), para a F4.

## O QUE FALTA (para o orquestrador)

1. **F4** (app: API, origem de demonstração isolada, lista salva Drift v17 no `onCreate` e no `onUpgrade`, provider; T-A1
   a T-A5, T-A7 a T-A10, T-M1, T-M1b; M-A10 a M-A18, M-A17b, M-A20, M-A25, M-A26) — **espera o merge do #534**
   (`gh pr view 534 --json state` às 13:15: `OPEN`). Ao entrar: `git pull --rebase origin main`, medir `schemaVersion`
   (esperado 16 → o 15a usa 17), e a parte do app da F0a.
2. **F4ui** (tela com os estados do §2.3 e os textos do §2.4, opção A) — espera a maquete
   `prestador-atendimento-3opcoes.reference.html` aprovada (não existe na `main`).
3. **Fecho de `P-MOBILE-ESTOQUE-TECNICO-FABRICADO`** quando a F4 entrar.
4. **Perguntas (emenda escrita antes de valer):** (a) a forma medida do T-DB2b (200 com a custódia do próprio técnico,
   o cabeçalho ignorado sob JWT), no lugar do 403 da hipótese; (b) a âncora da M-A23b no Prisma
   (`custody_type: { equals: custody.custodyType },`).
5. **O merge deste PR espera a F4** (plano §6, "o merge do 15a espera F1g e F4").

---

## F4 — dp-548 (DeepSeek Pro, identidade de dev declarada; sucessor do dev-15a-cl)

**Janela:** 17:15–17:40 SP (fora do pico). Conferência: Claude.

### Merge da main
- `git fetch origin` + `git merge origin/main`: main `f5b79026` (traz o #534 e o #539). Conflito só de registro em
  `decisoes.md` (mantidas as duas entradas) e `pendencias-indice.md` (índice regenerado). Merge `114b2102`, push ok.
- `app_database.dart` medido: `schemaVersion` = 16 na main → a F4 usa **17** (N+1).

### O que a F4 entregou (app)
- `prestador_models.dart`: `available` passa a `num`, sai o `location` fixo; nascem `TechnicianStockCustody`,
  `TechnicianStockCacheScope`, `TechnicianStockCacheEntry`, `TechnicianStockLoad` (`fresh`/`failed`/`forbidden`,
  `hasCached`). `WorkOrderMaterial`/`mergeMaterials` intactos.
- `technician_stock_demo.dart`: 8 itens de demonstração + `demoTechnicianStockCustody`.
- `technician_stock_remote_api.dart`: modelo DTO + `DioTechnicianStockRemoteApi`; 403 → `TechnicianStockForbiddenError`.
- `technician_stock_cache.dart`: interface + `InMemoryTechnicianStockCache`.
- `drift_technician_stock_cache.dart`: cache Drift por (tenant, user); `fetched_at` em epoch UTC.
- `app_database.dart`: v17, tabela no `onCreate` **e** no `onUpgrade` (`if (from < 17)`), migração aditiva.
- `prestador_repository.dart`: `loadTechnicianStock` devolve `TechnicianStockLoad`; providers
  `technicianStockRemoteApiProvider`/`technicianStockCacheProvider`; fiação `allowDemoStock: !remoteAuthModeProvider`,
  demo-session check.
- `technician_stock_screen.dart`: consome `TechnicianStockLoad`, estados (403, custódia nula, vazio, cache+banner, rede,
  erro+retry) e stepper com `floor()`.

### Testes
- `bsan315_estoque_real_test.dart`: T-A1..T-A10 (T-A8 com as duas asserções do CE-G1, por AST).
- `bsan315_migracao_v17_test.dart`: T-M1 (v16→v17 preserva linhas reais, contagem antes/depois) e T-M1b (instalação nova).
- `b119_prestador_flow_test.dart` caso 6: `load.items`.

### Mutações (vermelho → revertido → verde)
M-A10..M-A18, M-A17b, M-A20, M-A25' e M-A26, todas medidas no teste-dono com vermelho antes e verde depois da reversão.
- **M-A25' (emenda escrita, N-10):** o `catch` retorna cedo, então a M-A25 literal (remover a guarda `isFresh`) não alcança
  o caminho de erro e NÃO fica vermelha. A mutação virou "gravar também a carga falhada" (inserir
  `await _stockCache.save(scope, const [], DateTime.now());` no `catch`), que derruba o T-A9. As demais 12 ficaram
  vermelhas no texto literal do plano.

### Emenda de fronteira (fora do PERMITIDO listado, necessária)
- Renumeração 16→17 em `app_database_migration_test.dart`, `bfilausuario_drift_user_id_test.dart` e
  `brdvcomp_c1_drift15_migration_test.dart` (R3: "o teste acusa").
- Registro de `technician_stock_screen.dart` no guard B-SAN3-19b (`_tituloPorArquivo`) — consequência do novo
  `PermissionBlockedState` da F4.
- `npm run db:generate` (client Prisma desatualizado após o merge; só `node_modules`, nada versionado).

### Bateria
- `flutter analyze`: sem issues. `dart format --output=none --set-exit-if-changed` nos arquivos da F4: 0 mudanças.
- `flutter test --reporter compact`: **`+1149: All tests passed!`** (suíte inteira).
- `npm run check` (tsc): ok. `git diff --check`: limpo.
- Nota: `bsan313_minhas_os_escopo_test.dart` está fora do formato no HEAD (pré-existente, fora da F4) — não tocado.

### Entrega
- Commit `6b05e642` com `Co-Authored-By: DeepSeek <noreply@deepseek.com>`; push
  `114b2102..6b05e642 fix/mobile-estoque-real-do-tecnico`.

**F4 PRONTA — head 6b05e642**

---

## Conserto da pré-revisão (fix-548-cdx)

**Identidade:** `fix-548-cdx`, Codex GPT-5.6 Sol, dev declarado deste conserto; não é o `prerev-548-cdx`, não escreveu o plano nem o 15a (`dev-15a-cl` e `dp-548`).

- **2026-11-12T04:32:10-03:00 — terreno:** em `C:/Users/thiag/w-15a`, HEAD `bfdeb155fba22e1a03396882c4904b4f3320a863`, branch `fix/mobile-estoque-real-do-tecnico`, `git status --porcelain` vazio. A consulta global de processos Windows não encontrou nenhum `node`, `dart` ou `flutter`; logo nenhum tinha cwd no worktree. Terreno LIBERADO.
- **2026-11-12T04:32:39-03:00 — fontes e contrato:** lidos integralmente `CLAUDE.md`, `PROJECT_MEMORY.md` e as skills `ts-frontend-full` e `saas-multi-tenant`; lidas as Emendas 1 (N-11), 2 e 2.1 do plano, `prerev-548.json`, `prerev-548-evidencia.md` (§3 e §8), o diário anterior e as entradas relacionadas da trilha operacional. A Emenda 2.1 prevalece: 200 remoto fica `fresh`, 403 fica `forbidden`, 503/rede fica `failed`; em sessão demo remota o cache salvo não é lido, gravado nem apagado.
- **2026-11-12T04:33:45-03:00 — E2.2/E2.1 A1–A3:** `loadTechnicianStock` passou a impedir `save` e `clear` quando `_isDemoSession`; a leitura já estava suprimida. O novo T-A5b cobre (a) 200 `fresh` sem gravação, (b) 403 sem apagar, (c) 503/rede em `failed` sem cache e (d) entrada existente + 503 com `cached == null`. Teste focado: `+1 -0`, verde.
- **2026-11-12T04:34:33-03:00 — M-N11a:** `not ok - M-N11a: save incondicional no 200 foi detectado por T-A5b(a)`; vermelho `Expected: null`, `Actual: TechnicianStockCacheEntry`. Mutação revertida; `git diff --exit-code` vazio às 04:34:44.
- **2026-11-12T04:34:52-03:00 — M-N11b:** `not ok - M-N11b: clear incondicional no 403 foi detectado por T-A5b(b)`; vermelho por entrada apagada (`Null check operator used on a null value`). Mutação revertida; `git diff --exit-code` vazio às 04:35:03.
- **2026-11-12T04:35:54-03:00 — M-N11c:** `not ok - M-N11c: leitura da lista salva foi detectada por T-A5b(d)`; vermelho na asserção do caso (d), `Expected: null`, `Actual: TechnicianStockCacheEntry`. O caso (c) usa cache vazio para a falha pertencer ao (d). Mutação revertida; `git diff --exit-code` vazio às 04:36:04.
- **2026-11-12T04:36:42-03:00 — E2.3:** `decisoes.md` medido no blob do HEAD com 4.981 CR; materializado com `git -c core.autocrlf=false checkout HEAD -- ...` e normalizado mecanicamente para LF, sem `git archive`. Worktree após a conversão: zero CR; o aceite final será repetido no commit pós-merge.
- **2026-11-12T04:37:07-03:00 — E2.5:** aberta `P-APP-FORMAT-BSAN313`, BAIXA, pré-existente na `main`, fora do diff do PR #548, sem bloco dono definido e não bloqueante para o 15a. O índice foi gerado duas vezes; a segunda execução produziu o mesmo diff (880 cabeçalhos / 869 IDs).
- **2026-11-12T04:38:56-03:00 — E2.4:** `git fetch origin` confirmou `origin/main=fd51409c492a1c5e8ae38de79af412fb3608652e`. O merge conflitou apenas nos quatro caminhos previstos (`decisoes.md`, `pendencias.md`, índice e `frontend/package.json`); registros resolvidos por união e smoke com `dispatch-create-idempotency` + `bsan315-contagem-fechamento`. Índice gerado duas vezes sem mudança na segunda (923 cabeçalhos / 912 IDs). `comm -23`: zero cabeçalho perdido contra ambos os lados nos dois registros. Foram conferidos 69 blobs exclusivos da main sob `src/`, `prisma/`, `tests/`, `.github/` e `frontend/src/`: zero divergência. `decisoes.md` no índice: zero CR; zero marcador de conflito.
- **2026-11-12T04:40:41-03:00 — Postgres próprio:** o `initdb` literal criou WIN1252; foi parado e removido após validar o alvo exato, e o mesmo `C:/Users/thiag/pg-fix548` foi recriado com `--encoding=UTF8 --locale=C`, somente em `127.0.0.1:55564`, banco `fix548` em UTC. Resultado: 133 migrações e seed (12 papéis) concluídos.
- **2026-11-12T04:41:51-03:00 — Flutter:** `flutter pub get` verde; 15 arquivos Dart alterados pelo PR, `dart format --output=none --set-exit-if-changed` com zero mudança; `flutter analyze` sem issues; suíte integral **`+1169 -0`**, `All tests passed!`.
- **2026-11-12T04:42:45-03:00 — BLOQUEIO de integração:** os dois testes localizados por `ls tests | grep -iE 'bsan315'` terminaram `15 tests · pass 13 · fail 2 · skipped 0`. T-DB0 confirmou o papel `NOSUPERUSER NOBYPASSRLS`; falharam T-DB2b e T-B3 porque a main trouxe o gate do `B-SAN3-18` e a rota nova responde `403 route_module_unclassified`. A única correção medida exige alterar `src/modules/navigation/route-modules.ts` e o censo/fixture do 18, arquivos exclusivos da main e fora das Emendas 2/2.1; também quebraria o aceite de blob idêntico à main. Pela `D-EMENDA-ANTES-DO-CODIGO` e pela ordem de parar em conflito de código, não houve expansão improvisada, bateria restante nem push. O merge já estava commitado quando o conflito semântico apareceu; `git merge --abort` já não é aplicável. Head nesse ponto: `d9d4616ed843f674aafeeb17ecedafd22ea881a8`.
- **2026-11-12T04:43:26-03:00 — limpeza:** PostgreSQL parado com `pg_ctl ... stop -m fast`; `realpath` conferido; removidos somente `C:/Users/thiag/pg-fix548` e `C:/Users/thiag/pg-fix548.log`. `w-15a` preservado; nenhum `git worktree prune` executado.

## Continuação (fix-548b)

**Identidade:** `fix-548b-dp`, DeepSeek Pro (pelo Codex CLI), dev declarado desta continuação; sucessor do `fix-548-cdx`. Não achou nada neste bloco, não escreveu o plano nem as emendas, e não revisou as emendas. Fonte: `plano-B-SAN3-15-v2.md` (Emenda 3, com a 3.1 prevalecendo; valem as Emendas 2/2.1 já entregues).

- **2026-11-12T07:30-03:00 — terreno:** em `C:/Users/thiag/w-15a`, HEAD `abec4832e31a46b22704f8ee81d94a8c1f54ca52`, branch `fix/mobile-estoque-real-do-tecnico`, `git status --porcelain` vazio; nenhum processo `node`/`dart`/`flutter` ativo. Terreno LIBERADO.
- **2026-11-12T07:32-03:00 — fontes:** lidos inteiros o diário `revisoes/fix-548-cdx.md` e o plano (Emendas 3 e 3.1 no fim). A 3.1 prevalece (A1: a M-E3a nomeia também o T-B3; A2: o T-MOD1 confere `status===403` e `reason==='module_not_enabled'`, com o usuário de posse de `inventory.read`).
- **2026-11-12T07:34-03:00 — E3.1:** linha `{ pattern: "/mobile/technician/stock", modules: ["inventory"] },` em `src/modules/navigation/route-modules.ts`, logo depois de `/mobile/inventory` (nada mais no arquivo).
- **2026-11-12T07:35-03:00 — E3.2:** `node --import tsx scripts/san3-18-censo-modulos.mjs --gravar tests/fixtures/san3-18-route-modules.json` → 445 rotas, sem classe 0; o diff do instantâneo é exatamente 1 chave: `"GET /api/v1/mobile/technician/stock": "{inventory}"`.
- **2026-11-12T07:37-03:00 — E3.3/E3.4 (A2):** no teste de memória, tenantA e tenantB receberam `"inventory"`; no `-db`, `newTenant` passou a gravar `modules` (padrão `["inventory"]`, SQL `ARRAY[]::text[]` quando vazio) e nasceu o T-MOD1 (organização sem a área de estoque, usuário com `inventory.read` via `grantRole`, app real com JWT → 403 `module_not_enabled`). Nenhuma asserção existente mudou.
- **2026-11-12T07:40-03:00 — Postgres próprio:** `initdb` com `--encoding=UTF8 --locale=C` (o literal criava WIN1252, como o `-cdx` mediu), só em `127.0.0.1:55570`, banco `fix548b`; 133 migrações aplicadas e seed com 12 papéis/205 permissões. Pré-mutação: memória 9/9, censo 7/7, `-db` 7/7 com `# skipped 0`.
- **2026-11-12T07:44-03:00 — M-E3a:** sem a linha, `not ok` no censo (`SEM CLASSE`/`CLASSE DIVERGE ... runtime SEM_CLASSE`), no T-B3 e no T-DB2b (403 `route_module_unclassified`); T-MOD1 também caiu por razão errada (esperado). Revertida e conferida com `git diff`.
- **2026-11-12T07:46-03:00 — M-E3b:** `nucleo: true` no lugar de `modules: ["inventory"]` → `not ok` no T-MOD1 (`actual: 200`) e no censo (`CLASSE DIVERGE ... runtime NUCLEO`). Revertida e conferida com `git diff`.
- **2026-11-12T07:48-03:00 — commits:** `d16c1278` (`feat(navegacao): classifica a rota do estoque do técnico no gate de módulo (B-SAN3-15a, E3)` — `route-modules.ts` + instantâneo) e `13f31f84` (`test(estoque): dá a área de estoque às organizações do 15a e adiciona o T-MOD1 do gate (B-SAN3-15a, E3)` — os dois testes). Conventional Commits, ambos com `Co-Authored-By: DeepSeek <noreply@deepseek.com>`.
- **2026-11-12T07:50-03:00 — merge da main nova:** `git fetch origin` → `origin/main=bf29a86a` (#543 e #542). O merge conflitou SÓ no índice; `decisoes.md` e `pendencias.md` auto-mergiram sem perder nenhum cabeçalho `^## `/`^### ` (comm -23 zerado contra os dois lados); índice regenerado duas vezes (937 cabeçalhos / 926 IDs, sem diff na segunda); `decisoes.md` em LF (0 CR no blob commitado); os arquivos vindos só da main têm o blob da main; `route-modules.ts` e o instantâneo ficam com a linha/chave da emenda sobre a main. Merge commit `58c70d7d`.
- **2026-11-12T07:52-03:00 — bateria:** `prisma generate` verde; testes `bsan315|san3-18` = **72/72, `# skipped 0`** (com os `-db` no Postgres próprio); `npm run check` verde; `npm --prefix frontend run check` verde; `npm --prefix frontend run test:smoke` **1735/1735**; `git diff --check` limpo. Flutter: `pub get` verde, `dart format` 15 arquivos com 0 mudança, `flutter analyze` sem issues, `flutter test --reporter compact` **`+1169 -0`** (`All tests passed!`).
- **2026-11-12T07:53-03:00 — push:** `bfdeb155..58c70d7d fix/mobile-estoque-real-do-tecnico`. O PR segue em rascunho.

---

## Conserto da J-548 (fix-548c-dp)

**Identidade:** `fix-548c-dp`, DeepSeek Pro (pelo Codex CLI), dev declarado deste conserto. Não é a C3 da J-548 (`j548-c3-dp`), não escreveu o plano, não julgou o bloco. Fonte: `erp-pausa-2026-10-03/revisoes/j548/J-548-ata.md` (triagem) e `c3-voto.json`. Fluxo rápido §C7 10(3)4.

- **2026-11-12T09:51:56-03:00 — terreno:** em `C:/Users/thiag/w-15a`, HEAD `a429a13a1ce70cacca871f686ea52a310cfb28b3` == `origin/fix/mobile-estoque-real-do-tecnico`, `git status --porcelain` vazio; nenhum processo `node`/`dart`/`flutter` com cwd em `w-15a`. Terreno LIBERADO.
- **2026-11-12T09:52:40-03:00 — C3-02 (acentos):** `grep -nE "servico|peca|pecas" lib/features/prestador/ui/technician_stock_screen.dart` antes = linhas 78, 246, 259, 297 e 298; depois do `sed` = vazio (exit 1). Os 5 textos viraram "serviço", "peça", "peças". A única asserção de teste que confere esses literais é `b119_prestador_flow_test.dart:221` (`Adicionar ao servico` → `Adicionar ao serviço`); nenhuma outra asserção mudou (varredura `grep -rnE "Adicionar ao servico|Buscar peca|Nenhuma peca encontrada|Selecione as pecas|adicionado\(s\) ao servico" test/` = vazio).
- **2026-11-12T09:53:20-03:00 — C3-01, vermelho-controle:** escrito o T-A11 em `test/features/prestador/bsan315_estoque_real_test.dart` ANTES do botão. `flutter test --plain-name "T-A11"` → `00:00 +0 -1: ... T-A11 ... [E]`, `TestFailure: Expected: exactly one matching candidate · Actual: _TextWidgetFinder:<Found 0 widgets with text "Tentar de novo": []>`, na linha 616. Vermelho genuíno.
- **2026-11-12T09:54:10-03:00 — C3-01, o botão:** no ramo `hasCached`, o mesmo `OutlinedButton(key: 'stock-retry', onPressed: () => _retry(repo), child: Text('Tentar de novo'))` do ramo sem lista; `_buildList` ganha o parâmetro opcional `Widget? action`, renderizado logo abaixo do banner. Nenhum componente novo. T-A11 verde: `00:01 +1: All tests passed!` (conta as chamadas: `expect(calls, before + 1)`).
- **2026-11-12T09:55:30-03:00 — C3-03 (caso FECHADA):** a `P-MOBILE-ESTOQUE-TECNICO-FABRICADO` tem teste de encerramento em duas partes — `GET /mobile/technician/stock` escopado por custódia + teste (já no PR: `tests/bsan315-technician-stock.test.ts` e `tests/bsan315-technician-stock-db.test.ts`) e app mostrando o vazio honesto. O PR #548 TEM o teste do critério: o T-A6 ("estados e textos honestos") de `mobile/flutter_app/test/features/prestador/bsan315_estoque_real_test.dart` prova os vazios honestos ("Cadastro de profissional não encontrado", "Nenhuma peça com você"), e o T-A1/T-A3 provam que a lista vem da rota sem a semente de 8 SKUs. A pendência virou FECHADA citando o T-A6 e o PR #548; o texto anterior ficou em `status anterior`. `python agent-orchestration/controle/gerar-indice-pendencias.py` rodou 2× (FECHADAS 213→214, ABERTAS 720→719), sem diff na segunda.
- **2026-11-12T09:58:21-03:00 — bateria:** `dart format --output=none --set-exit-if-changed` nos 3 arquivos = 0 mudanças (após 1 passada de escrita na tela); `flutter analyze` sem issues; `flutter test --reporter compact` = **`+1170 -0`** (`All tests passed!`, +1 pelo T-A11); `npm run check` (tsc) ok.
- **Entrega:** commits `eba8ea01` (`fix(mobile): acentua 5 textos e adiciona Tentar de novo no erro com lista salva`), `13277a79` (`docs(controle): fecha a P-MOBILE-ESTOQUE-TECNICO-FABRICADO no PR #548`) e o commit de registro deste diário. Conventional Commits, todos com `Co-Authored-By: DeepSeek <noreply@deepseek.com>`. Push em `git push origin fix/mobile-estoque-real-do-tecnico`; o PR segue em rascunho.
