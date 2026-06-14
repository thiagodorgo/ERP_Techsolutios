# B-077 - Flutter Mobile Operacional Local-First

## Objetivo

Transformar o app existente em `mobile/flutter_app` em uma base Flutter operacional local-first, com Prestação de Contas/Gestao de Despesas como primeiro fluxo completo e estrutura pronta para OS/campo.

## Regras

- Nao alterar backend, migrations, APIs, frontend React, Figma, pagamentos, fiscal, contabil, comissoes ou mapa real.
- Nao criar PR.
- Nao fazer commit ou push.
- Nao apagar `experiments/`.
- Nao mexer em arquivos nao relacionados.
- Se endpoint ainda nao estiver conectado, usar repository/mock estruturado compativel com contrato futuro.
- Preservar tenant, permissoes, claims e isolamento multi-tenant.
- Flutter molda UX e bloqueios visuais; backend continua sendo autoridade final.

## Entregas

- Tema Flutter ERP.
- App shell autenticado e navegavel.
- Bootstrap provider/repository compativel com `GET /api/v1/mobile/bootstrap`.
- Componentes compartilhados: tenant context, sync banner, status chip, blocked/empty/error/offline states, policy violation banner, Prestação de Contas card e approval placeholder.
- Fluxa Prestação de Contas minimo: lista, nova Prestação de Contas, detalhe, novo item, totais, adiantamento, politica local, submit/sync e status.
- Fila local minima com `client_action_id`.
- Telas reais de preparacao para OS, mapa/localizacao, estoque e aprovacoes.

## Rotas

- `/login`
- `/`
- `/profile`
- `/diagnostics`
- `/sync`
- `/expenses`
- `/expenses/new`
- `/expenses/:reportId`
- `/expenses/:reportId/items/new`
- `/expenses/:reportId/submit`
- `/work-orders`
- `/field-map`
- `/inventory`
- `/approvals`

## Contratos Respeitados

- `GET /api/v1/expense-policies`
- `GET /api/v1/expense-categories`
- `GET /api/v1/expense-reports`
- `POST /api/v1/expense-reports`
- `GET /api/v1/expense-reports/:reportId`
- `PATCH /api/v1/expense-reports/:reportId`
- `POST /api/v1/expense-reports/:reportId/items`
- `POST /api/v1/expense-reports/:reportId/submit`
- `POST /api/v1/mobile/sync/expense-actions`

## Sync Actions

- `expense_report.create`
- `expense_item.create`
- `expense_report.submit`

## Validacoes

- `flutter pub get`
- `dart format .`
- `flutter analyze`
- `flutter test`
- `git diff --check`

## Retorno Esperado

- Resumo implementado.
- Telas Flutter reais criadas/alteradas.
- Rotas finais.
- Endpoints/contratos usados.
- Validacoes executadas.
- Lacunas restantes.
- Confirmacao de que nao houve commit, push ou PR.
