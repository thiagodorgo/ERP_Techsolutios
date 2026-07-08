# Plano-mestre — Rodada BLOCO-AUTO-F (Módulo Controle)

> F0 = P&D + fundação (abre PR e PARA). Pós-merge da F0: **F1→F12 automático, 1 PR real por item** (teto
> **18 PRs** — só F6 e F7 podem virar sub-PRs, justificado abaixo). Merge só com gates verdes **+ veredito
> APROVADO do validador-mestre**. Regras herdadas da rodada A–D (serviço completo/sem mock, espelho, ciclo
> Git squash+limpeza, 5 docs vivos por PR, KPIs não publicados). **Cota de testes 200% (M ≥ 2×N).**
>
> Fontes desta rodada: `docs/pd-controle.md` (regras/fórmulas citadas), `docs/actor-flows.md`,
> `docs/screen-element-map.md` (LEI), `docs/sidebar-ia.md`, `docs/navigation-matrix.md`. Grounding de repo:
> recon 2026-07-07 (mirror `src/modules/customers/`; próximo slot de migration `20260712000000_`; dinheiro
> `Decimal(20,6)`; RLS inline; idempotência `@@unique([tenant_id,…,idempotency_key])`; reuse: attachment
> de checklist p/ fotos, notifications p/ avisos, commissions p/ F8, `resolveVehicle` p/ disponibilidade).

## Espelhos (nunca inventar convenção)
- **Módulo backend novo (F1–F5, F7):** clonar `src/modules/customers/` (9 arquivos) + migration
  `20260712000000_add_*` com RLS inline; router `tenantContextMiddleware`+`createPersistentRbacContextMiddleware`
  +`requirePermission("<entity>:read|create|update")`; permissões novas em `catalog.ts` (`PERMISSION_CATALOG`
  + arrays de papel espelhando `vehicles:*`).
- **Frontend lista+modal:** clonar `frontend/src/modules/registry/customers/*` (page/modal/service/adapter/
  hook) sobre `frontend/src/components/dense-list/`. Detalhe: só se necessário, espelhar work-orders
  (`WorkOrderDetailPage`). Nada em `frontend/src/mocks/` novo (D-007).
- **Máquina de estados:** espelhar `field-dispatch.validators.ts` (guard table-driven) — **422** para
  Controle. **Idempotência de avisos:** reuso verbatim do notifications (R-P3).

## Sequência de PRs (F1→F12) e cota N (200%)

| PR | Espelho | Entrega | N baseline → M (≥2N) |
|---|---|---|---|
| **F1** Abastecimento | customers | `FuelLog` + migration + módulo + tela lista/modal + km/L derivado | N=7 → **M≥14** |
| **F2** Manutenção | customers + field-dispatch (status) | `MaintenanceOrder` + máquina de estados 422 + aviso idempotente + flag disponibilidade (leitura em `resolveVehicle`) | N=8 → **M≥16** |
| **F3** Multas | customers | `Fine` + `@@unique(numero_auto)` + máquina de estados + prazos/avisos | N=8 → **M≥16** |
| **F4** Seguros | customers | `InsurancePolicy` + `vencida` derivada + alertas 30/15/7 idempotentes | N=7 → **M≥14** |
| **F5** Danos | customers + checklist-attachment | `Damage` + fotos (reuso attachment/marker) + galeria + link OS | N=7 → **M≥14** |
| **F6** Mapa real | operations-map + field-location/dispatch/work-orders | matar `operations-map.mock.ts`; painel lateral; stale; indicadores F4/F2 no pin | N=6 → **M≥12** *(sub-PRs possíveis: 6a dados reais, 6b painel+indicadores)* |
| **F7** Estoque | customers ×3 (Item/Movement/CycleCount) | saldo derivado em tx (409); ABC job; ponto de pedido idempotente; custo médio; contagem cíclica | N=12 → **M≥24** *(sub-PRs: 7a Item+saldo, 7b ABC+reposição, 7c contagem)* |
| **F8** Remunerações | commissions (in-module) | rota agregada `statements/summary?from&to` + `read_own` (operator só o próprio) | N=6 → **M≥12** |
| **F9** Usuários | users (existente) | enriquecer: lista+modal papéis, ativar/desativar, auditoria visível; matar mock residual | N=6 → **M≥12** |
| **F10** Notificações | notifications (existente) | central categorias/filtros; ligar produtores F2/F3/F4/F7; badge real | N=6 → **M≥12** |
| **F11** Sidebar/nav | AppShell + tenantNavigation | IA aprovada; `MVP_NAV_PATHS` expandido; finance restaurado; badges reais; teste por papel (9) | N=9 → **M≥18** |
| **F12** Cera | telas eleitas | cabeçalho fixo, tabulares, chips, densidade persistida, Ctrl+K por papel, microinterações | N=5 → **M≥10** |

