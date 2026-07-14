# KPI Dashboard History

Este arquivo e o historico permanente do painel `Kpis/`. Todo bloco futuro deve atualizar:

- `Kpis/index.html`
- `Kpis/app.js`
- `Kpis/kpis-history.md`

## 2026-07-05 - B-124 Dashboard web enriquecido com despachos e localizacoes

### Resultado

- Dashboard web (`/dashboard`) passou a compor 4 fontes reais em paralelo:
  `GET /work-orders` + `GET /operations/dispatches` +
  `GET /field-locations/latest` + `GET /notifications/unread-count`
  (+ `GET /approvals/pending`, com `work_order_id` opcional no backend).
- 8 KPIs derivados dos dados (nunca fixos); fila critica combinada com
  ordenacao obrigatoria por criticidade — 1) SLA/agenda vencidos ·
  2) prioridade alta/urgente · 3) operador sem sinal recente (stale) ·
  4) aprovacao pendente · 5) OS sem operador — com dedupe por entidade e
  acao contextual (Abrir OS / Abrir mapa / Ver aprovacao).
- Status de campo real com a regra de stale de 15 min reutilizada de
  `operations-map.adapter` (`isStale`), sem recalcular limiar; despachos
  ativos com status desconhecido tolerado; alertas acionaveis; eventos
  derivados das listas carregadas (sem chamada de timeline por OS).
- Fallback por fonte com rotulos `Dados demonstrativos` (mock) / `Fallback
  local`; mensagens seguras; nenhum token/tenantId/ID tecnico/base64/path na
  UI. Web-only: nenhum arquivo mobile/backend alterado.

### Metadados pos-avaliacao humana

- PR: #125 (merge `dcfa25063111532f8cc1c77d7af8ec4519406bb0`, head `6605b13630e3f29f98670aabf9ee32e274f40d47`).
- Status: `published_after_human_approval`.

### KPIs B-124 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 (inalterado; B-124 e web-only) |
| Frontend Smoke Tests | 44/44 (era 33/33; +10 unit adapter + 1 render) |
| Backend Tests | 15/15 (inalterado) |
| Mobile Backend Contracts | 18/18 (inalterado) |
| Mobile + Core SaaS Contracts | 21/21 (inalterado) |
| Flutter modules | 17/17 (inalterado) |
| MVP demo | 96% (mantido; sem decisao humana para alterar) |
| MVP vendavel | 78% (mantido; sem decisao humana para alterar) |
| Blocos entregues | 49 (48 ate B-123 + B-124) |

### Nota sobre percentuais MVP

`mvp_demo`/`mvp_vendavel` permanecem nos valores oficiais publicados (96%/78%,
estimados). B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o
dashboard web enriquecido; ainda assim, **sem decisao humana explicita**, os
percentuais nao foram alterados e ficam registrados como oficiais ate revisao.

## 2026-07-05 - B-123 Fidelidade visual do fluxo de OS mobile

### Resultado

- 7 telas/areas do fluxo de OS mobile alinhadas ao prototipo aprovado
  (visual-only): lista de OS, detalhe/check-in, execucao, checklists da OS,
  execucao de checklist, evidencias e sincronizacao/fila offline.
- Estados semanticos visiveis por tokens centrais (pendente ambar · enviando
  roxo · sucesso verde · falha/conflito vermelho · info azul) via
  pills/faixas laterais do mobile_kit; sem dado tecnico cru na UI.
- Nenhum repository/service/contrato/sync/model/provider alterado; frontend e
  backend intocados; nenhuma dependencia nova.
- Dois testes realinhados com aprovacao humana previa (b114: rotulo 'Sync
  pendente' fiel ao os-lista.png; b116: header 'Atendimento' fiel ao
  prototipo).

### Metadados pos-avaliacao humana

- PR: #123 (merge `2537558f3f078425c13119a60445e960aac26bb2`, head `24d439072778438ed3de837fc66a4ef6bce31944`).
- Status: `published_after_human_approval`.

