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
- **Commit da F1 sem o ramo 2** (o `if (hasTenantWideRole(actor))`): no commit `9567a891`, `bsan315-technician-stock`
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
  40.000 movimentos, `ANALYZE`; script em `explain-15a.sql` no scratchpad):
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
