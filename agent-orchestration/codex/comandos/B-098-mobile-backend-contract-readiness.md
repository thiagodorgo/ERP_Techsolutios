# B-098 - Mobile Backend Contract Readiness

## Objetivo

Preparar e documentar o contrato backend minimo para o MVP mobile, mantendo o trabalho Flutter em outro agente isolado.

## Restricoes aplicadas

- Nao alterar `mobile/flutter_app/**`.
- Nao executar comandos Flutter.
- Usar worktree isolado `ERP_Techsolutios-codex-b098`.
- Nao fazer push, merge ou PR.
- Nao alterar secrets, `.env`, Docker/infra ou Figma.

## Escopo executado

- Inventario de endpoints backend relevantes para mobile.
- Implementacao de `GET /api/v1/mobile/bootstrap` minimo.
- 404 JSON estavel para rotas `/api/v1` nao mapeadas.
- Testes de contrato mobile/backend e divergencia de permissao.
- Documentacao consolidada em `docs/mobile-backend-contract-readiness.md`.

## Fora do escopo

- Sync completo de OS, checklist ou inventario.
- Upload generico de evidencias de OS.
- Migracoes Prisma.
- Alteracoes Flutter/React.

## Validacoes esperadas

- `npm run check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm --prefix frontend run check`
- `npm --prefix frontend run test:smoke`
- `npm --prefix frontend run build`
- `npx prisma validate`
- `git diff --check`
