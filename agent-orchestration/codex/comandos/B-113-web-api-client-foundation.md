# B-113 — Web: fundação da camada de API (apiClient central)

> Autor: Claude Code. Primeiro bloco da Fase 2 (Web Gestor). Padroniza o consumo de
> `/api/v1` no console web para os blocos de tela seguintes (B-114→B-119).

## Objetivo

Robustecer o cliente central `frontend/src/services/api/client.ts` para ser a única porta de
saída HTTP do web: erro tipado seguro (`ApiError`) e unwrap de envelope `{ data }` (`apiData`).
Base para trocar mocks por API real nas telas. (Tenant efetivo vem do JWT via
`/auth/active-tenant`; `X-Tenant-Id` real fica fora deste bloco.)

## Contratos / Endpoints

- Consome `/api/v1/**` (envelope `{ data }`). Auth via `Authorization: Bearer` (sessão B-110).
- `X-Tenant-Id` só para resolver organização ativa (multi-org); tenant efetivo é do JWT.
- **Versão do contrato (consumo):** `web_api_client@2026-07-02.b113`.

## Regras

- 401 → tenta refresh 1x (já existente); falha → limpa sessão.
- `ApiError { status, safeMessage }` — mensagem segura, sem vazar corpo cru.
- `apiData<T>` desembrulha `{ data }`.
- Modo mock preservado (`VITE_USE_MOCKS`).

## Escopo permitido

- `frontend/src/services/api/**`
- `frontend/tests/**` (teste do cliente)
- `frontend/package.json` (incluir teste no `test:smoke`)
- `agent-orchestration/**`

## Escopo proibido

- Backend `src/**` · `mobile/**` · `prisma/**` · `migrations/**` · `.env` · lockfiles · KPI.

## Validações

```bash
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
git diff --check
```

## Limites

- Não refatorar todas as telas neste bloco (cada tela vem em B-114→B-119).
- KPI publicado uma vez ao final do B-120 (decisão do usuário 2026-07-02).

## KPI (proposto, não publicado)

- Consolidado no fim do B-120.
