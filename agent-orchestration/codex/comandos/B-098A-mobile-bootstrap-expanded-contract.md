# B-098A - Mobile Bootstrap Expanded Contract

## Objetivo

Expandir `GET /api/v1/mobile/bootstrap` para entregar contrato cacheavel ao Flutter, sem implementar sync de acoes.

## Base

- Base obrigatoria: `main` apos merge do PR #79.
- Branch: `feature/mobile-bootstrap-expanded-contract`.

## Escopo permitido

- Expandir `src/modules/mobile`.
- Adicionar `feature_flags`, `mobile_policy`, metadados de cache/TTL, catalogos versionados e informacoes de versao do app mobile.
- Atualizar testes focados no bootstrap.
- Atualizar documentacao de API/mobile/sync.
- Registrar execucao em `agent-orchestration`.

## Fora do escopo

- Flutter e comandos Flutter.
- Figma.
- Secrets, `.env`, migrations e infra.
- `POST /api/v1/mobile/sync/work-order-actions`, reservado para B-098B.

## Validacoes esperadas

- `npm run check`
- `npm run lint`
- `npm test`
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`
- `npm run build`
- `npm --prefix frontend run check`
- `npm --prefix frontend run test:smoke`
- `npm --prefix frontend run build`
- `npx prisma validate`
- `git diff --check`
