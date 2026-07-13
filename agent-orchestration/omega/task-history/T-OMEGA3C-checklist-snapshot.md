# T-OMEGA3C — Checklist snapshot na OS (freeze + entrega aditiva)

## META
Congelar o TEMPLATE de checklist vigente da OS como SNAPSHOT JSON imutável, **no momento do DESPACHO**
(FieldDispatch.create), e entregá-lo no payload da OS que o mobile baixa. Governado por
`docs/decisions/checklist-unificado.md` (Opção A). Cumpre `:11` (congela no despacho) + `:22` (snapshot
no payload de sync, aditivo). Imutabilidade B1/Ω3-a.

## PLANO + ATAQUE — RECORTE do crítico (Req A–E)
Plano (planejador-mestre) propunha freeze + entrega + neutralizar `/available` + deferir `createRun`.
O crítico (**APROVADO CONDICIONAL**, não ciclo 4-5) provou que fazer METADE do consumo (neutralizar
`/available` servindo o snapshot v1 enquanto `createRun` relê o template vigente v2) cria **skew
render×run** que viola a decisão (`:17`) E quebra correção (component ids de v1 rejeitados no sync)
E quebra o Flutter em produção. **Recorte final:**
- **Ω3-c = FREEZE + ENTREGA aditiva** (Req A): congela em `FieldDispatch.create`; `checklistSnapshot`
  aditivo em `toWorkOrderDto` → chega ao `GET /work-orders/:id` E ao `server_state` do
  `POST /mobile/sync/work-order-actions`; migration JSONB. **NÃO toca `/available` nem `createRun`**
  (ficam consistentes no template vigente).
- **Ω3-c.1 = CONSUMO atômico** (Req B, pendência declarada): `/available` OS-scoped + `createRun` do
  snapshot + Flutter rewire — viajam JUNTOS.
- **Req C:** `FieldDispatchService` recebe um PORT `resolveChecklistSnapshot` injetado (não import duro
  de ChecklistService; a aresta field-dispatch→checklists vive só na raiz de composição).
- **Req D/E:** migration só ADD COLUMN (sem tocar RLS); `buildChecklistSnapshot` deep-copy + strip
  `tenant_id`; freeze só em create (não WorkOrder.create/assign, não reassign), idempotente.

## Forma
- **Migration** `20260731000000_add_work_order_checklist_snapshot`: `ALTER TABLE work_orders ADD COLUMN
  checklist_snapshot JSONB` (aditivo/nullable, metadata-only). up/down/re-up OK no Postgres vivo; RLS
  intacto (t/t).
- **Coluna na WorkOrder** (não FieldDispatch): evita ciclo de dependência (work-orders é folha;
  field-dispatch→work-orders já existe). O freeze é ESCRITO por FieldDispatchService (E1/E3).
- **Congelamento**: `assertWorkOrderBelongsToTenant` passa a RETORNAR a OS; `create` resolve o snapshot
  via port (só template `published` e não-deletado; senão null) e `freezeChecklistSnapshot` na OS ANTES
  de criar o despacho (freeze→create; nunca despacho sem checklist). Regras: sem checklist → null/201;
  não-publicado → null; reassign mantém o original; re-dispatch re-congela.
- **`buildChecklistSnapshot`**: reusa `toMobileChecklistTemplateDto` (deep-copy) + REMOVE `tenant_id`
  (§2.8). Envelope `{contract, frozen_at, template_id, template_version, template_status, template}`.
- **Entrega**: `toWorkOrderDto.checklistSnapshot` (aditivo; null antes do despacho). FORA do list DTO.

## RESULTADO TESTÁVEL
- Backend `check`/`build` verde. **14 novos** (`checklist-snapshot-dispatch` 9 HTTP +
  `work-order-checklist-snapshot-dto` 5 unit). Regressão dos afetados 69 verde (field-dispatch,
  work-orders, checklist-routes, dashboard, core-saas). Migration up/down/re-up OK.
- **Live prisma path** (seed do template via psql — ver P-036): despacho **congela** (201); §2.8
  DB-verificado (snapshot SEM tenant_id, f/f); **imutabilidade** DB-verificada (mutar template→v99 → OS
  snapshot fica v2). Congelamento/entrega provados no banco real.
- Casos-âncora (memória): congela no despacho; imutável pós-edição; OS sem checklist → null; template
  draft → null; reassign mantém original; WorkOrder.assign NÃO congela; §2.8 sem tenant_id; list DTO
  enxuto; toWorkOrderDto carrega (prova server_state); buildChecklistSnapshot strip tenant_id;
  snapshotPublishedTemplate (draft/inexistente/cross-tenant → null).

## FORA (declarado)
- **Ω3-c.1 (Req B, pendência):** `/available` OS-scoped + `createRun` do snapshot + Flutter rewire —
  ATÔMICOS (não separar; senão skew v1×v2). O consumo do snapshot pelo mobile é lá.
- Anexos → Ω3-d. Ações → Ω3-e. UI web do snapshot → futura.
- **P-036 (pré-existente):** create de checklist quebrado no live prisma (Prisma checked×unchecked);
  não é do Ω3-c (arquivo intocado). Contornado no smoke via psql.
