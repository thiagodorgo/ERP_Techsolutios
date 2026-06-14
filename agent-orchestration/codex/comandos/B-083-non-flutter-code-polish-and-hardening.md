# B-083 - Polimento e hardening fora do Flutter

Data: 2026-06-12

## Escopo

- Backend Node.js/TypeScript
- Frontend React
- Testes automatizados
- Documentacao operacional aditiva

## Fora do escopo

- `mobile/flutter_app/**`
- Flutter
- migrations
- contratos publicos de API
- RBAC/auth estrutural
- Figma
- secrets
- commit, push ou PR

## Melhorias implementadas

- `NotificationRecipientResolver` passou a resolver destinatarios em uma unica passada:
  - preserva ordem original dos candidatos;
  - ignora usuarios inativos;
  - exclui o ator do evento;
  - deduplica por `userId`;
  - interrompe ao atingir o limite seguro de 20 destinatarios.
- `DispatchesTable` e `WorkOrdersTable` passaram a memoizar a configuracao de colunas para reduzir recriacao de arrays/funcoes de render em re-renderizacoes.
- Cards mobile de despachos e ordens de servico receberam `aria-label` explicito para melhorar acessibilidade sem alterar UX visual.

## Testes adicionados

- `tests/notifications.test.ts`:
  - cobre ordem, deduplicacao, exclusao do ator, exclusao de inativos e limite de 20 destinatarios.

## Validacoes

- Baseline antes das alteracoes:
  - `npm run check`: OK
  - `npm run lint`: OK
  - `npm test`: OK
  - `npm run build`: OK
  - `npm --prefix frontend run check`: OK
  - `npm --prefix frontend run build`: OK
- Validacoes focadas apos alteracoes:
  - `npm run check`: OK
  - `node --test --import tsx tests/notifications.test.ts`: OK
  - `npm --prefix frontend run check`: OK
- Validacoes finais:
  - `npm run check`: OK
  - `npm run lint`: OK
  - `npm test`: OK
  - `npm run build`: OK
  - `npm --prefix frontend run check`: OK
  - `npm --prefix frontend run build`: OK
  - `npm --prefix frontend run test:smoke`: OK
  - `git diff --check`: OK
  - `docker compose ps`: falhou porque o daemon Docker Desktop nao estava disponivel em `npipe:////./pipe/dockerDesktopLinuxEngine`
  - `npm run test:e2e`: nao executado porque Docker/PostgreSQL nao estavam disponiveis

## Confirmacoes

- `mobile/flutter_app/**` nao foi alterado neste bloco.
- Nao houve feature nova.
- Nao houve alteracao de contrato publico.
- Nao houve alteracao de migrations/schema.
- Nao houve alteracao de secrets.
- Nao houve commit, push ou PR.
