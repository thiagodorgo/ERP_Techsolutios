# KPI Dashboard History

Este arquivo e o historico permanente do painel `Kpis/`. Todo bloco futuro deve atualizar:

- `Kpis/index.html`
- `Kpis/app.js`
- `Kpis/kpis-history.md`

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
