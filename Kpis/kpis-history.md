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
