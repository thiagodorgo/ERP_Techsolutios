# Historico de KPIs — ERP Techsolutions

Registro cronologico dos snapshots de qualidade e progresso do projeto.
Atualizar a cada entrega significativa (bloco B-XXX ou PR merged).

---

## B-122 — 2026-07-05

**Alinhamento visual ao prototipo aprovado (publicacao junto ao B-121K)**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 764 / 764 |
| Frontend Smoke Tests | 33 / 33 |
| Backend Tests | 15 / 15 |
| Mobile Backend Contracts | 18 / 18 |
| Mobile + Core SaaS Contracts | 21 / 21 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 96% |
| MVP Vendavel (est.) | 78% |
| Blocos Entregues | 47 |

**Novidades:** Perfil do operador recriado fiel a
`screen-refs/mobile/perfil.png` — hero com avatar/nome/e-mail e "Papel ·
Organizacao" (rotulo PT-BR), secoes Conta e organizacao, Aparencia (tema
preservado), Seguranca e sessao (sessao/conectividade/ultimo sync) e Sair.
Dados tecnicos (token, modo de autenticacao, permissoes cruas, IDs) sairam da
UI; suporte tecnico permanece no Diagnostico (dev-only). Testes b091
realinhados (rotulo PT-BR obrigatorio; claim tecnica proibida).

**Metadados:** PR #121 (merge `fc7e178`, head `f151b4f`); status
`published_after_human_approval`. Percentuais mvp mantidos nos valores
oficiais do B-121K; blocos por regra de contagem (47).

---

## B-121 — 2026-07-05

**MVP integrado Web/Mobile (publicacao B-121K)**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 764 / 764 |
| Frontend Smoke Tests | 33 / 33 |
| Backend Tests | 15 / 15 |
| Mobile Backend Contracts | 18 / 18 |
| Mobile + Core SaaS Contracts | 21 / 21 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 96% |
| MVP Vendavel (est.) | 78% |
| Blocos Entregues | 46 |
| PRs Merged (real) | 119 |

**Novidades:** B-121 fechou os gaps cirurgicos do Mobile MVP — timeline real no
detalhe/check-in (`GET /work-orders/:id/timeline`) com fallback local seguro,
auto-sync montado no app root com ordem segura, adapter de checklist tolerando
`fields` e `components` (tipo desconhecido mostra mensagem segura) e base URL
por `--dart-define=API_BASE_URL` — e religou o web MVP aos endpoints reais
(OS lista/detalhe, Dashboard, Aprovacao operacional e nav MVP-only).

**Metadados:** PRs #117 (merge `38facb2`), #118 (merge `f055668`) e #119
(merge `e851fd3`, approved head `72d6ccc`); status
`published_after_human_approval`. Consolida os blocos B-109 a B-120 mergeados
desde a ultima publicacao (B-108). Percentuais mvp: ultimos valores
documentados na rodada B-113 a B-120 (estimados; revisao humana pode ajustar).

---

## B-108 — 2026-06-18

**Hardening de evidências/storage**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 662 / 662 |
| Backend Tests | 15 / 15 |
| Mobile Backend Contracts | 18 / 18 |
| Mobile + Core SaaS Contracts | 21 / 21 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 93% |
| MVP Vendavel (est.) | 76% |
| Blocos Entregues | 38 |

**Novidades:** B-108 endureceu o upload de evidencias/storage mantendo o
multipart mobile, adicionando `EvidenceStorageProvider`,
`LocalProtectedEvidenceStorageProvider`, `EvidenceScanner` testavel,
`NoopEvidenceScanner`, fake de teste, referencia opaca `evfile_*`, validacao
MIME JPEG/PNG, limite de 10 MB, checksum SHA-256 e auditoria segura para
`accepted`, `rejected`, `scan_failed` e `stored`.

**Seguranca preservada:** resposta publica sem path, bucket, storage key, URL
publica, token, base64 ou binario. O mobile trata `stored`, `rejected`,
`scan_failed` e `pending_review`, preservando evidencia local em erro,
rejeicao, falha de scanner, rede ou timeout.