### KPIs B-123 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 48 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(96%/78%); nao houve decisao humana para altera-los no B-123. Blocos: regra
de contagem (47 ate B-122 + B-123 = 48).

### Limitacoes registradas

- Fluxo de OS mobile alinhado — lacuna anterior resolvida pelo B-123.
- Permanecem: S3/presigned real, DB/Redis receipt, antivirus real, download
  protegido final, retencao definitiva, Dashboard web sem
  dispatches/field-locations, Settings web sem backend dedicado e piloto
  Android em dispositivo fisico.

## 2026-07-05 - B-122 Alinhamento visual ao prototipo aprovado

### Resultado

- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png`: hero com
  avatar/nome/e-mail e "Papel · Organizacao" (rotulo PT-BR), secoes Conta e
  organizacao, Aparencia (tema preservado), Seguranca e sessao e botao Sair.
- Removidos da UI: modo de autenticacao, expiracao de token, permissoes cruas,
  modulos, tenants e IDs internos (suporte tecnico permanece no Diagnostico
  dev-only).
- Auditoria: 11 telas web MVP + shell conformes ao padrao aprovado; web sem
  rota de Perfil (lacuna documentada, sem criar tela fora das 16 congeladas);
  fluxo de OS mobile em Material stock (lacuna para as proximas fases).

### Metadados pos-avaliacao humana

- PR: #121 (merge `fc7e17810940edf933b5e4a2071f8f456e05d4e9`, head `f151b4fb6e53200204846aed5abb0699c0308d94`).
- Status: `published_after_human_approval`.

### KPIs B-122 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 47 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(B-121K, PR #120); B-122 nao propos novos percentuais. Blocos: regra de
contagem (46 ate B-121 + B-122 = 47).

### Limitacoes registradas

- Fluxo de OS mobile ainda em Material stock (fidelidade nas proximas fases).
- Demais limitacoes do B-121 permanecem (S3/presigned, DB/Redis receipt,
  antivirus real, download protegido, retencao, Dashboard web sem
  dispatches/field-locations, Settings web sem backend).

## 2026-07-05 - B-121 MVP integrado Web/Mobile

### Resultado

- Web MVP integrado aos endpoints reais: lista de OS (`useWorkOrders` -> GET /work-orders),
  Dashboard composto de work-orders + notifications, Detalhe da OS com timeline real,
  Aprovacao operacional no detalhe (GET /approvals/pending; POST /approve|/reject) e
  navegacao MVP-only via GET /navigation/menu.
- Matriz tela x endpoint x status das 27 telas MVP publicada em `docs/api-screen-endpoints.md`.
- Hardening mobile: timeline real no detalhe/check-in com fallback local seguro,
  auto-sync montado no app root com ordem segura preservada, adapter de checklist
  tolerando `fields` e `components` (tipo desconhecido -> mensagem segura) e base URL
  por `--dart-define=API_BASE_URL`.
- Consolida os blocos B-109 a B-120 mergeados desde a ultima publicacao (B-108).

### Metadados pos-avaliacao humana

- PR: #117 (merge `38facb24a3bc8592cc3ccd6c11d4e428420532ed`, head `73a50e905b5a7a3c4665910e705f168d239a8dd9`).
- PR: #118 (merge `f05566828a2b05d9c4400112d66be490477f0a17`, head `474e5ec49e562a39ddcb1eec15253816ff11f520`).
- PR: #119 (merge `e851fd35e141545401abfc0fac774f62e1c2f615`, head `72d6ccc6476be752ccf8d368a5252c8c97fac522`).
- Status: `published_after_human_approval`.

### KPIs B-121 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 46 |

Observacao: mvp_demo/mvp_vendavel seguem os ultimos valores documentados na rodada
B-113 a B-120 (`agent-orchestration/codex/log-execucao.md`, estimados); o B-121 nao
propos novos percentuais e a revisao humana pode ajusta-los.

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.
- Dashboard web sem enriquecimento de dispatches/field-locations.
- Settings web sem backend dedicado.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-108 Hardening de evidências/storage

### Resultado

- `EvidenceStorageProvider` publicado para upload mobile de evidencias.
- `LocalProtectedEvidenceStorageProvider` publicado para dev/test.
- `EvidenceScanner` testavel publicado com `NoopEvidenceScanner` e fake de teste.
- Referencia opaca `evfile_*` publicada na resposta publica.
- MIME validation JPEG/PNG.
- Size validation 10 MB.
- Checksum SHA-256 obrigatorio.
- Auditoria segura para `accepted`, `rejected`, `scan_failed` e `stored`.
- Upload multipart mobile preservado.
- Resposta publica sem path, bucket, storage key, URL publica, token, base64 ou binario.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #104 e gate B-108G.

### Metadados pos-avaliacao humana

- PR: #104.
- Merge commit: `468fcf16c6b42865aecbd45b05f4c37ced0c3068`.
- Approved head: `4b221cfdfe3acad9c65214ac5fc7e7892a050331`.
- Status: `published_after_human_approval`.

### KPIs B-108 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 662/662 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 93% |
| MVP vendavel mobile | 76% |
| Blocos entregues | 38 |

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.

## 2026-06-18 - B-107 Criacao remota de OS/local-only mapping + resolucao manual de conflitos

### Resultado

- `work_order.create` publicado no sync mobile existente de OS.
- `localId -> serverId` publicado para `accepted` e `already_applied`.
- `rejected` preserva a OS local com falha segura.
- `conflicts` entram em resolucao manual inicial.
- `statusUpdate` local-only permanece bloqueado antes de `serverId` e fica elegivel apos o mapeamento.
- UI e servico de resolucao manual foram publicados para manter local, aceitar servidor e revisao manual.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #102 e gate B-107G.

### Metadados pos-avaliacao humana

- PR: #102.
- Merge commit: `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`.
- Approved head: `b3da11d1605af9edb68e5e8f587881fc22115f3f`.
- Status: `published_after_human_approval`.

### KPIs B-107 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 654/654 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 92% |
| MVP vendavel mobile | 72% |
| Blocos entregues | 37 |

### Limitacoes registradas

- Approval real pendente.
- Evidence attach real pendente.
- Merge avancado campo a campo de conflitos pendente.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-106 Adapter GPS nativo real + permissoes Android/iOS

### Resultado

- Adapter GPS nativo real conectado ao DeviceLocationProvider via geolocator.
- Permissoes Android/iOS when-in-use.
- Opt-in explicito antes do primeiro pedido de permissao nativa.
- Captura manual somente por Enviar localizacao agora.
- KPIs raiz sincronizados com mobile/flutter_app/Kpis/.

### Metadados pos-avaliacao humana

- PR: #99.
- Merge commit: `aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26`.
- Approved head: `2ac4215fa6a69a93b546f53816a7bf5fc2766133`.
- Status: publicado apos avaliacao humana, merge e gate.

### KPIs B-106 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 633/633 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 90% |
| MVP vendavel mobile | 68% |
| Blocos entregues | 36 |

### Limitacoes registradas

- Sem background tracking.
- Sem stream continuo.
- Sem timer.
- Sem envio silencioso.
- Geofencing pendente.
- Roteirizacao pendente.
- Provider externo de mapa pendente, se aprovado.
- Approval real pendente.
- Conflitos manuais avancados pendentes.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

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

## 2026-06-17 - B-152F KPIs duplos pos-B-105

### Resultado

- `Kpis/` raiz foi sincronizado com os percentuais mobile de `mobile/flutter_app/Kpis/`.
- Criados `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` e `Kpis/README.md`.
- `Kpis/index.html` e `mobile/flutter_app/Kpis/index.html` passaram a conter
  B-105/totais de forma literal, alem do render por JavaScript.
- A politica permanente de KPIs duplos foi documentada.

### Politica permanente de KPIs duplos

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

### KPIs B-105 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 613/613 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 87% |
| MVP vendavel mobile | 64% |
| Blocos entregues | 35 |

### Limitacoes registradas

- Adapter GPS nativo real pendente.
- Permissoes Android/iOS e opt-in de privacidade pendentes.
- Sem pacote GPS nativo, sem geolocator, sem Google Maps, sem Mapbox e sem SDK externo.
- Sem background tracking, sem timer, sem stream continuo e sem envio silencioso.

## 2026-06-15 - KPI-DASHBOARD-001

### Registro inicial

- Criada a estrutura permanente `Kpis/` no mesmo nivel de `src/`.
- Criado dashboard HTML/CSS/JS puro, sem dependencia externa obrigatoria.
- Registrado estado consolidado apos o merge do B-098D.
- `mobile/**` permaneceu fora do escopo.
- Figma, secrets, `.env`, migrations e infra permaneceram fora do escopo.

### Estado consolidado apos B-098D

| Bloco | Status | Resultado |
| --- | --- | --- |
| B-098 | concluido | bootstrap minimo/backend readiness |
| B-098A | concluido | bootstrap expandido com feature flags, policies e catalogos |
| B-098B | concluido | sync offline de OS para status e atribuicao |
| B-098C | parcial | sync offline minimo de checklist |
| B-098D | parcial | inventory availability + inventory sync minimo |

### KPIs iniciais

| KPI | Valor |
| --- | --- |
| Bootstrap minimo | concluido |
| Bootstrap expandido | concluido |
| Sync OS | concluido |
| Sync checklist | parcial |
| Inventory availability/sync | parcial |
| Evidencias OS/genericas | planejado |
| Idempotencia duravel DB/Redis | planejado |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Contratos mobile/backend

Implementados:

- `GET /api/v1/mobile/bootstrap`
- `POST /api/v1/mobile/sync/work-order-actions`

Parciais:

- `POST /api/v1/mobile/sync/checklist-actions`
- `GET /api/v1/mobile/inventory/availability`
- `POST /api/v1/mobile/sync/inventory-actions`

Planejados:

- evidencias OS/genericas
- idempotencia duravel DB/Redis
- persistencia/reserva transacional de inventario
- consumo Flutter dos contratos B-098B/C/D

### Validacoes conhecidas

- PR #85: CI remoto `backend` passou.
- Frontend React: smoke conhecido `28/28`.
- Validacoes locais obrigatorias do KPI-DASHBOARD-001 devem ser registradas na entrega da branch.

### Lacunas restantes

- Flutter ainda precisa consumir B-098B/C/D.
- Evidencias OS/genericas ainda precisam de contrato backend.
- Idempotencia de replay ainda precisa persistencia duravel.
- Inventario ainda precisa reserva transacional e vinculo real com OS/armazem.
- Validacao E2E de campo ainda precisa fechar caminho backend + Flutter.

### Previsoes

- MVP vendavel: 40-80h restantes, sujeito a consumo Flutter dos contratos B-098B/C/D, evidencias/OS, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, dependendo de fidelidade visual, responsividade, estados, microinteracoes e polimento web/mobile.

### Regra permanente

Todo bloco futuro deve atualizar este historico com data, escopo, KPIs alterados, validacoes executadas, riscos novos e decisao de proximo bloco.

## 2026-06-15 - B-098E Mobile Evidence Contract

### Resultado

- Criado `POST /api/v1/mobile/sync/evidence-actions` em status `partial`.
- Tipos de OS: `evidence.work_order_photo`, `evidence.work_order_signature` e `evidence.work_order_observation`.
- Tipos de campo: `evidence.field_photo`, `evidence.field_signature` e `evidence.field_observation`.
- Tenant resolvido exclusivamente pelo ator autenticado; `tenant_id`/`tenantId` externo e ignorado.
- Idempotencia por tenant + usuario + `client_evidence_id`, com `already_applied` e `idempotency_payload_mismatch`.
- Bootstrap, policy e catalogo mobile atualizados para marcar evidencia como parcial.

### KPIs atualizados

| KPI | Valor |
| --- | --- |
| Backend mobile | 6/7 |
| Evidencias OS/genericas | parcial |
| Testes focados mobile/Core SaaS | 18/18 |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Lacunas e riscos

- O contrato registra apenas manifesto/metadados; nao recebe binario/base64.
- Faltam URL protegida de upload, storage, antivirus, auditoria de arquivo e persistencia duravel DB/Redis.
- Flutter ainda precisa consumir os contratos B-098B/C/D/E.
- Idempotencia em memoria nao atende ambiente multi-instancia.

### Validacoes executadas

- `npm run check`: pass.
- `npm run lint`: pass.
- `npm test`: pass, 15/15.
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`: pass, 18/18.
- `npm run build`: pass.
- `npm --prefix frontend run check`: pass.
- `npm --prefix frontend run test:smoke`: pass, 28/28.
- `npm --prefix frontend run build`: pass.
- `DATABASE_URL` dummy + `npx prisma validate`: pass.
- `git diff --check`: pass.

### Previsoes

- MVP vendavel: 36-72h restantes, sujeito a integracao Flutter, upload protegido, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, sem alteracao de Figma neste bloco.

### Regra permanente confirmada

Todo bloco futuro continua obrigado a atualizar `Kpis/index.html`, `Kpis/app.js` e `Kpis/kpis-history.md` antes de encerrar a entrega.

## 2026-07-13 — Ω-GOV (rodada saneamento, PR2): política KPI-por-PR + correção do backend

- **Política revogada→vigente:** "KPI só após avaliação humana (bloco …K)" **REVOGADA** (D-KPI-PER-PR). Vigente:
  todo PR que altere código/teste/escopo atualiza os KPIs **no próprio PR** com contagem de execução real; a
  **junta do PR** valida; o humano audita pelo history. Reescrito em CLAUDE.md (§C1/§C2/§C3/§C7/DoD),
  Kpis/README.md, mobile/flutter_app/Kpis/README.md, plano-mestre.md; handoff-package e logs = banner revogada.
- **backend_tests: 15/15 → 766/766.** O Ω-GATE (PR #174) fez o CI rodar a **suíte backend inteira** (100
  arquivos + Postgres+Redis + `prisma migrate deploy`), 0 fail. O antigo 15/15 media só `core-saas.test.ts`.
- **Escopo:** web/backend/docs-only. Flutter/mobile e frontend seguem valores oficiais B-124 até re-baseamento
  nas respectivas trilhas (política dupla mantida).

## 2026-07-13 — Ω-DOCS (rodada saneamento, PR3): descontaminação Kryos

- Removido `docs/research/estudo-doutoral-interfaces-10-saas.md` (100% conteúdo do projeto **Kryos** —
  supervisão de refrigeração/SCADA) + a pasta `docs/research/` (ficou vazia). 4 linhas de
  `docs/09-mapa-telas-frontend.md` reescritas (SCADA/DeviceDetail/Kryos → operacional denso / Detalhe de
  Entidade). 6 citações históricas ao estudo **retificadas** (não apagadas). **D-DOCS-KRYOS**.
- **Docs-only:** nenhuma métrica de teste mudou (backend segue **766/766** do gate). Fontes canônicas de UI =
  `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, docs próprias. Backfill do Ω-GOV: **PR #175 / 361f2c1**.

## 2026-07-13 — Ω-INFRA-1 (rodada saneamento, PR4): containerização + healthcheck + provedor

- **Containerização:** `Dockerfile` multi-stage do backend (runtime `node:20-bookworm-slim` **não-root**, Prisma
  Client gerado, HEALTHCHECK na readiness); `frontend/Dockerfile` (Vite → **nginx** estático + proxy same-origin
  `/api`). CI (`docker` job) builda em todo PR e **publica no GHCR** (`erp-backend:<sha>`) em push na main via
  `GITHUB_TOKEN`.
- **Healthcheck real:** `GET /health` (liveness, estável) + `GET /health/ready` (ping Postgres+Redis, 200/503,
  sem vazar dado). Validado ao vivo no `docker-compose.prod.yml` (api+web+migrate ponta a ponta).
- **backend_tests 766 → 768** (+2 `health-routes.test.ts`). **PD-INFRA-1** escolhe o provedor (Fly.io/gru 1º,
  AWS 2º) para a junta de 5. Backfill do Ω-DOCS: **PR #176 / d0126d5**.

## 2026-07-13 — JUNTA-MAPAS: criação da Junta de Mapas (3 agentes) + KB geo

- **3 agentes novos** no molde da casa: `.claude/agents/planejador-mapas.md`, `dev-mapas.md`, `avaliador-mapas.md`
  — acionados em **cadeia** (planejador → dev → avaliador) em toda tarefa de mapa/geo, web ou Flutter. Total de
  agentes: 16 → **19**, sem colisão de nomes.
- **Base de conhecimento viva** `docs/maps/kb-mapas.md` **preenchida** com pesquisa real datada (2026-07-13):
  preços por SKU do Google Maps Platform (tabela oficial marcada 2026-07-10 UTC), regras de cache do ToS
  (`place_id` perene vs `lat/lng` ≤30 dias, termos 2025-05-01), matriz caso-de-uso do ERP → API → custo no
  piloto (≈US$0 no volume piloto; gargalo de custo em escala = Route Matrix), estado do `google_maps_flutter`
  (2.17.1) e `flutter_map` (8.3.0), limites OpenFreeMap (sem limite, público).
- **Registro:** `D-JUNTA-MAPAS` em `agent-orchestration/controle/decisoes.md`; ata `J-JUNTA-MAPAS.md`
  (agente-fabrica, planejador-mestre, critico-adversarial, inspetor-de-rotas — **4/4 FAVORÁVEL**).
- **Regra de ouro:** MapLibre GL + OpenFreeMap permanecem como **base de exibição web** (custo zero, junta Ω1);
  Google Maps Platform entra só onde agrega; **ativar SKU pago / trocar provedor geo = PD + junta de 5 unânime**.
- **Escopo docs/agentes-only:** nenhum código/teste de produto tocado (**contagem real de testes novos = 0**),
  **nenhuma chave/billing/SKU ativado**. Métricas de teste carregam o último valor oficial (**Ω-INFRA-1**:
  backend 768/768, Flutter 764/764, smoke web 44/44). `blocks_completed` **inalterado (49)** — governança/tooling
  não conta como bloco de feature entregue (mesmo critério de Ω-GOV/Ω-DOCS). `mvp_demo`/`mvp_vendavel`
  inalterados (nenhum escopo de produto movido). Teste de gatilho da cadeia: **pendente de sessão nova** (o
  roteador carrega agentes no início da sessão; ver evidência/análise estática na ata J-JUNTA-MAPAS).

## 2026-07-13 — google-maps-frontend (J-MAPAS-3/4): Google Maps no Mapa Operacional (a pedido do dono)

- **Google Maps (Web Components)** no Mapa Operacional: operador colorido pela paleta REAL de status, pins de
  chamado por prioridade, LEGENDA (8 itens) fiéis ao MapLibre (**J-MAPAS-3**, junta 3/3). Câmera **foca a cidade
  com mais técnicos** por **clustering geográfico** (haversine, custo ZERO, sem geocoding) — empate por proxy
  oeste-primeiro (divergência da regra literal "nome alfabético" documentada em **D-JMAPAS4**; versão fiel =
  Geocoding API/SKU pago → junta de 5) (**J-MAPAS-4** APROVADO).
- **Seed:** 4 técnicos demo na região de Curitiba (idempotente). Chave do Google **só** em `frontend/.env`
  gitignorado (nunca versionada; `.env.example` placeholder).
- **frontend_smoke 44 → 378** (contagem REAL; +16 testes de mapa; o 44/44 estava congelado no B-124). Backfill do
  Ω-INFRA-1: **PR #177 / f457d9f**.
