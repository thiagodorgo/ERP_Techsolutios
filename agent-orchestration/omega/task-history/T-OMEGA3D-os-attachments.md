# T-OMEGA3D — Anexos de OS (Work Order Attachments)

## META
Anexar arquivos (evidências/documentos: imagens + PDF) a uma OS, REUSANDO o `ChecklistStorageProvider`
existente (D-014, sem storage/presigned/env novo) e o `EvidenceScanner` (Noop/Fake) para AV-scan. Bloco de
maior superfície do Ω3 (binário/storage/scan).

## PLANO + ATAQUE (planejador-mestre + critico) — APROVADO CONDICIONAL aos R0–R6
O crítico ratificou/derrubou as 3 decisões e endureceu:
- **R0 (premissa):** fontes são 3 — **Danos** (storage/DTO/migration/multipart), **mobile-evidence-upload**
  (scan/status/422/503) e **net-new** (idempotência client_action_id, delete LÓGICO deleted_at). Não é
  "espelha Danos" puro (Danos não escaneia e faz HARD delete).
- **R1:** auditoria com metadados CURADOS à mão (`{attachmentId,fileName,mimeType,sizeBytes,status}`) —
  NÃO a denylist `sanitizeEvidenceAuditMetadata` (não cobre file_url/checksum/provider). §2.8.
- **R2:** **SCAN antes de STORE** no service — malware nunca chega ao store. infected→422, failed→503.
- **R3 (RATIFICADO):** RBAC REUSA `work_orders:read`/`work_orders:update` (sem permissão nova); upload =
  `requireAnyPermission([work_orders:create, work_orders:update])` (fiel a Danos, inclui field_dispatcher).
- **R4 (DERRUBADO o 2-colunas):** UMA coluna `status` (CHECK 'stored|rejected|scan_failed|pending_review',
  default 'stored'); DROP `scan_status`. Gate de download (status≠stored→409) = reserva forward-compat AV.
- **R5 (RATIFICADO client_action_id):** índice único **TENANT-SCOPED** `(tenant_id, work_order_id,
  client_action_id) WHERE client_action_id NOT NULL AND deleted_at IS NULL` — RLS não guarda UNIQUE, então
  a chave inclui tenant_id (§6). checksum_sha256 só integridade.
- **R6:** `deleted_at` net-new filtrado em TODOS os reads; delete LÓGICO; CASCADE (delete futuro de OS)
  deixa blob órfão sem GC — limitação ACEITA e declarada.

## Forma
- **Model** `WorkOrderAttachment` (`@@map("work_order_attachments")`) — espelho de DamageAttachment +
  status/client_action_id/deleted_at + back-relation em WorkOrder (sem DDL na tabela work_orders).
  Migration `20260801000000` aditiva pura: CREATE TABLE + índices + índice parcial de idempotência +
  FKs (tenant Restrict, work_order CASCADE) + RLS ENABLE+FORCE+policy. up/down/re-up OK no Postgres vivo
  (partial idem index + CHECK + RLS t/t confirmados).
- **Storage** reusa `getDefaultChecklistStorageProvider().save/getObject/deleteObject` (workOrderId no slot
  runId). Multipart Busboy (files:1, fileSize=max) → 415 mime / 413 size / 400 file. Download = STREAM
  server-side (sem presigned). Scanner injetável (`configureWorkOrderAttachmentScannerForTests`).
- **Service:** scan→store→row status='stored'; **cleanup de órfão** (insert falha após store → deleteObject);
  idempotência checada antes do store; download gate (status≠stored→409); delete LÓGICO + deleteObject.
- **DTO §2.8** (allowlist POSITIVA): id, workOrderId, fileName, mimeType, sizeBytes, status, downloadPath,
  uploadedBy, createdAt. NUNCA storage_key/provider/fileUrl/checksum/tenant_id.
- **Contrato:** `POST /work-orders/:id/attachments` (multipart) · `GET .../attachments` · `GET
  .../:attId/download` (stream) · `DELETE .../:attId` (204 lógico). Códigos 201/400/403/404/409/413/415/422/503.

## RESULTADO TESTÁVEL
- Backend `check`/`lint`/`build` verde. Migration up/down/re-up OK (RLS t/t; partial idem index; CHECK).
- **22 novos**: routes 11 (upload/scan 422/503/415/multipart/delete-lógico/409-idem/isolamento/RBAC/download) +
  service 8 (Noop clean/scan/idem/download-gate/delete-lógico/isolamento/reuso-token-pós-delete) + dto 3 (§2.8).
  Regressão dos afetados (work-orders, damages, checklist-storage/attachments, comentários, core-saas): 96/96.
- **Live prisma + storage:** upload 201 (status=stored, DTO SEM storageKey), 409 idempotência, 415 mime,
  download 200 (bytes), delete lógico 204 → lista vazia. list DTO só campos seguros (§2.8).

## FORA (declarado)
- **Ω3-d.1:** fila/replay de anexo no Flutter (B-108: blob local retido até status=stored; `client_action_id`
  já exposto). AV real (ClamAV) — hook Noop/Fake agora; pipeline AV-assíncrono (pending_review→stored/
  scan_failed) reservado (colunas já existem, sem migration futura). UI web de anexos. Presigned: NÃO.
- CASCADE deixa blob órfão (sem GC) — limitação aceita (espelha Danos).
