// B-APP-ORG (item 70), fatia B2 — isolamento e perda na troca de organização,
// com Drift real (`NativeDatabase.memory`) e o app de verdade por baixo.
//
// Plano B-APP-ORG-69-70 §5.3 (T11, T12, T13); Emenda 1 §A3.3 (T11b), §A3.4
// (T15b), §A5 (T17); Emenda 1.1 E1.1-3 (M34a/b/d, uma por provider).
//
// O terreno: um servidor HTTP local (127.0.0.1) atrás de TODOS os clientes do
// app — o de autenticação, o da troca, o do bootstrap e os de dados. Ele
// responde pela organização do token (`tok-org-a` / `tok-org-b`). A troca passa
// pelo ponto único (`tenantSwitchOrchestratorProvider`). Os providers de
// repositório, da fila, da telemetria e o coordenador de sincronização são os
// reais. Os dados são fictícios e só existem neste arquivo.
//
// Mutações que este arquivo pega: M13 (T11 e os T11b-OS), M34a (T11b-OS e T11b-OS-demo),
// M34b (T11b-checklist), M34d (T11b-prestador), M36 (T15b).
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Variable;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/tenant_switch_orchestrator.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_providers.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/pending_count_provider.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_signal_source.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _orgA = 'org-a';
const _orgB = 'org-b';
const _email = 'joao.prado@guinchoexemplo.com.br';

String _userOf(String org) => org == _orgA ? 'u-a' : 'u-b';

AuthSession _sessaoA() => AuthSession(
  tokens: AuthTokens(
    accessToken: 'tok-org-a',
    refreshToken: 'ref-org-a',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: const AuthUser(
    sub: 'u-a',
    email: _email,
    tenantId: _orgA,
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    permissions: ['work_orders:read'],
    scope: 'tenant',
  ),
  sessionNonce: 'sess-org-a',
);

/// O 200 do `/auth/active-tenant` no formato do servidor (`auth.routes.ts`).
Map<String, Object?> _trocou(String org) => {
  'data': {
    'access_token': 'tok-$org',
    'accessToken': 'tok-$org',
    'token_type': 'Bearer',
    'tokenType': 'Bearer',
    'expires_in': 900,
    'expiresIn': 900,
    'refresh_token': 'ref-$org',
    'refreshToken': 'ref-$org',
    'refresh_expires_in': 2592000,
    'session_id': 'sess-$org',
    'sessionId': 'sess-$org',
    'tenant': {'id': org, 'name': 'Guincho $org'},
    'user': {'id': _userOf(org), 'name': 'João Prado', 'email': _email},
    'must_change_password': false,
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read', 'expense_sync:write'],
  },
};

Map<String, Object?> _bootstrapDe(String org) => {
  'data': {
    'feature_flags': const <String, Object?>{},
    'tenant': {'id': org, 'name': 'Guincho $org'},
    'user': {'id': _userOf(org), 'email': _email},
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read', 'expense_report:create'],
    'available_tenants': [
      {'tenantId': _orgA, 'displayName': 'Guincho org-a'},
      {'tenantId': _orgB, 'displayName': 'Guincho org-b'},
    ],
  },
};

// ── O servidor local ─────────────────────────────────────────────────────────

class _Req {
  _Req(this.method, this.path, this.auth, this.body);
  final String method;
  final String path;
  final String? auth;
  final Object? body;

  /// A organização do token, ou `null` sem `Authorization`.
  String? get org => auth?.replaceFirst('Bearer tok-', '');
}

class _Servidor {
  late final HttpServer _server;
  final List<_Req> reqs = [];

  /// Segura o bootstrap de B (a janela da troca).
  Completer<void>? portaoBootB;

  String get base => 'http://127.0.0.1:${_server.port}';

  Future<void> abre() async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server.listen(_trata);
    addTearDown(() => _server.close(force: true));
  }

  List<_Req> para(String path) => reqs.where((r) => r.path == path).toList();

  Future<void> _trata(HttpRequest req) async {
    final raw = await utf8.decoder.bind(req).join();
    Object? body;
    if (raw.isNotEmpty) {
      try {
        body = jsonDecode(raw);
      } catch (_) {
        body = raw;
      }
    }
    final r = _Req(
      req.method,
      req.uri.path,
      req.headers.value('authorization'),
      body,
    );
    reqs.add(r);
    final org = r.org ?? _orgA;
    Object resposta = {'data': <String, Object?>{}};
    switch (r.path) {
      case '/api/v1/auth/active-tenant':
        resposta = _trocou((body as Map)['tenantId'] as String);
      case '/api/v1/auth/logout':
        resposta = {'data': 'ok'};
      case '/api/v1/mobile/bootstrap':
        if (org == _orgB) await portaoBootB?.future;
        resposta = _bootstrapDe(org);
      case '/api/v1/work-orders':
        resposta = {
          'items': [
            {
              'id': 'srv-$org-1',
              'code': 'OS-$org',
              'title': 'OS $org',
              'status': 'scheduled',
              'priority': 'normal',
            },
          ],
          'pagination': {'nextCursor': null},
        };
      case '/api/v1/mobile/checklists/available':
        resposta = {
          'data': [
            {'id': 'tpl-$org', 'title': 'Modelo $org'},
          ],
        };
      case '/api/v1/mobile/technician/stock':
        resposta = {
          'data': {
            'items': [
              {
                'sku': 'SKU-$org',
                'name': 'Peça $org',
                'available': 1,
                'unit': 'un',
              },
            ],
            'generatedAt': '2026-11-20T10:00:00Z',
          },
        };
      case '/api/v1/mobile/sync/work-order-actions':
        resposta = {
          'data': {
            'accepted': [
              for (final a in _acoes(body))
                {'client_action_id': a, 'result_ref': 'srv-$a'},
            ],
          },
        };
      case '/api/v1/mobile/telemetry':
        resposta = {
          'data': {
            'results': [
              for (final e in _eventos(body))
                {'client_action_id': e, 'status': 'accepted'},
            ],
          },
        };
    }
    req.response
      ..statusCode = 200
      ..headers.contentType = ContentType.json
      ..write(jsonEncode(resposta));
    await req.response.close();
  }
}

