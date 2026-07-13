# T-OMEGA3A — ServiceQuote (Orçamento com congelamento de preço) — abre o Ω3 Logística

## META
Fundação de precificação do Painel Logístico: um **Orçamento** que **congela** (snapshot imutável) o
preço unitário + total a partir de uma **Tarifa** de **Tabela de Valores publicada**, no momento da
criação. Reeditar/republicar a Tarifa depois **não** altera o orçamento (anti-refaturamento; resolve o
deferral A4 de D-OMEGA2A). Módulo novo espelhando `src/modules/tariffs/` (9 arquivos + registry front).

## PLANO + ATAQUE (workflow recon→plano→ataque)
Planejado via workflow (planejador-mestre + critico-adversarial). O crítico aprovou **condicionalmente**
a ~20 requisitos (A1–A6, B1, C1–C2, D1–D4, E1–E3, F1–F2, G1, H1). Os aplicáveis ao Ω3-a foram
**incorporados no código** (os D/E/F pertencem a Ω3-b..f). Rastreabilidade dos bloqueadores duros:

- **A1 (arredondamento de seam)** — `roundMoney()` (half-up, 2 casas) aplicado ao congelar em AMBOS os
  caminhos (cópia da Tarifa e preço manual). Tarifa InMemory não arredonda; Prisma já é Decimal(12,2).
  Sem o helper no ponto de congelamento, 10.999 divergiria (InMemory 10.999 × Prisma 11.00). Teste-âncora:
  tarifa 33.333 → congela 33.33 (back) + smoke.
- **A2 (resolução determinística)** — `TariffRepository.findApplicable(tenant, service, customer,
  publishedIds)` novo (interface + InMemory + Prisma) com `pickApplicableTariff()` COMPARTILHADO (ordem
  total: cliente-específico → maior valid_from → mais recente created_at → id asc). Paridade InMemory×Prisma
  garantida (Prisma busca candidatos e aplica o MESMO picker em JS). Teste: 2 tarifas padrão concorrentes.
- **A3 (overflow)** — `assertMoneyInRange()` rejeita > 9.999.999.999,99 → **422 quote_total_overflow**
  (evita 500 do numeric). Testado (manual unit 9999999999.99 × qty 2).
- **A4 (quantidade)** — `parseQuantity()` rejeita 0/negativo → **400 invalid_quantity**. Testado.
- **A5 (snapshot atômico)** — todos os `frozen_*` vêm de UMA resolução; a Tarifa NUNCA é relida. `update()`
  recomputa `frozen_total` do `frozen_unit_price` JÁ congelado. Provado no smoke (tarifa→999, quote fica).
- **A6 (referências)** — FK compostas `(tenant_id, X)` validadas na persistência (P2003 → **400** com a
  referência específica), como no espelho Tarifa.
- **B1 (list DTO completo)** — o list DTO emite dinheiro COM moeda (`frozenCurrency`), `priceSource` e os
  links de volta (`workOrderId`, `customerId`) além de valor/qtd/total/status/serviceCatalogId/sourceTariffId/
  frozenAt. Classe de bug que reprovou 4 blocos — teste dedicado (back+front) + verificado no smoke ao vivo.
- **C1 (chave natural)** — a natural key `(tenant, work_order_id, service_catalog_id)` é índice único
  **PARCIAL** (`WHERE is_active AND status<>'void'`) em **SQL bruto**, NÃO `@@unique` cheio do Prisma
  (que bloquearia re-orçar após void). Schema Prisma usa `@@index` simples + colunas escalares (FKs no SQL).
- **C2 (predicado InMemory)** — `hasActiveNaturalKey` só colide com quote ATIVO (is_active && status<>'void');
  work_order_id NULL não colide (avulsos coexistem). Testes: 409 ativo; void libera re-orçar; avulsos coexistem.

## Forma (espelho de `tariffs`, adaptado)
- **Model** `ServiceQuote` (`@@map("service_quotes")`): colunas escalares no Prisma; FKs compostas Restrict
  (work_orders/customers/service_catalog/tariffs/price_tables — registro financeiro nunca cascateia) +
  índice parcial + RLS ENABLE+FORCE+policy no SQL bruto. Migration `20260730000000_add_service_quotes`
  (up/down/re-up OK no Postgres vivo `erp-postgres`: partial index + 6 FKs + RLS confirmados via `\d`).
- **Máquina de estado**: draft→{approved,rejected,void}; approved/rejected→void; void terminal. `void` =
  delete lógico (is_active=false, libera a chave parcial). PATCH quantidade/notas SÓ em draft; approved
  imutável (anti-refaturamento) → **422 quote_not_editable**.