**Metadados pós-avaliação humana:** PR #104, merge commit
`468fcf16c6b42865aecbd45b05f4c37ced0c3068` e approved head
`4b221cfdfe3acad9c65214ac5fc7e7892a050331`. Status:
`published_after_human_approval` apos gate B-108G.

**Lacunas mantidas:** S3/presigned real, DB/Redis receipt, antivirus real,
download protegido final e retencao definitiva.

---

## B-107 — 2026-06-18

**Criacao remota de OS/local-only mapping + resolucao manual de conflitos**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 654 / 654 |
| Backend Tests | 15 / 15 |
| Mobile Backend Contracts | 18 / 18 |
| Mobile + Core SaaS Contracts | 21 / 21 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 92% |
| MVP Vendavel (est.) | 72% |
| Blocos Entregues | 37 |

**Novidades:** `work_order.create` no sync mobile existente, criacao remota
tenant-scoped/idempotente de OS local-only, mapeamento `localId -> serverId`,
`already_applied` reaproveitando ID remoto, `rejected` mantendo a OS local com
falha segura e conflitos marcados para resolucao manual inicial.

**Fluxo preservado:** `statusUpdate` local-only fica bloqueado antes de
`serverId` e passa a ser elegivel apos o mapeamento. UI e servico de conflito
cobrem manter local e tentar novamente, aceitar servidor quando ha referencia
remota e manter revisao manual auditavel.

**Metadados pós-avaliação humana:** PR #102, merge commit
`db36fb318adc234e1fcc6bfeaeb17b6260847c3c` e approved head
`b3da11d1605af9edb68e5e8f587881fc22115f3f`. Status:
`published_after_human_approval` apos gate B-107G.

**Lacunas mantidas:** approval real, evidence attach real, merge avancado campo
a campo de conflitos, hardening final de evidencias/storage e piloto Android
real em dispositivo fisico.

---

## B-106 — 2026-06-18

**Adapter GPS nativo real + permissoes Android/iOS**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 633 / 633 |
| Backend Tests | 15 / 15 |
| Backend Contract Tests focados | 47 / 47 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 90% |
| MVP Vendavel (est.) | 68% |
| Blocos Entregues | 36 |

**Novidades:** `GeolocatorDeviceLocationProvider` conectado ao
`DeviceLocationProvider`, dependencia `geolocator`, permissoes Android/iOS
when-in-use, `LocationConsentStore` com opt-in explicito e captura manual apenas
por `Enviar localizacao agora`.

**Metadados pós-avaliação humana:** PR #99, merge commit
`aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26` e approved head
`2ac4215fa6a69a93b546f53816a7bf5fc2766133`.

**Privacidade preservada:** sem background tracking, sem stream continuo, sem
timer, sem envio silencioso e sem captura automatica ao abrir telas ou pelo
`AutoSyncCoordinator`. Field Location permanece em
`POST /api/v1/mobile/field-locations` com payload controlado.

### Política permanente de KPIs pós-avaliação humana

1. PRs de feature não devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatório final.
3. KPIs só devem ser atualizados após avaliação humana aprovando a entrega.
4. KPIs só devem ser publicados após merge e gate confirmando sucesso.
5. A publicação de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar também o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o próximo bloco.

### Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geração de artefatos deve limpar os artefatos temporários ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

---

## B-152F — 2026-06-17

**Correcao obrigatoria de KPIs duplos pos-B-105**

O gate B-152 confirmou Flutter 613/613 e backend verde, mas falhou porque o
dashboard raiz `Kpis/` nao refletia os percentuais mobile e os HTMLs nao
continham B-105/totais de forma literal. B-152F documenta a politica permanente:

