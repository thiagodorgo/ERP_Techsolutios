import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_models.dart';
import '../network/http_client.dart';
import '../network/listen_http_client.dart';
import 'auth_notifier.dart';
import 'auth_repository.dart';
import 'listen_token_journal.dart';
import 'pending_revocations.dart';
import 'session_renewal.dart';

final listenSessionsProvider = Provider<ListenSessions>((ref) {
  return ListenSessions(
    repository: ref.watch(authRepositoryProvider),
    journal: ListenTokenJournal(ref.watch(authTokenStorageProvider)),
    revocations: ref.watch(pendingRevocationsProvider),
    config: const ApiConfig(),
    liveClient: () => ref.read(tenantSwitchClientProvider)(),
    // dart format off
    liveKey: () => ref.read(authStateProvider.notifier).liveSessionKey, // a chave da sessão viva de agora, lida na hora
    // dart format on
    report: (errorType) {
      try {
        ref.read(authFailureReporterProvider)(errorType);
      } catch (_) {
        // O relato nunca derruba a escuta.
      }
    },
  );
});

/// O pátio de uma sessão (a de escuta ou a viva).
extension ListenSessionTenant on AuthSession {
  String get tenantId => user.tenantId;
}

class ListenSessions {
  ListenSessions({
    required AuthRepository repository,
    required ListenTokenJournal journal,
    required PendingRevocations revocations,
    required ApiConfig config,
    required Dio Function() liveClient,
    required String? Function() liveKey,
    void Function(String errorType)? report,
    DateTime Function()? now,
    HttpClientAdapter? adapter,
  }) : _repository = repository,
       _journal = journal,
       _revocations = revocations,
       _config = config,
       _liveClientOf = liveClient,
       _liveKey = liveKey,
       _report = report ?? _noReport,
       _now = now ?? DateTime.now,
       _adapter = adapter;

  final AuthRepository _repository;
  final ListenTokenJournal _journal;
  final PendingRevocations _revocations;
  final ApiConfig _config;
  final Dio Function() _liveClientOf;
  final String? Function() _liveKey;
  final void Function(String errorType) _report;
  final DateTime Function() _now;
  final HttpClientAdapter? _adapter;
  final Map<String, AuthSession> _sessions = {};
  final Map<String, Dio> _clients = {};
  final Map<String, Future<AuthSession?>> _inFlight = {};
  int _generation = 0;
  String? _owner;
  String? _closedFor;

  Dio get _liveClient => _liveClientOf();

  String? get _served {
    final live = _liveKey();
    // dart format off
    if (live == null || live == _closedFor) return null; // a sessão que saiu nunca mais é servida
    // dart format on
    return live;
  }

  String? _keyFor(AuthSession current) {
    final served = _served;
    // dart format off
    if (served == null || served != sessionKeyOf(current)) return null; // só a sessão viva de agora pede e recebe
    // dart format on
    return served;
  }

  bool get _ownerServed => _owner != null && _owner == _served;

  List<AuthSession> get sessions =>
      _ownerServed ? List.unmodifiable(_sessions.values) : const [];

  Dio? _clientOrNull(String tenantId) =>
      _ownerServed ? _clients[tenantId] : null;

  Dio clientFor(String tenantId) {
    final client = _clientOrNull(tenantId);
    if (client == null) throw StateError("Sessão de escuta indisponível.");
    return client;
  }

  Future<Dio?> clientOf(String tenantId, AuthSession current) async {
    final session = await acquire(tenantId, current);
    return session == null ? null : _clientOrNull(tenantId);
  }

  Future<AuthSession?> acquire(String tenantId, AuthSession current) {
    final key = _keyFor(current);
    if (key == null) return Future.value();
    // dart format off
    if (_owner != key) _wipe(key); // a sessão viva mudou: a memória de antes não serve a ninguém
    // dart format on
    final pending = _inFlight[tenantId];
    if (pending != null) return pending;
    final started = _acquire(tenantId, current, _generation);
    _inFlight[tenantId] = started;
    return started.whenComplete(() {
      if (identical(_inFlight[tenantId], started)) _inFlight.remove(tenantId);
    });
  }

