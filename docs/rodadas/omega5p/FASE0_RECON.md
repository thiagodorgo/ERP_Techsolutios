# FASE0_RECON — Reconhecimento do repo para a rodada Ω5P (Pátios de Recolhimento / SIGPRV)

> **Natureza:** reconhecimento técnico da Fase 0 (PR-00) da rodada Ω5P. NÃO altera código de produto.
> **Fontes de verdade lidas:** `docs/rodadas/omega5p/ESTUDO_SIGPRV_PATIOS.md`, `docs/rodadas/omega5p/PLANO_OMEGA5P.md`, `docs/juntas/J-OMEGA5P.md`.
> **Método:** leitura direta de `prisma/schema.prisma`, `src/modules/**`, `src/infra/**`, `src/app.ts`, `frontend/src/**`, `prisma/migrations/**`. Todo achado está ancorado em `arquivo:linha` **confirmado por leitura**.
> **Convenção:** `FATO` = lido no repo; `HIPÓTESE` = inferência de projeto (marcada). Data: 2026-07-25.

---

## 1. `git status --short` (reportado, NÃO commitado)

```
?? .claude/agents/omega5p-avaliador.md
?? .claude/agents/omega5p-dev-backend.md
?? .claude/agents/omega5p-dev-frontend.md
?? .claude/agents/omega5p-dev-portal.md
?? .claude/agents/omega5p-planejador.md
?? .claude/skills/blockchain-developer/
?? .claude/skills/cloud-architect/
?? .claude/skills/cloud-devops/
?? .claude/skills/payment-integration/
?? .claude/skills/skill-creator/
?? docs/juntas/J-OMEGA5P.md
?? docs/planejamento-aws-erp-techsolutions.docx
?? docs/rodadas/omega5p/
```

Branch: `rodada/omega5p`. Tudo untracked; nenhum arquivo rastreado modificado. Os 5 agentes efêmeros da junta e a ata `J-OMEGA5P.md` já existem em disco (não versionados). As skills untracked (blockchain/cloud/payment/skill-creator) são untracked-permitidos (§C5) — **não** são escopo Ω5P e não devem entrar em nenhum `git add` da rodada. Este `FASE0_RECON.md` nasce dentro de `docs/rodadas/omega5p/` (escopo permitido, J-OMEGA5P §5).

---

## 2. Tabela existe / estende / cria (âncoras reais)

Legenda: **REUSA** = usar como está · **ESTENDE** = adicionar campos/rota a um model/módulo existente · **CRIA** = net-new.

| Capacidade Ω5P | Ação | Model/módulo real | Âncora (arquivo:linha) |
|---|---|---|---|
| OS de remoção (base) | **REUSA** | `WorkOrder` + `WorkOrderEvent` (append-only) + `WorkOrderAssignment` | `prisma/schema.prisma:2047`, `:2153`, `:2174` |
| Despacho ao guincheiro | **REUSA** | `FieldDispatch` + `FieldDispatchEvent` (exige `work_order_id`) | `prisma/schema.prisma:2199`, `:2234`; `src/modules/field-dispatch/field-dispatch.service.ts:69` |
| Checklist / vistoria | **ESTENDE (especializa)** | `ChecklistTemplate`/`Component`/`Run`/`Answer`/`Attachment`/`Marker` | `prisma/schema.prisma:619`, `:646`, `:674`, `:703`, `:722`, `:744` |
| Assinatura / ciência | **REUSA** | `ChecklistAcknowledgement` + componente `acknowledgement` | `prisma/schema.prisma:766`; `src/modules/checklists/checklist.components.ts:57` |
| Fotos / evidências | **REUSA** | `Attachment` (polimórfico), `ChecklistAttachment`, `WorkOrderAttachment` | `prisma/schema.prisma:1119`, `:722`, `:1085` |
| Timeline de custódia | **CRIA** (segue padrão event-table) | `CustodyEvent` (hash-encadeado) — net-new | padrão em `prisma/schema.prisma:2153` (WorkOrderEvent) |
| Processo de custódia | **CRIA** | `ImpoundProcess` (agregado-raiz) — net-new | — |
| Pátio físico / vagas | **CRIA** | `yard` (áreas hierárquicas + vagas + ocupação) — net-new | `Branch` é ORGANIZACIONAL, não físico → `prisma/schema.prisma:95`, `src/modules/branches/branch.types.ts:10` |
| Perfis normativos | **CRIA** | `jurisdiction` (`JurisdictionProfile`) — net-new | — |
| Tarifas | **ESTENDE** | `Tariff` + `PriceTable` (já têm vigência) | `prisma/schema.prisma:1385`, `:1357`; `src/modules/tariffs/tariff.service.ts:33` |
| Motor de diárias | **CRIA** (reusa scheduler) | `charging` — net-new; job idempotente | scheduler: `src/infra/jobs/job.worker.ts:81`, `src/infra/jobs/job.registry.ts:38` |
| Encargos → contas a pagar | **REUSA/ESTENDE** | `FinancialTitle` + `payable-source.routes.ts` | `prisma/schema.prisma:1639`; `src/modules/financial-titles/payable-source.routes.ts:47` |
| Encargo → extrato do profissional | **REUSA** | `ProfessionalStatementEntry` | `prisma/schema.prisma:1966` |
| Trilha de notificações legais | **CRIA (registro) + REUSA (motor)** | `ScheduledNotification` + `notifications.scan-due` | `prisma/schema.prisma:319`; `src/modules/notifications/scheduled-notification.jobs.ts:13` |
| Liberação | **CRIA** | `release` — net-new | — |
| Leilão | **CRIA** | `auction` (preparação, lotes, liquidação cascata) — net-new | liquidação espelha `FinancialEntry` `prisma/schema.prisma:1727` |
| Interop Sivec | **CRIA** | `interop` (outbox versionado) — net-new; padrão event/queue existe | `src/infra/events/domain-event.publisher.ts:27` |
| PWAs (authority + owner) | **CRIA** | 2 builds Vite/PWA isolados — net-new | SPA único hoje: `frontend/package.json:8`; sem `vite-plugin-pwa` |
| Auditoria de escrita | **REUSA** | `AuditLog` + `recordRequestAuditBestEffort` | `prisma/schema.prisma:264`; `src/modules/financial-titles/payable-source.routes.ts:126` |
| Auth/sessões (ERP) | **REUSA** (NÃO no portal) | `User`/`AuthSession` | `prisma/schema.prisma:112`, `:183` |
| RLS/tenant | **REUSA** | `withTenantRls` + policy `current_tenant_id` | `src/database/rls.ts:18`; migration `20260831000000/migration.sql:75` |
| Impressão (guia/edital/dossiê) | **REUSA (frontend) — ver risco R1** | `Print*Modal.tsx` = `window.print()`, **sem PDF backend** | `frontend/src/modules/work-orders/components/PrintWorkOrderModal.tsx:154` |