- mexeu Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`;
- mexeu fora do mobile: atualizar `Kpis/*`;
- mexeu nos dois: atualizar os dois conjuntos;
- se existir `index.html`, atualizar tambem o HTML.

Valores B-105 preservados: Flutter Tests 613/613, Backend Tests 15/15,
Backend Contract Tests focados 47/47, modulos Flutter 17/17, MVP Demo 87%,
MVP Vendavel 64% e Blocos Entregues 35.

## B-105 — 2026-06-17

**Fundacao de GPS/mapa operacional da OS**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 613 / 613 |
| Backend Tests | 15 / 15 |
| Backend Contract Tests focados | 47 / 47 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 17 / 17 |
| MVP Demo Readiness (est.) | 87% |
| MVP Vendavel (est.) | 64% |
| Blocos Entregues | 35 |

**Novidades:** `DeviceLocationProvider` abstrato/testavel, runtime seguro com
indisponibilidade quando nao ha adapter nativo, store Drift `field_location_events`,
sync manual para `POST /api/v1/mobile/field-locations`, card de localizacao na OS
e `/field-map` como mapa operacional simples conectado a Ordem de Servico.

**Validações:** o sweep completo Flutter passou com 613/613 testes. O primeiro
sweep completo encontrou 9 falhas em telas antigas de OS por dependencia de DB
em testes isolados; a correcao foi limitar o provider de Field Location a fallback
em memoria quando a database nao esta disponivel no container de teste.

**Lacunas mantidas:** adapter GPS nativo real, permissoes Android/iOS, opt-in de
privacidade, provider externo de mapa se aprovado, background tracking, stream
continuo, timer de coleta, envio silencioso, roteirizacao e geofencing.

---

## B-104 — 2026-06-17

**Upload real de fotos/evidencias**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 589 / 589 |
| Backend Tests | 15 / 15 |
| Modulos Flutter Prontos | 16 / 16 |
| MVP Demo Readiness (est.) | 85% |
| MVP Vendavel (est.) | 62% |
| Blocos Entregues | 34 |

**Novidades:** `POST /api/v1/mobile/evidence-uploads`, blob local opaco,
upload multipart JPEG/PNG ate 10 MB, checksum SHA-256 obrigatorio e metadata
sync liberando upload binario somente apos `evidence_id` real.

**Lacunas mantidas:** presigned URL, storage protegido final, persistencia
DB/Redis, antivirus e auditoria completa de arquivo.

---

## B-103 — 2026-06-16

**Flutter OS Sync Bidirecional**
Conecta o replay local-first de status de Ordem de Serviço ao contrato backend
real `POST /api/v1/mobile/sync/work-order-actions`. O Flutter envia envelope
`{ client_batch_id, actions[] }`, mapeia `work_order.status_update` interno para
`work_order.status_change` e interpreta `accepted`, `rejected`, `conflicts` e
`already_applied` por action.

| KPI | Valor |
|-----|-------|
| Flutter Tests | 582 / 582 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 16 / 16 |
| MVP Demo Readiness (est.) | 83% |
| MVP Vendavel (est.) | 58% |
| Blocos Entregues | 33 |

**Novidades:**
- `WorkOrderSyncCodec` serializa status de OS para o contrato backend real.
- `server_id` ou `work_order_id` real vira `payload.work_order_id`.
- `local_id` fica apenas em `metadata`; nunca vira `work_order_id`.
- `dispatched` vira `assigned`, `enRoute` vira `on_route`,
  `arrived` vira `on_site` e `inService` vira `in_progress`.
- Replay real B-103 envia somente `WorkOrderSyncActionTypes.statusUpdate`
  backend-ready.
- `accepted` e `already_applied` limpam `pending` da WorkOrder local e
  preservam/atualizam `serverId` quando o backend retorna `resultRef`.
- OS local-only permanece `pending`.
- `work_order.create`, `work_order.approval_request` e
  `work_order.evidence_attach` ficam fora do replay B-103.
- `accepted` e `already_applied` viram `synced`.
- `rejected` vira `failed` retryable; `conflict` marca a WorkOrder local como
  `conflict` e exige decisao manual.
- `AutoSyncCoordinator` passa a chamar Work Order sync.
- Replay de RDV agora filtra somente `ExpenseSyncActionTypes`, evitando captura
  de actions de OS.
- 43 testes B-103 cobrem serializer, parser, replay, entity updater, providers,
  repositorio, cross-domain e autosync.

**Lacunas mantidas:** upload real de evidencias, criacao remota de OS/mapping
local-only, aprovacao real, GPS/mapa, resolucao manual completa de conflitos e
piloto Android real.

**Proximos passos:** B-104 (upload real de evidencias), B-105 (GPS/mapa e
piloto Android), B-106 (criacao remota de OS/local-only mapping).

---

## B-102 — 2026-06-16

**Flutter Checklist Answers Sync**
Conecta o replay local-first de respostas de checklist ao contrato backend real
`POST /api/v1/mobile/sync/checklist-actions`. O Flutter envia envelope
`{ client_batch_id, actions[] }`, usa tipos backend reais e interpreta
`accepted`, `rejected`, `conflicts` e `already_applied` sem marcar sucesso falso.
O replay real B-102 envia apenas respostas/notas/conclusao de runs reconhecidas
pelo backend via `server_run_id` ou `run_id` real.

| KPI | Valor |
|-----|-------|
| Flutter Tests | 538 / 538 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 15 / 16 |
| MVP Demo Readiness (est.) | 81% |
| MVP Vendavel (est.) | 56% |
| Blocos Entregues | 32 |

**Novidades:**
- `ChecklistSyncCodec` serializa `checklist_answer.upsert` para
  `checklist.item_answer` ou `checklist.item_note`.
- `checklist_run.complete` vira `checklist.complete`.
- `local_run_id` fica apenas em metadata; nao vira `run_id` de backend.
- Actions sem `server_run_id`/`run_id` real permanecem pending.
- `checklist_run.create`, markers, divergencia, acknowledgement e anexos ficam
  fora do replay real B-102.
- `DioChecklistSyncBatchApi` envia snake_case e le `body.data`.
- `accepted` e `already_applied` viram `synced`.
- `rejected` vira `failed` retryable; `conflict` exige decisao manual.
- Payload seguro: sem `tenantId`, `tenant_id`, token, `Authorization`, path,
  `local_path`, base64, `file_data` ou binary.
- 38 testes B-102 cobrindo serializer, parser, replay, provider, `server_run_id`,
  elegibilidade de backend e seguranca.

**Lacunas mantidas:** checklist run creation/mapping remoto,
markers/divergencia/ack/anexos em lote, OS sync bidirecional, upload real de
evidencias, GPS/mapa, aprovacao real e piloto Android real.

**Proximos passos:** B-103 (OS sync bidirecional), B-104 (upload real de
evidencias), B-105 (GPS/mapa e piloto Android).

---


## B-098F — 2026-06-15

**Mobile Evidence Flutter Sync**
Consome o contrato backend parcial `POST /api/v1/mobile/sync/evidence-actions`
para replay de manifestos de evidencias de OS/campo. O Flutter envia somente
metadados controlados, le o envelope `body.data` e trata `accepted`,
`rejected`, `conflicts` e `already_applied`.

| KPI | Valor |
|-----|-------|
| Flutter Tests | 497 / 497 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 14 / 16 |
| MVP Demo Readiness (est.) | 79% |
| MVP Vendavel (est.) | 54% |
| Blocos Entregues | 31 |

**Novidades:**
- `EvidenceSyncCodec` serializa `{ client_batch_id, actions[] }`.
- Tipos B-098F suportados: fotos, assinaturas e observacoes de OS/campo.
- Payload seguro: sem `tenant_id`, `tenantId`, base64, binario, `file_data`,
  `local_path` ou `path`.
- Fotos/assinaturas respeitam limite declarado de 10 MB e enviam
  `file_name`, `content_type`, `size_bytes`, `sha256`, `caption` e `gps`
  quando disponiveis.
- `already_applied` vira sucesso idempotente.
- `conflict` permanece como conflito manual, sem retry automatico.

**Lacunas mantidas:** upload/presigned URL, storage protegido, persistencia
DB/Redis, antivirus e auditoria completa de arquivo.

**Proximos passos:** B-102 (sync write checklist + CI wiring), B-103 (OS sync bidirecional), B-104 (upload real de evidencias).

---
## B-101 — 2026-06-15

**Backend Mobile Checklist Available Endpoint**
Fecha a lacuna documentada na B-100. O endpoint `GET /api/v1/mobile/checklists/available`
(que ja existia em `checklist.routes.ts`, nao em `mobile.routes.ts`) passa a retornar um
DTO mobile compativel com o parser Flutter B-100: `title` (de name), `schema_version`
(de version), `status` normalizado para `active` e envelope `{ data, items, meta }`.
Tenant-scoped + RBAC (`checklist_runs:read`/`create`); somente templates publicados.

| KPI | Valor |
|-----|-------|
| npm test (core-saas) | 15 / 15 |
| Testes de contrato mobile (node --test) | 45 / 45 (+5 de B-101) |
| npm run lint | 0 erros |
| npm run build | 0 erros |
| Flutter analyze | sem issues |
| Flutter tests (regressao) | 487 (486 + 1 instavel pre-existente) |
| Blocos Entregues | 30 |

**Novidades:**
- `toMobileChecklistTemplateDto` (DTO mobile separado, nao afeta o contrato web/tenant)
- Envelope `{ data, items, meta }` (data + items para tolerancia do parser Flutter)
- `published` -> `active` para o filtro `activeTemplates` do app
- 5 testes de contrato (`tests/mobile-checklists-available.test.ts`)

**Descoberta:** o handler nao estava ausente; estava registrado em `checklist.routes.ts`.
A "limitacao" da B-100 era um diagnostico impreciso (procurou apenas em `mobile.routes.ts`).

**Pendente:** sync write de respostas de checklist; wiring de CI (npm test roda so core-saas).

**Proximos passos:** B-102 (sync write checklist + CI wiring), B-103 (OS sync bidirecional), B-104 (upload evidencias)

---

## B-100K — Limpeza do dashboard de KPIs Mobile

### Resumo
A pasta oficial `mobile/flutter_app/Kpis/` foi reestruturada usando a pasta raiz `Kpis/` apenas como referência visual/estrutural.

### Ajustes
- Removida dependência obrigatória de servidor local.
- Removidos launchers e arquivos obsoletos (`iniciar-dashboard.bat`).
- Dashboard passa a funcionar por duplo clique em `index.html`, com fallback embutido em `app.js`.
- `kpis-latest.json` e `kpis-history.json` continuam versionados como fonte oficial.
- A pasta raiz `Kpis/` permanece fora dos commits.

### Impacto
- Não altera código Flutter funcional.
- Não altera backend.
- Não altera frontend web.
- Não altera KPIs numéricos, salvo ajustes já feitos pela B-100.

---

## B-100 — 2026-06-15

**Flutter Checklist Remote Templates**
Conecta `ChecklistRepository` ao `GET /api/v1/mobile/checklists/available`. Parser
tolerante (camelCase/snake_case + multiplos envelopes), cache Drift, fallback para
seeds e banners de pull state na tela de checklists disponiveis.

| KPI | Valor |
|-----|-------|
| Flutter Tests | 487 / 487 |
| Backend Tests | 15 / 15 |
| flutter analyze | 0 issues |
| npm lint | 0 erros |
| npm build | 0 erros |
| Modulos Flutter Prontos | 13 / 15 |
| MVP Demo Readiness (est.) | 76% |
| MVP Vendavel (est.) | 51% |
| Blocos Entregues | 29 |

**Novidades:**
- Pull remoto de templates de checklist (`fetchAvailableChecklists`)
- Parser tolerante: envelopes `{checklists}` / `{items}` / `{data}`, camelCase + snake_case
- `ChecklistPullOutcome` enum (success, cached, error, pulling)
- Estado de pull no repo: `isPulling`, `lastPulledAt`, `lastPullError`, `hasCache`, `refresh()`
- `ChecklistAvailableScreen` convertida para `ConsumerStatefulWidget` com `RefreshIndicator`
- Banners: `LinearProgressIndicator`, `_ChecklistErrorBanner`, `_LastUpdatedBanner`, `_CacheBanner`, `_EmptyState`
- +44 testes (parser, repo, refresh, regressao)

**Limitacao conhecida:** rota backend `GET /api/v1/mobile/checklists/available` ainda
ausente em `mobile.routes.ts` (listada como implementada no catalogo de bootstrap).
Flutter trata com fallback para cache/seeds. Escopo backend nao alterado nesta entrega.

**Proximos passos:** B-101 (rota backend + sync write de respostas), B-102 (OS sync bidirecional), B-103 (upload evidencias)

---

## B-099 — 2026-06-14

**Flutter Real Work Orders Pull**
Conecta `WorkOrderRepository` ao `GET /api/v1/work-orders`. Upsert no Drift,
preservacao de pending locais, banners de pull state em Home e List.

| KPI | Valor |
|-----|-------|
| Flutter Tests | 443 / 443 |
| Backend Tests | 15 / 15 |
| flutter analyze | 0 issues |
| npm lint | 0 erros |
| npm build | 0 erros |
| Modulos Flutter Prontos | 12 / 15 |
| MVP Demo Readiness (est.) | 75% |
| MVP Vendavel (est.) | 50% |
| Blocos Entregues | 28 |

**Novidades:**
- OS pull remoto ativo em modo `ERP_AUTH_MODE=remote`
- Parser tolerante camelCase/snake_case no `DioWorkOrderRemoteApi`
- `WorkOrderPullOutcome` enum (success, cached, error, pulling)
- Banners: `LinearProgressIndicator`, `_WoPullErrorBanner`, `_WoLocalCacheBanner`
- `_HomeContentState` convertido para `ConsumerStatefulWidget` com listener estavel

**Proximos passos:** B-100 (sync bidirecional), B-101 (checklist remoto), B-102 (upload evidencias)

---

## B-098B — 2026-06-14

**Flutter Consume Expanded Bootstrap Contract**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 413 / 413 |
| Backend Tests | 15 / 15 |
| Modulos Flutter Prontos | 12 / 15 |
| MVP Demo Readiness (est.) | 74% |
| MVP Vendavel (est.) | 47% |
| Blocos Entregues | 27 |

**Novidades:** FeatureFlag, CapabilityStatus, SyncCursors, ExpandedMobilePolicy,
dual-format bootstrap (B-098 minimal + B-098A expandido).

---

## B-098 — 2026-06-14

**Flutter Real Auth and Bootstrap**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 352 / 352 |
| Backend Tests | 15 / 15 |
| Modulos Flutter Prontos | 11 / 15 |
| MVP Demo Readiness (est.) | 73% |
| MVP Vendavel (est.) | 45% |
| Blocos Entregues | 25 |

**Novidades:** DioAuthRepository, BootstrapNotifier, TenantSelectorScreen,
multi-tenant switch, _BootstrapErrorView com retry.

---

## B-097 — 2026-06-14

**Flutter Mobile MVP Stabilization**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 315 / 315 |
| Backend Tests | 15 / 15 |
| Modulos Flutter Prontos | 11 / 15 |
| MVP Demo Readiness (est.) | 72% |
| MVP Vendavel (est.) | 43% |
| Blocos Entregues | 24 |

**Novidades:** DriftWorkOrderLocalStore, checklist renderers (10 tipos),
WorkOrder evidence schema v4, SyncScreen melhorado.

---

## B-094 — 2026-06-13

**QA Geral + Organizacao Flutter + Estrategia de PR**

| KPI | Valor |
|-----|-------|
| Flutter Tests | 280 / 280 |
| Backend Tests | 15 / 15 |
| flutter analyze | 0 issues |
| Modulos Flutter Prontos | 10 / 15 |
| MVP Demo Readiness (est.) | 70% |
| MVP Vendavel (est.) | 40% |
| Blocos Entregues | 22 |

---

## Como atualizar este historico

A partir da B-099K, toda entrega deve:

1. Adicionar entrada ao topo deste arquivo com data, versao e KPIs reais.
2. Adicionar snapshot em `kpis-history.json`.
3. Atualizar `kpis-latest.json` com os novos valores.
4. Commitar com mensagem `docs(kpis): update dashboard for B-XXX`.