List<String> _acoes(Object? body) => [
  if (body is Map && body['actions'] is List)
    for (final a in body['actions'] as List)
      if (a is Map) (a['client_action_id'] ?? a['clientActionId']) as String,
];

List<String> _eventos(Object? body) => [
  if (body is Map && body['events'] is List)
    for (final e in body['events'] as List)
      if (e is Map) e['client_action_id'] as String,
];

/// O armazenamento seguro em memória (consentimento e aparência).
class _Cofre implements FlutterSecureStorage {
  final Map<String, String> m = {};

  @override
  dynamic noSuchMethod(Invocation i) {
    final key = i.namedArguments[#key] as String?;
    switch (i.memberName) {
      case #read:
        return Future<String?>.value(m[key]);
      case #write:
        final v = i.namedArguments[#value] as String?;
        if (v == null) {
          m.remove(key);
        } else {
          m[key!] = v;
        }
        return Future<void>.value();
      case #delete:
        m.remove(key);
        return Future<void>.value();
      case #containsKey:
        return Future<bool>.value(m.containsKey(key));
      case #readAll:
        return Future<Map<String, String>>.value(Map.of(m));
      case #deleteAll:
        m.clear();
        return Future<void>.value();
    }
    return super.noSuchMethod(i);
  }
}

// ── O app ────────────────────────────────────────────────────────────────────

class _App {
  _App(this.srv, this.db, this.c, this.cofre, this.blobs);
  final _Servidor srv;
  final AppDatabase db;
  final ProviderContainer c;
  final _Cofre cofre;
  final InMemoryEvidenceBlobStore blobs;

  Future<void> troca(String org) =>
      c.read(tenantSwitchOrchestratorProvider).run(org);

  AuthSession get sessao => c.read(authStateProvider).asData!.value.session!;

  /// Espera o bootstrap da organização [org] (o da sessão viva).
  Future<void> bootEm(String org) async {
    final fim = DateTime.now().add(const Duration(seconds: 10));
    while (true) {
      final b = await c.read(bootstrapSessionProvider.future);
      if (b.activeTenant.tenantId == org) return;
      if (DateTime.now().isAfter(fim)) fail('o bootstrap não chegou a $org');
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
  }

  /// Uma passada do coordenador REAL, na organização do bootstrap.
  Future<void> passada() async {
    await c.read(autoSyncCoordinatorProvider.notifier).triggerManual();
  }
}

Future<_App> _abre() async {
  final srv = _Servidor();
  await srv.abre();
  final db = AppDatabase(NativeDatabase.memory());
  addTearDown(db.close);
  final storage = InMemoryAuthTokenStorage();
  await storage.saveSession(_sessaoA());
  final cofre = _Cofre();
  final blobs = InMemoryEvidenceBlobStore();
  final authDio = Dio(BaseOptions(baseUrl: srv.base));
  final c = ProviderContainer(
    overrides: [
      appDatabaseProvider.overrideWithValue(db),
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(
        DioAuthRepository(client: authDio, storage: storage),
      ),
      // A regra real (a chave da sessão, depois o token), só com o servidor
      // local no lugar do endereço de produção.
      authenticatedApiConfigProvider.overrideWith((ref) {
        final key = ref.watch(sessionKeyProvider);
        if (key == null) return ApiConfig(baseUrl: srv.base);
        final s = ref.read(authStateProvider).asData?.value.session;
        return ApiConfig(baseUrl: srv.base, accessToken: s?.tokens.accessToken);
      }),
      mobileBootstrapRepositoryProvider.overrideWith(
        (ref) => DioMobileBootstrapRepository(
          storage,
          createClient: (config) => sessionHttpClient(
            ref,
            ApiConfig(baseUrl: srv.base, accessToken: config.accessToken),
          ),
        ),
      ),
      remoteAuthModeProvider.overrideWithValue(true),
      evidenceBlobStoreProvider.overrideWithValue(blobs),
      locationConsentStoreProvider.overrideWith(
        (ref) => SecureLocationConsentStore(
          cofre,
          ownerResolver: () => locationConsentOwnerOf(ref),
        ),
      ),
      appAppearanceStoreProvider.overrideWithValue(
        SecureAppAppearanceStore(cofre),
      ),
      deviceLocationProvider.overrideWithValue(
        const PendingDeviceLocationProvider(),
      ),
      telemetrySignalSourceProvider.overrideWithValue(
        const FixedTelemetrySignalSource(TelemetrySignalType.wifi),
      ),
    ],
  );
  addTearDown(c.dispose);
  final aberto = await c.read(authStateProvider.future);
  expect(aberto.session!.user.tenantId, _orgA);
  final app = _App(srv, db, c, cofre, blobs);
  await app.bootEm(_orgA);
  return app;
}

// ── Sementes e retratos ──────────────────────────────────────────────────────

WorkOrder _os(
  String localId,
  String serverId, {
  SyncStatus sync = SyncStatus.synced,
}) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _orgA,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 11, 20),
);

SyncAction _acao(String id, String org, Map<String, Object?> payload) =>
    SyncAction(
      clientActionId: id,
      tenantId: org,
      userId: _userOf(org),
      type: WorkOrderSyncActionTypes.create,
      payload: payload,
      status: SyncStatus.pending,
      retryCount: 0,
      createdAt: DateTime.utc(2026, 11, 20, 10),
    );

/// Toda linha de A no banco local: as tabelas com `tenant_id` (por
/// `tenant_id = A`) e as da vistoria-mãe (pelo `run_id` das vistorias de A).
Future<Map<String, List<Map<String, Object?>>>> _retratoA(
  AppDatabase db,
) async {
  final out = <String, List<Map<String, Object?>>>{};
  final tabelas = await db
      .customSelect(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .get();
  for (final t in tabelas) {
    final nome = t.read<String>('name');
    final cols = await db.customSelect('PRAGMA table_info($nome)').get();
    final nomes = {for (final c in cols) c.read<String>('name')};
    String? onde;
    if (nomes.contains('tenant_id')) {
      onde = 'tenant_id = ?';
    } else if (nomes.contains('run_id')) {
      onde =
          'run_id IN (SELECT local_id FROM checklist_runs WHERE tenant_id = ?)';
    }
    if (onde == null) continue;
    final linhas = await db
        .customSelect(
          'SELECT * FROM $nome WHERE $onde ORDER BY rowid',
          variables: [Variable<String>(_orgA)],
        )
        .get();
    out[nome] = [for (final l in linhas) Map.of(l.data)];
  }
  return out;
}

Future<int> _conta(AppDatabase db, String sql) async =>
    (await db.customSelect(sql).get()).length;

void main() {
  // ── T11: nada perdido ──────────────────────────────────────────────────────

  test('[T11] a troca para B e o pull de B com o _reconcile deixam toda linha '
      'de A igual (Drift, foto, consentimento e aparência)', () async {
    final app = await _abre();
    final c = app.c;
    final store = DriftWorkOrderLocalStore(app.db);
    // OS de A: a sincronizada (sem pendência) e a pendente; linha do tempo;
    // evidência com o arquivo da foto.
    await store.saveWorkOrder(_os('wo-a1', 'srv-org-a-1'));
    await store.saveWorkOrder(
      _os('wo-a2', 'srv-org-a-2', sync: SyncStatus.pending),
    );
    await store.saveTimelineEvent(
      WorkOrderTimelineEvent(
        localId: 'tl-a1',
        workOrderLocalId: 'wo-a1',
        tenantId: _orgA,
        eventType: WorkOrderTimelineEventType.values.first,
        occurredAt: DateTime.utc(2026, 11, 20, 9),
      ),
    );
    final foto = Uint8List.fromList(List<int>.filled(16, 3));
    final blobRef = await app.blobs.save(foto, contentType: 'image/jpeg');
    await store.saveEvidence(
      WorkOrderEvidence(
        localId: 'ev-a1',
        workOrderLocalId: 'wo-a1',
        tenantId: _orgA,
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: foto.length,
        captureSource: 'camera',
        syncStatus: SyncStatus.pending,
        createdAt: DateTime.utc(2026, 11, 20, 9),
        localBlobRef: blobRef,
      ),
    );
    // Vistoria de A, com anexo.
    final checklist = DriftChecklistLocalStore(app.db);
    await checklist.saveRun(
      MobileChecklistRun(
        localId: 'run-a1',
        tenantId: _orgA,
        checklistId: 'cl-a',
        workOrderId: 'srv-org-a-1',
        schemaVersion: '1',
        status: MobileChecklistRunStatus.inProgress,
        executedByUserId: 'u-a',
        startedAt: DateTime.utc(2026, 11, 20, 9),
        syncStatus: SyncStatus.pending,
        answers: const {},
      ),
    );
    await checklist.saveAttachment(
      MobileChecklistAttachmentMetadata(
        localId: 'att-a1',
        runId: 'run-a1',
        fieldId: 'frente',
        fileName: 'frente.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: foto.length,
        syncStatus: SyncStatus.pending,
        localBlobRef: blobRef,
      ),
    );
    // Despesa de A com recibo (e as ações dela na fila).
    final despesas = c.read(expenseRepositoryProvider);
    final rel = await despesas.createReport(
      title: 'Viagem A',
      advanceAmount: 0,
    );
    final item = await despesas.addItem(
      reportId: rel.report.localId,
      categoryId: 'fuel',
      amount: 50,
      city: 'Campinas',
      vendorName: 'Posto',
    );
    await despesas.attachReceiptPlaceholder(
      reportLocalId: rel.report.localId,
      itemLocalId: item.report.items.last.localId,
      fileName: 'nota.jpg',
      mimeType: 'image/jpeg',
      bytes: foto,
      sha256: 'a' * 64,
    );
    // Uma ação de OS de A na fila, uma posição e um evento de telemetria.
    await c
        .read(syncQueueRepositoryProvider)
        .enqueue(_acao('o-a9', _orgA, {'local_id': 'wo-a2', 'title': 'OS a2'}));
    await DriftFieldLocationStore(app.db).save(
      FieldLocationEvent(
        localId: 'pos-a1',
        tenantId: _orgA,
        workOrderLocalId: 'wo-a1',
        latitude: -23.5,
        longitude: -46.6,
        recordedAt: DateTime.utc(2026, 11, 20, 9),
        syncStatus: SyncStatus.pending,
        retryCount: 0,
        createdAt: DateTime.utc(2026, 11, 20, 9),
      ),
    );
    await DriftTelemetryLocalStore(app.db).save(
      TelemetryEvent(
        localId: 'tel-a1',
        tenantId: _orgA,
        clientActionId: 'tel-cid-a1',
        eventType: TelemetryEventType.heartbeat,
        capturedAt: DateTime.utc(2026, 11, 20, 9),
        syncStatus: SyncStatus.pending,
        retryCount: 0,
        createdAt: DateTime.utc(2026, 11, 20, 9),
      ),
    );
    // Consentimento e aparência de A.
    await c.read(locationConsentStoreProvider).acceptManualCapture();
    final gravou = await c
        .read(appAppearanceStoreProvider)
        .write(
          const AppAppearanceOwner(tenantId: _orgA, userId: 'u-a'),
          'dashboard',
          AppAppearance.b,
        );
    expect(gravou, isTrue);

    final antes = await _retratoA(app.db);
    final cofreAntes = Map.of(app.cofre.m);
    expect(antes['work_orders'], hasLength(2));
    expect(antes['sync_actions'], isNotEmpty);
    expect(antes['expense_receipts'], hasLength(1));
    expect(antes['checklist_attachments'], hasLength(1));
    expect(cofreAntes, isNotEmpty);

    await app.troca(_orgB);
    await app.bootEm(_orgB);
    final repo = c.read(workOrderRepositoryProvider);
    final pull = await repo.refresh();
    expect(pull, WorkOrderPullOutcome.success);
    expect(repo.lastPullIncomplete, isFalse, reason: 'o _reconcile rodou');
    expect(app.srv.para('/api/v1/work-orders').map((r) => r.org), [_orgB]);

    final depois = await _retratoA(app.db);
    expect(jsonEncode(depois), jsonEncode(antes));
    for (final e in cofreAntes.entries) {
      expect(app.cofre.m[e.key], e.value, reason: 'cofre ${e.key}');
    }
    expect(await app.blobs.load(blobRef), isNotNull, reason: 'a foto fica');
    // E a OS de B chegou, como de B.
    expect(
      await _conta(
        app.db,
        "SELECT 1 FROM work_orders WHERE tenant_id = 'org-b' AND server_id = 'srv-org-b-1'",
      ),
      1,
    );
  });

  // ── T11b: o repositório nunca junta o cliente de B com o bootstrap de A ────

  /// Abre em A com a OS sincronizada de A no Drift e o bootstrap de B preso.
  /// [naJanela] roda NO MESMO PASSO em que a sessão vira B (um ouvinte do
  /// estado da sessão, como uma tela que reage à troca).
  Future<_App> janela(Future<void> Function(_App app) naJanela) async {
    final app = await _abre();
    await DriftWorkOrderLocalStore(
      app.db,
    ).saveWorkOrder(_os('wo-a1', 'srv-org-a-1'));
    app.srv.portaoBootB = Completer<void>();
    Future<void>? pedido;
    final sub = app.c.listen<AsyncValue<AuthState>>(authStateProvider, (
      _,
      next,
    ) {
      final org = next.asData?.value.session?.user.tenantId;
      if (org == _orgB && pedido == null) pedido = naJanela(app);
    });
    await app.troca(_orgB);
    sub.close();
    expect(pedido, isNotNull, reason: 'o ouvinte viu a sessão B');
    await pedido;
    return app;
  }

  test('[T11b-OS] no passo do login em B: 0 pull com o bootstrap de A; a OS '
      'de A fica e nada de B é gravado como de A', () async {
    final app = await janela((app) async {
      await app.c.read(workOrderRepositoryProvider).refresh();
    });
    expect(
      app.srv.para('/api/v1/work-orders').where((r) => r.org == _orgB),
      isEmpty,
    );
    expect(
      await _conta(
        app.db,
        "SELECT 1 FROM work_orders WHERE server_id = 'srv-org-a-1' AND tenant_id = 'org-a'",
      ),
      1,
    );
    expect(
      await _conta(
        app.db,
        "SELECT 1 FROM work_orders WHERE server_id = 'srv-org-b-1'",
      ),
      0,
    );
    app.srv.portaoBootB!.complete();
  });

  test(
    '[T11b-OS-demo] 20 ms depois (o bootstrap de B carregando cai no de '
    'demonstração): 0 pull, nada gravado como da organização de demonstração',
    () async {
      final app = await _abre();
      await DriftWorkOrderLocalStore(
        app.db,
      ).saveWorkOrder(_os('wo-a1', 'srv-org-a-1'));
      app.srv.portaoBootB = Completer<void>();
      await app.troca(_orgB);
      app.c.read(
        bootstrapSessionProvider,
      ); // o recálculo de B começa (e fica preso)
      await Future<void>.delayed(const Duration(milliseconds: 20));
      final boot = app.c.read(bootstrapSessionProvider);
      expect(
        boot.isLoading,
        isTrue,
        reason: 'o bootstrap de B ainda está preso',
      );
      await app.c.read(workOrderRepositoryProvider).refresh();
      expect(
        app.srv.para('/api/v1/work-orders').where((r) => r.org == _orgB),
        isEmpty,
      );
      expect(
        await _conta(
          app.db,
          "SELECT 1 FROM work_orders WHERE tenant_id = 'tenant-demo'",
        ),
        0,
      );
      expect(
        await _conta(
          app.db,
          "SELECT 1 FROM work_orders WHERE server_id = 'srv-org-b-1'",
        ),
        0,
      );
      expect(
        await _conta(
          app.db,
          "SELECT 1 FROM work_orders WHERE server_id = 'srv-org-a-1' AND tenant_id = 'org-a'",
        ),
        1,
      );
      app.srv.portaoBootB!.complete();
    },
  );

  test('[T11b-checklist] no passo do login em B: o modelo de B não é gravado '
      'como de A', () async {
    final app = await janela((app) async {
      await app.c.read(checklistRepositoryProvider).refresh();
    });
    expect(
      app.srv
          .para('/api/v1/mobile/checklists/available')
          .where((r) => r.org == _orgB),
      isEmpty,
    );
    expect(
      await _conta(
        app.db,
        "SELECT 1 FROM checklist_templates WHERE id = 'tpl-org-b'",
      ),
      0,
    );
    app.srv.portaoBootB!.complete();
  });

  test('[T11b-prestador] no passo do login em B: o estoque de B não é gravado '
      'no cache de A', () async {
    final app = await janela((app) async {
      await app.c.read(prestadorRepositoryProvider).loadTechnicianStock();
    });
    expect(
      app.srv
          .para('/api/v1/mobile/technician/stock')
          .where((r) => r.org == _orgB),
      isEmpty,
    );
    expect(
      await _conta(
        app.db,
        "SELECT 1 FROM technician_stock_cache WHERE items_json LIKE '%SKU-org-b%'",
      ),
      0,
    );
    app.srv.portaoBootB!.complete();
  });

  // ── T12: a volta ───────────────────────────────────────────────────────────

  test('[T12] de B para A, as ações de A sobem com tok-a e saem da fila; '
      'nenhuma ação de B sai com tok-a', () async {
    final app = await _abre();
    final fila = app.c.read(syncQueueRepositoryProvider);
    await fila.enqueue(
      _acao('o-a1', _orgA, {'local_id': 'wo-a1', 'title': 'OS a1'}),
    );
    await fila.enqueue(
      _acao('o-b1', _orgB, {'local_id': 'wo-b1', 'title': 'OS b1'}),
    );

    await app.troca(_orgB);
    await app.bootEm(_orgB);
    await app.passada();
    await app.troca(_orgA);
    await app.bootEm(_orgA);
    await app.passada();

    final lotes = app.srv.para('/api/v1/mobile/sync/work-order-actions');
    final comA = [
      for (final r in lotes.where((r) => r.org == _orgA)) ..._acoes(r.body),
    ];
    final comB = [
      for (final r in lotes.where((r) => r.org == _orgB)) ..._acoes(r.body),
    ];
    expect(comA, ['o-a1'], reason: 'as ações de A sobem com tok-a');
    expect(comB, ['o-b1'], reason: 'a de B subiu em B, com tok-b');
    final a = (await fila.actionsForTenant(_orgA)).single;
    expect(a.status, SyncStatus.synced, reason: 'a ação de A saiu da fila');
  });

  // ── T13: nada vaza na tela ─────────────────────────────────────────────────

  test('[T13] em B, o que a lista de OS, a rota da OS, Finanças, Sincronização '
      'e Início leem é só de B', () async {
    // Medido na camada que cada tela lê (o mesmo provider e o mesmo filtro):
    // lista e Início → `workOrderRepositoryProvider.workOrders`
    // (`home_screen.dart:143`); rota `/work-orders/<id>` → `findById`
    // (`work_order_detail_screen.dart:179`); Finanças →
    // `expenseRepositoryProvider.reports` (`expense_list_screen.dart:85`);
    // Sincronização → `actionsForTenant(<organização do bootstrap>)` +
    // `partitionByUser` (`sync_screen.dart:197-200`); a contagem da troca →
    // `pendingCountForActiveSessionProvider`.
    final app = await _abre();
    final c = app.c;
    await DriftWorkOrderLocalStore(
      app.db,
    ).saveWorkOrder(_os('wo-a1', 'srv-org-a-1'));
    final relA = await c
        .read(expenseRepositoryProvider)
        .createReport(title: 'Viagem A', advanceAmount: 0);
    await c
        .read(syncQueueRepositoryProvider)
        .enqueue(_acao('o-a1', _orgA, {'local_id': 'wo-a1', 'title': 'OS a1'}));

    await app.troca(_orgB);
    await app.bootEm(_orgB);
    final boot = await c.read(bootstrapSessionProvider.future);
    final repo = c.read(workOrderRepositoryProvider);
    await repo.load();
    final fim = DateTime.now().add(const Duration(seconds: 5));
    while (repo.isPulling && DateTime.now().isBefore(fim)) {
      await Future<void>.delayed(const Duration(milliseconds: 5));
    }
    expect(repo.lastPullError, isNull);

    // Lista de OS e Início.
    expect(repo.workOrders, isNotEmpty);
    expect(repo.workOrders.map((o) => o.tenantId).toSet(), {_orgB});
    expect(repo.workOrders.map((o) => o.localId), isNot(contains('wo-a1')));
    // A rota direta da OS de A.
    expect(repo.findById('wo-a1'), isNull);
    // Finanças.
    final despesas = c.read(expenseRepositoryProvider);
    await despesas.load();
    expect(
      despesas.reports.map((r) => r.localId),
      isNot(contains(relA.report.localId)),
    );
    expect(despesas.reports.where((r) => r.tenantId != _orgB), isEmpty);
    // Sincronização (e o Início, que conta pela mesma fila).
    final daTela = await c
        .read(syncQueueRepositoryProvider)
        .actionsForTenant(boot.activeTenant.tenantId);
    expect(daTela.where((a) => a.tenantId == _orgA), isEmpty);
    expect(daTela.map((a) => a.clientActionId), isNot(contains('o-a1')));
    // A contagem da tela de troca, em B.
    expect(await c.read(pendingCountForActiveSessionProvider.future), 0);
  });

  // ── T15b: a contagem da tela de troca ──────────────────────────────────────

  test(
    '[T15b] as pendências da organização atual, só da pessoa da sessão',
    () async {
      final app = await _abre();
      final fila = app.c.read(syncQueueRepositoryProvider);
      await fila.enqueue(_acao('a1', _orgA, {'local_id': 'x1', 'title': 'x'}));
      await fila.enqueue(_acao('a2', _orgA, {'local_id': 'x2', 'title': 'x'}));
      await fila.enqueue(
        SyncAction(
          clientActionId: 'a3-outro',
          tenantId: _orgA,
          userId: 'u-outro',
          type: WorkOrderSyncActionTypes.create,
          payload: const {'local_id': 'x3', 'title': 'x'},
          status: SyncStatus.pending,
          retryCount: 0,
          createdAt: DateTime.utc(2026, 11, 20, 10),
        ),
      );
      for (final id in ['b1', 'b2', 'b3']) {
        await fila.enqueue(_acao(id, _orgB, {'local_id': id, 'title': 'x'}));
      }
      expect(await app.c.read(pendingCountForActiveSessionProvider.future), 2);
    },
  );

  // ── T17: o DISCONNECT de A ─────────────────────────────────────────────────

  test('[T17] a passada de B não leva evento de A; na volta, o DISCONNECT(A) '
      'sai com tok-a e sai do armazenamento', () async {
    final app = await _abre();
    final tele = DriftTelemetryLocalStore(app.db);
    // O app conectado em A (o CONNECT do login).
    await app.c
        .read(telemetryCaptureServiceProvider)
        .recordAppConnect(tenantId: _orgA);

    await app.troca(_orgB);
    await app.bootEm(_orgB);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    final deA = await tele.eventsForTenant(_orgA);
    final disconnectA = deA
        .where((e) => e.eventType == TelemetryEventType.appDisconnect)
        .toList();
    expect(
      disconnectA,
      hasLength(1),
      reason: 'o DISCONNECT(A) ficou na fila de A',
    );
    final idsDeA = {for (final e in deA) e.clientActionId};

    await app.passada();
    final enviadosB = [
      for (final r
          in app.srv
              .para('/api/v1/mobile/telemetry')
              .where((r) => r.org == _orgB))
        ..._eventos(r.body),
    ];
    expect(enviadosB, isNotEmpty, reason: 'o lote de B saiu');
    expect(
      enviadosB.where(idsDeA.contains),
      isEmpty,
      reason: '0 evento de A com tok-b',
    );

    await app.troca(_orgA);
    await app.bootEm(_orgA);
    await app.passada();
    final enviadosA = [
      for (final r
          in app.srv
              .para('/api/v1/mobile/telemetry')
              .where((r) => r.org == _orgA))
        ..._eventos(r.body),
    ];
    expect(enviadosA, contains(disconnectA.single.clientActionId));
    final restantes = {
      for (final e in await tele.eventsForTenant(_orgA)) e.clientActionId,
    };
    expect(restantes, isNot(contains(disconnectA.single.clientActionId)));
  });
}
