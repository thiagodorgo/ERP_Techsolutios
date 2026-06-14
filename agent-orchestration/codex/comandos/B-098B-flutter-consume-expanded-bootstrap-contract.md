# B-098B — Flutter Consume Expanded Mobile Bootstrap Contract

## Objetivo

Adaptar o app Flutter para consumir o contrato expandido de
`GET /api/v1/mobile/bootstrap` introduzido na PR #81 (B-098A), sem quebrar
o contrato mínimo da B-098.

## Branch

`feature/flutter-consume-expanded-bootstrap-contract`

## Escopo

### O que este comando faz

- Adiciona modelos para os novos blocos do contrato expandido:
  `CapabilityStatus`, `FeatureFlag`, `SyncPolicy`, `EvidencePolicy`,
  `ExpandedMobilePolicy`, `BootstrapContractMeta`, `SyncCursors`.
- Estende `BootstrapSession` com campos opcionais para os blocos expandidos,
  com defaults que preservam compatibilidade com sessões em cache.
- Adiciona helpers `isFeatureEnabled(flagKey)` e `featureStatus(flagKey)`.
- Atualiza `DioMobileBootstrapRepository` para detectar o formato da resposta
  (minimal B-098 vs expanded B-098A) e delegar ao parser correto.
- Expõe `bootstrapSessionFromJson(body)` como função de biblioteca para que
  testes possam exercitar o parsing diretamente, sem HTTP.
- Adiciona lookup `_kNavigationModules` para mapear chaves de módulo
  (ex: `work_orders`) para title/route/requiredPermissions.
- 42 testes unitários cobrindo todos os caminhos de parsing e degradação.

### O que NÃO faz

- NÃO altera backend (`src/`).
- NÃO altera frontend web (`frontend/`).
- NÃO conecta Work Orders reais.
- NÃO conecta checklist remoto.
- NÃO altera contratos de API.
- NÃO commita secrets ou credenciais reais.

## Arquivos

### Novos
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_expanded_session.dart`
- `mobile/flutter_app/test/features/b098b_expanded_bootstrap_test.dart`

### Modificados
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_session.dart` — novos campos opcionais + helpers
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_repository.dart` — parser dual-format + lookup de módulos

## Decisões de Arquitetura

### Detecção de formato por presença de chave
A resposta B-098A é envolvida em `{"data": {...}}`. Dentro do objeto
desembrulhado, a presença da chave `feature_flags` identifica o contrato
expandido. Sem essa chave → parser minimal (backward compat).

### Campos expandidos não são cacheados
`BootstrapSessionCodec` não serializa `featureFlags`, `expandedPolicy`,
`contractMeta` ou `syncCursors`. Sessões restauradas do cache têm defaults
neutros e funcionam sem esses campos. Os blocos expandidos são reconstruídos
na próxima chamada HTTP.

### Lookup local de módulos
O contrato expandido envia `modules: [{key, enabled}]` sem title/route.
O mapa `_kNavigationModules` provê os metadados de UI localmente. Módulos
de plataforma (`mobile`) ou desconhecidos são ignorados silenciosamente.

### SyncCursors preparado para B-099
O bloco `sync: {workOrdersCursor, ...}` é parseado mas não consumido nesta
PR. B-099 (Work Orders pull) usará `syncCursors.workOrdersCursor` para
pull incremental.

## Critérios de Aceite

- [x] `BootstrapSession` aceita contrato mínimo B-098 sem alteração
- [x] `BootstrapSession` aceita contrato expandido B-098A
- [x] Campos opcionais ausentes não causam crash
- [x] `isFeatureEnabled` e `featureStatus` funcionam corretamente
- [x] `SyncCursors` parseados para uso futuro em B-099
- [x] `devBootstrapSession` continua compilando como `const` sem alterações
- [x] `flutter analyze`: No issues found
- [x] `flutter test`: todos passando

## Validações

```bash
cd mobile/flutter_app
flutter pub get
flutter analyze
flutter test

cd ../..
npm test
npm run lint
npm run build
```