---

## 3. Achados por alvo (1–8 do prompt)

### Alvo 1 — OS de remoção + checklist + fotos + assinatura + timeline (Ω3F P1)
- **FATO.** `WorkOrder` (`prisma/schema.prisma:2047`) já tem estados (`status`, `started_at/arrived_at/completed_at/cancelled_at`), destino (`destination_*`, :2064), tipo dinâmico (`service_details` Json + `ServiceCatalog.service_type`/`requires_destination` :1332), km (`mileage_*` :2113), GPS (`service_latitude/longitude`), SLA (`sla_due_at` :2094), checklist congelado (`checklist_snapshot` :2085).
- **FATO — hook de "OS concluída" REUTILIZÁVEL.** A transição de status publica `publishDomainEvent("work_order.status_changed", {...to_status})` em `src/modules/work-orders/work-order.service.ts:810`; `statusEventType` mapeia `completed → "work_order_completed"` (`:1445`). O barramento (`src/infra/events/domain-event.publisher.ts:42`) enfileira job via `eventJobMap` (`:27`). **Ponto crítico (FATO):** o mapa é **1 evento → 1 job**, e `work_order.status_changed` **já está tomado** por `field-ops-event-fanout` (`:39`). ⇒ Para abrir custódia na conclusão, a extensão limpa é (HIPÓTESE de projeto): **(a)** emitir um evento NOVO dedicado (`impound.trigger_evaluated`) dentro do serviço de OS quando `to_status==completed` **e** o `service_type` for de remoção, ou **(b)** encadear a partir do handler de fanout. Idempotência do gatilho: reusar `MobileActionReceipt`/`client_action_id` (`prisma/schema.prisma:2575`) OU um índice único parcial `(tenant_id, work_order_id)` na tabela `ImpoundProcess` (no MÁX. 1 processo por OS) — mesmo padrão anti-refaturamento de `FinancialTitle` (`:1679`).
- **FATO — especializar checklist p/ VISTORIA de recepção (art. 9º I / art. 14).** Os tipos de componente existentes cobrem quase tudo: `photo_upload` (conjuntos FRONT/REAR/LEFT/RIGHT/ROOF/DASH_PANEL/ENGINE/CHASSIS_ID/ODOMETER/INNER_OBJECTS), `damage_map` (estado lataria/pintura/pneus + set DAMAGES), `vehicle_selector` (resolve imagem por tipo), `observation` (objetos internos / equipamentos ausentes), `acknowledgement` (assinatura/recusa). Enum em `src/modules/checklists/checklist.types.ts:29`; defs em `src/modules/checklists/checklist.components.ts:12-65`. **Especialização = um `ChecklistTemplate` de `type` novo (ex. `impound_reception`)** com `required=true` nos conjuntos obrigatórios + `validationRules` exigindo o conjunto mínimo — SEM novo tipo de componente. O `ChecklistRun.related_entity_type/id` (`:679`) aponta ao `ImpoundProcess`.

