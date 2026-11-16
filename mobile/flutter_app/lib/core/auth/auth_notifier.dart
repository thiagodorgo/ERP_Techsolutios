import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/auth_models.dart';
import '../config/app_config.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import '../telemetry/telemetry_capture_service.dart';
import '../telemetry/telemetry_event.dart';
import '../telemetry/telemetry_providers.dart';
import 'auth_repository.dart';
import 'auth_token_storage.dart';
import 'pending_revocations.dart';
import 'session_renewal.dart';

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

/// B-APP-SESSAO-RENOVA (D3): o relato de uma falha LOCAL da sessão (a
/// renovação ilegível, o armazenamento que lança). Só o TIPO do erro sai daqui:
/// nunca token, mensagem nem caminho. Os testes trocam o relator.
final authFailureReporterProvider = Provider<void Function(String errorType)>((
  ref,
) {
  return (errorType) => debugPrint('Sessão: falha local ($errorType).');
});

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends AsyncNotifier<AuthState> {
  /// A renovação em voo: os 401 que chegam enquanto ela corre esperam a mesma.
  Future<SessionRenewalOutcome>? _inFlight;

  /// B-APP-SESSAO-RENOVA (D3b): a época da sessão. Cada pedido leva a época em
  /// que saiu; um pedido de outra época nunca usa o token desta.
  int _epoch = 0;

  int get epoch => _epoch;

  /// D3b: a época sobe de forma síncrona no 1º passo de cada ciclo da sessão
  /// (login, "Sair", troca de senha, expiração) e esquece a renovação em voo.
  void _bumpEpoch() {
    _epoch++;
    _inFlight = null;
  }

  /// D3b: a trava de sessão (molde de `_enterMaterialLock`). Toda escrita da
  /// sessão, no armazenamento e no estado, passa por ela. Não é reentrante:
  /// nada que roda dentro dela a pede de novo. `null` = ociosa.
  Future<void>? _sessionTail;

  Future<void Function()> _enterSessionLock() async {
    final previous = _sessionTail;
    final done = Completer<void>();
    final mine = done.future;
    _sessionTail = mine;
    if (previous != null) await previous;
    return () {
      done.complete();
      if (identical(_sessionTail, mine)) _sessionTail = null;
    };
  }

  /// O token de acesso da sessão autenticada de agora, para o interceptador.
  String? get liveAccessToken {
    final current = state.asData?.value;
    if (current == null || !current.isAuthenticated) return null;
    return current.session?.tokens.accessToken;
  }

  @override
  Future<AuthState> build() async {
    // dart format off
    unawaited(ref.read(pendingRevocationsProvider).drain()); // na abertura: esvazia a fila de revogação
    // dart format on
    final repo = ref.watch(authRepositoryProvider);
    final restored = await repo.restoreSession();

    if (restored == null) {
      return const AuthState(status: AuthStatus.unauthenticated);
    }

    if (restored.isExpired) {
      // D7: só a recusa do servidor expira. Sem rede, ou com falha local, a
      // sessão fica (o técnico trabalha offline e renova no 1º pedido online).
      try {
        final refreshed = await repo.refresh();
        await repo.commitRefreshed(refreshed);
        return AuthState(status: AuthStatus.authenticated, session: refreshed);
      } on ApiUnauthorizedError {
        await _clearDevice(repo);
        return AuthState(
          status: AuthStatus.expired,
          safeError: kSessionExpiredMessage,
          expiredOwnerSub: restored.user.sub,
        );
      } catch (error) {
        if (error is! ApiError) _reportLocalFailure(error);
        // dart format off
        return AuthState(status: AuthStatus.offlineCached, session: restored); // abrir sem rede: a sessão fica
        // dart format on
      }
    }

    return AuthState(status: AuthStatus.authenticated, session: restored);
  }

  Future<void> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    _bumpEpoch(); // ciclo: login
    state = const AsyncValue.loading();
    final release = await _enterSessionLock();
    try {
      final repo = ref.read(authRepositoryProvider);
      final session = await repo.login(
        email: email,
        password: password,
        tenantId: tenantId,
      );
      if (session.mustChangePassword) {
        // B-USERS-ACESSO-SEG (T2): sessão restrita da senha provisória. Não é
        // autenticada: sem APP_CONNECT, sem bootstrap, sem sincronização. O
        // roteador leva direto à troca de senha.
        state = AsyncValue.data(
          AuthState(
            status: AuthStatus.passwordChangeRequired,
            session: session,
          ),
        );
        return;
      }
      state = AsyncValue.data(
        AuthState(status: AuthStatus.authenticated, session: session),
      );
      // dart format off
      unawaited(ref.read(pendingRevocationsProvider).drain()); // entrou: o servidor responde, esvazia a fila
      // dart format on
      // Ω4C PR-13 — hook de ciclo: login → APP_CONNECT (de-dup por estado no
      // serviço). Best-effort: telemetria nunca derruba o login.
      _recordTelemetry((service) {
        return service.recordAppConnect(tenantId: session.user.tenantId);
      });
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    } finally {
      release();
    }
  }

  /// B-USERS-ACESSO-SEG (T2): troca a senha provisória. Sucesso → sessão local
  /// apagada e volta ao login com o aviso. Sessão vencida → volta ao login com
  /// o texto de sessão expirada. Os demais erros sobem para a tela, que fica.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _bumpEpoch(); // ciclo: troca de senha
    final repo = ref.read(authRepositoryProvider);
    final release = await _enterSessionLock();
    try {
      try {
        await repo.changePassword(
          currentPassword: currentPassword,
          newPassword: newPassword,
        );
      } on PasswordChangeError catch (e) {
        if (e.failure == PasswordChangeFailure.sessionExpired) {
          state = AsyncValue.data(
            AuthState(status: AuthStatus.expired, safeError: e.safeMessage),
          );
        }
        rethrow;
      }
      state = const AsyncValue.data(
        AuthState(
          status: AuthStatus.unauthenticated,
          safeNotice: kPasswordChangedNotice,
        ),
      );
    } finally {
      release();
    }
  }

  Future<void> logout() async {
    _bumpEpoch(); // ciclo: logout
    // Ω4C PR-13 — hook de ciclo: logout → APP_DISCONNECT (antes de limpar a
    // sessao, para ainda conhecer o tenant). Best-effort.
    // B-USERS-ACESSO-SEG (T2): só sessão autenticada registrou APP_CONNECT; o
    // "Sair" da sessão restrita não registra APP_DISCONNECT.
    final current = state.asData?.value;
    final tenantId = (current?.isAuthenticated ?? false)
        ? current?.session?.user.tenantId
        : null;
    if (tenantId != null && tenantId.isNotEmpty) {
      _recordTelemetry(
        (service) => service.recordAppDisconnect(tenantId: tenantId),
      );
    }
    // B-APP-SESSAO-RENOVA (D2): o "Sair" entrega ao servidor o token de
    // renovação VIGENTE guardado, e só depois limpa o aparelho. O servidor
    // revoga a sessão inteira com esse token (S2). Dentro da trava (D3b): uma
    // renovação que gravou antes lê aqui o token que acabou de gravar.
    // D11: o token vai pela fila: revoga agora, ou espera nela até a resposta
    // definitiva do servidor.
    final release = await _enterSessionLock();
    try {
      final storedRefreshToken = await _readStoredRefreshToken();
      if (storedRefreshToken == null) return await _clearDeviceAfterLogout();
      // dart format off
      await _revocations.revokeOrQueue(storedRefreshToken); // Sair: revoga ou fica na fila
      // dart format on
      await _clearDeviceAfterLogout();
    } finally {
      release();
    }
  }

  PendingRevocations get _revocations => ref.read(pendingRevocationsProvider);

  Future<void> _clearDeviceAfterLogout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.logout();
    state = const AsyncValue.data(
      AuthState(status: AuthStatus.unauthenticated),
    );
  }

  Future<String?> _readStoredRefreshToken() async {
    try {
      final stored = await ref.read(authTokenStorageProvider).loadSession();
      return stored?.tokens.refreshToken;
    } catch (_) {
      // O armazenamento falhou: o "Sair" segue e limpa o aparelho mesmo assim.
      return null;
    }
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

  /// B-APP-SESSAO-RENOVA (D3) — a porta: um 401 de pedido comum pede a
  /// renovação aqui. Uma renovação por vez no app inteiro; um 401 atrasado, com
  /// o token já trocado, repete com o atual sem renovar de novo.
  Future<SessionRenewalOutcome> renewAfterUnauthorized(
    String? failedAccessToken,
    int requestEpoch,
  ) {
    // dart format off
    if (requestEpoch != _epoch) return Future.value(const SessionSuperseded()); // pedido de outra sessão nunca usa o token desta
    // dart format on
    final current = liveAccessToken;
    if (current == null) return Future.value(const SessionSuperseded());
    // dart format off
    if (failedAccessToken != null && current != failedAccessToken) { // outro pedido já renovou
      // dart format on
      return Future.value(SessionRenewed(current));
    }
    final inFlight = _inFlight;
    if (inFlight != null) return inFlight; // uma renovação por vez
    final renewal = _renew(_epoch);
    _inFlight = renewal;
    return renewal.whenComplete(() {
      if (identical(_inFlight, renewal)) _inFlight = null;
    });
  }

  /// O pedido repetido também levou 401: o servidor não aceita mais a sessão.
  Future<void> expireSession(int requestEpoch) async {
    await _expireIfEpoch(requestEpoch);
  }

  Future<SessionRenewalOutcome> _renew(int epoch) async {
    final repo = ref.read(authRepositoryProvider);
    final AuthSession fresh;
    try {
      fresh = await repo.refresh();
    } on ApiUnauthorizedError {
      return _expireIfEpoch(epoch);
    } on ApiError {
      return const SessionUnreachable();
    } catch (error) {
      _reportLocalFailure(error);
      // dart format off
      return const SessionRenewalFailed(); // falha local: a sessão fica
      // dart format on
    }
    // D3b: a gravação da renovação, dentro da trava, só vale para a época que
    // a começou. Superada antes de gravar: não grava nada (o servidor cobre o
    // token novo, S2/S3). Superada depois de gravar: não publica; quem mudou a
    // época, e espera a trava, sobrescreve ou limpa o armazenamento.
    final release = await _enterSessionLock();
    try {
      // dart format off
      if (epoch != _epoch) return const SessionSuperseded(); // gravação: a época ainda vale?
      // dart format on
      try {
        await repo.commitRefreshed(fresh);
      } catch (error) {
        _reportLocalFailure(error);
        // dart format off
        return const SessionRenewalFailed(); // gravação falhou: a sessão em memória não muda
        // dart format on
      }
      // dart format off
      if (epoch != _epoch) return const SessionSuperseded(); // superada depois de gravar: quem mudou a época limpa
      // dart format on
      state = AsyncData(
        AuthState(status: AuthStatus.authenticated, session: fresh),
      );
      // dart format off
      unawaited(ref.read(pendingRevocationsProvider).drain()); // renovou: o servidor responde, esvazia a fila
      // dart format on
      return SessionRenewed(fresh.tokens.accessToken);
    } finally {
      release();
    }
  }

  /// A única transição de "sessão morta": só a recusa do servidor chega aqui,
  /// e só para a própria época. Não chama `/auth/logout`: o servidor já
  /// recusou.
  Future<SessionRenewalOutcome> _expireIfEpoch(int epoch) async {
    // dart format off
    if (epoch != _epoch) return const SessionSuperseded(); // expirar só a própria época
    // dart format on
    final sub = state.asData?.value.session?.user.sub;
    _bumpEpoch();
    final release = await _enterSessionLock();
    try {
      final repo = ref.read(authRepositoryProvider);
      try {
        await repo.clearSession();
      } catch (error) {
        _reportLocalFailure(error);
      }
      try {
        // dart format off
        await ref.read(authTokenStorageProvider).clearBootstrap(); // expirou: o cache morre com a sessão
        // dart format on
      } catch (error) {
        _reportLocalFailure(error);
      }
      state = AsyncData(
        AuthState(
          status: AuthStatus.expired,
          safeError: kSessionExpiredMessage,
          expiredOwnerSub: sub,
        ),
      );
      return const SessionDead();
    } finally {
      release();
    }
  }

  Future<void> _clearDevice(AuthRepository repo) async {
    try {
      await repo.clearSession();
      await ref.read(authTokenStorageProvider).clearBootstrap();
    } catch (error) {
      _reportLocalFailure(error);
    }
  }

  void _reportLocalFailure(Object error) {
    try {
      ref.read(authFailureReporterProvider)(error.runtimeType.toString());
    } catch (_) {
      // O relato nunca derruba a sessão.
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
// B-USERS-ACESSO-SEG (T2): o token só sai para o resto do app com sessão
// AUTENTICADA. O token da sessão restrita (senha provisória) só serve à troca
// de senha, que o repositório de auth envia por conta própria.
final authenticatedApiConfigProvider = Provider<ApiConfig>((ref) {
  final authState = ref.watch(authStateProvider);
  final token = authState.maybeWhen(
    data: (state) =>
        state.isAuthenticated ? state.session?.tokens.accessToken : null,
    orElse: () => null,
  );
  return ApiConfig(accessToken: token);
});