- **Contrato** `/api/v1/service-quotes`: GET lista (DTO completo) · POST 201 (congela) · GET/:id (404
  cross-tenant) · PATCH/:id (qtd/notas em draft) · PATCH/:id/status. Erros: 422
  tariff_not_found_for_service · 422 invalid_status_transition · 422 quote_total_overflow · 422
  quote_not_editable · 409 duplicate_quote_for_service · 404 not_found · 400 invalid_*.
- **RBAC**: `service_quotes:read` amplo (todos os papéis que leem cadastros + finance); `create|update`
  a **manager/operator/finance** (+ admins). Auditoria grava só status/priceSource/serviceCatalogId (sem PII).

## Frontend (registry `service-quotes/` + menu OPERAÇÃO)
Página `OrcamentosPage` (dense-list: OS · Serviço · Valor unit. · Qtd · Total · Origem · Situação · Ações
aprovar/anular), modal "Novo orçamento" (origem Tarifa/Manual; serviço obrigatório), estados completos
(loading/empty/error/no-perm/fallback D-007). Dinheiro SEMPRE com moeda (Intl pt-BR). Rota
`/operations/quotes` (PermissionGuard `service_quotes:read`); item **"Orçamentos"** no grupo OPERAÇÃO
(scope "operations", NÃO conta como Cadastro — os 11 cadastros seguem intactos). Linguagem PT-BR (nunca "tenant").

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · **service-quotes 29/29** + **service-quotes-routes 14/14** +
  regressão core-saas 26/26, tariffs 19/19, price-tables 11/11. Migration up/down/re-up OK. Cota:
  **43 novos testes back** (≥ meta 40).
- Frontend: `check`/`build` verde · `test:smoke` verde (+ service-quotes 12; cadastros-nav 11 intacto).
- **Live HTTP** (login real gestor.demo, Postgres): 201 congela 175.55 (frozenTotal 351.1, currency BRL,
  sourceTariffId set) · **invariante provada** (tarifa→999, quote fica 175.55) · list DTO 14 campos
  (B1) · 422 tariff_not_found · 400 invalid_quantity · 409 duplicate · 422 quote_not_editable · 403 sem auth.

## JUNTA + PROTOCOLO v3 (ciclo 1 → 2)
Junta de 5 (login real): master-teste APROVADO · inspetor-de-rotas APROVADO · validador-mestre APROVADO
(condicionado) · **cognicao-visual REPROVADO** · **coordenador-de-acessos REPROVADO**. Correções (R-omega3a-1):
- **Congelamento hardening (achado validador-mestre):** `quantity` é Decimal(12,2) sem teto → `1e11`
  estouraria o numeric no Postgres (500) e divergiria do InMemory mesmo com total baixo. Guard
  `assertMoneyInRange(quantity)` no create E no PATCH → 422; 2 testes de regressão (unit + PATCH).
- **Rótulos humanos (veto cognicao-visual — B1):** as colunas Serviço/OS/Cliente exibiam UUID cru. Novo
  `useServiceQuoteReferences` (espelho de `useTariffReferences`) resolve nome do serviço/cliente e código
  da OS; a lista mostra o NOME (UUID no `title`), a busca casa os rótulos, e o modal virou **selects**
  (mata o input de UUID). Coluna Cliente adicionada.
- **Governança de visibilidade (veto coordenador-de-acessos):** (V1) `/operations/quotes` registrado no
  `navigation.registry.ts` (`operations.quotes`, `requiredPermissions: service_quotes:read`) → path
  GOVERNADO, escondido de inventory/support; (V2) "Orçamentos" incluído no grupo OPERAÇÃO do RoleKind
  finance; (V3) linha em `docs/navigation-matrix.md` + bullet `service_quotes` em `RBAC_MATRIX.md`.

## FORA do Ω3-a (declarado)
- Aditivo `quotes[]` no detalhe da OS (`GET /work-orders/:id`) — **deferido para Ω3-e** (consumidor natural;
  H1 do crítico: exige novo parâmetro opcional em `toWorkOrderDto`, não cabe em `links`). O filtro
  `?workOrderId=` da lista já entrega quotes-por-OS.
- Faturamento/nota, alçada (APPROVAL_LIMITS), câmbio, desconto/imposto por linha, PDF, km, anexos,
  comentários — fatias Ω3-b..f/Ω4.
- ~~Selects de referência por identificador~~ — RESOLVIDO no ciclo 2 (selects + rótulos humanos via
  `useServiceQuoteReferences`). Falta apenas o vínculo linha→detalhe da OS (Ω3-e).
