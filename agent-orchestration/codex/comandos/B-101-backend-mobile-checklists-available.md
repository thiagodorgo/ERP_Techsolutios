# B-101 — Backend Mobile Checklist Available Endpoint

## Objetivo

Fechar a lacuna documentada na B-100: garantir que o endpoint
`GET /api/v1/mobile/checklists/available` retorne, do backend real, os templates de
checklist disponiveis para o app mobile, em um contrato compativel com o parser
Flutter B-100 — respeitando tenant ativo, RBAC e isolamento por tenant.

## Branch

`feature/backend-mobile-checklists-available`

## Descoberta da investigacao

A B-100 documentou que o handler estava "ausente". **Isso era impreciso.** O handler
ja existia, registrado em `src/modules/checklists/checklist.routes.ts` (linha 96) —
nao em `src/modules/mobile/mobile.routes.ts`, que foi onde a B-100 procurou. O teste
`tests/mobile-backend-contracts.test.ts` ja exercitava a rota (status 200, `body.data`
array).

O problema real era de **contrato**: a rota usava o DTO compartilhado
`toChecklistTemplateDto`, que expoe `name` (e nao `title`), `version` numerico (e nao
`schema_version`) e `status: "published"` — enquanto o parser Flutter B-100 le `title`,
`schema_version` e filtra por `status == 'active'` (`activeTemplates`). Resultado:
templates publicados chegariam com titulo vazio e seriam ocultados pelo filtro.

## Escopo

### O que este comando faz

- Adiciona `toMobileChecklistTemplateDto` em `checklist.dto.ts` — DTO mobile separado
  que mapeia o template ao contrato Flutter B-100:
  - `title` (de `name`), `name` mantido por seguranca
  - `schema_version` = `v{version}`; `version` numerico mantido
  - `status` normalizado: `published` -> `active`
  - `tenant_id`, `code`/`category`/`work_order_type`/`linked_work_order_type` (de `type`)
  - `is_required`, `module`, `updated_at`, e `items` (de components, ordenados)
- Altera `ChecklistController.listAvailableMobileChecklists` para usar o DTO mobile e
  retornar o envelope `{ data, items, meta }` (`data` legado + `items` do contrato +
  `meta.count`/`source`/`generated_at`). Compativel com o parser Flutter
  (`data ?? items ?? checklists`).
- Mantem RBAC (`checklist_runs:read`/`create`) e tenant scoping (apenas templates
  publicados do tenant ativo, via `listAvailableTemplates`).
- Adiciona `tests/mobile-checklists-available.test.ts` (5 testes de contrato).

### O que este comando NAO faz

- NAO altera frontend web `frontend/**`.
- NAO altera o app Flutter funcional (`mobile/flutter_app/lib/**`) — apenas KPIs.
- NAO cria migrations (usa o fluxo de templates publicados existente).
- NAO implementa sync write de respostas de checklist.
- NAO implementa upload de evidencias, OS sync replay, GPS ou aprovacao.
- NAO altera `package.json` (fora do escopo) — ver limitacao de CI abaixo.
- NAO faz push nem cria PR.

## Arquivos alterados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/modules/checklists/checklist.dto.ts` | feat | `toMobileChecklistTemplateDto` + mapeamento de status |
| `src/modules/checklists/checklist.controller.ts` | feat | `listAvailableMobileChecklists` usa DTO mobile + envelope `{data,items,meta}` |
| `tests/mobile-checklists-available.test.ts` | test | 5 testes de contrato (novo arquivo) |
| `mobile/flutter_app/Kpis/*` | docs/kpis | snapshot B-101 (latest, history.json, history.md, app.js embutido) |
| `agent-orchestration/...`, `docs/...` | docs | command doc, log, status, gap-analysis |

## Contrato de resposta

`GET /api/v1/mobile/checklists/available` — 200:

```json
{
  "data": [ /* mesmos itens de items (envelope legado) */ ],
  "items": [
    {
      "id": "…",
      "tenant_id": "…",
      "code": "technical_evidence",
      "name": "Inspecao de Seguranca",
      "title": "Inspecao de Seguranca",
      "description": null,
      "version": 2,
      "schema_version": "v2",
      "status": "active",
      "is_required": false,
      "category": "technical_evidence",
      "work_order_type": "technical_evidence",
      "linked_work_order_type": "technical_evidence",
      "module": "tenant_checklist",
      "updated_at": "2026-06-15T00:00:00.000Z",
      "items": [
        { "id": "…", "label": "O local esta seguro?", "type": "observation", "required": true, "order": 0 }
      ]
    }
  ],
  "meta": { "source": "backend", "count": 1, "generated_at": "2026-06-15T00:00:00.000Z" }
}
```

Respostas de erro (padrao do backend):
- **401/ausencia de contexto** → `403 { error: { reason: "tenant_required" } }`
- **permissao insuficiente** → `403 { error: { reason: "permission_required" } }`
- **vazio** → `200 { data: [], items: [], meta: { count: 0 } }`
- **404** nao ocorre para a rota.

## Autorizacao e tenant

- Autenticacao igual aos demais endpoints mobile (`tenantContextMiddleware`).
- RBAC: `requireAnyChecklistPermission([checklist_runs:read, checklist_runs:create])`.
- Tenant ativo via contexto autenticado; `listAvailableTemplates` filtra por
  `actor.tenantId` (somente publicados). Nunca retorna templates de outro tenant.

## Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `npm test` (core-saas) | **15/15** |
| Testes de contrato mobile (`node --test`) | **45/45** (+5 de B-101) |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |
| `flutter analyze` | **No issues found** |
| `flutter test` (regressao) | **486/487** (1 instavel pre-existente, passa isolado) |

## Limitacao conhecida (CI)

`npm test` executa **apenas** `tests/core-saas.test.ts` (15). Os arquivos de teste de
contrato mobile (`mobile-backend-contracts`, `checklist-*` e o novo
`mobile-checklists-available`) ja eram **orfaos** do `npm test`/CI e rodam via
`node --test --import tsx tests/<arquivo>`. Como `package.json` esta fora do escopo
permitido da B-101, o wiring de CI fica para um bloco de infra (B-102).

## Commits gerados

1. `feat(mobile-api): add available checklist templates endpoint`
2. `test(mobile-api): cover checklist templates contract`
3. `docs: add B-101 backend checklist endpoint status` *(este)*