  Future<AuthSession?> _acquire(
    String tenantId,
    AuthSession current,
    int generation,
  ) async {
    bool alive() => generation == _generation && _keyFor(current) != null;
    final existing = _sessions[tenantId];
    if (existing != null && existing.tokens.expiresAt.isAfter(_now())) {
      return existing;
    }
    await _drop(tenantId); // expirou: sai da memória; o diário revoga abaixo
    final previous = await _journal.tokenFor(tenantId);
    // dart format off
    if (previous != null && !await _revoked(tenantId, previous)) return null; // sem resposta definitiva: não pede outra
    if (!alive()) return null; // GA: a época mudou antes do pedido: nenhum pedido sai
    // dart format on
    final AuthSession session;
    try {
      session = await _repository.acquireListenSession(
        current: current,
        tenantId: tenantId,
        client: _liveClient,
      );
    } on ListenTenantMismatchError catch (error) {
      await _revocations.revokeOrQueue(error.refreshToken);
      rethrow;
    }
    final token = session.refreshToken;
    // dart format off
    if (!alive()) return _refuse(tenantId, token); // GB: a época mudou durante o pedido: o token nunca entra no diário
    if (!await _journaled(tenantId, token)) return _refuse(tenantId, token); // grava antes de usar; sem diário, a sessão não é usada
    if (!alive()) return _refuse(tenantId, token); // GC: a época mudou na gravação: a sessão nunca é instalada
    final client = createListenHttpClient(_config, accessToken: session.accessToken);
    // dart format on
    final adapter = _adapter;
    if (adapter != null) client.httpClientAdapter = adapter;
    client.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          // dart format off
          if (identical(_clients[tenantId], client)) await _handleStatus(error.response?.statusCode, tenantId); // só o cliente instalado derruba a sessão do pátio
          // dart format on
          handler.next(error);
        },
      ),
    );
    _sessions[tenantId] = session;
    _clients[tenantId] = client;
    return session;
  }

  Future<AuthSession?> _refuse(String tenantId, String token) async {
    await _revocations.revokeOrQueue(token);
    try {
      await _journal.removeIfSame(tenantId, token);
    } catch (error) {
      _report(error.runtimeType.toString());
    }
    return null;
  }

  Future<bool> _journaled(String tenantId, String token) async {
    try {
      await _journal.put(tenantId, token);
      return true;
    } catch (error) {
      _report(error.runtimeType.toString());
      return false;
    }
  }

  Future<void> drop(String tenantId) => _drop(tenantId);

  Future<void> _handleStatus(int? status, String tenantId) async {
    if (status == 401) return _drop(tenantId);
  }

  Future<void> _drop(String tenantId) async {
    _sessions.remove(tenantId);
    _clients.remove(tenantId);
  }

  void _wipe(String? owner) {
    _generation++;
    _owner = owner;
    _sessions.clear();
    _clients.clear();
    _inFlight.clear();
  }

  Future<void> retainTenants(Set<String> tenantIds) async {
    try {
      final journal = await _journal.all();
      for (final entry in journal.entries) {
        if (tenantIds.contains(entry.key)) continue;
        await _revocations.revokeOrQueue(entry.value);
        await _journal.removeIfSame(entry.key, entry.value);
      }
    } catch (error) {
      _report(error.runtimeType.toString());
    }
    for (final tenantId in _sessions.keys.toList()) {
      if (!tenantIds.contains(tenantId)) await _drop(tenantId);
    }
  }

  Future<void> discardAll() async {
    // dart format off
    _closedFor = _liveKey(); // a sessão que sai não pede mais escuta
    _wipe(null); // a memória sai no mesmo passo, antes de qualquer espera
    // dart format on
    try {
      final journal = await _journal.all();
      for (final entry in journal.entries) {
        await _revocations.revokeOrQueue(entry.value);
        await _journal.removeIfSame(entry.key, entry.value);
      }
    } catch (error) {
      _report(error.runtimeType.toString());
    }
  }

  void reopen() => _closedFor = null;

  Future<bool> _revoked(String tenantId, String refreshToken) async {
    final outcome = await _repository.revokeRefreshToken(refreshToken);
    if (outcome == RevocationOutcome.retry) return false;
    await _journal.removeIfSame(tenantId, refreshToken);
    return true;
  }
}

void _noReport(String _) {}

extension on AuthSession {
  String get accessToken => tokens.accessToken;
  String get refreshToken => tokens.refreshToken ?? '';
}
