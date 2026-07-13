# T-OMEGA3B — Despacho web→campo endurecido + Comentários/Timeline da OS

## META
Duas correções cirúrgicas no eixo despacho web→campo (backend + docs, mesmo PR): (1) o alvo do
`FieldDispatch` passa a ser obrigatoriamente técnico DE CAMPO; a timeline do despacho ganha rota; (2)
comentário livre do usuário na OS, gravado como evento imutável na timeline existente. SEM migration,
SEM frontend (surfacing UI = fatia futura).

## PLANO + ATAQUE (planejador-mestre + critico-adversarial)
Plano obrigatório (planejador-mestre) + ataque (critico) → **APROVADO CONDICIONAL aos requisitos R1–R5**
(não ciclo 4-5). Incorporados:
- **R1 (crítico):** `FIELD_DISPATCH_TARGET_ROLES = ["field_technician","technician"]`; fixtures de teste
  `operator`→`technician` (operator = operador-web, não alvo — decisão `controle/D-OMEGA3B`).
- **R2:** descrição PT-BR de `work_orders:comment` no `prisma/seed.ts` (senão `satisfies Record<Permission,string>` quebra o tsc).
- **R3:** `"work_order_comment"` no `WORK_ORDER_EVENTS` (union fechada; `createEvent` tipado).
- **R4:** smoke com papel STANDARD; `core-saas.test.ts expectedPermissionCatalog += work_orders:comment`.
- **R5:** método `FieldDispatchController.timeline` (o service.timeline já existia sem rota).

## Forma
- **Hardening (D1/D3):** `assertOperatorBelongsToTenant` captura o `User` de `getUserForTenant` e valida
  `roles ∩ FIELD_DISPATCH_TARGET_ROLES` (checa o CONJUNTO, plural). Existência → **404** ANTES do papel →
  **422 `target_not_field_technician`**. Guard ÚNICO → cobre create (:65) E reassign (:179) — reassign não burla (D1.b).
- **Timeline do despacho:** `GET /operations/dispatches/:id/timeline` (`field_dispatch:read`), DTO
  `toFieldDispatchEventDto` (não vaza tenant_id).
- **Comentário (Opção A / D4):** evento imutável `event_type="work_order_comment"` via `createEvent` na
  timeline da OS. `POST /work-orders/:id/comments` (`work_orders:comment` NOVA) → 201; 400 comment_required;
  422 comment_too_long (>4000); 404 cross-tenant; 403. **Auditoria allowlist** `{workOrderId,eventType,messageLength}`
  — corpo do comentário NUNCA em auditoria (§2.8). Aparece no `GET /work-orders/:id/timeline` existente.
- **RBAC:** `work_orders:comment` → manager/operator/technician/field_technician/field_dispatcher (+admins).

## RESULTADO TESTÁVEL
- Backend `check`/`lint`/`build` verde. SEM migration (event_type é String livre no Postgres).
- Novos: **field-dispatch-target-role 8** + **work-order-comments 9** + **work-order-comments-routes 8** = **25**
  (≥ meta 24). Regressão: field-dispatch 4 (fixtures→technician) + work-orders 2 + work-orders-routes 3 +
  core-saas 26 + dashboard-summary = intactos.

## JUNTA 5/5 + achado do validador (ciclo 2)
Junta de 5 APROVADO: validador-mestre · inspetor-de-rotas · master-teste-telas-rotas · coordenador-de-acessos ·
critico-adversarial (verificou R1–R5). cognicao-visual/frontend-pixel N/A (backend-only). Achados fechados:
- **§2.8 auditoria (master-teste):** provado AO VIVO — comentário com marcador de PII → `SELECT count(*) FROM
  audit_logs WHERE metadata LIKE '%marcador%'` = **0**; metadata carrega só `messageLength` (allowlist).
- **P-034 (validador, MÉDIA):** o feed `recentEvents` do dashboard vazava o corpo do comentário a `support`
  (dashboard:read sem work_orders:read). CORRIGIDO: `dashboard-prisma.repository.ts` + `dashboard.repository.ts`
  filtram `event_type != work_order_comment`; teste `[P-034]` prova ausência no `/dashboard/summary`.
- **P-035 (BAIXA):** contagem por-arquivo corrigida (8+9+8=25).
- **Casos-âncora:** create/reassign p/ não-field → 422; field_technician/technician/plural → 201/reassigned;
  inexistente/cross-tenant → 404 (antes do papel); field_dispatcher → 422; timeline 200/404/403 sem vazar tenant;
  comment 201 + aparece na timeline; comment 400/422/404/403; comment não infla timeline de outra OS; allowlist.

## FORA (declarado)
Anexos no comentário → Ω3-d. Snapshot de checklist → Ω3-c. Frontend (caixa Comentar / drawer timeline) →
fatia futura. Edição/exclusão de comentário → imutável por design. Hardening de `WorkOrder.assign` → gatilho
distinto (E3), NÃO endurecido aqui (só `FieldDispatch.create/reassign`).
