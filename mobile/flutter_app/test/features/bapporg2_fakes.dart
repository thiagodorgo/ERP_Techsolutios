// B-APP-ORG-2 (A1) — o servidor falso dos testes da escuta. Sem rede: todo
// HTTP passa por este adaptador, por caminho. Os dados são fictícios.
//
// O servidor conta as sessões de escuta VIVAS de cada pátio (emitidas menos
// revogadas), como o servidor real faria, e guarda a ordem dos pedidos.

import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';

const kBase = 'https://teste.local';
const kActiveTenant = '/api/v1/auth/active-tenant';
const kLogout = '/api/v1/auth/logout';
const kRefresh = '/api/v1/auth/refresh';
const kWorkOrders = '/api/v1/work-orders';
const kLiveToken = 'tok-x';

/// Um pedido que chegou ao servidor, com o `Authorization` do envio.
class Sent {
  Sent(this.options, this.auth);
  final RequestOptions options;
  final String? auth;
  String get path => options.path;
  String get method => options.method;
  Map<String, Object?> get body =>
      Map<String, Object?>.from(options.data as Map? ?? const {});
}

enum LogoutMode { ok, unavailable, offline }

class FakeServer implements HttpClientAdapter {
  final List<Sent> sent = [];
  final Set<String> live = {};
  final Map<String, int> maxLive = {};
  final List<String> events = [];
  int _sequence = 0;

  /// O pátio que a resposta do `active-tenant` diz (L9); `null` = o pedido.
  String? replyTenant;
  int activeTenantStatus = 200;
  String activeTenantReason = 'forbidden';
  final Map<String, int> statusByTenant = {};
  LogoutMode logout = LogoutMode.ok;

  /// Os chamados que o servidor devolve para cada TOKEN de pátio (L9b troca).
  final Map<String, List<Map<String, Object?>>> ordersByTenant = {};
  int workOrdersStatus = 200;

  List<Sent> to(String path) => sent.where((s) => s.path == path).toList();
  int liveOf(String tenantId) =>
      live.where((t) => t.startsWith('ref-$tenantId-')).length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final s = Sent(options, options.headers['Authorization'] as String?);
    sent.add(s);
    switch (options.path) {
      case kActiveTenant:
        return _activeTenant(s);
      case kLogout:
        return _logout(s);
      case kRefresh:
        events.add('refresh');
        return _json(401, {
          'error': {'code': 'INVALID_TOKEN'},
        });
      case kWorkOrders:
        return _workOrders(s);
    }
    return _json(404, {
      'error': {'code': 'NOT_FOUND'},
    });
  }

  ResponseBody _activeTenant(Sent s) {
    final requested = s.body['tenantId'] as String;
    events.add('acquire:$requested');
    final status = statusByTenant[requested] ?? activeTenantStatus;
    if (status != 200) {
      return _json(status, {
        'error': {'code': 'FORBIDDEN', 'reason': activeTenantReason},
      });
    }
    final tenantId = replyTenant ?? requested;
    final n = ++_sequence;
    final refresh = 'ref-$tenantId-$n';
    live.add(refresh);
    final count = liveOf(tenantId);
    if (count > (maxLive[tenantId] ?? 0)) maxLive[tenantId] = count;
    return _json(200, activeTenantBody(tenantId, 'tok-$tenantId-$n', refresh));
  }

  ResponseBody _logout(Sent s) {
    final token = s.body['refreshToken'] as String;
    events.add('revoke:$token');
    switch (logout) {
      case LogoutMode.offline:
        throw DioException(
          requestOptions: s.options,
          type: DioExceptionType.connectionError,
        );
      case LogoutMode.unavailable:
        return _json(503, {
          'error': {'code': 'UNAVAILABLE'},
        });
      case LogoutMode.ok:
        live.remove(token);
        return _json(200, {'data': 'ok'});
    }
  }

  ResponseBody _workOrders(Sent s) {
    if (s.method != 'GET') return _json(405, const {});
    final auth = s.auth ?? '';
    final tenantId = auth.startsWith('Bearer tok-')
        ? auth.substring('Bearer tok-'.length).split('-').first
        : '';
    if (workOrdersStatus != 200) {
      return _json(workOrdersStatus, {
        'error': {'code': 'ERROR', 'reason': 'module_not_enabled'},
      });
    }
    return _json(200, {
      'items': ordersByTenant[tenantId] ?? const [],
      'pagination': {'nextCursor': null},
    });
  }

  ResponseBody _json(int status, Map<String, Object?> body) =>
      ResponseBody.fromString(
        jsonEncode(body),
        status,
        headers: {
          Headers.contentTypeHeader: ['application/json; charset=utf-8'],
        },
      );

  @override
  void close({bool force = false}) {}
}

