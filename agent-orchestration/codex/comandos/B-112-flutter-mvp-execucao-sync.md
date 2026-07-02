# B-112 — Flutter MVP: telas 1.3–1.5 + execução → conclusão → localização → sync

> Autor: Claude Code. Formaliza como bloco o MVP mobile feito fora do sistema de blocos
> (antes "PR-1.3 a 1.12"), continuando a numeração após B-111. Trilha compartilhada.

## Objetivo

Fechar o MVP mobile de campo (guincho + prestador): banner de aprovações, badges de OS,
check-in, stepper de execução, checklists de coleta/entrega com assinatura, fluxo prestador
com estoque do técnico, conclusão/comissão, localização LGPD e fila de sync com conflito manual.

## Contratos / Endpoints (consumidos / propostos)

- `/mobile/sync/work-order-actions`, `/checklists/:id/render` + runs/markers/attachments/complete,
  `/mobile/technician/stock`, `/mobile/work-orders/:id/materials`, `/mobile/field-locations`,
  `/mobile/sync/*` (3 canais). Idempotência: `tenant + usuário + client_action_id`.
- Persistência local (Drift) schema v6 → **v9** (service_type, checklist run kind, materiais).
  Conflitos com resolução manual (Minha versão / Versão do gestor).

## Regras

- Sem termo técnico na UI; estados loading/empty/error/sem-permissão + offline/sync.
- LGPD: localização só manual, sem background tracking.
- Payload/auditoria sanitizados (sem token/path/base64/tenant externo).

## Integrações

- Work orders, checklists (coleta/entrega + comparação), prestador (materiais),
  evidências, localização, fila de sync.

## Escopo permitido

- `mobile/flutter_app/lib/**`
- `mobile/flutter_app/test/**`
- `agent-orchestration/**` (registro do bloco)

## Escopo proibido

- Backend `src/**` · `frontend/**` · `prisma/**` · `migrations/**` · `infra/**` · `.env` ·
  lockfiles · `pubspec.*` (sem novas deps nesta rodada) · arquivos **KPI**.

## Validações

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test --reporter compact   # suite completa (regressoes + b113..b122)
cd ../..
git diff --check
```

## Limites

- **Não** atualizar KPIs nesta PR (feature). KPI acumulado publica em bloco `K` único
  após B-111 e B-112 (decisão do usuário 2026-07-02).
- Sem novas dependências (`pubspec` fora de escopo nesta rodada).

## KPI (proposto, não publicado)

- Publicação só no bloco `K` consolidado, com PR #, merge commit e approved head reais.
