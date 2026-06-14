# B-081 — Flutter: autenticacao mobile com secure storage e boundary real

**Data:** 2026-06-11
**Status:** Concluido
**Bloco:** Mobile Flutter

## Objetivo

Implementar a fundacao de autenticacao mobile no Flutter com secure storage, sessao local segura
e boundary real para bootstrap. O app passa a ter login real, sessao persistida de forma segura,
guard de rota e perfil com dados seguros da sessao.

## Arquivos criados

| Arquivo | Descricao |
|---|---|
| `lib/features/auth/auth_models.dart` | `AuthStatus`, `AuthTokens`, `AuthUser`, `AuthSession`, `AuthState` |
| `lib/core/auth/auth_token_storage.dart` | `AuthTokenStorage` interface + `SecureAuthTokenStorage` + `InMemoryAuthTokenStorage` |
| `lib/core/auth/auth_repository.dart` | `AuthRepository` + `LocalDevAuthRepository` + `DioAuthRepository` |
| `lib/core/auth/auth_notifier.dart` | `AuthNotifier`, `RouterNotifier`, providers Riverpod |
| `lib/core/bootstrap/bootstrap_codec.dart` | `BootstrapSessionCodec.encode/decode` |
| `test/core/auth/auth_repository_test.dart` | 11 testes de auth |

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `lib/core/bootstrap/bootstrap_repository.dart` | Interface `MobileBootstrapRepository` + `LocalDevBootstrapRepository` + `DioMobileBootstrapRepository` |
| `lib/app/router.dart` | `appRouterProvider` com auth guard + `appRouter` global (testes) |
| `lib/app/app.dart` | `ConsumerWidget`, consome `appRouterProvider` |
| `lib/features/auth/login_screen.dart` | Wired a `AuthNotifier`, safeError, disabled loading |
| `lib/shared/ui/profile_screen.dart` | Exibe metadata segura da sessao, logout real |
| `lib/core/network/api_contracts.dart` | `mobileBootstrap = '/api/v1/mobile/bootstrap'` |
| `test/features/expenses/expense_local_first_test.dart` | Override `bootstrapSessionProvider` |
| `test/features/expenses/expense_diagnostics_test.dart` | Override `bootstrapSessionProvider` |

## Restricoes de seguranca

- Armazena: access token, refresh token, expiry, safe user JSON (sub, email, tenantId, tenantRole, tenantRoles, permissions, scope)
- Nunca armazena: senha, payload bruto sensivel, path privado, secrets, logs de token
- `safeMessage` de `ApiError` nunca contem Bearer, token, path ou excecao bruta
- `ProfileScreen` nunca exibe token ou path completo
- `LoginScreen` exibe apenas `safeMessage` tipado

## Resultados

```
flutter test: 69/69 passando
flutter analyze: No issues found
dart format: OK
git diff --check: OK
```

## Sem commit, push ou PR
