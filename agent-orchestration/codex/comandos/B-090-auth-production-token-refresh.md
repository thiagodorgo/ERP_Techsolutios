# B-090 — Flutter: Auth Production Mode + Token Refresh

## Objetivo

Habilitar autenticacao real em producao via `--dart-define=ERP_AUTH_MODE=remote`, implementar refresh automatico de token em clientes Dio, exibir UI de sessao expirada, e conectar checklist e bootstrap ao modo remoto — preservando modo dev/local e todos os testes existentes.

## Restricoes

- sem commit, sem push, sem PR
- Nao alterar: backend, frontend React, Figma, migrations, pagamentos, fiscal, contabil, comissoes, mapa real, secrets, experiments/
- Payload nunca contem: Bearer token, senha, path privado absoluto, base64, segredo, log de token

## Arquivos produzidos/alterados

| Arquivo | Tipo |
|---------|------|
| `lib/core/config/app_config.dart` | novo |
| `lib/core/network/auth_interceptor.dart` | novo |
| `lib/core/network/http_client.dart` | modificado (+createAuthenticatedHttpClient) |
| `lib/core/auth/auth_notifier.dart` | modificado (auth mode, expired state) |
| `lib/features/auth/login_screen.dart` | modificado (+safeError UI) |
| `lib/features/checklists/data/checklist_repository.dart` | modificado (authenticated client) |
| `lib/core/bootstrap/bootstrap_repository.dart` | modificado (remote provider) |
| `test/features/b090_auth_production_token_refresh_test.dart` | novo (16 testes) |

## Decisoes tecnicas

### Seleção de modo auth

`const kIsRemoteAuth = String.fromEnvironment('ERP_AUTH_MODE', defaultValue: 'local') == 'remote'`

Resolve em compile-time — sem custo de runtime, sem condicional dinamica. Build de producao: `flutter run --dart-define=ERP_AUTH_MODE=remote`. Build dev: nenhuma flag necessaria.

### AuthRefreshInterceptor

Dois mecanismos anti-loop independentes:
1. `bool _refreshing` — flag de instancia. Se um refresh ja esta em andamento, requisicoes 401 concorrentes sao rejeitadas imediatamente (nao sao colocadas em fila).
2. `extra['_authRetry'] = true` — marca a requisicao de retry. Se o retry tambem receber 401, o interceptor ve o flag e propaga sem tentar novo refresh.

Skip automatico em `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout` para evitar ciclo recursivo.

Apos refresh bem-sucedido: atualiza `client.options.headers` (requisicoes futuras) E `err.requestOptions.headers` (o retry imediato).

### DioAuthRepository

Ja estava completo com `login`, `refresh`, `logout`, `restoreSession`, `clearSession`. O bloco B-090 apenas expoe via `authRepositoryProvider` quando `kIsRemoteAuth`. Nenhum novo metodo foi necessario.

### AuthStatus.expired

`AuthNotifier.tryRefresh()` falha → `clearSession()` + `state = AuthState(expired, safeError: '...')`. O router ja redirecionava `!isAuthenticated` para `/login` — `expired` nao esta em `isAuthenticated`, logo o redirect acontece automaticamente. `LoginScreen` exibe `safeError` como banner informativo.

### Bootstrap em modo remoto

`DioMobileBootstrapRepository` criava seu proprio Dio interno em `fetch()` com o token da sessao. Nao precisou de modificacao — apenas o provider foi atualizado para seleciona-lo. O bootstrap so e chamado apos login com token fresco, portanto nao precisa de interceptor de refresh.

### createAuthenticatedHttpClient

Factory que chama `createExpenseHttpClient(config)` e adiciona `AuthRefreshInterceptor`. Os callbacks `onRefresh` e `onClearSession` sao injetados pelo provider consumidor — o cliente HTTP nao conhece Riverpod.

## Validacao

```
flutter pub get:  OK
dart format .:    aplicado (0 mudancas residuais)
flutter analyze:  No issues found
flutter test:     229/229 passando (16 novos B-090, 0 regressoes)
git diff --check: limpo
```

## Como ativar modo remoto

```bash
# Emulador Android (10.0.2.2 = localhost)
flutter run --dart-define=ERP_AUTH_MODE=remote

# Dispositivo fisico / iOS
flutter run --dart-define=ERP_AUTH_MODE=remote \
            --dart-define=ERP_API_BASE_URL=http://192.168.x.x:3000
```

## Proximos passos sugeridos

- B-091: `SyncReplayService` com interceptor de refresh (requisicoes de sync tambem podem receber 401)
- B-092: `InventorySyncBatchApi` HTTP real seguindo o mesmo padrao de `DioChecklistRemoteApi`
- B-093: refresh token com expiracao real (Cognito / JWT RS256) e politica de rotacao