/// O 200 do `/auth/active-tenant` no formato do servidor (`auth.routes.ts`).
Map<String, Object?> activeTenantBody(
  String tenantId,
  String access,
  String refresh, {
  bool mustChange = false,
}) => {
  'data': {
    'access_token': access,
    'accessToken': access,
    'token_type': 'Bearer',
    'expires_in': 900,
    'expiresIn': 900,
    'refresh_token': refresh,
    'refreshToken': refresh,
    'session_id': 'sess-$tenantId',
    'tenant': {'id': tenantId, 'name': 'Guincho $tenantId'},
    'user': {
      'id': 'u-$tenantId',
      'name': 'João Prado',
      'email': 'joao@guinchoexemplo.com.br',
    },
    'must_change_password': mustChange,
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read'],
  },
};

Map<String, Object?> workOrderJson(String id) => {
  'id': id,
  'code': id.toUpperCase(),
  'title': 'Remoção $id',
  'status': 'assigned',
};

AuthSession liveSession({String tenantId = 'X', bool mustChange = false}) =>
    AuthSession(
      tokens: AuthTokens(
        accessToken: kLiveToken,
        refreshToken: 'ref-live',
        expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
      ),
      user: AuthUser(
        sub: 'u-x',
        email: 'joao@guinchoexemplo.com.br',
        tenantId: tenantId,
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        permissions: const ['work_orders:read'],
        scope: 'tenant',
      ),
      mustChangePassword: mustChange,
      sessionNonce: 'n-x',
    );

/// A escuta montada como no app, com o repositório REAL (`DioAuthRepository`)
/// e o cliente vivo com o token da sessão viva, todos sobre o servidor falso.
class Escuta {
  Escuta({FakeServer? server, InMemoryAuthTokenStorage? storage})
    : server = server ?? FakeServer(),
      storage = storage ?? InMemoryAuthTokenStorage() {
    authClient = Dio(BaseOptions(baseUrl: kBase))
      ..httpClientAdapter = this.server;
    liveClient = Dio(
      BaseOptions(
        baseUrl: kBase,
        headers: {'Authorization': 'Bearer $kLiveToken'},
      ),
    )..httpClientAdapter = this.server;
    repository = DioAuthRepository(client: authClient, storage: this.storage);
    revocations = PendingRevocations(
      repository: repository,
      storage: this.storage,
      report: (_) {},
    );
    journal = ListenTokenJournal(this.storage);
    sessions = open();
  }

  final FakeServer server;
  final InMemoryAuthTokenStorage storage;
  late final Dio authClient;
  late final Dio liveClient;
  late final DioAuthRepository repository;
  late final PendingRevocations revocations;
  late final ListenTokenJournal journal;
  late ListenSessions sessions;
  DateTime clock = DateTime.now().toUtc();

  /// A chave da sessão viva de agora (os testes a trocam).
  String? liveKey = 'u-x|X|n-x';

  /// Um aparelho que abre de novo: memória nova, o mesmo armazenamento.
  ListenSessions open() => ListenSessions(
    repository: repository,
    journal: journal,
    revocations: revocations,
    config: const ApiConfig(baseUrl: kBase),
    liveClient: () => liveClient,
    liveKey: () => liveKey,
    now: () => clock,
    adapter: server,
  );

  /// A sessão de escuta passa da validade (o relógio anda 1 hora).
  void expire() => clock = clock.add(const Duration(hours: 1));
}