Teto 18 PRs: F1–F5, F8–F12 = 10 · F6 até 2 · F7 até 3 = **até 15** (folga de 3). Sub-PRs só se justificado no
plano da PR (tamanho/risco); o validador-mestre valida cada uma.

## Contratos de API (formato obrigatório; detalhe/regra em pd-controle.md)
Todo F1–F5/F7: `POST`, `GET` lista (paginação+busca+`is_active`+filtros de domínio), `GET/:id`, `PATCH`
(desativação lógica). Erros `{error:{code,reason,message}}`; 404 cross-tenant; 409 unicidade composta;
**422 transição de estado inválida** (F2/F3/F5); **409 saldo insuficiente** (F7). Tenant da claim, RLS.
- **F1** `/api/v1/fuel-logs` — odômetro regressivo = 422.
- **F2** `/api/v1/maintenance-orders` (+ transição de status; concluir exige custo+data).
- **F3** `/api/v1/fines` (`@@unique([tenant_id, numero_auto])`).
- **F4** `/api/v1/insurance-policies` (`@@unique([tenant_id, numero_apolice])`; `status` derivado no read).
- **F5** `/api/v1/damages` (fotos via endpoints de attachment existentes; sem storage novo).
- **F7** `/api/v1/inventory-items`, `/stock-movements` (saldo em tx), `/cycle-counts`; rota admin recálculo ABC.
- **F8** `/api/v1/commissions/statements/summary?from&to` + rota `read_own`.

## Cota 200% — prioridade do excedente (após 1 caminho feliz por endpoint/regra/tela)
1. **Isolamento** (molde P6, 3 tenants): 404 cross-tenant, lista sem item alheio, `tenant_id` do body
   ignorado, unicidade composta 409/201.
2. **RBAC negado por rota** (papel sem permissão → 403).
3. **Validação/erros de domínio**: odômetro regressivo=422, transição inválida=422, saldo insuficiente=409.
4. **Edge de domínio**: **job idempotente rodado 2× = 1 aviso**; ABC recalculada com item novo; apólice
   vencendo exatamente hoje; km/L entre 2 abastecimentos; F8 `read_own` (operator só o próprio — obrigatório).
5. Regressão dos módulos tocados (work-orders/field-dispatch/commissions/notifications/checklists).

## Riscos + mitigação + rollback (por bloco)
- **Migrations**: aditivas, `up` E `down` (DROP manual) testados no `erp-postgres`. Rollback = revert do
  squash + DROP. F7 tem 3 tabelas → ordem de DROP (movement/cyclecount antes de item).
- **F2 disponibilidade**: só LEITURA em `resolveVehicle`; não tocar field-dispatch (regressão 39/39 tem de
  seguir verde). **F6**: remover o mock só quando as 3 fontes reais estiverem ligadas (senão parada).
- **F8/F10**: mudança IN-MODULE nos módulos existentes; regressão do módulo obrigatória.
- **F11**: `MVP_NAV_PATHS` + `NAV_BY_ROLE` — escopo cirúrgico; estilo/colapso/tokens intocáveis.
- **Vocabulário RBAC** (front mock × back catalog): F11 reconcilia adotando o backend como autoridade.

## Skills/agents por PR (registrar na PR)
saas-multi-tenant (schema/rota/isolamento), ts-frontend-full (web), ui-ux-pro-max (tela; checklist anexo),
frontend-pixel-master (revisão visual pré-gates), **validador-mestre (veredito APROVADO obrigatório antes
do push/merge)**.

## Condições de parada (reportar + opções, nunca improvisar)
3ª reprovação do validador; gate/CI vermelho após 3 tentativas; migration destrutiva; impacto não-aditivo
em `mobile-sync-contracts.md`; backend exigindo integração externa/infra nova; fluxo/regra fora do
`actor-flows`/`pd-controle` aprovado; dependência nova; conflito com main; falha de push/gh.
