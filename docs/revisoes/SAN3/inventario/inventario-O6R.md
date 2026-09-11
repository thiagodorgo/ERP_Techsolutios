# Inventário dos achados ABERTOS da auditoria Ω6R — medido no head `ca5fd19a`

Data da medição: 2026-09-11. Papel: inventariante (somente leitura).

## 0. Terreno e método

| Item | Valor |
|---|---|
| Worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b06` |
| Branch | `fix/billing-durability` (PR **#385**, estado **OPEN** — o B-O6R-06 ainda NÃO está na `main`) |
| Head | `ca5fd19a` (`git rev-parse --short HEAD`), árvore limpa (`git status --porcelain` vazio) |
| Fontes | `docs/revisoes/O6R/achados.jsonl` (32 linhas), `PLANO_O6R.md`, `REGISTRO_ACHADOS_O6R.md`, `ATA_J6R.md`, `agent-orchestration/controle/pendencias.md`, `Kpis/kpis-latest.json` |
| Método | Prova por **presença** (arquivo:linha lido no head). Nenhuma escrita no repo, nenhum `git checkout/reset/stash`, nenhum build, nenhum banco. |
| Única execução | `node --test --import tsx tests/kpi-achados-paridade.test.ts` → **6/6 pass, ec=0** (guard JSONL ↔ painel ↔ registro ↔ cronograma; sem banco). As contagens abaixo são as que esse guard aceita. |

**Campos reais do JSONL** (lidos, não presumidos): `id, severidade, categoria, modulo, lente, local[], descricao, evidencia, impacto, correcao, teste, confianca, status, votacao, fase_descoberta`; quando fechado: `fechado_em, fechado_por, evidencia_fechamento`; quando parcial: `supersedido{por, componente_superado, componentes_abertos[], contagem_aberta, pendencia_dona, verificado_em, ressalva_r1}` e (SEC-004) `nota_leitura`.

**Distribuição lida do JSONL:** 32 achados = **P0 17** (13 `fechado` · 1 `parcialmente_superado` · 3 `ativo`) + **P1 15** (2 `fechado` · 2 `parcialmente_superado` · 11 `ativo`). **Não-fechados: 17.**

**Ressalva de terreno que muda a leitura do gate:** `Ω6R-DIN-005` e `Ω6R-DIN-007` estão `fechado` no JSONL **desta branch**, com `fechado_por: "B-O6R-06 (PR na autoria...)"`. O PR #385 está **aberto**. Na `origin/main` esses dois P0 **continuam abertos** até o merge — e o painel só os conta como fechados com hash de merge (é o que o subtest 6 do guard afirma).

---

## 1. Os 32 achados — id · prioridade · status (JSONL) · fechado_por · bloco no PLANO_O6R.md

| # | ID | P | status (JSONL) | fechado_por (campo real) | Bloco no plano |
|--:|---|:-:|---|---|---|
| 1 | Ω6R-DIN-001 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 2 | Ω6R-DIN-002 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 3 | Ω6R-DIN-003 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 4 | Ω6R-DIN-004 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 5 | Ω6R-DIN-005 | P0 | fechado (**na autoria — PR #385 aberto**) | B-O6R-06 (PR na autoria; nº e hash no backfill pós-merge) | B-O6R-06 |
| 6 | Ω6R-SEC-001 | P0 | fechado | B-O6R-01 (PR #357, 0a39824) | B-O6R-01 |
| 7 | Ω6R-TEN-001 | P0 | fechado | B-O6R-01 (PR #357, 0a39824) | B-O6R-01 |
| 8 | Ω6R-DAT-001 | P0 | fechado | B-O6R-05 (PR #353, a8901ff) | B-O6R-05 |
| 9 | Ω6R-SEC-002 | P0 | **parcialmente_superado** | supersedido.por: B-O6R-07a (PR #369, ciclo 2) · residual: `P-O6R-SUBRECURSO-OBJECT-SCOPE` | B-O6R-07 (residual → **B-O6R-07c**) |
| 10 | Ω6R-ARQ-001 | P1 | **ativo** | — | B-O6R-08 |
| 11 | Ω6R-ARQ-002 | P1 | **ativo** | — | B-O6R-08 |
| 12 | Ω6R-ARQ-003 | P1 | **ativo** | — | B-O6R-08 |
| 13 | Ω6R-ARQ-004 | P1 | **ativo** | — | B-O6R-09 |
| 14 | Ω6R-DIN-006 | P0 | fechado | B-O6R-05 (PR #353, a8901ff) | B-O6R-05 |
| 15 | Ω6R-PERF-001 | P1 | **ativo** | — | B-O6R-08 |
| 16 | Ω6R-PERF-002 | P1 | **ativo** | — | B-O6R-10 |
| 17 | Ω6R-PERF-003 | P1 | **ativo** | — | B-O6R-10 |
| 18 | Ω6R-QUA-001 | P1 | **ativo** | — | B-O6R-03 |
| 19 | Ω6R-QUA-002 | P1 | **ativo** | — | B-O6R-04 |
| 20 | Ω6R-DIN-007 | P0 | fechado (**na autoria — PR #385 aberto**) | B-O6R-06 (PR na autoria; nº e hash no backfill pós-merge) | B-O6R-06 |
| 21 | Ω6R-QUA-003 | P1 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 22 | Ω6R-DIN-008 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) | B-O6R-02 |
| 23 | Ω6R-DIN-009 | P0 | **ativo** | — | B-O6R-03 |
| 24 | Ω6R-DAT-002 | P0 | **ativo** | — | B-O6R-04 |
| 25 | Ω6R-DAT-003 | P0 | **ativo** | — | B-O6R-04 |
| 26 | Ω6R-QUA-004 | P1 | **parcialmente_superado** | supersedido.por: PR #351 (7e60b90) — B-127 (timeline) | B-O6R-11 |
| 27 | Ω6R-QUA-005 | P1 | **ativo** | — | B-O6R-11 |
| 28 | Ω6R-SEC-003 | P1 | fechado | B-O6R-01 (núcleo, PR #357) + B-O6R-07a (residuais, PR #369, dc8168b) | B-O6R-07 |
| 29 | Ω6R-SEC-004 | P1 | **parcialmente_superado** | supersedido.por: B-O6R-07b (PR #380, merge fe2748c, head julgado a2988b5) · residual: `P-O6R-B07B-SCANNER-AV-REAL` | B-O6R-07 (residual → **B-AV-REAL**, bloco FORA do plano) |
| 30 | Ω6R-DAT-004 | P1 | **ativo** | — | B-O6R-12 (adendo 2026-08-16, aceite provisório) |
| 31 | Ω6R-DIN-010 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) — achado pela própria junta do bloco | B-O6R-02 |
| 32 | Ω6R-DIN-011 | P0 | fechado | B-O6R-02 ciclo 5 (PR #371, 99f1840) — achado pela própria junta do bloco | B-O6R-02 |

---

## 2. Os 17 não-fechados — status comprovado pelo CÓDIGO no head `ca5fd19a`

### 2.1 Resumo

| ID | P | status_comprovado | bloco_dono | bloco começou? | risco | impacto_vendavel |
|---|:-:|:-:|---|:-:|---|:-:|
| Ω6R-DIN-009 | P0 | **ATIVO** | B-O6R-03 | NÃO | 4-faturamento/dinheiro | **BLOQUEIA** |
| Ω6R-DAT-002 | P0 | **ATIVO** | B-O6R-04 | NÃO | 1-perda/corrupcao-de-dados | **BLOQUEIA** |
| Ω6R-DAT-003 | P0 | **ATIVO** | B-O6R-04 | NÃO | 1-perda/corrupcao-de-dados | **BLOQUEIA** |
| Ω6R-SEC-002 | P0 | **PARCIAL** (residual ativo) | B-O6R-07c | NÃO | 3-seguranca/permissoes | **BLOQUEIA** |
| Ω6R-ARQ-001 | P1 | **ATIVO** | B-O6R-08 | NÃO | 5-confiabilidade | NAO (risco declarado) |
| Ω6R-ARQ-002 | P1 | **ATIVO** | B-O6R-08 | NÃO | 5-confiabilidade | NAO (risco declarado) |
| Ω6R-ARQ-003 | P1 | **ATIVO** | B-O6R-08 | NÃO | 5-confiabilidade | NAO (risco declarado) |
| Ω6R-ARQ-004 | P1 | **ATIVO** | B-O6R-09 | NÃO (dep. B08 nunca começou) | 1-perda/corrupcao-de-dados | NAO (risco declarado) |
| Ω6R-PERF-001 | P1 | **ATIVO** | B-O6R-08 | NÃO | 5-confiabilidade | NAO (risco declarado) |
| Ω6R-PERF-002 | P1 | **ATIVO** | B-O6R-10 | NÃO | 5-confiabilidade | NAO (risco declarado) |
| Ω6R-PERF-003 | P1 | **ATIVO** | B-O6R-10 | NÃO | 5-confiabilidade | NAO (risco declarado, com condição) |
| Ω6R-QUA-001 | P1 | **ATIVO** | B-O6R-03 | NÃO | 7-fluxo-necessario-para-venda | NAO por regra — mas o fluxo RDV mobile NÃO funciona |
| Ω6R-QUA-002 | P1 | **ATIVO** | B-O6R-04 | NÃO | 7-fluxo-necessario-para-venda | NAO por regra — mas o estoque mobile NÃO sincroniza |
| Ω6R-QUA-004 | P1 | **PARCIAL** (2 de 3 componentes ativos) | B-O6R-11 | NÃO | 6-contratos/testes | NAO (risco declarado) |
| Ω6R-QUA-005 | P1 | **ATIVO** | B-O6R-11 | NÃO | 1-perda/corrupcao-de-dados | NAO (risco declarado) |
| Ω6R-SEC-004 | P1 | **PARCIAL** (residual ativo) | B-AV-REAL (fora do plano) | NÃO | 3-seguranca/permissoes | **BLOQUEIA** (funcional: produção/staging respondem 503 a TODO upload) |
| Ω6R-DAT-004 | P1 | **ATIVO** | B-O6R-12 | NÃO | 4-faturamento/dinheiro | NAO (risco declarado, com condição) |

Nenhum dos 17 foi corrigido "de passagem" por bloco posterior: o `git log --since=2026-08-12` sobre cada sítio só devolve #353 (bootstrap do worker — moveu o código, não o corrigiu), #352 (checklists em field-dispatch — não toca o par create/createEvent), #351 (timeline mobile — já contabilizado no `supersedido` do QUA-004), #369/#380 (work-order.routes — gates de approve e upload, não o escopo por objeto dos subrecursos).

### 2.2 Ficha por achado (13 campos)

---

#### Ω6R-DIN-009
- **P:** P0
- **descrição:** Sync de despesa aplica efeito antes do recibo, em transações separadas, chave sem usuário/fingerprint.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/expense-management/expense-management.service.ts:169-191` — ordem `findMobileActionReceipt({tenantId, clientActionId})` (`:169`) → `processSyncAction(actor, type, payload)` (`:182`) → `createMobileActionReceipt({... actorUserId ...})` (`:183-191`); a chave consultada é só `{tenantId, clientActionId}`, `actorUserId` só é gravado depois, nenhum hash de payload. `expense-management-prisma.repository.ts:150-161` (`findUnique` por `tenant_id_client_action_id`), `:163-180` (`createMobileActionReceipt` faz check-then-create), e `:269-275` — `findMobileActionReceipt` e `createMobileActionReceipt` são **dois `withTenantRls` distintos** (uma transação por método), e `createReport/addItem/submitReport` (`:253-267`) outras tantas. Nenhum caminho de claim `processing`.
- **gravidade:** P0 (registro) · minha leitura: **P0 mantido** — replay após crash entre `:182` e `:183` paga o mesmo item duas vezes; dois usuários com o mesmo `client_action_id` colidem em silêncio (o replay devolve o `resultRef` alheio).
- **origem:** 2026-08-11/12, auditoria Ω6R (Fase 2 — onda financeira), lente A3.
- **bloco_dono / começou?:** `B-O6R-03` (`fix/expense-sync-atomic`). **NÃO começou:** sem branch local/remota, sem PR (#326-#385 listados), sem comando em `agent-orchestration/codex/comandos/`, `Kpis/kpis-latest.json` roadmap `B-O6R-03.estado = "a_fazer"`, `pendencias.md:2711-2742` `P-O6R-B03` **ABERTA — 1 P0 + 1 P1**.
- **risco:** 4-faturamento/dinheiro
- **dependências:** plano: dep. B-O6R-01 — **satisfeita** (#357). Nada depende do B03.
- **impacto_vendavel:** **BLOQUEIA** — P0 de dinheiro (duplicação de valor de despesa/reembolso por replay).
- **teste_de_encerramento:** (JSONL `teste`) crash effect→receipt, duas chamadas concorrentes, dois usuários com a mesma chave e mesma chave com payload divergente → exatamente um efeito correto persistido; fingerprint divergente = conflito. Gate transversal do plano: PostgreSQL real, duas conexões/barreira, invariantes finais no banco.

---

#### Ω6R-DAT-002
- **P:** P0
- **descrição:** Saída de estoque lê saldo, valida e insere sem lock; reversão sem unicidade ativa.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/inventory/inventory-prisma.repository.ts:206-237` — `createMovement`: `saldoOfCustody` (agregado, `:214`) → `wouldOverdraw` (`:216-218`) → `insertMovement` (`:236`); o comentário `:212-213` declara que o guard roda "against THIS custody's balance" via agregado, sem `FOR UPDATE`/balance row/CAS. `:410-427` — `removeExitForSource`: `findExitBySource` → `isExitReversed` (`:413`, check) → `insertMovement` com `reversesMovementId` (`:416-426`), sem unicidade que impeça duas reversões concorrentes do mesmo `exit.id`.
- **gravidade:** P0 (votado 5×0) · minha leitura: **P0 mantido** — com saldo 10, duas saídas de 8 lêem 10 e gravam −16; é corrupção de estoque e de custódia.
- **origem:** 2026-08-11/12, auditoria Ω6R (Fase 2 — onda dados), lente A3.
- **bloco_dono / começou?:** `B-O6R-04` (`fix/inventory-consistency`). **NÃO começou:** sem branch/PR/comando; KPI `B-O6R-04.estado = "a_fazer"`; `pendencias.md:2744-2802` `P-O6R-B04` **ABERTA — NÃO INICIADO** (e a correção de registro de 2026-08-28 mostra que este bloco chegou a constar como FECHADO por 13 dias, por status trocado com o B05).
- **risco:** 1-perda/corrupcao-de-dados
- **dependências:** dep. B-O6R-01 — **satisfeita**. É "frente livre" (porteiro do #359).
- **impacto_vendavel:** **BLOQUEIA** — P0 de perda/corrupção de dado (saldo negativo persistido, compensação dupla).
- **teste_de_encerramento:** 20 retiradas concorrentes e N reversões no PostgreSQL → saldo nunca negativo, exatamente uma compensação por origem; lock/CAS por `(tenant, item, custody)` e unicidade de reversão ativa.

---

#### Ω6R-DAT-003
- **P:** P0
- **descrição:** Fechamento de contagem commita ajuste por item; sessão sem lock nem unicidade por sessão+item.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/inventory/cycle-count.service.ts:153-156` — comentário vivo: "cada createMovement commita na propria transacao. Um novo 'Fechar' NAO pode duplicar esses ajustes → puxamos os ajustes ja ligados a esta sessao e pulamos"; `:157-163` lê `listMovements` **antes** do laço; `:165-205` laço com `this.inventory.createMovement` por item (`:182-190`); `:207-212` `applyClose` só ao final. `cycle-count-prisma.repository.ts:100-120` — `applyClose`: `findSession` sem `FOR UPDATE` (`:101`), `updateMany` por entrada (`:104-112`) e `updateMany` de status para `concluida` **sem condição de status anterior** (`:114-117`).
- **gravidade:** P0 (votado 5×0) · minha leitura: **P0 mantido** — dois "Fechar" concorrentes passam ambos o `status !== "aberta"` (`:146`), ambos lêem "sem ajuste" e ambos gravam; falha no meio deixa parcial (o remendo de idempotência só cobre o retry sequencial).
- **origem:** 2026-08-11/12, auditoria Ω6R (Fase 2 — onda dados), lente A3.
- **bloco_dono / começou?:** `B-O6R-04`. **NÃO começou** (idem DAT-002).
- **risco:** 1-perda/corrupcao-de-dados
- **dependências:** dep. B-O6R-01 — **satisfeita**.
- **impacto_vendavel:** **BLOQUEIA** — P0 de corrupção de dado (ajuste de inventário aplicado duas vezes / contagem parcial).
- **teste_de_encerramento:** N closes concorrentes e falha no item intermediário → um ajuste por item, vencedor único, rollback integral; transação única com `FOR UPDATE` da sessão, status condicional e unique `(tenant, cycle_count, item)`.

---

#### Ω6R-SEC-002 (parcialmente_superado)
- **P:** P0
- **descrição:** Residual: técnico ainda muta OS alheia por 10 vias (anexos, comentários, geocode, km via sync).
- **status_comprovado:** **PARCIAL** — o superado está no código; o residual das 10 vias está **ATIVO**.
- **prova do SUPERADO (para fixar o que já não reprova):** `src/modules/work-orders/work-order.routes.ts:87-97` — approve/reject exigem `WORK_ORDER_PERMISSIONS.approve`; `work-order.service.ts:808-840` — `assertMutationObjectScope` (403 `not_assigned_to_actor`, dual-match perfil OU user id), chamado em `:852` (`update`) e `:1319` (`changeStatus`).
- **prova do RESIDUAL (as 10 vias, cada uma pelo head):**
  1-2. `work-order.routes.ts:223-226` `POST /:workOrderId/attachments` com `requireAnyPermission([create, update])`; `:237-240` `DELETE /:workOrderId/attachments/:attachmentId` com `requirePermission(update)` — nenhum dos dois passa por `assertMutationObjectScope` (os únicos chamadores são `:852` e `:1319`).
  3-7. `src/modules/work-order-comments/work-order-comment.routes.ts:45-81` — as 5 rotas mutantes (`POST`, `PATCH`, `DELETE` de comentário; `POST`/`DELETE` de tag) gateiam só `WORK_ORDER_COMMENT_PERMISSIONS.comment`; `work-order-comment.service.ts:139-145` — `assertCanMutate` = `isAuthor || permissions.includes("work_orders:update")`, e o técnico porta `update` (é o mesmo motivo do achado original).
  8-9. `work-order.routes.ts:246-259` — `POST /:workOrderId/geocode` e `/geocode-destination` com `requirePermission(update)`, sem guard de objeto (efeito condicionado a `GEOCODING_ENABLED`, como registrado).
  10. `src/modules/mobile/mobile-work-order-sync.ts:245-257` — `work_order.mileage` exige só `work_orders:status` (`:246`) e chama `service.setMileage(...)` (`:247-255`); `work-order.service.ts:1247-1290` — `setMileage` faz `this.get` (`:1253`), parse, `repository.update` (`:1279`): **não chama `assertMutationObjectScope`** (chamadores confirmados por grep: só `:852` e `:1319`).
- **residual exato (o registro nomeia):** `supersedido.componentes_abertos` = 9 rotas dos dois routers de OS + 1 via de sync mobile (`contagem_aberta`: "10 vias ... o número NÃO é exaustivo — o B-O6R-07c CENSA a superfície de sync antes de declarar este P0 fechado"). Item de decisão de produto embutido: `D-Ω3F-5-COMMENT` (cláusula "autor OU update").
- **gravidade:** P0 (votado 5×0) · minha leitura: o residual **continua P0 na parte destrutiva** — `DELETE /attachments/:id` apaga blob de OS alheia (perda de evidência) e `work_order.mileage` via sync escreve km em OS alheia (medido HTTP 200 pelo porteiro do #369); a parte de comentários é P1 de produto.
- **origem:** 2026-08-11/12, auditoria Ω6R (Fase 2 — onda segurança), lente A2; residual medido em 2026-09-03 (junta ciclo 2 do 07a) e re-confirmado pelo porteiro do #369.
- **bloco_dono / começou?:** `B-O6R-07c` (`fix/o6r07c-subresource-scope`), dono nomeado em `pendencias.md:6501-6555` `P-O6R-SUBRECURSO-OBJECT-SCOPE` **ABERTA, ALTA**. **NÃO começou:** sem branch, sem PR, sem comando, sem plano. KPI: `B-O6R-07.estado = "a_fazer"` (apesar de #369 e #380 mergeados — leitura do painel é "bloco 07 não concluído porque falta o 07c"; anoto, não corrijo).
- **risco:** 3-seguranca/permissoes
- **dependências:** pré-requisito declarado: merge do 07b — **satisfeito** (#380, fe2748c). Não bloqueia outro bloco do plano; a CHECKLIST P1 herda a trava ("fatia de P1 que amplie superfície de anexo/comentário de OS herda a trava").
- **impacto_vendavel:** **BLOQUEIA** — P0 de permissão: ator de campo destrói/altera recurso de OS que não é dele. Se o dono quiser reduzir o bloqueio ao mínimo: fechar as vias 1, 2 e 10 (destrutivas/dado) é o piso; as 5 de comentário podem ficar como risco declarado até a decisão de produto do `D-Ω3F-5-COMMENT`.
- **teste_de_encerramento:** técnico A, OS atribuída a B → `POST/DELETE attachments`, `POST/PATCH/DELETE comments` e tags, `POST geocode*`, `sync work_order.mileage` → 403 (nunca 404); B legítimo continua 201/204/200; censo da superfície de sync mobile com vermelho-controle no head-base.

---

#### Ω6R-ARQ-001
- **P:** P1
- **descrição:** `dequeue` faz LPOP destrutivo antes de gravar `processing`; sem lease, processing list ou reclaim.
- **status_comprovado:** **ATIVO**
- **prova:** `src/infra/jobs/job.queue.ts:54-78` — `:57` `await this.redis.command("LPOP", this.pendingKey)`; `:63` `getJob`; `:69-75` só então `save({...status: "processing"})`. Nenhum `RPOPLPUSH`/`XREADGROUP`/lease. `job.worker.ts:62-64` — `handler(...)` → `complete(job)`; crash entre `:57` e `:75` ou durante `:63` perde o id.
- **gravidade:** P1 (registro) · minha leitura: **P1** — os sweeps auto-reenfileirantes re-semeiam no próximo boot (`job-worker.bootstrap.ts:141-147`), então a perda permanente atinge jobs de evento únicos (notification-dispatch, fanout) e o tick de sweep até o restart.
- **origem:** 2026-08-11/12, auditoria Ω6R (Fase 2 — onda arquitetura), lente A1.
- **bloco_dono / começou?:** `B-O6R-08` (`fix/durable-jobs-realtime`). **NÃO começou:** sem branch/PR/comando; KPI `a_fazer`; `pendencias.md:3090-3134` `P-O6R-B08` **ABERTA — 4 P1**. Rascunho `docs/revisoes/O6R/D-003-jobs-duraveis.md` é pauta do dono, não decisão.
- **risco:** 5-confiabilidade
- **dependências:** dep. B-O6R-05 — **satisfeita** (#353). **B-O6R-09 depende deste bloco.**
- **impacto_vendavel:** NAO — P1 sem perda de dado persistido; risco declarado: entre crash e restart não roda sweep, e notificação de despacho/fanout perdidos não voltam.
- **teste_de_encerramento:** matar o worker após `dequeue` e durante o handler → outro worker recupera o mesmo job após o lease, sem perda nem execução simultânea; enqueue (envelope + push) atômico.

---

#### Ω6R-ARQ-002
- **P:** P1
- **descrição:** Cada boot enfileira 4 sweeps com UUID novo; handler sempre re-enfileira; sem chave/líder.
- **status_comprovado:** **ATIVO** (o código mudou de arquivo com o #353, não de comportamento)
- **prova:** `src/infra/jobs/job-worker.bootstrap.ts:141-147` — os quatro `enqueueInitial*` a cada `startJobWorkerIfEnabled` (corpo "VERBATIM do server.ts:19-31 original", `:62`); `src/modules/charging/charge.jobs.ts:14-17` — `finally { enqueue("charging.accrue-daily", ...) }` "Re-enfileira SEMPRE (mesmo se a varredura falhar)"; `:22-23` `enqueueInitialChargingAccrueScan`; `job.queue.ts:28` `id: randomUUID()` — sem chave determinística de schedule, sem `SET NX`/lease.
- **gravidade:** P1 · minha leitura: **P1** — os sweeps são idempotentes (`period_seq`, comentário `charge.jobs.ts:9`), então multiplicação é carga, não cobrança dupla; cresce com o histórico de restarts.
- **origem:** 2026-08-11/12, auditoria Ω6R, lente A1.
- **bloco_dono / começou?:** `B-O6R-08` — **NÃO começou** (idem ARQ-001).
- **risco:** 5-confiabilidade
- **dependências:** dep. B05 satisfeita; B09 depende do B08.
- **impacto_vendavel:** NAO — risco declarado (carga crescente; com uma réplica e restarts raros o efeito é limitado).
- **teste_de_encerramento:** duas réplicas e restarts → exatamente um sweep de cada nome por intervalo (chave determinística por schedule com lease/renovação ou scheduler único).

---

#### Ω6R-ARQ-003
- **P:** P1
- **descrição:** Broker SSE mantém assinantes e dedupe em `Map` do processo; sem broadcast nem replay.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/field-ops-realtime/field-ops-realtime.broker.ts:24-27` — `subscribersByTenant = new Map(...)`, `recentEventIds: string[]`, `recentEventIdSet = new Set()`; `:42-60` `publish` entrega só a `this.subscribersByTenant.get(sanitized.tenantId)` (`:47`). Sem Pub/Sub, sem cursor, sem `Last-Event-ID`.
- **gravidade:** P1 · minha leitura: **P1, latente** — só se manifesta com mais de uma réplica; hoje `fly.staging.toml` roda 1 máquina (`min_machines_running = 1`, #354).
- **origem:** 2026-08-11/12, auditoria Ω6R, lente A1.
- **bloco_dono / começou?:** `B-O6R-08` — **NÃO começou**.
- **risco:** 5-confiabilidade
- **dependências:** dep. B05 satisfeita.
- **impacto_vendavel:** NAO — risco declarado, condicionado a escalar horizontalmente (o mapa fica desatualizado até refresh).
- **teste_de_encerramento:** cliente SSE em B, mutação em A, worker em C → B recebe uma vez e recupera após reconexão.

---

#### Ω6R-ARQ-004
- **P:** P1
- **descrição:** Despacho e evento de timeline gravados em duas transações; criação sem chave idempotente.
- **status_comprovado:** **ATIVO** (linhas deslocadas pelo #352; o par continua)
- **prova:** `src/modules/field-dispatch/field-dispatch.service.ts:376-386` — `await this.repository.create({...})`; `:388-...` — `await this.repository.createEvent({... dispatchId: dispatch.id ...})`: duas chamadas independentes; grep por `client_action_id|clientActionId` no service não devolve linha. `field-dispatch-prisma.repository.ts:153-155` (`create`) e `:173-175` (`createEvent`) — cada método abre o seu próprio `withTenantRls`. Mesma fronteira em `changeStatus` (`:511`) e `reassign` (`:563`).
- **gravidade:** P1 · minha leitura: **P1** — despacho sem evento probatório e despacho duplicado no retry são visíveis ao operador e corrigíveis; não perde dinheiro.
- **origem:** 2026-08-11/12, auditoria Ω6R, lente A1.
- **bloco_dono / começou?:** `B-O6R-09` (`fix/dispatch-atomic-timeline`). **NÃO começou:** sem branch/PR/comando; KPI `a_fazer`; `pendencias.md:3136-3155` `P-O6R-B09` **ABERTA — 1 P1**.
- **risco:** 1-perda/corrupcao-de-dados
- **dependências:** dep. **B-O6R-08 — NÃO satisfeita** (B08 nunca começou). Trava a `P-Ω3F7B-MAPA-ETAPA` (histórico por etapa do despacho).
- **impacto_vendavel:** NAO — risco declarado (agregado sem história / duplicado em retry, sem dinheiro).
- **teste_de_encerramento:** falha injetada no insert do evento → rollback do despacho; replay da mesma chave → um agregado e um evento.

---

#### Ω6R-PERF-001
- **P:** P1
- **descrição:** `setInterval` dispara `processNextJob` sem guarda in-flight; handler sem deadline/cancelamento.
- **status_comprovado:** **ATIVO**
- **prova:** `src/infra/jobs/job.worker.ts:104-114` — `this.timer = setInterval(() => { this.processNextJob().catch(...) }, pollIntervalMs)`: Promise não aguardada, sem semáforo; `:62-64` `await handler(job.payload, job)` sem timeout/AbortSignal. O `lastSuccessfulTickAt` (`:29-45`, DIN-006) mede vida, não limita concorrência.
- **gravidade:** P1 · minha leitura: **P1**.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda performance), lente A4.
- **bloco_dono / começou?:** `B-O6R-08` — **NÃO começou**.
- **risco:** 5-confiabilidade
- **dependências:** dep. B05 satisfeita.
- **impacto_vendavel:** NAO — risco declarado.
- **teste_de_encerramento:** handler bloqueado por barreira durante vários intervalos não inicia execuções acima do limite; timeout aciona retry/reclaim.

---

#### Ω6R-PERF-002
- **P:** P1
- **descrição:** Auto-refresh ignora a Promise em intervalo fixo; `fetch` sem `AbortSignal`/timeout.
- **status_comprovado:** **ATIVO**
- **prova:** `frontend/src/hooks/useAutoRefresh.ts:34-40` — `const tick = () => { ...; void savedRefresh.current(true); }; const id = window.setInterval(tick, intervalMs);` (sem trava in-flight, sem generation guard); `frontend/src/services/api/client.ts:123` e `:137` — `fetch(\`${apiBaseUrl()}${path}\`, buildInit(...))` sem `signal`/deadline.
- **gravidade:** P1 · minha leitura: **P1** — sob backend lento, resposta velha pode vencer a nova na tela do operador.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda performance), lente A4.
- **bloco_dono / começou?:** `B-O6R-10` (`fix/client-load-shedding`). **NÃO começou:** sem branch/PR/comando; KPI `a_fazer`; `pendencias.md:3157-3187` `P-O6R-B10` **ABERTA — 2 P1**.
- **risco:** 5-confiabilidade
- **dependências:** dep. B-O6R-05 — **satisfeita**.
- **impacto_vendavel:** NAO — risco declarado.
- **teste_de_encerramento:** requests > 2 intervalos resolvidas fora de ordem → no máximo uma ativa, estado final da geração mais recente; timeout central com `AbortController`.

---

#### Ω6R-PERF-003
- **P:** P1
- **descrição:** Jimp decodifica até 40M pixels, 3 concorrentes, no mesmo processo do ERP; timeout não cancela.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/owner-portal/image-header-guard.ts:14` `MAX_DECODED_PIXELS = 40_000_000`; `photo-concurrency-guard.ts:12` `PHOTO_PIPELINE_MAX_CONCURRENCY = 3` e `:3-4` "O timeout de 4000ms ... NÃO cancela trabalho SÍNCRONO já em curso"; `owner-portal.photo-pipeline.ts:64-78` `Jimp.read` → `resize` → `print` → `getBuffer` no processo; `src/server.ts:36-42` — `createPortalApp()` sobe no **mesmo `main()`** do ERP (porta separada, processo igual).
- **gravidade:** P1 · minha leitura: **P1 com nota** — é superfície pública sem autenticação; as defesas do Ω5P PR-17b (header-guard, semáforo, 503) limitam a ~480 MB RGBA teóricos e 3 decodes, mas o CPU-bound segue bloqueando rotas autenticadas.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda performance), lente A4.
- **bloco_dono / começou?:** `B-O6R-10` — **NÃO começou**.
- **risco:** 5-confiabilidade
- **dependências:** dep. B05 satisfeita.
- **impacto_vendavel:** NAO, **com condição**: se o owner-portal público for parte do produto vendido, o piso é implantá-lo como container separado (o próprio `server.ts:33-35` diz "Deployável como container próprio", mas hoje sobe junto). Sem portal público exposto, é risco declarado.
- **teste_de_encerramento:** três imagens no limite → RSS/p99 de `/health`/rota autenticada dentro do SLO; timeout encerra o trabalho real (worker/processo isolado com cancelamento).

---

#### Ω6R-QUA-001
- **P:** P1
- **descrição:** Replay RDV usa `ApiConfig` const sem token; a fila de despesas nunca converge.
- **status_comprovado:** **ATIVO**
- **prova:** `mobile/flutter_app/lib/core/sync/sync_providers.dart:51` — `final apiConfigProvider = Provider<ApiConfig>((ref) => const ApiConfig());`; `:109-112` — `syncBatchApiProvider` lê `apiConfigProvider` e constrói `DioExpenseSyncBatchApi(createExpenseHttpClient(config))`. Contraste no mesmo arquivo: `:78-99` (`fieldLocationApiProvider`) e `:122-124` (`workOrderSyncBatchApiProvider`) usam `authenticatedApiConfigProvider` com refresh/logout. `auto_sync_coordinator.dart:118` chama `syncReplayServiceProvider.replayTenant` — o replay roda, sem Bearer.
- **gravidade:** P1 · minha leitura: **P1 funcional** — não corrompe nada; simplesmente o RDV criado em campo nunca chega ao ERP.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda qualidade), lente A5.
- **bloco_dono / começou?:** `B-O6R-03` — **NÃO começou**.
- **risco:** 7-fluxo-necessario-para-venda
- **dependências:** dep. B01 satisfeita; entra na mesma fila do PR-08 mobile (`P-MOBILE-OS-SEEDS`, `P-MOBILE-BANNER-INTEGRACAO`, ambas ABERTAS).
- **impacto_vendavel:** NAO por regra (P1) — **mas se "despesas/RDV no app de campo" estiver no escopo vendido, o fluxo não funciona ponta a ponta.** Como vive no B03 junto do DIN-009 (que bloqueia), fecha no mesmo bloco.
- **teste_de_encerramento:** `ProviderContainer` com sessão intercepta o POST de sync e exige Bearer; 401 provoca refresh + um retry; sem sessão a fila não é consumida (implementação pending).

---

#### Ω6R-QUA-002
- **P:** P1
- **descrição:** App enfileira `entry/exit.create`; backend só aceita `reserve/consume/shortage_report`; sem replay; estado em `Map`.
- **status_comprovado:** **ATIVO**
- **prova:** `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart:92-105` (`InventorySyncActionTypes.entryCreate`) e `:147-159` (`exitCreate`); `src/modules/mobile/mobile-inventory-sync.ts:99-105` — `syncReceipts = new Map()`, `inventoryByTenant = new Map()`, `supportedActionTypes = ["inventory.reserve","inventory.consume","inventory.shortage_report"]`; `mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart:90-118` — replays de OS, checklist, evidência, RDV; **nenhum de estoque**.
- **gravidade:** P1 · minha leitura: **P1 funcional** — três defeitos encadeados (tipo, replay, persistência) que juntos significam "estoque mobile não existe para o backend".
- **origem:** 2026-08-11/12, auditoria Ω6R (onda qualidade), lente A5.
- **bloco_dono / começou?:** `B-O6R-04` — **NÃO começou**.
- **risco:** 7-fluxo-necessario-para-venda
- **dependências:** dep. B01 satisfeita.
- **impacto_vendavel:** NAO por regra — **mas se "estoque no app de campo" estiver no escopo vendido, o fluxo não funciona.** Vive no B04 com DAT-002/003 (que bloqueiam).
- **teste_de_encerramento:** fixture de contrato para cada ação; replay pelo coordinator; consulta do mesmo estoque Prisma; restart do backend → persistência e idempotência.

---

#### Ω6R-QUA-004 (parcialmente_superado)
- **P:** P1
- **descrição:** Residual: detalhe/status entregam o envelope ao parser snake_case; assign envia `user_id` que o service não lê.
- **status_comprovado:** **PARCIAL** — timeline superada (no código); detalhe, status e assign **ATIVOS**.
- **prova do superado:** `work_order_remote_api.dart:122-138` — `fetchTimeline` pede `Map` e lê `resp.data?['data']` (PR #351, 7e60b90).
- **prova do residual:** `:94-103` `fetchWorkOrder` → `_workOrderFromJson(resp.data!)` (envelope inteiro); `:105-119` `updateWorkOrderStatus` idem; `:223-247` `_workOrderFromJson` lê `json['tenant_id']`, `json['customer_name']`, `json['scheduled_at']`… na **raiz**, enquanto o backend serializa `{ data: {camelCase} }`. `:141-160` `assignWorkOrder` envia `'user_id': userId` (`:151`); backend `work-order.controller.ts:195-199` repassa `request.body ?? {}` sem normalizar; `work-order.service.ts:1684` lê `body.operatorId ?? body.userId` → ambos `undefined` → `parseRequiredUuid` → 400. (O comentário `work-order.service.ts:819` diz "o app manda `userId`" — o Dart em `:151` manda `user_id`; o comentário do 07a descreve o caminho do **sync** `mobile-work-order-sync.ts:229-231`, que mapeia `user_id → userId`, não o REST direto.)
- **residual exato (o registro nomeia):** `supersedido.componentes_abertos` = `fetchWorkOrder`, `updateWorkOrderStatus`, `assignWorkOrder`.
- **gravidade:** P1 · minha leitura: **P1** — o caminho offline do app (fila → `POST /mobile/sync/work-order-actions`) funciona; o que quebra é a API remota direta e o falso verde do teste `b099_real_work_orders_pull_test.dart`.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda qualidade), lente A5; parcial verificado em 2026-08-14 sobre `e80430a`.
- **bloco_dono / começou?:** `B-O6R-11` (`fix/mobile-work-order-contracts`). **NÃO começou:** sem branch/PR/comando; KPI `a_fazer`; `pendencias.md:3189-3234` `P-O6R-B11` **ABERTA — 2 P1**.
- **risco:** 6-contratos/testes
- **dependências:** dep. B01 satisfeita; fila do PR-08 mobile.
- **impacto_vendavel:** NAO — risco declarado (o fluxo de campo passa pelo sync, que está correto).
- **teste_de_encerramento:** `MockAdapter` executa `DioWorkOrderRemoteApi` em list/detail/status/timeline/assign com respostas reais do backend; normalizador único de envelope/camelCase; payload de assign conforme contrato.

---

#### Ω6R-QUA-005
- **P:** P1
- **descrição:** `forEach` dispara `enqueue` sem `await`; cada enqueue faz load/save da fila inteira.
- **status_comprovado:** **ATIVO**
- **prova:** `mobile/flutter_app/lib/features/prestador/data/prestador_repository.dart:121-133` — `selection.forEach((sku, qty) { ...; _syncQueue.enqueue(action); });` (Future descartada; contraste com o `for ... await` de `:117-119` logo acima); `:135-136` retorna antes da durabilidade. `core/sync/sync_queue_repository.dart:17-34` — `enqueue` = `_store.load()` → `any(...)` → `_store.save([...actions, action])` (read-modify-write sem transação).
- **gravidade:** P1 · minha leitura: **P1** — perde material lançado em campo se o app morrer logo após confirmar; vários SKUs podem se sobrescrever.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda qualidade), lente A5.
- **bloco_dono / começou?:** `B-O6R-11` — **NÃO começou**.
- **risco:** 1-perda/corrupcao-de-dados
- **dependências:** dep. B01 satisfeita.
- **impacto_vendavel:** NAO por regra (P1) — risco declarado: perda local de ação de material sob crash imediato.
- **teste_de_encerramento:** três SKUs com store atrasado e restart imediato após o retorno → as três ações existem ao reabrir o banco (`for...in await` ou `enqueueAll` transacional Drift).

---

#### Ω6R-SEC-004 (parcialmente_superado)
- **P:** P1
- **descrição:** Residual: sem antivírus real; produção/staging respondem 503 a todo upload; `noop` segue default em dev/test.
- **status_comprovado:** **PARCIAL** — os dois mecanismos (MIME do cliente; download inline) estão mortos no código; o terceiro (scanner) está **fail-closed sem AV real**.
- **prova do superado:** `src/config/env.ts:546-551` — refinamento recusa `EVIDENCE_SCANNER=noop` em produção; `:637-638` default por `NODE_ENV` (`production → "unavailable"`, senão `"noop"`); `src/modules/evidence/evidence-scanner.factory.ts:34` — `env.EVIDENCE_SCANNER === "noop" ? new NoopEvidenceScanner() : new UnavailableEvidenceScanner()`; `attachment.storage.ts:59`, `mobile-evidence-upload.ts:64`, `work-order-attachment.storage.ts:57` — o default de módulo `new NoopEvidenceScanner()` morreu nas três vias.
- **prova do residual:** as únicas implementações de `EvidenceScanner` no head são `NoopEvidenceScanner` (`evidence-storage.ts:58`), `FakeEvidenceScanner` (`:64`) e `UnavailableEvidenceScanner` (`:83`); grep case-insensitive por `clamd|clamav|zINSTREAM` em `src/` não devolve linha. Logo: em `NODE_ENV=production` (staging incluso — `fly.staging.toml:31`) **todo upload das 5 vias responde 503**; em dev/test o scanner continua respondendo `clean` para qualquer byte.
- **residual exato (o registro nomeia):** `supersedido.componentes_abertos` = (1) antivírus real em produção — serviço externo, junta-5 + `PD-O6R-B07B-CLAMD-INSTREAM`; (2) quarentena de arquivo infectado (hoje 422 + log, nada gravado).
- **gravidade:** P1 · minha leitura: **P1 de segurança, mas P0 funcional** — não há buraco (é fail-closed), há ausência de função: o produto de campo sem upload de evidência.
- **origem:** 2026-08-11/12, auditoria Ω6R (onda segurança), lente A2; residual nomeado em 2026-09-06 (07b).
- **bloco_dono / começou?:** **`B-AV-REAL` — bloco FORA do `PLANO_O6R.md`** (`pendencias.md:6920-6945` `P-O6R-B07B-SCANNER-AV-REAL` **ABERTA, ALTA, dono "bloco próprio pós-O6R (B-AV-REAL), a encaixar pelo dono"**). **NÃO começou:** sem branch/PR/comando/PD. Decisão do dono registrada em `:6963-6964` (2026-09-06): caminho (a) — "mergear o 07b normalmente" e agendar o bloco de AV imediatamente após.
- **risco:** 3-seguranca/permissoes
- **dependências:** exige **junta-5 unânime + PD** (serviço externo — §C7.1); não depende de bloco do plano. Guard `kpi-achados-paridade` **não** impede promover a `fechado` sem AV (registro `:957-959`): o contrato é do bloco de AV.
- **impacto_vendavel:** **BLOQUEIA (funcional, não por severidade):** sem AV real, produção e staging não aceitam nenhum upload (evidência mobile, anexo, anexo de OS, anexo de checklist, foto de dano). Um produto de operação de campo não se vende sem foto de evidência. `scripts/smoke-staging.mjs` não faz upload → o CI fica verde e a pane só aparece a quem usa.
- **teste_de_encerramento:** EICAR/mock infected, MIME divergente e scanner indisponível → nada persistido nem baixável; com o AV ligado, upload limpo persiste e download serve `attachment` + `nosniff`; smoke de staging **com** upload.

---

#### Ω6R-DAT-004
- **P:** P1
- **descrição:** `PATCH` altera perfil normativo in place; motor de diárias lê o perfil vivo; auditoria grava só `{scope, active}`.
- **status_comprovado:** **ATIVO**
- **prova:** `src/modules/jurisdiction/jurisdiction.service.ts:76-98` — `update` → `repository.updateProfile({... scope, ownerNotifDays, noticeEdictDay, auctionEligibleDay, dailyModel, dailyCap, releaseRequirements ...})` no mesmo `profileId`, sem versão/vigência; `jurisdiction.controller.ts:50-57` — `metadata: { scope: profile.scope, active: profile.active }` (sem campo alterado, anterior ou novo); `src/modules/charging/charge-prisma.repository.ts:226-231` — `SELECT ... jp.scope, jp.daily_model, jp.daily_cap ... FROM impound_processes ip JOIN jurisdiction_profiles jp ON ... jp.id = ip.profile_id` (perfil corrente, não o vigente em `entered_at`); `jurisdiction.defaults.ts:39` `TEMA_124_LEGACY_CAP` só é consumido por `tests/jurisdiction.test.ts:10,65-66`.
- **gravidade:** P1 (não votado pela J-6R) · minha leitura: **P1** — é dinheiro (valor devido de estada re-temperado), mas com mitigações medidas: piso federal de 60 dias no leilão, sobre-acumulação estornada; a sub-acumulação e a falta de de/para são o que fica.
- **origem:** 2026-08-14, reconciliação pós-merge da Fase 5 (achado nascido depois da J-6R; entrou no plano em 2026-08-16 como linha 12 com aceite **provisório**).
- **bloco_dono / começou?:** `B-O6R-12` (`fix/jurisdiction-profile-versioning`). **NÃO começou:** sem branch/PR/comando; KPI `a_fazer` (nota: "critério de aceite provisório, a ser ratificado pela junta do próprio bloco"); `pendencias.md:2804-2832` `P-O6R-B12` **ABERTO**, dono "próximo agente que puxar a trilha jurisdiction/impound".
- **risco:** 4-faturamento/dinheiro
- **dependências:** nenhuma (plano: `—`); não bloqueia ninguém.
- **impacto_vendavel:** NAO, **com condição**: só é relevante se o módulo Pátios (custódia/diárias) estiver no escopo vendido; nesse caso vira risco declarado com a regra operacional "não editar perfil com processos vivos" até o bloco.
- **teste_de_encerramento:** custódia com `entered_at` sob `THIRTY_DAYS_LEGACY`; `PATCH` do perfil para `SIX_MONTHS` → extrato da custódia antiga mantém `capCount = 30`, custódia nova nasce com o teto novo; auditoria da edição contém campo alterado com valor anterior e novo.

---

## 3. Blocos do plano — começaram × nunca começaram

Critério de "começou": existe branch (local ou `origin/*`), PR (lista `gh pr list --state all` #326-#385), comando em `agent-orchestration/codex/comandos/`, ou commit em qualquer ref (`git log --all`) nomeando o bloco/branch. Estado do painel: `Kpis/kpis-latest.json → roadmap.blocos[].estado`.

| Bloco | Branch do plano | Começou? | Evidência | Achados que carrega |
|---|---|:-:|---|---|
| B-O6R-01 | `fix/identity-authority` | **mergeado** | PR #357 (0a39824), backfill #358/#370 | SEC-001, TEN-001 (+ núcleo SEC-003) |
| B-O6R-02 | `fix/financial-uow` | **mergeado** | PR #371 (99f1840), ciclo 5, registro #372-#379 | DIN-001..004, DIN-008, DIN-010, DIN-011, QUA-003 |
| B-O6R-05 | `fix/production-runtime-gates` | **mergeado** | PR #353 (a8901ff) + #354 | DAT-001, DIN-006 |
| B-O6R-06 | `fix/billing-durability` | **em PR (este worktree)** | PR **#385 OPEN**, head ca5fd19a | DIN-005, DIN-007 (fechados só nesta branch) |
| B-O6R-07a | `fix/o6r07a-authorization` | **mergeado** | PR #369 (dc8168b) | SEC-002 parcial, SEC-003 residuais |
| B-O6R-07b | `fix/o6r07b-uploads` | **mergeado** | PR #380 (fe2748c) | SEC-004 parcial |
| (fora do plano) B-O6R-ARNES / B-O6R-REG | — | mergeados | #359, #360 | arnês/registro, sem achado |
| **B-O6R-03** | `fix/expense-sync-atomic` | **NUNCA** | 0 branch · 0 PR · 0 comando · 0 commit · KPI `a_fazer` · `P-O6R-B03` ABERTA | **DIN-009 (P0)**, QUA-001 |
| **B-O6R-04** | `fix/inventory-consistency` | **NUNCA** | idem · `P-O6R-B04` "ABERTA — NÃO INICIADO" | **DAT-002 (P0), DAT-003 (P0)**, QUA-002 |
| **B-O6R-07c** | `fix/o6r07c-subresource-scope` | **NUNCA** | idem · `P-O6R-SUBRECURSO-OBJECT-SCOPE` ABERTA · KPI B-O6R-07 `a_fazer` | **SEC-002 residual (P0)** |
| **B-O6R-08** | `fix/durable-jobs-realtime` | **NUNCA** | idem · `P-O6R-B08` ABERTA | ARQ-001, ARQ-002, ARQ-003, PERF-001 |
| **B-O6R-09** | `fix/dispatch-atomic-timeline` | **NUNCA** (e dep. B08 não satisfeita) | idem · `P-O6R-B09` ABERTA | ARQ-004 |
| **B-O6R-10** | `fix/client-load-shedding` | **NUNCA** | idem · `P-O6R-B10` ABERTA | PERF-002, PERF-003 |
| **B-O6R-11** | `fix/mobile-work-order-contracts` | **NUNCA** | idem · `P-O6R-B11` ABERTA | QUA-004 parcial, QUA-005 |
| **B-O6R-12** | `fix/jurisdiction-profile-versioning` | **NUNCA** | idem · `P-O6R-B12` ABERTO | DAT-004 |
| **B-AV-REAL** (fora do plano) | — | **NUNCA** | `P-O6R-B07B-SCANNER-AV-REAL` ABERTA; exige junta-5 + PD | **SEC-004 residual** |

**Grafo de dependências declarado no plano (coluna `Dep.`), com estado:**
- B03 ← B01 ✓ · B04 ← B01 ✓ · B11 ← B01 ✓ · B07c ← 07b ✓ (#380)
- B08 ← B05 ✓ · B10 ← B05 ✓
- **B09 ← B08 ✗** (única dependência insatisfeita entre os abertos)
- B12 ← — · B-AV-REAL ← junta-5 + PD (serviço externo)

Observação de registro (não corrigi — só leitura): o painel marca `B-O6R-07.estado = "a_fazer"` com #369 e #380 mergeados; a leitura coerente é "bloco 07 incompleto porque o 07c não existe", mas alguém que leia só o estado concluirá que o 07 não começou.

---

## GATE VENDAVEL

**Premissa:** o veredito da J-6R (5×0, REPROVADO PARA PRODUÇÃO) segue integral — `deploy_bloqueado: true`; só junta libera, com ata. O que segue é a minha leitura de **quais dos 17 precisam fechar antes de vender** e quais podem virar risco declarado, achado a achado, com o motivo.

### A. PRECISAM fechar antes de vender (5 — 4 pela regra do P0, 1 funcional)

| ID | Motivo | Bloco (estado) |
|---|---|---|
| **Ω6R-DIN-009** (P0) | dinheiro: replay de despesa duplica valor; dois usuários colidem na chave | B-O6R-03 (nunca começou) |
| **Ω6R-DAT-002** (P0) | perda/corrupção de dado: saldo de estoque negativo, compensação dupla | B-O6R-04 (nunca começou) |
| **Ω6R-DAT-003** (P0) | perda/corrupção de dado: ajuste de contagem duplicado / parcial | B-O6R-04 (nunca começou) |
| **Ω6R-SEC-002 residual** (P0) | permissão por objeto: técnico apaga anexo/blob e escreve km em OS alheia (10 vias, 3+1 medidas por execução). Piso aceitável se o dono quiser encolher: vias 1, 2 e 10 (destrutivas/dado); comentários (vias 3-7) podem ficar como risco declarado até o `D-Ω3F-5-COMMENT` | B-O6R-07c (nunca começou) |
| **Ω6R-SEC-004 residual** (P1) | **funcional, não de severidade:** sem AV real, produção e staging respondem 503 a TODO upload — não há produto de campo sem foto de evidência. Serviço externo → junta-5 + PD | B-AV-REAL (fora do plano, nunca começou) |

**Mais dois que não são "dos 17" mas condicionam o mesmo gate:** `Ω6R-DIN-005` e `Ω6R-DIN-007` (P0, dinheiro) estão fechados **só nesta branch** — o PR #385 precisa mergear para que a `main` os tenha. Sem isso, a `main` tem 5 P0 abertos de dinheiro/dado, não 3.

### B. Podem ficar como RISCO DECLARADO (12), com o motivo e a condição

| ID | Motivo para não bloquear | Condição / o que se declara |
|---|---|---|
| Ω6R-QUA-001 (P1) | não corrompe; o fluxo RDV mobile só não converge | **declarar que RDV no app de campo não está à venda** até o B03 — e o B03 já é obrigatório pelo DIN-009, então fecha junto |
| Ω6R-QUA-002 (P1) | idem: estoque mobile não sincroniza, nada corrompe | **declarar que estoque no app não está à venda** até o B04 — obrigatório pelo DAT-002/003, fecha junto |
| Ω6R-ARQ-001 (P1) | perda de job de evento; sweeps re-semeiam no boot | 1 réplica, restart automático; notificação de despacho/fanout perdidos não voltam |
| Ω6R-ARQ-002 (P1) | sweeps idempotentes (`period_seq`); multiplicação é carga | restarts raros; monitorar tamanho da fila |
| Ω6R-ARQ-003 (P1) | latente: só com >1 réplica | não escalar horizontalmente antes do B08 |
| Ω6R-PERF-001 (P1) | sobreposição de ticks; sem dinheiro | 1 réplica, fila pequena |
| Ω6R-ARQ-004 (P1) | despacho sem evento/duplicado é visível e corrigível | trava o histórico por etapa do Mapa (`P-Ω3F7B-MAPA-ETAPA`); dep. B08 |
| Ω6R-PERF-002 (P1) | UX sob degradação; sem perda | backend com p99 abaixo de 30 s |
| Ω6R-PERF-003 (P1) | defesas do PR-17b limitam (cap, semáforo 3, 503) | **condição forte:** owner-portal público em container separado, ou não exposto |
| Ω6R-QUA-004 parcial (P1) | o caminho de campo é o sync, que está correto; quebra só a API direta + falso verde | não vender fluxo que dependa de detalhe/status/assign pela API remota direta do app |
| Ω6R-QUA-005 (P1) | perda local de material sob crash imediato | declarar; é o segundo item do B11 |
| Ω6R-DAT-004 (P1) | mitigações medidas (piso 60 dias no leilão, sobre-acumulação estornada) | **condição:** módulo Pátios no escopo → regra operacional "não editar perfil com processos vivos" até o B12 |

### C. Ordem que eu recomendaria para o gate (pelo que está travado por quê)

1. **Mergear #385** (B-O6R-06) — sem ele DIN-005/DIN-007 não existem na `main`.
2. **B-O6R-04** (2 P0 de dado + QUA-002) e **B-O6R-03** (1 P0 de dinheiro + QUA-001) — frentes livres, dependência B01 satisfeita há 3 semanas; são os únicos P0 `ativo` que restam.
3. **B-O6R-07c** (residual do SEC-002) — frente livre desde #380; junta precisa decidir o `D-Ω3F-5-COMMENT` antes de codar.
4. **B-AV-REAL** — junta-5 + PD (`PD-O6R-B07B-CLAMD-INSTREAM`); é o único item que não é "codar e provar": exige decisão de serviço externo. Sem ele, staging já está sem upload desde o deploy do #380.
5. Depois, na ordem do plano: B08 → B09, B10, B11, B12 — todos risco declarado.

**Números para o placar (lidos do JSONL desta branch, aceitos pelo guard 6/6):** P0 17 = 13 fechados · 1 parcial · 3 ativos; P1 15 = 2 fechados · 2 parciais · 11 ativos. Na `origin/main`, enquanto #385 não merge: P0 11 fechados · 1 parcial · 5 ativos.
