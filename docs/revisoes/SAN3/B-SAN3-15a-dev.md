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
limpo depois de cada uma. Roteiro e saídas TAP fora do repositório (`scratchpad/mut15a/driver.py` e `M-*.tap`).

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
