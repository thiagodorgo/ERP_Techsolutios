# B-098 — Flutter Mobile Real Auth and Bootstrap

## Objetivo

Ativar autenticação real controlada e bootstrap completo no app Flutter, sem quebrar o modo dev nem conectar módulos remotos que ainda não estão prontos.

## Branch

`feature/flutter-real-auth-bootstrap`

## Escopo

### O que este comando faz
- Adiciona `fetchForTenant(session, tenantId)` à interface `MobileBootstrapRepository` e implementações
- Cria `BootstrapNotifier` com `retry()`, `switchTenant()`, `pendingTenantSelection`
- Mantém `bootstrapSessionProvider` (FutureProvider) intocado para backward-compat com 30+ testes existentes
- Adiciona `bootstrapNotifierProvider` (AsyncNotifierProvider) separado para retry/switch
- Cria `TenantSelectorScreen` para fluxo multi-tenant
- Atualiza `HomeScreen` para usar `bootstrapNotifierProvider` com tratamento de erro
- Atualiza `router.dart` com rota `/tenant-select` e redirect de tenant pendente
- 30 novos testes cobrindo todos os caminhos críticos

### O que NÃO faz
- NÃO altera backend (nenhum arquivo em `src/`)
- NÃO altera frontend web React (nenhum arquivo em `frontend/`)
- NÃO conecta Work Orders reais
- NÃO remove modo dev
- NÃO usa credenciais reais em código
- NÃO commita secrets

## Arquivos Modificados

### Novos
- `mobile/flutter_app/lib/features/auth/tenant_selector_screen.dart`
- `mobile/flutter_app/test/features/b098_real_auth_bootstrap_test.dart`

### Modificados
- `mobile/flutter_app/lib/core/bootstrap/bootstrap_repository.dart` — fetchForTenant, BootstrapNotifier, bootstrapNotifierProvider
- `mobile/flutter_app/lib/app/router.dart` — /tenant-select route, redirect pendingTenantSelection
- `mobile/flutter_app/lib/core/auth/auth_notifier.dart` — wildcard fix Dart 3.11.4
- `mobile/flutter_app/lib/shared/ui/home_screen.dart` — bootstrapNotifierProvider, _BootstrapErrorView

## Decisões de Arquitetura

### Dois providers em paralelo
`bootstrapSessionProvider` (FutureProvider) mantido intacto para backward-compat.
`bootstrapNotifierProvider` (AsyncNotifierProvider) adicionado para retry/switchTenant.

### Prevenção de redirect loop
Flag `_tenantWasSelected` em `BootstrapNotifier`. Após `switchTenant()`, `pendingTenantSelection` retorna `false` permanentemente.

### Tokens fora do SQLite
`SecureAuthTokenStorage` usa `FlutterSecureStorage`, não Drift.

### Retry automático do Riverpod 3.x
`ProviderContainer.defaultRetry` ativa retry exponencial para Exceptions. Em testes de estado de erro, `ProviderScope(retry: (_, _) => null)` desativa o retry para que `AsyncError` seja imediato.

### DioMobileBootstrapRepository não injetável
Cria seu próprio `Dio` internamente. Testes de Group 2 cobrem apenas cache/restore (sem HTTP real).

## Critérios de Aceite

- [x] `kIsRemoteAuth` controla login real via `--dart-define=ERP_AUTH_MODE=remote`
- [x] Modo dev continua funcional sem flag
- [x] Bootstrap real popula tenant, permissões, módulos, categorias
- [x] Multi-tenant tem caminho claro: `TenantSelectorScreen`
- [x] Falha de bootstrap mostra `_BootstrapErrorView` com retry
- [x] Tokens em `FlutterSecureStorage`, não SQLite
- [x] `flutter analyze`: No issues found
- [x] `flutter test`: 352/352 passando
- [x] `npm test`: 15/15 passando
- [x] `npm run lint`: sem erros
- [x] `npm run build`: sem erros

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
