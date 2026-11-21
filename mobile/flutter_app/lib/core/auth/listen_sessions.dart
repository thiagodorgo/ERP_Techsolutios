import 'package:dio/dio.dart';

import '../../features/auth/auth_models.dart';
import '../network/http_client.dart';
import '../network/listen_http_client.dart';
import 'auth_repository.dart';
import 'listen_token_journal.dart';
import 'pending_revocations.dart';

class ListenSessions {
  ListenSessions({
    required AuthRepository repository,
    required ListenTokenJournal journal,
    required PendingRevocations revocations,
    required ApiConfig config,
    required Dio Function() liveClient,
  }) : _repository = repository,
       _journal = journal,
       _revocations = revocations,
       _config = config,
       _liveClient = liveClient;

  final AuthRepository _repository;
  final ListenTokenJournal _journal;
  final PendingRevocations _revocations;
  final ApiConfig _config;
  final Dio Function() _liveClient;
  final Map<String, AuthSession> _sessions = {};
  final Map<String, Dio> _clients = {};

  List<AuthSession> get sessions => List.unmodifiable(_sessions.values);

  Dio clientFor(String tenantId) {
    final client = _clients[tenantId];
    if (client == null) throw StateError('Sessão de escuta indisponível.');
    return client;
  }

  Future<AuthSession?> acquire(String tenantId, AuthSession current) async {
    final existing = _sessions[tenantId];
    if (existing != null) return existing;
    final previous = await _journal.tokenFor(tenantId);
    if (previous != null && !await _revoked(tenantId, previous)) {
      return null;
    } // sem resposta definitiva: não pede outra
    final session = await _repository.acquireListenSession(
      current: current,
      tenantId: tenantId,
      client: _liveClient(),
    );
    await _journal.put(
      tenantId,
      session.refreshToken,
    ); // grava antes de usar: o próximo início revoga
    final client = createListenHttpClient(
      _config,
      accessToken: session.accessToken,
    );
    client.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          if (status == 401) await drop(tenantId);
          handler.next(error);
        },
      ),
    );
    _sessions[tenantId] = session;
    _clients[tenantId] = client;
    return session;
  }

  Future<void> drop(String tenantId) async {
    _sessions.remove(tenantId);
    _clients.remove(tenantId);
  }

  Future<void> retainTenants(Set<String> tenantIds) async {
    final journal = await _journal.all();
    for (final entry in journal.entries) {
      if (!tenantIds.contains(entry.key)) {
        await _revocations.revokeOrQueue(entry.value);
        await _journal.remove(entry.key);
        await drop(entry.key);
      }
    }
  }

  Future<void> discardAll() async {
    final journal = await _journal.all();
    for (final token in journal.values) {
      await _revocations.revokeOrQueue(token);
    }
    await _journal.clear();
    _sessions.clear();
    _clients.clear();
  }

  Future<bool> _revoked(String tenantId, String refreshToken) async {
    final outcome = await _repository.revokeRefreshToken(refreshToken);
    if (outcome == RevocationOutcome.retry) return false;
    await _journal.remove(tenantId);
    return true;
  }
}

extension on AuthSession {
  String get accessToken => tokens.accessToken;
  String get refreshToken => tokens.refreshToken!;
}