### Alvo 2 — Origem "solicitação de remoção" (autoridade, persona ativa)
- **FATO.** `FieldDispatch.create` **exige** `work_order_id` pré-existente (`src/modules/field-dispatch/field-dispatch.service.ts:70`, `assertWorkOrderBelongsToTenant` `:251`). Ou seja, field-dispatch **atribui** um técnico a uma OS que já existe; **não origina** OS.
- **CONCLUSÃO (HIPÓTESE de projeto):** a **remoção iniciada pela AUTORIDADE** deve **CRIAR uma `WorkOrder`** (com `service_type` de remoção no `ServiceCatalog`) via um novo BFF do authority-portal, e essa OS dispara o processo de custódia (Alvo 1). Não estende field-dispatch nem cria um agregado de OS paralelo — **reusa `WorkOrder` como está** e apenas acrescenta a origem "autoridade" (campo/`service_details` ou FK ao convênio no `ImpoundProcess`). O **despacho ao guincheiro** segue reusando `FieldDispatch`.
- **FATO/decisão D-Ω5P-13.** O "reparo do guincheiro que HABILITA a remoção" (veículo não transportável) é **sub-etapa/serviço da OS de remoção** (item de checklist ou `ServiceCatalog` adicional) — distinto do "reparo do dono" da liberação (`LIBERADO_PARA_REPARO`, art. 271 §2), que vive no módulo `release`. Nenhum reparo evita a remoção.

### Alvo 3 — Domínio físico bases/pátios (Ω3F P2)
- **FATO.** Existe `Branch` (`prisma/schema.prisma:95`) mas é **ORGANIZACIONAL**: só `name/code/status`, relaciona `users` e `user_role_assignments` — o próprio tipo declara isso (`src/modules/branches/branch.types.ts:10` "Filial (cadastro)... NÃO tem is_active"). **Não há** hierarquia de áreas, vaga, tipo de vaga, capacidade ou ocupação. Não há nenhum model `yard`/`patio`/`slot`/`spot`.
- **CONCLUSÃO (FATO):** `yard` é **CRIAR net-new** (pátio → área hierárquica quadra→corredor→fileira→vaga, tipos coberta/moto/pesado, ocupação I1). `Branch` **não** é reaproveitável como pátio físico (é o recorte de acesso/RBAC). Um pátio PODE opcionalmente referenciar um `Branch` (HIPÓTESE) para herdar recorte organizacional, mas o domínio físico é novo.

### Alvo 4 — `tariffs` (JÁ EXISTE)
- **FATO.** `Tariff` (`prisma/schema.prisma:1385`) já tem: `unit_price Decimal(12,2)`, `currency`, `origin`, `rule`, **`valid_from`/`valid_to`** (vigência!), `price_table_id` → `PriceTable` versionada (`:1357`, status draft/published/archived + `valid_from/to`), `service_catalog_id`, `customer_id` (tarifa por-cliente), chave natural `(tenant_id, price_table_id, service_catalog_id, customer_id)` (`:1411`). Módulo completo InMemory+Prisma (`src/modules/tariffs/tariff.service.ts:33`), rota em `src/app.ts:119`.
- **CONCLUSÃO (FATO): ESTENDER, não recriar** (ratifica D-Ω5P-10). Delta aditivo mínimo: **(a)** categoria de veículo × serviço — `service_catalog_id` já dá o eixo "serviço"; a **categoria de veículo** é o eixo novo (coluna aditiva `vehicle_category` OU novo `ServiceCatalog` por categoria); **(b)** escopo **público-credenciado × privado-contratual** — coluna aditiva `scope` (enum-app) ou amarrar ao `JurisdictionProfile`/convênio. Vigência (`valid_from/to` + `PriceTable.version`) **já resolve** a "tabela vigente na data de cada acumulação" do motor de diárias (§5 do ESTUDO). O motor de diárias LÊ a tarifa vigente; correção retroativa gera **ajuste** (novo lançamento), nunca update (I2/I4).

