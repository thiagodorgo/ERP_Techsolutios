# J-CHECKLIST-P1 — Rodada CHECKLIST P1 (builder real de checklist)

> Rodada própria, aberta após a limpeza de pendências do dossiê (2026-08-02). Decisão fundacional já tomada pelo dono:
> **D-CHK-P1-RUN-LIFECYCLE** (`agent-orchestration/controle/decisoes.md`) — a run **trava ao concluir/assinar**
> (preenche a qualquer momento enquanto a OS/custódia ativa; imutável após concluir; reabrir = nova versão auditada).

## 1. Recon (2026-08-02, agente Explore) — o que JÁ existe vs falta

**Já existe (não reinventar):** modelo de dados completo (`ChecklistTemplate`/`Component`/`Run`/`Answer`/`Attachment`/
`Marker`/`Acknowledgement`, RLS); API tenant CRUD+publish (versão int + freeze do schema); API mobile de run
(create via despacho/idempotência, answer, attachment multipart+storage, marker, complete, divergência,
acknowledgement); **builder web visual** (`/administrator/checklists` → `TenantChecklistsPage`: paleta/canvas/inspector/
preview/publish); execução web (`ChecklistRuntimePage`) e mobile completa (o app **já** renderiza assinatura/foto/
damage_map); aba read-only por processo no dossiê; snapshot congelado no despacho.

**Tipos de componente HOJE** (backend `checklist.types.ts:29`): `vehicle_selector, damage_map, photo_upload,
observation, comparison, acknowledgement, before_after`.

**RISCO-CHAVE:** o **mobile e o codec de sync já aceitam `single_choice`/`multi_choice`/`signature`** (enum
`MobileChecklistFieldType`), mas o **backend e o builder web NÃO** — o P1 precisa alinhar os três (enum backend ↔
catálogo/validator ↔ builder web) para que o que se authora na web seja o que o app renderiza.

## 2. Gaps do P1 e sequência de PRs

| PR | Escopo | Risco / nota |
|----|--------|--------------|
| **PR-01** | Alinhar tipos: `single_choice`/`multi_choice`/`signature` no enum + catálogo (`checklist.components.ts`) + validator tipado (choice exige `config.options[]` não-vazio) + union do builder web (`frontend/.../checklists/types.ts`). A paleta vem do catálogo backend (`GET /tenant/checklist-components`) → propaga sozinha. Sem migração (tipo é String). | fecha o mismatch web↔backend↔mobile |
| **PR-02** | Inspector tipado no builder: editor de opções (choice), config de foto (min/max), assinatura. | web-only; fidelidade |
| **PR-03** | **Imutabilidade pós-conclusão** (D-CHK-P1-RUN-LIFECYCLE): guard em `updateRun`/`completeRun` (prisma + InMemory) — run `completed`/`completed_with_divergence` = imutável (409/422); reabrir = nova versão. | **invariante forte** → junta crítico+dba, teste DB-gated |
| **PR-04** (sub-sequência) | **Aplicabilidade** (cliente + serviço + tipo): tabela de regras + resolução determinística (espelha Tarifas) → **junção N:N `work_order_checklist`** + sticky-no-create + `checklist_source` → **ajuste do operador no ENVIO** → **custódia (dentro do escopo)** → `available` mobile real (para de fingir `work_order_type`). Decisões cravadas em **D-CHK-P1-APPLICABILITY**. | migração aditiva; maior fatia; ratificada pelo dono após ataque adversarial |
| **PR-05** | Tela de **execuções realizadas** (histórico tenant-wide): liga `service.listRuns` (hoje morto p/ HTTP) a rota + tela. | |
| **PR-06** | **Impressão de execução** de checklist (PDF): reusa o padrão `DossiePrintDocument` + **a lição do `@media print` escopado do Ω-VID PR-10** (`body.dossie-printing` classe, não global). | |
| **PR-07** | **Config de imagens**: upload de imagem de referência (fundo do damage_map / por tipo de veículo). Reusa infra de attachment/storage. | |
| **PR-08** | Reconciliar os **2 modelos mobile** (foundation `ChecklistQuestionType` com foto/damage desabilitados vs `MobileChecklistFieldType` ativo). | Flutter |

## 3. Decisões de arquitetura a fixar (na PR onde importam, §A2)
- **Conjunto de tipos novos** (PR-01): começa com `single_choice`, `multi_choice`, `signature` (o que o mobile já
  renderiza). `text`/`number`/`yes_no` ficam para demanda (o `observation` cobre texto hoje).
- **Modelo de aplicabilidade** (PR-04): tabela de regras `template × (cliente?, tipo-de-serviço?)` — a definir no
  comando da PR-04 (com o critico-adversarial atacando a resolução de regra antes de codar).

## 4. Arquivos-chave (do recon)
Backend: `checklist.types.ts` (enums), `checklist.components.ts` (catálogo), `checklist.validator.ts:25-154`
(validação por-tipo), `checklist.service.ts`/`checklist-prisma.repository.ts:500-572` (imutabilidade), `checklist.dto.ts:60`
(aplicabilidade real), `checklist.routes.ts`/`.controller.ts` (histórico/impressão). Frontend:
`modules/checklists/types.ts`, `components/ChecklistInspector.tsx`/`ChecklistComponentPalette.tsx`, `checklist.builder.ts`,
`pages/TenantChecklistsPage.tsx`, + nova tela de histórico e componente de impressão. Mobile:
`features/checklists/domain/checklist_models.dart` (enum já cobre) + reconciliar `checklist_template_models.dart`.

