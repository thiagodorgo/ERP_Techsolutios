// B-APP-ORG-2 (A1; Emendas 1.8 §5.2, 1.8.1 §5.3, 1.8.2 §4.3 e 1.8.3 §4): as
// sessões de escuta, só de leitura, dos outros pátios.
//
// - Cada pátio de escuta tem a sua sessão e o seu cliente; a sessão viva não
//   muda (nada gravado, a época igual).
// - A escuta nunca renova: no 401 e na expiração a sessão sai da memória, e o
//   próximo ciclo pede outra.
// - Sem acúmulo no servidor (CA182-05): o diário guarda no máximo 1 token de
//   renovação por pátio, gravado ANTES de usar a sessão; só se pede sessão nova
//   com a revogação da anterior confirmada (2xx ou 400). Sem resposta
//   definitiva, não se pede outra.
// - Sair, troca e queda da sessão viva: os tokens do diário vão para a fila do
//   Sair, e o diário e a memória se esvaziam.
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_models.dart';
import '../network/http_client.dart';
import '../network/listen_http_client.dart';
import 'auth_notifier.dart';
import 'auth_repository.dart';
import 'listen_token_journal.dart';
import 'pending_revocations.dart';

/// Não vigia a sessão viva: o notifier lê este provider na troca, no Sair e na
/// queda. O cliente vivo (o da troca, `tenantSwitchClientProvider`) nasce na
/// hora de cada pedido de sessão de escuta.
final listenSessionsProvider = Provider<ListenSessions>((ref) {
  return ListenSessions(
    repository: ref.watch(authRepositoryProvider),
    journal: ListenTokenJournal(ref.watch(authTokenStorageProvider)),
    revocations: ref.watch(pendingRevocationsProvider),
    config: const ApiConfig(),
    liveClient: () => ref.read(tenantSwitchClientProvider)(),
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
    void Function(String errorType)? report,
    DateTime Function()? now,
    HttpClientAdapter? adapter,
  }) : _repository = repository,
       _journal = journal,
       _revocations = revocations,
       _config = config,
       _liveClientOf = liveClient,
       _report = report ?? _noReport,
       _now = now ?? DateTime.now,
       _adapter = adapter;

  final AuthRepository _repository;
  final ListenTokenJournal _journal;
  final PendingRevocations _revocations;
  final ApiConfig _config;
  final Dio Function() _liveClientOf;
  final void Function(String errorType) _report;
  final DateTime Function() _now;

  /// Os testes trocam o adaptador dos clientes de escuta por aqui.
  final HttpClientAdapter? _adapter;
  final Map<String, AuthSession> _sessions = {};
  final Map<String, Dio> _clients = {};
  final Map<String, Future<AuthSession?>> _inFlight = {};

  /// Sobe no Sair, na troca e na queda: um pedido que começou antes não vira
  /// sessão de escuta depois.
  int _generation = 0;

  /// O cliente da sessão viva, que leva o pedido de sessão de escuta.
  Dio get _liveClient => _liveClientOf();

  List<AuthSession> get sessions => List.unmodifiable(_sessions.values);

  Dio clientFor(String tenantId) {
    final client = _clients[tenantId];
    if (client == null) throw StateError('Sessão de escuta indisponível.');
    return client;
  }

  /// A sessão de escuta do pátio, ou `null` quando a revogação da anterior não
  /// teve resposta definitiva (o bloco fica com os dados que já tinha).
  Future<AuthSession?> acquire(String tenantId, AuthSession current) {
    final pending = _inFlight[tenantId];
    if (pending != null) return pending;
    final started = _acquire(tenantId, current);
    _inFlight[tenantId] = started;
    return started.whenComplete(() => _inFlight.remove(tenantId));
  }

  Future<AuthSession?> _acquire(String tenantId, AuthSession current) async {
    final existing = _sessions[tenantId];
    if (existing != null && existing.tokens.expiresAt.isAfter(_now())) {
      return existing;
    }
    await _drop(tenantId); // expirou: sai da memória; o diário revoga abaixo
    final generation = _generation;
    final previous = await _journal.tokenFor(tenantId);
    // dart format off
    if (previous != null && !await _revoked(tenantId, previous)) return null; // sem resposta definitiva: não pede outra
    // dart format on
    final AuthSession session;
    try {
      session = await _repository.acquireListenSession(
        current: current,
        tenantId: tenantId,
        client: _liveClient,
      );
    } on ListenTenantMismatchError catch (error) {
      // L9: a sessão não é guardada e o token recebido vai para a revogação.
      await _revocations.revokeOrQueue(error.refreshToken);
      rethrow;
    }
    if (generation != _generation) {
      // A época mudou durante o pedido: a sessão nova nunca é usada.
      await _revocations.revokeOrQueue(session.refreshToken);
      return null;
    }
    // dart format off
    await _journal.put(tenantId, session.refreshToken); // grava antes de usar: o próximo início revoga
    final client = createListenHttpClient(_config, accessToken: session.accessToken);
    // dart format on
    final adapter = _adapter;
    if (adapter != null) client.httpClientAdapter = adapter;
    client.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          await _handleStatus(error.response?.statusCode, tenantId);
          handler.next(error);
        },
      ),
    );
    _sessions[tenantId] = session;
    _clients[tenantId] = client;
    return session;
  }

  /// Tira a sessão de escuta da memória; o token fica no diário e é revogado
  /// antes do próximo pedido.
  Future<void> drop(String tenantId) => _drop(tenantId);

  Future<void> _handleStatus(int? status, String tenantId) async {
    if (status == 401) return _drop(tenantId);
  }

  Future<void> _drop(String tenantId) async {
    _sessions.remove(tenantId);
    _clients.remove(tenantId);
  }

  /// O pátio que saiu da lista: o token vai para a fila do Sair e sai do
  /// diário e da memória.
  Future<void> retainTenants(Set<String> tenantIds) async {
    try {
      final journal = await _journal.all();
      for (final entry in journal.entries) {
        if (tenantIds.contains(entry.key)) continue;
        await _revocations.revokeOrQueue(entry.value);
        await _journal.remove(entry.key);
      }
    } catch (error) {
      _report(error.runtimeType.toString());
    }
    for (final tenantId in _sessions.keys.toList()) {
      if (!tenantIds.contains(tenantId)) await _drop(tenantId);
    }
  }

  /// Sair, troca e queda: nunca lança (o Sair e a troca seguem).
  Future<void> discardAll() async {
    _generation++;
    _sessions.clear();
    _clients.clear();
    try {
      final journal = await _journal.all();
      for (final token in journal.values) {
        await _revocations.revokeOrQueue(token);
      }
      await _journal.clear();
    } catch (error) {
      _report(error.runtimeType.toString());
    }
  }

  Future<bool> _revoked(String tenantId, String refreshToken) async {
    final outcome = await _repository.revokeRefreshToken(refreshToken);
    if (outcome == RevocationOutcome.retry) return false;
    await _journal.remove(tenantId);
    return true;
  }
}

void _noReport(String _) {}

extension on AuthSession {
  String get accessToken => tokens.accessToken;
  String get refreshToken => tokens.refreshToken ?? '';
}
