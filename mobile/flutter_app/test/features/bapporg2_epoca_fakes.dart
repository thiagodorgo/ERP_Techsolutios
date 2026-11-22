// PROTOTIPO do plan-1839-fable: os dublês que seguram uma espera.
import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bapporg2_fakes.dart';

class Hold {
  final arrived = Completer<void>();
  final release = Completer<void>();
}

class GatedServer extends FakeServer {
  final Map<String, Hold> _holds = {};
  Hold hold(String path) => _holds[path] = Hold();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final h = _holds.remove(options.path);
    if (h != null) {
      h.arrived.complete();
      await h.release.future;
    }
    return super.fetch(options, requestStream, cancelFuture);
  }
}

class GatedStorage extends InMemoryAuthTokenStorage {
  Hold? onLoad;
  Hold? onSave;
  bool failSave = false;
  Duration latency = Duration.zero;
  int listenSaves = 0;

  Hold holdLoad() => onLoad = Hold();
  Hold holdSave() => onSave = Hold();

  @override
  Future<Map<String, String>> loadListenTokens() async {
    final h = onLoad;
    onLoad = null;
    if (h != null) {
      h.arrived.complete();
      await h.release.future;
    }
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    return super.loadListenTokens();
  }

  @override
  Future<void> saveListenTokens(Map<String, String> tokensByTenant) async {
    final h = onSave;
    onSave = null;
    if (h != null) {
      h.arrived.complete();
      await h.release.future;
    }
    if (latency > Duration.zero) await Future<void>.delayed(latency);
    if (failSave) throw StateError('armazenamento');
    listenSaves++;
    await super.saveListenTokens(tokensByTenant);
  }
}

AuthSession pessoa(String sub, String tenantId) => AuthSession(
  tokens: AuthTokens(
    accessToken: kLiveToken,
    refreshToken: 'ref-live-$sub',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: AuthUser(
    sub: sub,
    email: '$sub@guinchoexemplo.com.br',
    tenantId: tenantId,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['work_orders:read'],
    scope: 'tenant',
  ),
  sessionNonce: 'n-$sub',
);

({Escuta e, GatedServer server, GatedStorage storage}) monta() {
  final server = GatedServer();
  final storage = GatedStorage();
  return (
    e: Escuta(server: server, storage: storage),
    server: server,
    storage: storage,
  );
}

Future<void> nadaFicou(Escuta e, String tenantId) async {
  expect(e.sessions.sessions, isEmpty);
  expect(() => e.sessions.clientFor(tenantId), throwsStateError);
  expect(await e.journal.all(), isEmpty);
  expect(e.server.liveOf(tenantId), 0);
  expect(await e.revocations.pending(), isEmpty);
}
