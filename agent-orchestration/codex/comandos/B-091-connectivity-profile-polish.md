# B-091 — Connectivity Real + Profile Polish

**Data:** 2026-06-12
**Status:** Concluido
**Testes:** 15/15 (258/258 total)

## Objetivo

Conectar a camada de rede real via `connectivity_plus` ao `NetworkStatusNotifier` existente,
mantendo o design desacoplado e testavel; e polir a tela `/profile` com todas as
informacoes de sessao relevantes sem expor tokens.

## Parte A — ConnectivityBridge

### Problema

`NetworkStatusNotifier` era um Notifier pure-Dart sem feed de evento real.
A app ficava em `NetworkStatus.online` (default) para sempre.

### Solucao

Adicionar `connectivity_plus: ^6.0.0` e criar uma camada de abstracao:

```
ConnectivitySource (abstract)
  ├── ConnectivityPlusSource   ← producao, wraps connectivity_plus
  └── ManualConnectivitySource ← testes, driven by .emit()
```

`connectivityBridgeProvider` (Provider<void>) assina o stream do source e
aciona `networkStatusProvider.notifier.setStatus()`. Montado uma vez no root via
`ref.watch(connectivityBridgeProvider)` em `ErpMobileApp.build()`.

Em testes: override apenas `connectivitySourceProvider` com `_FakeConnectivitySource`.
O plugin nativo nunca e instanciado.

### Arquivos

- `lib/core/network/connectivity_bridge.dart` (NOVO)
- `pubspec.yaml` (connectivity_plus adicionado)
- `lib/app/app.dart` (bridge montado no root)

## Parte B — ProfileScreen

### Conteudo da tela

| Secao | Dado | Fonte |
|---|---|---|
| Avatar | Iniciais do email | `session.user.email` |
| Tenant | displayName | `session.activeTenant` |
| Funcao | tenantRole + roles adicionais | `session.user` |
| Modo auth | 'Local' ou 'Remoto' | `kIsRemoteAuth` |
| Status sessao | authenticated/offlineCached/expired | `authState.status` |
| Token expira | Tempo formatado (sem valor) | `authState.session.tokens.expiresAt` |
| Conectividade | Online/Offline/Verificando | `networkStatusProvider` |
| Ultimo sync | Hora formatada ou erro | `autoSyncCoordinatorProvider` |
| Permissoes | Lista | `session.permissions` |
| Modulos | Titulos habilitados | `session.enabledModules` |
| Tenants | displayNames | `session.availableTenants` |
| Sair | FilledButton cor error | `authStateProvider.notifier.logout()` |

Estado `AuthStatus.expired` renderiza `_ExpiredSessionView` — sem listagem de campos
de sessao, apenas aviso + botao "Fazer login novamente".

### Arquivos

- `lib/shared/ui/profile_screen.dart` (NOVO)

## Testes

### Fakes criadas

| Classe | Proposito |
|---|---|
| `_FakeConnectivitySource` | Controle manual do stream de conectividade |
| `_FixedNetworkStatusNotifier` | Override de `build()` para status fixo em widget tests |
| `_FakeAuthNotifier extends AuthNotifier` | Override de `build()` + `logout()` sem FlutterSecureStorage |
| `_NullQueue` | SyncQueueRepository vazio (evita Drift em testes de profile) |
| `_NoopSyncReplayService / Checklist` | Replay noop (evita DioExpenseSyncBatchApi) |
| `_CountingSync` | Contador de chamadas para validar auto sync |

### Grupos

```
ManualConnectivitySource (3 testes)
  t01 — fetchCurrent retorna status inicial
  t02 — emit atualiza stream e fetchCurrent
  t03 — multiplos emits entregues em ordem

connectivityBridgeProvider (3 testes)
  t04 — connectivitySourceProvider e overrideavel
  t05 — bridge propaga evento de stream para networkStatusProvider
  t06 — auto sync dispara ao transicionar offline→online via bridge

ProfileScreen (9 testes)
  t07 — mostra email e tenantRole do devBootstrapSession
  t08 — mostra tenant displayName
  t09 — mostra modo auth 'Local (desenvolvimento)'
  t10 — mostra 'Online'
  t11 — mostra 'Offline'
  t12 — nao exibe valor do access token
  t13 — tap em 'Sair' aciona logout no notifier
  t14 — sessao expirada mostra _ExpiredSessionView
  t15 — avatar exibe iniciais corretas ('TE' para 'tecnico@tenant.demo')
```

## Decisoes tecnicas

**Plugin desacoplado por design**: manter `NetworkStatusNotifier` pure-Dart e
introduzir `ConnectivitySource` como interface significa que qualquer fonte
(plugin, WebSocket, polling) pode acionar o notifier sem mudar o contrato.

**_FixedNetworkStatusNotifier**: `Notifier.state` e inacessivel antes de `build()`.
Subclasse que override `build()` e a unica forma correta de inicializar o estado
em `overrideWith()` para testes de widget.

**_FakeAuthNotifier extends AuthNotifier**: `AsyncNotifierProvider<AuthNotifier, T>.overrideWith`
exige uma factory que retorne `AuthNotifier` (nao `AsyncNotifier<T>`). Extender
a classe concreta garante compatibilidade de tipo sem necessidade de providers
intermediarios.

## Constraints mantidos

- sem commit, sem push, sem PR
- sem alteracoes em backend, frontend React, migrations, pagamentos, fiscal, comissoes
- `experiments/` nao tocado
