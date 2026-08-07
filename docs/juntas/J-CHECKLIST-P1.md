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

### PR-02 — replanejado sobre o protótipo do dono (2026-08-05, spec da cognicao-visual)

O dono reprovou a tela atual do builder ("não ficou legal") e desenhou **`Modelos de Checklist.dc.html`** no
Claude Design (importado para a raiz do repo). A cognicao-visual extraiu a spec forense ANTES de código
(protocolo pré-tela): 2 modos (lista ↔ editor), abas Estrutura/Aplicabilidade("Em breve"), paleta 264px +
canvas + inspector 336px (+dock de preview 392px), seções nomeadas, inspector TIPADO por tipo, preview em
frame de telefone, dirty-tracking + modal "Sair sem salvar?", toasts, guard-rails de publicação client-side.

**Fatiamento aprovado (1 bloco = 1 PR):**
- **PR-02a — Lista**: scList completo (header/busca/filtro/4 KPI-cards/tabela nova/pills/ações-ícone/estados
  + banner somente-leitura) + componente de **toast** (infra nova) + correção transversal de
  `checklist.constants.ts` (acentos, "Personalizado", travessão). UI-only, endpoints existentes; o builder
  atual permanece como ponte ao clicar (o redesign do editor vem em 02b-d).
- **PR-02b — Editor casca+canvas**: sub-rota `/administrator/checklists/:id`, header do editor (nome/tipo
  inline, pills, dirty, Salvar), paleta, canvas com seções (mover/duplicar/remover), modal de saída, aba
  Aplicabilidade estática ("Em breve") + card "O que acontece ao publicar". Convenção `schema.sections[]` +
  `config.sectionIndex`/`config.help` (config é JSON livre; validator só olha `options`) com teste de round-trip.
- **PR-02c — Inspector tipado + publicação**: 10 formulários de config por tipo, editor de opções, blockers
  espelhando o validator, Publicar no editor, reposição do Inativar/Arquivar (gap do protótipo — a
  capacidade real não se perde).
- **PR-02d — Pré-visualização**: modal + dock, render fiel por tipo, sem OS fictícia (contexto real da sessão).
- Aplicabilidade REAL segue sendo a sub-sequência do PR-04 (D-CHK-P1-APPLICABILITY).

**Regras de fidelidade herdadas:** rótulos PT-BR acentuados SEMPRE do mapa local (o catálogo do backend
devolve sem acento — nunca renderizar cru); grip de arrastar é decorativo (reordenação real ↑/↓, como no
protótipo — DnD real exigiria dependência nova/junta-5); versão exibida é a devolvida pela API (não replicar
o incremento do mock); CSS novo em namespace `.ckb-*` com tokens (J-002).

### PR-02a — lista de "Modelos de Checklist" — JUNTA EM WORKFLOW + correções (2026-08-06)

**Dev:** frontend-pixel-master recriou o scList do protótipo (header/busca/filtro/4 KPI-cards/tabela nova/
pills/ações-ícone/estados §7/banner somente-leitura) + ChecklistToast novo + correção transversal de copy
(`checklist.constants.ts`) + remoção do NewChecklistForm ("Novo modelo" instantâneo do protótipo).

**Junta (workflow, 3 vetos em paralelo + verificação adversarial de cada achado):** cognicao-visual
**REPROVADO** · coordenador-de-acessos **APROVADO_CONDICIONADO** · critico-adversarial
**APROVADO_CONDICIONADO**. 8 achados CONFIRMADOS por refutação independente (0 refutados). Dois achados
tiveram a verificação derrubada por limite de sessão e foram re-verificados pelo orquestrador com
execução própria: a pill "Alterações não publicadas" é legítima (o DTO expõe `publishedAt`) e a rota de
execuções existe (`/operations/checklists`).

**Correções aplicadas (todas no mesmo PR):**
1. **ALTA — auto-select**: a ponte do builder antigo montava SEM clique no primeiro paint pós-carga,
   vazando enum cru ("vehicle_selector"), JSON de schema (`componentKey`, `w02a_builder`) e copy de
   andaime. Fallback `?? nextChecklists[0]` removido — ponte é click-only, como a ata autorizava.
2. **MÉDIA — flash do vazio**: `loading` inicial voltou a `true` (o 1º frame comitado era o vazio-hero
   "Nenhum modelo ainda" com dados existentes; regressão vs HEAD provada por execução do próprio smoke).
