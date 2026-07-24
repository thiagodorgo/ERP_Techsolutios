import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/auth_models.dart';
import '../config/app_config.dart';
import '../network/http_client.dart';
import '../telemetry/telemetry_capture_service.dart';
import '../telemetry/telemetry_event.dart';
import '../telemetry/telemetry_providers.dart';
import 'auth_repository.dart';
import 'auth_token_storage.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final authTokenStorageProvider = Provider<AuthTokenStorage>((ref) {
  return const SecureAuthTokenStorage(FlutterSecureStorage());
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storage = ref.watch(authTokenStorageProvider);
  if (kIsRemoteAuth) {
    return DioAuthRepository(
      client: createExpenseHttpClient(const ApiConfig()),
      storage: storage,
    );
  }
  return LocalDevAuthRepository(storage: storage);
});

final authStateProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final repo = ref.watch(authRepositoryProvider);
    final restored = await repo.restoreSession();

    if (restored == null) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }

    if (restored.isExpired) {
      try {
        final refreshed = await repo.refresh();
        return AuthState(status: AuthStatus.authenticated, session: refreshed);
      } catch (_) {
        await repo.clearSession();
        return const AuthState(
          status: AuthStatus.expired,
          safeError: 'Sua sessao expirou. Faca login novamente.',
        );
      }
    }

    return AuthState(status: AuthStatus.authenticated, session: restored);
  }

  Future<void> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(authRepositoryProvider);
      final session = await repo.login(
        email: email,
        password: password,
        tenantId: tenantId,
      );
      state = AsyncValue.data(
        AuthState(status: AuthStatus.authenticated, session: session),
      );
      // Ω4C PR-13 — hook de ciclo: login → APP_CONNECT (de-dup por estado no
      // serviço). Best-effort: telemetria nunca derruba o login.
      _recordTelemetry((service) {
        return service.recordAppConnect(tenantId: session.user.tenantId);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logout() async {
    // Ω4C PR-13 — hook de ciclo: logout → APP_DISCONNECT (antes de limpar a
    // sessao, para ainda conhecer o tenant). Best-effort.
    final tenantId = state.asData?.value.session?.user.tenantId;
    if (tenantId != null && tenantId.isNotEmpty) {
      _recordTelemetry(
        (service) => service.recordAppDisconnect(tenantId: tenantId),
      );
    }
    final repo = ref.read(authRepositoryProvider);
    await repo.logout();
    state = const AsyncValue.data(
      AuthState(status: AuthStatus.unauthenticated),
    );
  }

  void _recordTelemetry(
    Future<TelemetryEvent?> Function(TelemetryCaptureService service) action,
  ) {
    try {
      final service = ref.read(telemetryCaptureServiceProvider);
      // Fire-and-forget: nao aguarda nem propaga erro para o fluxo de auth.
      action(service).catchError((_) => null);
    } catch (_) {
      // Provider indisponivel (ex.: escopo de teste sem telemetria) — no-op.
    }
  }

  Future<void> tryRefresh() async {
    final repo = ref.read(authRepositoryProvider);
    try {
      final session = await repo.refresh();
      state = AsyncValue.data(
        AuthState(status: AuthStatus.authenticated, session: session),
      );
    } catch (_) {
      await repo.clearSession();
      state = const AsyncValue.data(
        AuthState(
          status: AuthStatus.expired,
          safeError: 'Sua sessao expirou. Faca login novamente.',
        ),
      );
    }
  }
}

// ── Router refresh listenable ─────────────────────────────────────────────────

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this._ref) {
    _ref.listen<AsyncValue<AuthState>>(authStateProvider, (_, _) {
      notifyListeners();
    });
  }

  final Ref _ref;
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

// Injects the current access token into ApiConfig so Dio clients can use it.
// Returns ApiConfig with null token when unauthenticated — callers must guard.
final authenticatedApiConfigProvider = Provider<ApiConfig>((ref) {
  final authState = ref.watch(authStateProvider);
  final token = authState.maybeWhen(
    data: (state) => state.session?.tokens.accessToken,
    orElse: () => null,
  );
  return ApiConfig(accessToken: token);
});
