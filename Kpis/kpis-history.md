# KPI Dashboard History

Este arquivo e o historico permanente do painel `Kpis/`. Todo bloco futuro deve atualizar:

- `Kpis/index.html`
- `Kpis/app.js`
- `Kpis/kpis-history.md`

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