3. **MÉDIA/ALTA — esconde-fino da ponte**: papel somente-leitura recebia paleta "Adicionar" + mover/
   remover ativos. Ponte agora é consulta pura sem `update` (paleta/inspector não montam; canvas sem
   controles — `onMove`/`onRemove` opcionais). De quebra o canvas parou de renderizar a CHAVE TÉCNICA
   crua no subtítulo (§3): rótulo PT-BR do mapa local.
4. **ALTA — lixo irremovível**: o protótipo não desenhou Inativar/Arquivar e o "Novo modelo" instantâneo
   cria template REAL por clique — sem caminho de remoção, engano virava lixo permanente. Ação
   Inativar/Reativar reposta na linha (gate `update`); o lugar definitivo é o editor (PR-02c).
5. **MÉDIA — testes vácuos**: os smokes SSR não provavam o esconde-fino (sem efeitos, lista vazia,
   `doesNotMatch` passa vazio). Solução: costura `initialChecklists` (prop de teste; produção intocada)
   + `rowActionVisibility()` pura + 3 testes novos com LINHAS REAIS provando: leitura → zero escrita e
   "Ver modelo"; escrita → Editar/Inativar/Reativar/Duplicar; ponte nunca monta sem clique.
6. **BAIXAs aplicadas**: recarga falha com dados → toast (não silêncio) + limpeza na troca de organização;
   cabeçalho da tabela sem `aria-hidden` (role=table/row/columnheader); "Ver execuções" com gate PRÓPRIO
   `checklist_runs:read` navegando de verdade para /operations/checklists (o toast "em breve" mentia);
   linha na `docs/navigation-matrix.md`; copy duplicada unificada (ChecklistRunsPage/RunStatusBadge
   importam `checklist.constants` — morrem "Customizado", "Concluido", "ciencia").

**Registrado, não feito aqui:** divergência pré-existente RBAC_MATRIX × catálogo em "Configurable checklist
templates" (pendência própria); e2e W02A com âncoras conferidas estaticamente (o spec e2e não roda na
bateria local). Smoke da tela 12/12; suíte completa na bateria do PR.

### PR-02b — editor (casca + paleta + canvas com seções + saída suja) — 2026-08-06

**Entregue:** sub-rota `/administrator/checklists/:checklistId` (mesmo `PermissionGuard` da lista) com o bloco
`scEditor` do protótipo recriado: header (voltar 34×34, nome inline, tipo, pills de situação/pendência, dirty,
Salvar), abas Estrutura/Aplicabilidade + "Ver execuções deste modelo" (gate próprio `checklist_runs:read`),
paleta 264px, canvas com **seções nomeadas** (mover ↑/↓ na mesma seção, duplicar, remover), inspector básico
(pergunta · ajuda · obrigatoriedade), modal "Sair sem salvar?" e aba Aplicabilidade estática com o selo
"Em breve". A **ponte do builder antigo abaixo da lista morreu** (e com ela `ChecklistCanvas`,
`ChecklistComponentPalette`, `ChecklistInspector`, `ChecklistSchemaPreview` e `ChecklistStatusBadge` —
os cinco ficaram sem NENHUM consumidor, confirmado por grep no repositório antes de remover). O mapa de
cor/ícone por tipo virou fonte única (`checklist-tiles.ts`) e a montagem do contexto de API saiu da lista
para `checklist.api-context.ts` (as duas telas leem a mesma regra).

**Convenção de persistência PROVADA por execução (não por leitura de código)** — sondagem do payload real
contra `parseUpdateChecklistTemplateDto` + `InMemoryChecklistRepository`:
`schema.sections` ✅ sobrevive · chave desconhecida no `schema` ✅ sobrevive · `config.sectionIndex` ✅ ·
`config.help` ✅ · chave extra no **topo** do componente ❌ descartada pelo `z.object` (confirma o achado que
motivou a convenção) · `buildSchema` do repositório só reescreve `components`, preservando o resto do schema.

**Achado ALTA (fora do escopo deste PR, registrado como pendência `P-CHK-PATCH-SEM-TYPE`):** o PATCH de
template **não carrega `type`** — `parseUpdateChecklistTemplateDto` só aceita `name/description/status/schema/
components` e nenhum dos dois repositórios grava a coluna. Um seletor de tipo "funcionando" descartaria a
escolha do usuário em silêncio; por isso o campo é renderizado **desabilitado** (`title="Disponível em breve"`),
exibindo o tipo atual. Ligá-lo exige tocar o validator/serviço no backend → **PR-02c**.