## 5. Registro de execução

### PR-01 — alinhar tipos `single_choice`/`multi_choice`/`signature` + plumbar opções ao mobile — VOTOS DA JUNTA (2026-08-03)

> Junta: `critico-adversarial` (alinhamento web↔backend↔mobile). Ciclo 1 **APROVADO_CONDICIONADO** (achado ALTA) →
> fix real → re-verificação.

**Escopo:** os 3 tipos entram no enum backend (`checklist.types.ts`), no catálogo (`checklist.components.ts`), no
validator tipado (`checklist.validator.ts` — escolha EXIGE `config.options` como lista não-vazia de strings) e na
união/paleta do builder web (a paleta lê o catálogo via `GET /tenant/checklist-components`, propaga sozinha).

**Achado ALTA da junta (fica ABERTO — 2 ciclos de rastreamento):** a premissa "o mobile já renderiza os três" era
FALSA. Em 2 ciclos o crítico rastreou a fonte REAL do run screen: `getSchema → GET /mobile/checklists/:id/render →
`toChecklistTemplateComponentDto` — e o parser do ENVELOPE de render está quebrado (`_schemaFromJson` espera
`title`/`checklistId`/`version as String`, não desembrulha `{data}`) → **o app cai no fallback de SEEDS para TODOS os
tipos**. Ou seja: hoje NENHUM checklist authorado na web renderiza no app. O 1º fix mirou o DTO errado
(`toMobileChecklistTemplateDto`/snapshot — que o run screen NÃO lê; o `available` até ignora `items`); corrigido para
plumbar também **`toChecklistTemplateComponentDto`** (o DTO certo, do `/render`).

**Honestidade (§A6) — a ALTA NÃO está fechada:** o PR-01 entrega o que é seu — os TIPOS alinhados (enum/catálogo/
validator/builder web) e o **AUTHORING web** dos 3 tipos, mais o plumbing das opções `[{value,label}]` nos **dois**
DTOs (render + snapshot), ready para quando o envelope resolver. Mas o **render mobile do backend NÃO fecha** — é a
pendência **P-CHK-RENDER-ENVELOPE** (ALTA ABERTA), a fechar na **PR-08 (reconciliação mobile)**: alinhar o envelope +
teste de contrato render→field, OU rewire do run screen para o snapshot. Também registrado **P-CHK-CATALOG-EXHAUSTIVE**
(catálogo array, não Record). O crítico **APROVOU_CONDICIONADO** o diff (seguro, sem regressão) com a condição de
NÃO vender o fechamento do loop — cumprida aqui.

**KPIs:** backend +5 test() (1 validator + 4 DTO mobile: itens+snapshot+render) → suíte checklist 35→39+; frontend
inalterado (tsc+smoke cobrem a paleta); sem migração. `blocks_completed` +1.

### Fatia render-envelope (P-CHK-RENDER-ENVELOPE) + menu do builder — 2026-08-04 (a pedido do dono: "faça o A")

Fecha a ALTA aberta pela junta do PR-01, priorizada acima das demais PRs do builder:
1. **Flutter — envelope alinhado** (`checklist_remote_api.dart`): `fetchChecklistRender` desembrulha `{data}`
   (tolerando payload sem envelope) e `_schemaFromJson` passa a tolerar o shape REAL do fio (`name`→title, `version`
   numérico→string, `checklistId` ausente→id, `description`→instructions). O cast que estourava e derrubava o app no
   fallback de SEEDS morreu — checklists authorados na web passam a renderizar do backend.
2. **Teste de contrato** (`test/features/checklists/p1_render_envelope_test.dart`, 4): exercita o PARSER REAL
   (`DioChecklistRemoteApi` com transporte stub) contra o payload byte-shape do backend — prova
   `render → schema → field.options != null` (escolha renderiza; não "Componente não suportado"), signature ok,
   contrato legado tolerado e degradação honesta sem options. Era a rede que faltava (o gap nunca tinha sido pego
   porque nenhum teste exercitava o parse contra o shape real).
3. **Web — menu do builder** (achado do dono: "não está aparecendo o build do checklist"): a rota
   `/administrator/checklists` (builder) existia mas era ÓRFÃ de menu (só via URL digitada). Entrou o item
   **"Modelos de Checklist"** no grupo ADMINISTRAÇÃO (`appSidebarNav.ts`), distinto de "Checklists" (execuções,
   OPERAÇÃO). Gate real: `tenant_checklists:read` (registry + PermissionGuard; backend é a autoridade).

Bateria: `dart format` 0-changed · `flutter analyze` limpo · teste de contrato 4/4 · suíte Flutter completa (contagem
real no PR) · frontend check/smoke(997)/build verdes · backend intocado. Emulador do dono com watcher armado (o app
instala sozinho quando a instância Android subir).
