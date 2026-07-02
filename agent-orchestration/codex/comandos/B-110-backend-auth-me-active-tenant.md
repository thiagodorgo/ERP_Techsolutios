# B-110 — Backend: /me, /me/tenants e /auth/active-tenant + permissions catalog

> Autor: Claude Code. Formaliza como bloco o trabalho de auth do backend feito fora do
> sistema de blocos (antes rotulado "PR-0.1"), continuando a numeração do Codex após B-109.
> Trilha compartilhada — não altera artefatos deixados pelo Codex.

## Objetivo

Expor os endpoints de sessão/identidade do ator autenticado e fixar a organização ativa,
mais os itens de catálogo de permissões necessários para o contexto multi-org do MVP.

## Contratos / Endpoints

- `GET /api/v1/me` — usuário autenticado (claims: `sub · email · tenant_id · tenant_role ·
  tenant_roles · permissions · scope`).
- `GET /api/v1/me/tenants` — organizações do usuário.
- `POST /api/v1/auth/active-tenant` — fixa a organização ativa da sessão.
- Envelope `{ data }`. **Versão do contrato:** `auth_me_active_tenant@2026-07-02.b110`.
- Tenant resolvido pelo **ator autenticado** (ignora `tenant_id` do cliente).
- Permissões canônicas conforme `RBAC_MATRIX.md`; catálogo em
  `src/modules/core-saas/permissions/catalog.ts`.

## Regras

- `/me` e `/me/tenants` exigem sessão válida; sem token → 401 seguro.
- `active-tenant` valida que o tenant pertence ao usuário; caso contrário rejeita.
- Sem exposição de segredo/token/PII em payload ou auditoria (allowlist).

## Integrações

- Base para seleção de organização no web (B-111) e bootstrap mobile.
- Core-SaaS service/store/adapters estendidos para servir tenants do usuário.

## Escopo permitido

- `src/app.ts`
- `src/modules/auth/**`
- `src/modules/core-saas/**`
- `src/modules/mobile/mobile.routes.ts`
- `tests/core-saas.test.ts`
- `agent-orchestration/**` (registro do bloco)

## Escopo proibido

- `frontend/**` · `mobile/**` · `prisma/**` · `migrations/**` · `infra/**` · `.env` ·
  lockfiles · arquivos **KPI**.

## Validações

```bash
npm run check
npm run lint
npm test            # node --test tests/core-saas.test.ts
npm run build
git diff --check
```

## Limites

- **Não** atualizar KPIs nesta PR (feature).
- Fora de escopo: Prisma/migrations reais, Cognito real, frontend.

## KPI (proposto, não publicado)

- Publicar só em `B-110K`, após avaliação humana + merge + gate, com PR #, merge commit e
  approved head reais.
