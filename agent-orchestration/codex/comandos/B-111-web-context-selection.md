# B-111 — Web: seleção de contexto / organização

> Autor: Claude Code. Formaliza como bloco o trabalho web de seleção de contexto
> (antes "PR-0.2"), continuando a numeração após B-110. Trilha compartilhada.

## Objetivo

Permitir ao usuário do console web escolher a organização ativa (contexto), consumindo os
endpoints de sessão do B-110 (`/me`, `/me/tenants`, `/auth/active-tenant`).

## Contratos / Endpoints

- Consome `GET /api/v1/me/tenants` e `POST /api/v1/auth/active-tenant` (contrato B-110).
- Contexto/organização ativa resolvido pela sessão (claims); UI apenas seleciona.
- **Versão do contrato (consumo):** `auth_me_active_tenant@2026-07-02.b110`.

## Regras

- Sem termo técnico na UI (rótulos de negócio conforme CLAUDE.md §3).
- Estados: loading · vazio · erro · sem permissão.
- Backend é a autoridade de autorização; a UI só molda/esconde.

## Integrações

- `frontend/src/modules/auth` (adapter/types) e `frontend/src/modules/context` (repository) +
  `ContextSelectionPage`.

## Escopo permitido

- `frontend/src/modules/auth/**`
- `frontend/src/modules/context/**`
- `frontend/src/pages/ContextSelectionPage.tsx`
- `agent-orchestration/**` (registro do bloco)

## Escopo proibido

- Backend `src/**` · `mobile/**` · `prisma/**` · `migrations/**` · `infra/**` · `.env` ·
  lockfiles · arquivos **KPI**.

## Validações

```bash
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
git diff --check
```

## Limites

- **Não** atualizar KPIs nesta PR (feature). KPI acumulado publica em bloco `K` único
  após B-111 e B-112 (decisão do usuário 2026-07-02).
- Fora de escopo: shell/navegação completa, demais telas web (Fase 2).

## KPI (proposto, não publicado)

- Publicação só no bloco `K` consolidado, com PR #, merge commit e approved head reais.
