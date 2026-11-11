# B-SAN3-19b — acesso não permitido e textos do app em língua de negócio (resíduo do item 48; resíduo do item 47 no app)

- **Ramo:** `fix/mobile-acesso-nao-permitido-textos`
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executor:** `dev-19b-cl`, Claude Opus 5.5 (subagente, nível menor, declarado). O plano pedia Codex; exceção
  declarada (§C7 item 6 e 11(6)): Codex 1 sem cota semanal até 16/11, Codex 2 ocupado, API no limite do dia, Argon só
  como segundo revisor. A pré-revisão é de outro modelo.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-19b-v2.md` (autor `replano-B-SAN3-19b-api`, Claude
  Opus 5.5 pela API, topo declarado), com a **Emenda 1** (requisitos da crítica r2, `revisoes/crit-19b-r2-plano.json`).
- **Perguntas do dono (§9):** sem resposta ao começar; segue a recomendação (Pergunta 1 = A; Pergunta 2 abre
  `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`).
- **Nível:** junta completa (§5 do plano: o diff toca `lib/core/bootstrap/**`, o roteador dos gates e o componente do
  estado bloqueado; a junta prova por execução que nenhuma permissão mudou).
- **Pendências:** fecha `P-SAN3-19-PLACEHOLDER-CHAVE-CRUA`, `P-O6R11-TEXTOS-FORA-DE-D-T` e
  `P-MOBILE-FAXINA-TERMOS-TECNICOS`; apensa `P-CHK-SEED-DEMO-SUJO` e `P-MOBILE-TITULOS-SEM-ACENTO`; abre
  `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`.

## Escopo permitido (plano v2 §4 + Emenda 1, por conteúdo)

`mobile/flutter_app/lib/shared/ui/erp_components.dart` (a `assert` e `_kChaveTecnica` de `PermissionBlockedState`; o
rótulo do chip de `ApprovalDecisionCard`; o texto do `PolicyViolationBanner`); `lib/shared/ui/module_placeholder_screen.dart`
(`blockedMessage`, os literais dos dois ramos, sem o `SyncStatusBanner`; o gate intocado); `lib/app/router.dart` (só os
literais das 4 chamadas `ModulePlaceholderScreen(`); os literais `title:`/`message:` do `PermissionBlockedState` das 9
telas; `expense_report_detail_screen.dart`, `new_expense_report_screen.dart`, `expense_item_receipts_screen.dart`,
`expense_models.dart:329-330`, `expense_list_screen.dart:152`, os 2 `message:` de `expense_policy_evaluator.dart`;
`sync_engine.dart:54`, `field_location_service.dart:160`, `telemetry_sync_service.dart:141`, `api_error.dart:43-44`;
os 3 `displayName` de `bootstrap_session.dart` e `_tenantDisplayName` de `bootstrap_repository.dart`;
`mobile/flutter_app/README.md`; os 3 testes `bsan319b_*` e os literais de teste da §3.2 (mais
`bo6r11_sync_screen_despesa_e_saida_test.dart:162,172`); `agent-orchestration/controle/pendencias.md`;
`docs/revisoes/SAN3/PLANO_SAN3.md` (notas dos itens 47 e 48); `docs/revisoes/SAN3/B-SAN3-19b-dev.md`; este comando.

## Escopo proibido

Toda condição de permissão (`PermissionResolver`, `PermissionSet`, `hasPermission`, `requiredPermission:`, os `if`/`.has(`,
as listas `permissions:`, `enabledModules`/`requiredPermissions`, `lib/core/permissions/**`, `lib/core/auth/**`, o resto de
`lib/core/bootstrap/**`); `home_screen.dart`; `pubspec.*`, `android/**`, `ios/**`, `src/**` (o T9 só lê o `catalog.ts`),
`frontend/**`, `prisma/**`, `migrations/**`, `infra/**`, `.github/**`, `.env`, lockfiles e `Kpis/**` (KPI congelado,
§C7 item 8(5)).

## Validação

Em `mobile/flutter_app`: `flutter pub get` · `dart format --output=none --set-exit-if-changed` nos arquivos tocados (o
`format` do repositório inteiro falha no Flutter local 3.41.6 por `bsan313_minhas_os_escopo_test.dart`, anterior ao
bloco; o juiz é o CI, 3.47.5) · `flutter analyze` · `flutter test` dos 3 `bsan319b_*` · regressões da §3.2 do plano ·
`flutter test --reporter compact`. Na raiz: `git diff --check`. Mutações M1–M28 (sem M14, que o plano não define)
vermelhas e restauradas. Grep da trava do §5 do plano sobre o diff de `lib/`, com as exceções nomeadas (texto removido
e o resolvedor de nome local de `bootstrap_repository.dart`). CI do head concluído, com o resumo do job `flutter` lido no
log (`gh run view <run> --job <job> --log | grep -E 'Some tests failed|\+[0-9]+ -[0-9]+|All tests passed'`).