**Também registrado:** o backend **regenera o id de cada componente** a cada PATCH (o `componentKey` é que
sobrevive) — o editor reancora a seleção pela chave após salvar, senão o inspector perderia o campo recém-
configurado. O bloqueio de saída suja cobre o botão Voltar; blocker GLOBAL de rota (sidebar/back do navegador)
exigiria `useBlocker`/data-router e fica para o PR-02c.

**Fora deste PR (por fatiamento, não por esquecimento):** inspector TIPADO por tipo e Publicar (PR-02c);
pré-visualização em frame de telefone (PR-02d) — os dois botões existem no header, **desabilitados**.

**Bateria:** `check` (tsc) verde · `test:smoke` **1063/1063** (era 1052; +10 novos, +1 na lista) · `build`
verde · `git diff --check` limpo. Suíte backend não exercitada: nenhum teste de `tests/*.ts` lê os arquivos
tocados (só `approval-frontend-contract.test.ts` lê frontend, e são arquivos de Ordens de Serviço).

### PR-02b — editor (casca + canvas + seções) — JUNTA: pixel REPROVOU, crítico CONDICIONOU → corrigido (2026-08-07)

**Entrega:** sub-rota `/administrator/checklists/:checklistId`, header do protótipo (nome inline, tipo, pills,
dirty, Salvar), paleta, canvas com **seções nomeadas**, inspector básico, modal "Sair sem salvar?", aba
Aplicabilidade estática. A ponte antiga (builder abaixo da lista) MORREU; 5 componentes órfãos removidos.

**Persistência das seções — verificada rodando parser + repositório REAIS** (não por leitura):
`schema.sections` ✅ · chave desconhecida no schema ✅ · `config.sectionIndex` ✅ · `config.help` ✅ ·
chave extra no TOPO do componente ❌ (descartada pelo `z.object`) · **`type` ❌ descartado no PATCH** ·
`id` do componente é REGENERADO a cada PATCH (só `componentKey` sobrevive).

**Achados aplicados (junta em workflow com refutação adversarial por achado):**
| Sev | Achado | Correção |
|---|---|---|
| ALTA | `align-items: start` impedia as colunas de esticarem: a rolagem interna do canvas nunca ativava, subia para o shell e o HEADER (Salvar/dirty/abas) saía da tela ao rolar o formulário | removido (o protótipo usa o `stretch` default); `start` re-escopado só no empilhado ≤1180px |
| ALTA | Adicionar campo gravava o rótulo CRU do catálogo backend ("Observacao", "Seletor de veiculo") como **a pergunta que o técnico lê no app** — e persistia | rótulo resolvido pelo mapa local ANTES de criar + teste do handler |
| ALTA | **Publicar ficou inalcançável** — capacidade real do produto removida, com o endpoint funcionando | Publicar LIGADO (`POST /tenant/checklists/:id/publish`); guard-rails por tipo seguem no 02c |
| ALTA | Perda SILENCIOSA de trabalho: editar durante o save → toast verde confirmando um save sem as edições | `editingFrozen` congela paleta/ações/campos enquanto grava (inspector fica montado em readOnly) |
| MÉDIA | Troca de organização deixava o modelo anterior na tela, **editável** | reset de estado antes do fetch |
| MÉDIA | 404/403 apareciam como "Verifique sua internet" | `resolveEditorLoadError` por status (inexistente ≠ sem permissão ≠ rede) |
| MÉDIA | Guarda de saída cobria só o botão Voltar | `beforeunload` enquanto dirty; blocker global de rota = requisito EXPLÍCITO do 02c |
| MÉDIA | "Nova seção" sem remoção: a tela só sabia criar lixo estrutural persistido | `removeEditorSection` (só seção VAZIA, nunca a última, reindexando os seguintes) |
| MÉDIA | Mutadores do canvas sem NENHUM teste | 3 testes novos (borda, não-cruza-seção, duplicar preserva seção, remover seção, rótulo PT-BR) |
| MÉDIA | Controles parados com cinza que não existe no protótipo | selo "Em breve" do próprio desenho ao lado de Pré-visualizar/tipo |
| BAIXA | Payload levava `schema.components` obsoleto | removido do que sobe |
| BAIXA | Campos de texto sem anel de foco | anel do protótipo em nome/seção/inspector |

**Pendências registradas:** `P-CHK-PATCH-SEM-TYPE` (o PATCH descarta `type` — por isso o seletor fica parado;
ligar exige backend, PR-02c) e `P-CHK-PATCH-SEM-LOCK` (last-write-wins sem guarda de versão; mitigação e
correção no 02c).

**Bateria:** check verde · smoke **1052→1066** · build ✓ · `git diff --check` limpo.