### Alvo 5 — Reuso Ω4C
- **`Attachment` polimórfico (FATO).** `prisma/schema.prisma:1119` — `entity_type` + `entity_id`, storage interno (`storage_key/provider/checksum` nunca no DTO), `status` (AV-assíncrono), `client_action_id` (idempotência), `deleted_at` (soft-delete). Posse/RBAC herdadas da entidade-alvo via resolver. ⇒ fotos de recepção/liberação/leilão penduram em `entity_type="impound_process"` etc.
- **Motor de notificações + scheduler (FATO).** `ScheduledNotification` (`:319`) é a camada de DEFINIÇÃO; a entrega vive em `Notification` (`:284`). O scheduler é **in-process SEM node-cron**: `job.worker.ts` (`setInterval → dequeue → registry`, `src/infra/jobs/job.worker.ts:81-91`) roda o job **auto-reenfileirante** `notifications.scan-due` (`src/modules/notifications/scheduled-notification.jobs.ts:13` — re-enqueue com delay fixo no `finally`). ⇒ **Os relógios D+10/D+30/D+60 e o job diário de diárias reusam ESSE padrão**: registrar novos `JobName` em `src/infra/jobs/job.types.ts:1` (union const fechada) + handler em `src/infra/jobs/job.registry.ts:38`; cada tick varre tenants e re-enfileira a si mesmo. `ScheduledNotification.source_type/source_id` (`:329`) já é "foundation-ready" p/ apontar à entidade-fonte (aqui: `ImpoundProcess`) — os prazos legais viram `ScheduledNotification` que fazem fan-out ao inbox interno.
- **Auditoria (FATO).** `AuditLog` (`:264`) append-only + `recordRequestAuditBestEffort` (visto em `payable-source.routes.ts:126`, metadados sem PII/tenant/valores). Toda escrita Ω5P audita por aqui.
- **Auth/sessões (FATO).** `User` (`:112`) + `AuthSession` (`:183`) — **reuso no ERP autenticado (`/patios`), NÃO nos PWAs** (J-OMEGA5P §5 proíbe reusar sessão/cookie do ERP no portal).
- **Contas a pagar / extrato (FATO).** `FinancialTitle` (`:1639`) tem par genérico de proveniência `source_type/source_id` (`:1663`, sem FK dura, idempotência por índice parcial `:1682`) e o factory **`createPayableSourceRoutes`** (`src/modules/financial-titles/payable-source.routes.ts:47`, `createForSource` `:63`) montável dentro do router do módulo-fonte. **Ponto de extensão exato:** o `charging` chama `service.createForSource({sourceType:"impound_charge", sourceId: processId, direction:"payable"...})` para materializar guias/diárias como conta a pagar; encargos roteados a um profissional (ex. dano no pátio) usam `ProfessionalStatementEntry` (`:1966`, parcela datada, `source_type/source_id` foundation-ready). `FinancialEntry` (`:1727`) liquida (base da cascata do leilão I7).

### Alvo 6 — Motor de impressão/PDF (Ω3F)
- **FATO — não há motor de PDF no backend.** Busca repo-wide por `jspdf|pdfmake|pdfkit|puppeteer|@react-pdf` em `src/` e `frontend/src/` retorna **zero**. O que existe é um padrão **frontend `window.print()` + `@media print`**: `PrintWorkOrderModal.tsx` (`frontend/src/modules/work-orders/components/PrintWorkOrderModal.tsx:154` `window.print()`, `:49` `@media print`), e irmãos em `finance/commissions/PrintRemuneracoesModal.tsx`, `fleet/damages/PrintDamageModal.tsx`, `fleet/fines/PrintFineModal.tsx`, `fleet/maintenance/PrintMaintenanceOrderModal.tsx`.
- **CONCLUSÃO (RISCO R1, ver §7).** Guia de débitos, comprovante de liberação, edital, nota de leilão e dossiê probatório **exportável** (PLANO PR-15) podem seguir o padrão `Print*Modal` (client-side) no MVP, MAS documentos com **valor probatório/de transferência de propriedade** (nota de leilão = título art. 124 III CTB) e o **dossiê retido ≥5 anos** (I9) pedem geração **server-side determinística e arquivável** — que é **net-new**. Decisão pendente (PD) sobre criar `printing`/`document` no backend ou aceitar o client-side. Não bloqueia Fase 1.

