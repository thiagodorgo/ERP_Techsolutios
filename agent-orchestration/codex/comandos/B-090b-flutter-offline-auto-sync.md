# B-090b — Flutter: Offline/Online UX + Auto Sync

## Objetivo

Adicionar camada de conectividade pura Dart, indicadores visuais de offline/online nas telas principais e sincronizacao automatica ao reconectar, sem dependencia de plugin nativo.

## Arquivos criados

### `lib/core/network/connectivity_repository.dart`

```dart
enum NetworkStatus { online, offline, checking, unknown }

class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  @override
  NetworkStatus build() => NetworkStatus.online; // otimista

  void setStatus(NetworkStatus status) => state = status;
  void setOnline()   => state = NetworkStatus.online;
  void setOffline()  => state = NetworkStatus.offline;
  void setChecking() => state = NetworkStatus.checking;
}

final networkStatusProvider =
    NotifierProvider<NetworkStatusNotifier, NetworkStatus>(NetworkStatusNotifier.new);
```

Integracao futura com `connectivity_plus`: basta criar um listener do stream que chama `setStatus()`.

### `lib/core/sync/auto_sync_coordinator.dart`

```dart
class AutoSyncState {
  const AutoSyncState({this.isRunning = false, this.lastSyncAt, this.lastSafeError});
  final bool isRunning;
  final DateTime? lastSyncAt;
  final String? lastSafeError; // nunca contem token
  bool get hasError => lastSafeError != null;
  AutoSyncState copyWith({bool? isRunning, DateTime? lastSyncAt,
    String? lastSafeError, bool clearError = false}) { ... }
}

class AutoSyncCoordinator extends Notifier<AutoSyncState> {
  bool _running = false;

  @override
  AutoSyncState build() {
    ref.listen<NetworkStatus>(networkStatusProvider, (prev, next) {
      if (prev == NetworkStatus.offline && next == NetworkStatus.online) {
        _triggerSync(); // fire-and-forget
      }
    });
    return const AutoSyncState();
  }

  Future<void> triggerManual() => _triggerSync();

  Future<void> _triggerSync() async {
    if (_running) return; // previne concorrencia
    _running = true;
    state = state.copyWith(isRunning: true, clearError: true);
    try {
      final session = ref.read(bootstrapSessionProvider).asData?.value;
      if (session == null) { state = state.copyWith(isRunning: false); return; }
      final tenantId = session.activeTenant.tenantId;
      await ref.read(syncReplayServiceProvider).replayTenant(tenantId);
      await ref.read(checklistSyncReplayServiceProvider).replayTenant(tenantId);
      state = state.copyWith(isRunning: false, lastSyncAt: DateTime.now().toUtc(), clearError: true);
    } catch (e) {
      state = state.copyWith(isRunning: false, lastSafeError: _safeMessage(e));
    } finally {
      _running = false;
    }
  }
}

final autoSyncCoordinatorProvider =
    NotifierProvider<AutoSyncCoordinator, AutoSyncState>(AutoSyncCoordinator.new);
```

### `lib/shared/ui/erp_components.dart` — `NetworkStatusBanner`

```dart
class NetworkStatusBanner extends StatelessWidget {
  const NetworkStatusBanner({required this.status, super.key});
  final NetworkStatus status;

  @override
  Widget build(BuildContext context) {
    if (status == NetworkStatus.online || status == NetworkStatus.unknown) {
      return const SizedBox.shrink();
    }
    final (Color color, IconData icon, String message) = switch (status) {
      NetworkStatus.offline  => (ErpMobileTheme.danger,  Icons.wifi_off_outlined, 'Modo offline — ...'),
      NetworkStatus.checking => (ErpMobileTheme.warning, Icons.sync_outlined,     'Verificando conexao...'),
      _ => (Colors.transparent, Icons.wifi, ''),
    };
    return Container(/* colored banner com icon + text */);
  }
}
```

## Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `lib/shared/ui/home_screen.dart` | `NetworkStatusBanner(status: ref.watch(networkStatusProvider))` apos greeting |
| `lib/shared/ui/sync_screen.dart` | Banner + card auto sync + botao "Sincronizar tudo" |
| `lib/core/diagnostics/diagnostics_screen.dart` | Card "Conectividade" com `networkStatus.name` |

## Testes — `test/features/b090b_offline_auto_sync_test.dart`

14 testes em 4 grupos:

| Grupo | Testes |
|---|---|
| `NetworkStatusNotifier` (3) | default online; setOffline/setOnline; setStatus cobre todos valores |
| `NetworkStatusBanner widget` (3) | invisible em online; msg offline + icon; msg checking + icon |
| `AutoSyncCoordinator` (7) | idle inicial; offline→online dispara sync; concorrencia bloqueada; manual trigger; falha armazena safeError; sem sessao skipa; online→online nao dispara |
| `Safety` (1) | AutoSyncState nao contem bearer/token/eyj |

### Pattern critico: aguardar session antes do sync

```dart
// Em testes de AutoSyncCoordinator, o bootstrapSessionProvider e FutureProvider.
// ref.read(...).asData?.value retorna null ate o future resolver.
// Sempre await antes de disparar sync:
await container.read(bootstrapSessionProvider.future);
container.read(autoSyncCoordinatorProvider);
// ... trigger ...
await Future.delayed(Duration.zero); // drena chain async do _triggerSync
await Future.delayed(Duration.zero);
```

### Pattern: ListView lazy + scrollUntilVisible

Quando o widget esperado esta abaixo do viewport do teste (600px), `find.text()` nao encontra porque o ListView nao constroi itens fora da tela. Usar:

```dart
await tester.scrollUntilVisible(
  find.text('texto esperado'),
  200.0,
);
```

## Resultado

- 243/243 testes passando (14 novos B-090b + 1 expense_diagnostics)
- `dart format .`: aplicado
- `flutter analyze`: No issues found
- sem commit, push ou PR