### Alvo 7 — RLS/tenant middleware, padrão de repo, catálogo, navegação
- **FATO — `withTenantRls`.** `src/database/rls.ts:18` (transação + `setTenantRlsContext` `:5` → `set_config('app.current_tenant_id', ...)`). Toda tabela nova Ω5P segue o padrão de migration: `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `CREATE POLICY ... USING/WITH CHECK (tenant_id = current_setting('app.current_tenant_id'))` — exemplo vivo em `prisma/migrations/20260831000000_add_telemetry_events/migration.sql:75-80`.
- **FATO — repo InMemory + Prisma.** Padrão canônico em `src/modules/tariffs/tariff.service.ts`: `InMemory<X>Repository` + `create<X>MemoryService` (`:105`) e `createDefault<X>Service` com **env-gate** `env.CORE_SAAS_PERSISTENCE !== "prisma"` → memory, senão import dinâmico do `*-prisma.repository.ts` (`:113-130`). Todo módulo Ω5P replica isso.
- **FATO — registro em `src/app.ts`.** Cada módulo é `app.use("/api/v1", attachAuthenticatedActor(), create<X>Router())` (`src/app.ts:88-173`); o catch-all 404 `route_not_found` está em `:173-174` (memória do repo: incluir `src/app.ts` no `git add` do PR que cria router, senão o CI dá 404).
- **FATO — catálogo de permissões.** `src/modules/core-saas/permissions/catalog.ts:1` (`PERMISSION_CATALOG` const), papéis `STANDARD_ROLES` (`:201`) + legados (`:210`), `ROLE_PERMISSIONS` (`:233`); `tenant_admin` herda tudo que **não** começa com `platform:` (`:229`). Ω5P adiciona permissões `yard:*`, `impound:*`, `charging:*`, `release:*`, `auction:*` (+ leitura `impound:read` etc.) neste arquivo.
- **FATO — NAVIGATION_REGISTRY.** `src/modules/navigation/navigation.registry.ts:3`; padrão "esconde-fino" via `getGovernedNavigationPaths()` (`src/modules/navigation/navigation.service.ts:72`): itens governados só por `requiredPermissions` (sem `requiredModules`) somem de quem não tem a permissão, e o backend segue barrando no 403. Os itens `/patios` seguem esse padrão (governed paths).

### Alvo 8 — Scheduler/jobs (motor de diárias + relógios do leilão)
- **FATO.** O loop é `JobWorker.start()` (`src/infra/jobs/job.worker.ts:81`, `setInterval` `:86`), só sobe atrás de flag `JOBS_WORKER_ENABLED` (comentado em `scheduled-notification.jobs.ts:11`) — CI/testes que importam `app.ts` **nunca** ligam o loop. Recorrência = job que se **re-enfileira** (`scheduled-notification.jobs.ts:17-24`).
- **CONCLUSÃO (HIPÓTESE de projeto):** o **motor de diárias** = novo `JobName` `charging.accrue-daily` (idempotente por `(processId, refDate)` — mesma disciplina do `MobileActionReceipt`/índice único), registrado em `job.types.ts:1` + `job.registry.ts:38`, auto-reenfileirante com delay diário; DST-safe pelo fuso do pátio. Os **relógios de prazo do leilão/notificação** (D+10/D+30/D+60, edital ≥15 d.u.) = ou `ScheduledNotification` (uma linha por prazo, varrida por `notifications.scan-due`) ou um job `impound.deadline-scan` análogo. Ambos **reusam o scheduler existente, SEM lib nova** (node-cron proibido, D-Ω4C-NOTIF-SCHEDULER).

---

## 4. Ratificação D-Ω5P-01..13

Formato: decisão → veredito da realidade do repo.

| D-record | Veredito |
|---|---|
| **D-Ω5P-01** hash-chain em `CustodyEvent` append-only | **RATIFICA (ajuste de fundação).** O padrão de **event-table append-only** é da casa (`WorkOrderEvent:2153`, `FieldDispatchEvent:2234`, `AuditLog:264` — só `createEvent`, sem update). MAS **nenhuma** tabela tem coluna de hash/`prevHash`. ⇒ hash-chain (`sha256(prevHash+canonicalJson(payload)+occurredAt+actorId)`) é **aditivo net-new** sobre um padrão conhecido. Endpoint de verificação = net-new. |
| **D-Ω5P-02** diária rolling-24h + calendário por perfil | **RATIFICA.** Sem motor de acúmulo hoje; scheduler in-process existe e comporta o job idempotente (`job.worker.ts:81`). Sem conflito. |
| **D-Ω5P-03** teto intertemporal pela data de entrada | **RATIFICA.** Sem precedente de teto, mas a **vigência** (`Tariff.valid_from/to:1396`, `PriceTable:1364`) dá a base para "regra vigente na data". Lógica de teto = net-new no `charging`. |
| **D-Ω5P-04** portal por placa+Renavam(+doc), plugável GOV.BR | **RATIFICA.** Auth atual é JWT/Cognito/local do ERP (`AuthSession:183`); **não há** superfície pública. BFF isolado = net-new (alinhado a D-Ω5P-11). |
| **D-Ω5P-05** Sivec via adapter/outbox versionado | **RATIFICA (ajuste).** Há barramento de eventos + fila (`domain-event.publisher.ts:27`, `job.queue`), MAS **não há tabela outbox durável**. ⇒ `interop` cria uma tabela outbox versionada net-new; a fila in-process é o transporte, não a garantia de retenção. |
| **D-Ω5P-06** leilão prepara/documenta/liquida (sem lances) | **RATIFICA.** Decisão de produto; sem conflito no repo. |
| **D-Ω5P-07** quitação manual no MVP, PIX-ready | **RATIFICA.** `FinancialTitle`/`FinancialEntry` já liquidam manualmente (sem PSP). Adapter futuro só por junta-de-5. Sem conflito. |
| **D-Ω5P-08** retenção 5 anos + anonimização | **RATIFICA.** Soft-delete (`deleted_at`) é pervasivo (`FinancialTitle:1670`, `Attachment:1139`, `ScheduledNotification:338`); exclusão física já é evitada por padrão. |
| **D-Ω5P-09** veículo não identificado é 1ª classe | **RATIFICA (com nota FORTE).** O `Vehicle` do ERP (`prisma/schema.prisma:835`) **exige `plate` NOT NULL** e `@@unique([tenant_id, plate])` (`:861`) — é a **frota própria**, imprópria p/ o bem de terceiro possivelmente sem identificação. ⇒ o `ImpoundProcess` deve carregar **seus próprios** campos de identidade (placa/chassi/Renavam **nullable** + flag `unidentified` + justificativa), **NÃO** um FK obrigatório a `Vehicle`. Reusar `Vehicle` violaria D-Ω5P-09. |
| **D-Ω5P-10** `tariffs` ESTENDE (não recria) | **RATIFICA — confirmado por leitura.** `Tariff:1385` já tem vigência/serviço/cliente/price-table. Delta = eixo categoria-de-veículo + escopo público/privado (aditivo). Ver Alvo 4. |
| **D-Ω5P-11** dois PWAs isolados mobile-first | **RATIFICA.** Frontend é **SPA único** Vite (`frontend/package.json:8`), **sem** `vite-plugin-pwa`/workbox/manifest. ⇒ 2 builds PWA net-new, sem sessão do ERP. |
| **D-Ω5P-12** autoridade = persona ativa (origina remoção + aprova liberação) | **RATIFICA.** `FieldDispatch` não origina OS (`field-dispatch.service.ts:70`) — a origem "autoridade" cria `WorkOrder` via BFF do authority-portal; a "autorização do órgão" do I5 é uma ação registrada (evento de custódia) disparada pelo authority-portal. Net-new no fluxo. |
| **D-Ω5P-13** dois reparos distintos | **RATIFICA.** Não há "sub-etapa de reparo" hoje; o reparo-habilita-remoção é serviço/checklist da OS de remoção; o reparo-do-dono é estado `LIBERADO_PARA_REPARO` no `release`. Modelagem net-new. |

**Divergências que viram D-record novo:** nenhuma divergência de rumo. Duas **precisões de fundação** recomendadas à junta (não contradizem os D-records, refinam-nos):
- **D-Ω5P-RECON-A (proposta):** identidade do veículo custodiado vive **no `ImpoundProcess`** (campos nullable + flag `unidentified`), sem FK obrigatória ao `Vehicle` da frota (fecha o furo do `plate` NOT NULL — reforça D-Ω5P-09).
- **D-Ω5P-RECON-B (proposta):** gatilho OS→custódia usa um **evento de domínio dedicado** (`impound.trigger_evaluated`) + guarda de idempotência (índice único `(tenant_id, work_order_id)` no `ImpoundProcess`), porque `work_order.status_changed` já está 1:1 com `field-ops-event-fanout` no `eventJobMap` (`domain-event.publisher.ts:39`).

---

## 5. Pontos abertos do ESTUDO §11 (parametrizado vs. deferido)

| # | Ponto aberto | Veredito | Justificativa |
|---|---|---|---|
| (a) | **Sivec** — spec técnica/homologação | **DEFERIDO (Ω6)** | Ato federal não publicado; D-Ω5P-05 já decide adapter/outbox versionado sem chamada externa. Ω5P cumpre só o dado mínimo do art. 9º + outbox pronto. |
| (b) | **Classificação conservado/sucata** (critérios federais art. 28 I) | **PARAMETRIZADO** (o enum) **+ DEFERIDO** (os critérios detalhados) | O **estado** (`conservado`/`sucata`/`inservível`) é enum-app configurável por `JurisdictionProfile`; a máquina de estados I8 (2-strikes → sucata) é implementável já. Os **critérios automáticos** de classificação ficam para Ω6 (dependem de ato federal) — no MVP a classificação é **decisão registrada** (manual, auditada). |
| (c) | **Guarda monitorada** (art. 17, hardware homologado) | **DEFERIDO (Ω6)** | Depende de solução tecnológica homologada federalmente; J-OMEGA5P §8 já lista no backlog Ω6. Fora do MVP. |
| (d) | **Interop SNE** (notificação eletrônica direta) | **DEFERIDO (Ω6)** | Envio real via SNE fora do MVP (PLANO §4); Ω5P só **registra** a trilha probatória (tipo/canal/datas/comprovante). Canal aceito é campo do `JurisdictionProfile` (SNE-only ≥ 2027) — a **flag** é parametrizada, o **envio** é deferido. |
| (e) | **Categorias de veículo** (unificada vs. por órgão) | **PARAMETRIZADO** | Vira eixo aditivo na tarifa (`Tariff`/`ServiceCatalog`) + dimensão do `JurisdictionProfile`. Cada perfil/convênio define sua tabela de categorias; sem hardcode. |
| (f) | **Veículo sem identificação** (tratamento probatório) | **PARAMETRIZADO** (1ª classe) | Já é D-Ω5P-09; o `ImpoundProcess` carrega identidade nullable + flag + justificativa (ver D-Ω5P-RECON-A). Não é erro de validação, é caso de negócio. |

---

## 6. Tabela final de módulos + ordem de PRs (confirmada/ajustada)

### 6.1 Módulos (nome real → ação)
| Módulo | Ação | Nota |
|---|---|---|
| `yard` | **CRIA** | pátio + área hierárquica + vaga + ocupação (I1). Pode referenciar `Branch` opcionalmente. |
| `jurisdiction` | **CRIA** | `JurisdictionProfile` (prazos/diária/teto/exigências/canais/categorias). Defaults federais. |
| `tariffs` | **ESTENDE** | +categoria-de-veículo +escopo público/privado; vigência já existe. |
| `impound` | **CRIA** | `ImpoundProcess` (agregado-raiz, identidade nullable) + `CustodyEvent` (hash-chain) + máquina de estados (I1-I3). |
| `charging` | **CRIA** | motor de diárias (job idempotente rolling-24h, teto intertemporal, congelamento I4) + encargos → `FinancialTitle.createForSource`. |
| `release` | **CRIA** | liberação (I5: autorização + quitação/dispensa + quem retira + comprovante) + reparo-do-dono (art. 271 §2). |
| `auction` | **CRIA** | elegibilidade/preparação/2-strikes (I8) + eventos/edital + liquidação cascata §6º (I7) + saldo 5 anos. |
| `authority-portal` (PWA + BFF) | **CRIA** | credenciado; origina remoção + aprova liberação (D-Ω5P-12). |
| `owner-portal` (PWA + BFF) | **CRIA** | público; consulta placa+Renavam, anti-enumeração/rate-limit/`PortalAccessLog` (I10). |
| `interop` | **CRIA** | outbox versionado Sivec-ready (adapter, sem chamada externa). |
| Reuso: `work-orders`, `field-dispatch`, `checklists`, `attachments`, `notifications`(+`scheduled`), `financial-titles`, `financial-entries`, `professional-statements`, `core-saas`(audit/rbac/rls), `navigation` | **REUSA/ESTENDE** | pontos de extensão nas §3. |

### 6.2 Ordem de PRs (mantém PLANO §3 + deltas do dono; ajuste em negrito)
- **Fase 1 — Fundações:** PR-01 `yard` · PR-02 `jurisdiction` · PR-03 **`tariffs` (ESTENDE, não recria)** · PR-04 UI admin `/patios`.
- **Fase 2 — Custódia:** PR-05 `impound` (processo+`CustodyEvent` hash+FSM I1-I3, **identidade nullable D-Ω5P-RECON-A**) · PR-06 recepção/vistoria (checklist `type=impound_reception` especializado + **origem "autoridade" cria WorkOrder** + gatilho OS→custódia idempotente **D-Ω5P-RECON-B** + alocação de vaga) · PR-07 `charging` (diárias, novo `JobName`) · PR-08 UI operação (mapa de ocupação, dossiê) · PR-09 trilha de notificações legais (D+10/D+30/D+60 via `ScheduledNotification`/scan-due).
- **Fase 3 — Liberação:** PR-10 `release` (I5 + **aprovação in-system da autoridade** + reparo-do-dono) · PR-11 UI liberação/fila/agendamento.
- **Fase 4 — Leilão:** PR-12 elegibilidade/preparação/2-strikes (I8) · PR-13 eventos/edital · PR-14 liquidação cascata (I7)+saldo · PR-15 UI funil + dossiê exportável.
- **Fase 5 — Portais (secops obrigatório):** PR-16 **owner-portal BFF público** (anti-enumeração/rate-limit/`PortalAccessLog` I10) · PR-17 **owner-portal PWA** · PR-18 **authority-portal PWA+BFF** (persona ativa) · PR-19 hardening LGPD (I9). *(numeração comprime/expande — 2 PWAs isolados D-Ω5P-11.)*
- **Fase 6 — Gestão/encerramento:** PR-20 painel gerencial · PR-21 `interop` outbox Sivec-ready + varredura de invariantes + ata final + deleção dos 5 agentes efêmeros.

**Ajuste vs. PLANO:** a Fase 5 do PLANO (PR-16..18) vira **4 PRs** (16-19) para separar **owner-portal** de **authority-portal** (dois PWAs isolados, D-Ω5P-11), empurrando painel/interop para PR-20/21. Ordem de dependência preservada (físico → custódia → cobrança → liberação → leilão → portais → gestão).

---

## 7. Riscos / PDs

- **R1 — Motor de PDF/impressão inexistente no backend (FATO).** Só há `window.print()` client-side (Alvo 6). Documentos probatórios (nota de leilão = título de transferência, dossiê retido ≥5 anos I9) pedem geração server-side arquivável — **net-new**. **PD-Ω5P-PRINT (proposta):** decidir na junta do PR-14/15 entre (a) reuso do padrão `Print*Modal` para guias/comprovantes operacionais e (b) módulo `document`/`printing` backend para os probatórios. Não bloqueia Fase 1.
- **R2 — `eventJobMap` é 1:1 (FATO).** `work_order.status_changed` já mapeia a `field-ops-event-fanout` (`domain-event.publisher.ts:39`); reusar o mesmo evento para custódia exigiria mudar o barramento. Mitigação: evento dedicado `impound.trigger_evaluated` (D-Ω5P-RECON-B). Baixo risco, alto valor de clareza.
- **R3 — `JOB_NAMES` é union const fechada (FATO, `job.types.ts:1`).** Todo job novo (diárias, relógios de prazo) **precisa** ser adicionado ali + no `job.registry.ts:38`, senão o handler não resolve (o worker faz `fail` "No handler registered", `job.worker.ts:34`). Checklist de PR.
- **R4 — `Vehicle.plate` NOT NULL + unique (FATO, `:838/:861`).** Não reusar `Vehicle` para o bem custodiado (fecharia a porta ao veículo sem identificação e colidiria placas entre processos). Identidade no `ImpoundProcess` (D-Ω5P-RECON-A).
- **R5 — Superfície pública (LGPD/secops).** Não há nenhum BFF público hoje (FATO: busca por `owner-portal/public-bff` retorna zero). Os 2 PWAs introduzem CORS/rate-limit/`PortalAccessLog` próprios — **secops obrigatório** em todo PR das Fases 5 (J-OMEGA5P §1). Nenhuma reutilização de `AuthSession` do ERP.
- **R6 — RLS em toda tabela nova (FATO).** Cada `CREATE TABLE` Ω5P deve replicar `ENABLE+FORCE RLS + policy current_tenant_id` (`migration 20260831000000:75-80`) e `tenant_id` 1º em todo índice composto; migrações **só aditivas** (próximo prefixo ≥ `20260833000000`; última é `20260832000000`). `agente-dba-guardiao` em todo PR com migração.
- **PD aberto (categorias/classificação):** critérios federais de conservado/sucata e tabela de categorias de veículo dependem de ato não publicado → parametrizados (perfil), decisão automática deferida a Ω6 (§5 b/e).

---

## 8. Correções do gate adversarial (PR-00) — condições aplicadas

O `critico-adversarial` (gate da Fase 0, no lugar do `omega5p-avaliador` que ativa na próxima sessão) deu **APROVADO_CONDICIONADO** com 5 condições + 1 nota. Todas de precisão do recon; nenhuma bloqueia a Fase 1. Aplicadas:

1. **[ACHADO-1 — âncora] Corrigido:** `FinancialEntry` é `prisma/schema.prisma:1727` (o `:1774` é `model Cheque`). Corrigido na tabela §2 e no Alvo 5.
2. **[ACHADO-2 — durabilidade do gatilho — requisito de PR-06]:** o gatilho OS-concluída→custódia NÃO pode só evitar duplicação (índice único `(tenant_id, work_order_id)`) — tem de garantir que **TODA** OS de remoção concluída ABRA custódia. O barramento é best-effort (`domain-event.publisher.ts:88-109` engole falha de enqueue com `warn` e retorna `published:true`). ⇒ **PR-06 abre custódia TRANSACIONALMENTE (mesma tx da conclusão da OS) OU adiciona um sweep de reconciliação** (varre OS de remoção concluídas sem `ImpoundProcess`, espelhando o catch-up do `scan-due`). Gatilho perdido = buraco probatório inaceitável ("o registro é prova").
3. **[ACHADO-3 — R1 reescopado: PDF × assinatura — bloqueante de PR-13/14]:** a **nota de leilão** (Res. 1025 art. 38 + CTB art. 124 III) é **título de transferência assinado eletronicamente**. O PDF é a metade fácil; a **assinatura eletrônica com valor probatório** (ICP-Brasil/qualificada) pode exigir **provedor externo tarifado** → **PD-Ω5P-SIGN + possível gatilho junta-de-5** (D-SAN-AUTONOMIA). **Bloqueante de PR-13/14, NÃO de Fase 1.** No MVP a junta do PR-13 decide entre assinatura simples/registro auditado × provedor qualificado.
4. **[ACHADO-4 — extensão de `tariffs`, rota preferencial]:** adicionar `vehicle_category` como **coluna** obrigaria alterar a chave natural `@@unique([tenant_id, price_table_id, service_catalog_id, customer_id]):1411` (DROP+CREATE = **destrutivo**, vedado por J §5). **Preferir a rota truly-additive:** novo `ServiceCatalog` por categoria OU `PriceTable` escopada (preserva a unique). Se optar por coluna, a troca de unique é **exceção revisada pelo `agente-dba-guardiao`**.
5. **[ACHADO-5 — precisões de dependência]:** (a) o gatilho OS→custódia é **origem-agnóstico** — dispara de QUALQUER OS de remoção concluída (inclusive criada internamente no ERP); logo **as Fases 2-4 NÃO dependem do authority-portal (PR-18)**. A capacidade backend "origem autoridade" (PR-06) é distinta do BFF que a dirige (PR-18). (b) o `interop`/outbox (PR-21) captura eventos **desde a recepção** por **replay do log `CustodyEvent` append-only retido** — sem retrofit de PR-05..14.
6. **[ACHADO-6 — notas de implementação]:** (a) `ScheduledNotification.created_by` é NOT NULL (`:334`) → os relógios D+10/30/60 definem `created_by` = operador de recepção ou ator de sistema. (b) RECON-B exige estender o union `DomainEventName` (`domain-event.types.ts`) + novo `JobName` em `JOB_NAMES` (`job.types.ts`) + handler em `job.registry.ts` + entrada em `eventJobMap`.

**Nota (deferimento explícito):** SNE vira canal **EXCLUSIVO** de notificação em **01/01/2027** (art. 15). O MVP só **registra** a trilha; o envio real via SNE é deferido a Ω6. Risco de timing de negócio reconhecido — o produto não notifica legalmente o proprietário em 2027 sem o SNE.

**Veredito:** APROVADO_CONDICIONADO → 5 condições aplicadas → **APROVADO** para PR-00 (ratificação oficial pelo `omega5p-avaliador` na próxima sessão; PR-00 é docs-only, sem código/migração/schema).
