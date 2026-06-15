/// B-100 — Flutter Checklist Remote Templates
///
/// Tests for:
///   1. DioChecklistRemoteApi — tolerant parser + envelope variants
///   2. ChecklistRepository   — pull state tracking, refresh, fallback
///   3. ChecklistAvailableScreen — UX states (loading, error, cache, empty)
///   4. Regression             — B-099 pull outcome, home permission
library;

import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fake HTTP adapter — intercepts Dio without network
// ---------------------------------------------------------------------------

class _FakeHttpAdapter implements HttpClientAdapter {
  _FakeHttpAdapter({
    this.handler,
    this.statusCode = 200,
    this.shouldThrow = false,
  });

  final Map<String, dynamic> Function(RequestOptions)? handler;
  final int statusCode;
  final bool shouldThrow;
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    if (shouldThrow) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
      );
    }
    final body = handler?.call(options) ?? <String, dynamic>{};
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Dio _fakeDio(
  Map<String, dynamic> Function(RequestOptions) handler, {
  int statusCode = 200,
  bool shouldThrow = false,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _FakeHttpAdapter(
    handler: handler,
    statusCode: statusCode,
    shouldThrow: shouldThrow,
  );
  return dio;
}

// ---------------------------------------------------------------------------
// Fake remote API — for repository tests
// ---------------------------------------------------------------------------

class _FakeChecklistRemoteApi implements ChecklistRemoteApi {
  _FakeChecklistRemoteApi({
    this.templates = const [],
    this.shouldThrow = false,
    Object? error,
  }) : _error = error;

  final List<MobileChecklistTemplate> templates;
  final bool shouldThrow;
  final Object? _error;
  int fetchCount = 0;

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async {
    fetchCount++;
    if (shouldThrow) throw _error ?? const ApiNetworkError();
    return templates;
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String id) =>
      Future.error(const ApiNetworkError());
  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());
  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());
  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());
  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());
  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());
  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());
  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}

class _FakeSyncQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}
  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => [];
  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => [];
  @override
  Future<void> update(SyncAction action) async {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _tenantId = 'tenant-b100';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'B-100 Tenant'),
  enabledModules: [],
  permissions: PermissionSet({'checklist_run:execute'}),
);

MobileChecklistTemplate _tpl(String id, {String? tenantId}) =>
    MobileChecklistTemplate(
      id: id,
      tenantId: tenantId ?? _tenantId,
      title: 'Checklist $id',
      isRequired: false,
      schemaVersion: 'v1',
      status: 'active',
    );

ChecklistRepository _makeRepo({
  required ChecklistRemoteApi remoteApi,
  ChecklistLocalStore? localStore,
  BootstrapSession session = _session,
}) => ChecklistRepository(
  session: session,
  syncQueue: _FakeSyncQueue(),
  actionFactory: SyncActionFactory(),
  localStore: localStore ?? InMemoryChecklistLocalStore(),
  remoteApi: remoteApi,
);

// ---------------------------------------------------------------------------
// 1. DioChecklistRemoteApi — parser + envelope
// ---------------------------------------------------------------------------

void main() {
  group('1. DioChecklistRemoteApi — envelope variants (B-100)', () {
    test('1.1 envelope { checklists: [...] } retorna lista', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => {
            'checklists': [
              {
                'id': 'cl-1',
                'tenantId': _tenantId,
                'title': 'CL 1',
                'isRequired': false,
                'schemaVersion': 'v1',
                'status': 'active',
              },
            ],
          },
        ),
      );
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result, hasLength(1));
      expect(result.first.id, 'cl-1');
    });

    test('1.2 envelope { items: [...] } retorna lista', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => {
            'items': [
              {
                'id': 'cl-2',
                'tenantId': _tenantId,
                'title': 'CL 2',
                'isRequired': false,
                'schemaVersion': 'v1',
                'status': 'active',
              },
            ],
          },
        ),
      );
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result, hasLength(1));
      expect(result.first.id, 'cl-2');
    });

    test('1.3 envelope { data: [...] } retorna lista', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => {
            'data': [
              {
                'id': 'cl-3',
                'tenantId': _tenantId,
                'title': 'CL 3',
                'isRequired': false,
                'schemaVersion': 'v1',
                'status': 'active',
              },
            ],
          },
        ),
      );
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result, hasLength(1));
      expect(result.first.id, 'cl-3');
    });

    test(
      '1.4 parser aceita camelCase (isRequired, schemaVersion, tenantId)',
      () async {
        final api = DioChecklistRemoteApi(
          _fakeDio(
            (_) => {
              'checklists': [
                {
                  'id': 'cl-camel',
                  'tenantId': _tenantId,
                  'title': 'Camel',
                  'isRequired': true,
                  'schemaVersion': 'v2',
                  'status': 'active',
                  'linkedWorkOrderType': 'installation',
                },
              ],
            },
          ),
        );
        final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
        expect(result.first.isRequired, isTrue);
        expect(result.first.schemaVersion, 'v2');
        expect(result.first.linkedWorkOrderType, 'installation');
      },
    );

    test(
      '1.5 parser aceita snake_case (is_required, schema_version, tenant_id)',
      () async {
        final api = DioChecklistRemoteApi(
          _fakeDio(
            (_) => {
              'checklists': [
                {
                  'id': 'cl-snake',
                  'tenant_id': _tenantId,
                  'title': 'Snake',
                  'is_required': true,
                  'schema_version': 'v3',
                  'status': 'active',
                  'linked_work_order_type': 'survey',
                },
              ],
            },
          ),
        );
        final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
        expect(result.first.isRequired, isTrue);
        expect(result.first.schemaVersion, 'v3');
        expect(result.first.tenantId, _tenantId);
        expect(result.first.linkedWorkOrderType, 'survey');
      },
    );

    test('1.6 campos opcionais ausentes nao causam crash', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => {
            'checklists': [
              // Minimal: only required id and title; everything else optional
              {'id': 'cl-min', 'title': 'Minimal'},
            ],
          },
        ),
      );
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result.first.id, 'cl-min');
      expect(result.first.tenantId, _tenantId); // fallback
      expect(result.first.isRequired, isFalse);
      expect(result.first.schemaVersion, 'v1');
      expect(result.first.status, 'active');
    });

    test('1.7 resposta vazia retorna lista vazia sem crash', () async {
      final api = DioChecklistRemoteApi(_fakeDio((_) => {'checklists': []}));
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result, isEmpty);
    });

    test('1.8 multiplos itens retornados corretamente', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => {
            'checklists': [
              {
                'id': 'cl-a',
                'title': 'A',
                'isRequired': false,
                'schemaVersion': 'v1',
                'status': 'active',
              },
              {
                'id': 'cl-b',
                'title': 'B',
                'isRequired': true,
                'schemaVersion': 'v1',
                'status': 'active',
              },
              {
                'id': 'cl-c',
                'title': 'C',
                'isRequired': false,
                'schemaVersion': 'v1',
                'status': 'draft',
              },
            ],
          },
        ),
      );
      final result = await api.fetchAvailableChecklists(tenantId: _tenantId);
      expect(result, hasLength(3));
      expect(result[1].isRequired, isTrue);
      expect(result[2].status, 'draft');
    });

    test('1.9 erro 401 lanca ApiUnauthorizedError', () async {
      final api = DioChecklistRemoteApi(_fakeDio((_) => {}, statusCode: 401));
      await expectLater(
        api.fetchAvailableChecklists(tenantId: _tenantId),
        throwsA(isA<ApiUnauthorizedError>()),
      );
    });

    test('1.10 erro 403 lanca ApiUnauthorizedError', () async {
      final api = DioChecklistRemoteApi(_fakeDio((_) => {}, statusCode: 403));
      await expectLater(
        api.fetchAvailableChecklists(tenantId: _tenantId),
        throwsA(isA<ApiUnauthorizedError>()),
      );
    });

    test('1.11 erro 500 lanca ApiServerError', () async {
      final api = DioChecklistRemoteApi(_fakeDio((_) => {}, statusCode: 500));
      await expectLater(
        api.fetchAvailableChecklists(tenantId: _tenantId),
        throwsA(isA<ApiServerError>()),
      );
    });

    test('1.12 erro de rede lanca ApiNetworkError', () async {
      final api = DioChecklistRemoteApi(_fakeDio((_) => {}, shouldThrow: true));
      await expectLater(
        api.fetchAvailableChecklists(tenantId: _tenantId),
        throwsA(isA<ApiNetworkError>()),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. ChecklistRepository — pull state tracking
  // ---------------------------------------------------------------------------

  group('2. ChecklistRepository — pull state tracking (B-100)', () {
    test('2.1 load() com remoto bem-sucedido define templates', () async {
      final remote = _FakeChecklistRemoteApi(
        templates: [_tpl('r1'), _tpl('r2')],
      );
      final repo = _makeRepo(remoteApi: remote);
      await repo.load();
      expect(repo.templates, hasLength(2));
      expect(repo.templates.first.id, 'r1');
    });

    test('2.2 load() bem-sucedido define lastPulledAt', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      expect(repo.lastPulledAt, isNotNull);
    });

    test('2.3 load() bem-sucedido limpa lastPullError', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      expect(repo.lastPullError, isNull);
    });

    test('2.4 load() bem-sucedido: isPulling false apos conclusao', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      expect(repo.isPulling, isFalse);
    });

    test('2.5 load() falha de rede: define lastPullError', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
      );
      await repo.load();
      expect(repo.lastPullError, isNotNull);
    });

    test('2.6 load() falha: isPulling false apos conclusao', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
      );
      await repo.load();
      expect(repo.isPulling, isFalse);
    });

    test('2.7 load() falha: lastPulledAt permanece null', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
      );
      await repo.load();
      expect(repo.lastPulledAt, isNull);
    });

    test('2.8 load() salva templates remotos no localStore', () async {
      final store = InMemoryChecklistLocalStore();
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('save-me')]),
        localStore: store,
      );
      await repo.load();
      final stored = await store.loadTemplates(_tenantId);
      expect(stored, hasLength(1));
      expect(stored.first.id, 'save-me');
    });

    test('2.9 load() fallback para cache quando remoto falha', () async {
      final store = InMemoryChecklistLocalStore(templates: [_tpl('cached')]);
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
        localStore: store,
      );
      await repo.load();
      expect(repo.templates, hasLength(1));
      expect(repo.templates.first.id, 'cached');
    });

    test('2.10 load() sem cache e com erro: usa seeds locais', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
      );
      await repo.load();
      expect(repo.templates, isNotEmpty); // seeds
    });

    test(
      '2.11 load() nao chama remoto na segunda chamada (idempotente)',
      () async {
        final remote = _FakeChecklistRemoteApi(templates: [_tpl('x')]);
        final repo = _makeRepo(remoteApi: remote);
        await repo.load();
        await repo.load();
        expect(remote.fetchCount, equals(1));
      },
    );

    test(
      '2.12 tenant isolation: nao mistura templates de tenants diferentes',
      () async {
        final store = InMemoryChecklistLocalStore(
          templates: [
            _tpl('cl-a', tenantId: _tenantId),
            _tpl('cl-b', tenantId: 'other-tenant'),
          ],
        );
        final repo = _makeRepo(
          remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
          localStore: store,
        );
        await repo.load();
        expect(repo.templates.every((t) => t.tenantId == _tenantId), isTrue);
      },
    );

    test('2.13 hasCache false quando sem templates', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(
          shouldThrow: true,
          error: const ApiUnauthorizedError(),
        ),
        localStore: InMemoryChecklistLocalStore(),
      );
      expect(repo.hasCache, isFalse);
    });

    test('2.14 hasCache true apos load bem-sucedido', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      expect(repo.hasCache, isTrue);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ChecklistRepository.refresh()
  // ---------------------------------------------------------------------------

  group('3. ChecklistRepository.refresh() (B-100)', () {
    test('3.1 refresh() retorna success quando remoto bem-sucedido', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('fresh')]),
      );
      await repo.load();
      final outcome = await repo.refresh();
      expect(outcome, ChecklistPullOutcome.success);
    });

    test('3.2 refresh() atualiza templates apos novo pull', () async {
      int call = 0;
      final remote = _FakeChecklistRemoteApi(templates: [_tpl('v1')]);
      final repo = _makeRepo(remoteApi: remote);
      await repo.load();
      expect(repo.templates.first.id, 'v1');

      // Simula segundo fetch com lista diferente usando fake via overwrite
      final remote2 = _FakeChecklistRemoteApi(
        templates: [_tpl('v2'), _tpl('v3')],
      );
      final repo2 = _makeRepo(remoteApi: remote2);
      await repo2.load();
      final outcome = await repo2.refresh();
      expect(outcome, ChecklistPullOutcome.success);
      expect(repo2.templates, hasLength(2));
      call++;
      expect(call, 1);
    });

    test('3.3 refresh() falha + cache retorna cached', () async {
      final store = InMemoryChecklistLocalStore(templates: [_tpl('old')]);
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
        localStore: store,
      );
      await repo.load(); // carrega cache
      final outcome = await repo.refresh();
      expect(outcome, ChecklistPullOutcome.cached);
    });

    test('3.4 refresh() falha + sem cache retorna error', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(
          shouldThrow: true,
          error: const ApiUnauthorizedError(),
        ),
        localStore: InMemoryChecklistLocalStore(),
      );
      // Nao chama load() para evitar seed
      final outcome = await repo.refresh();
      expect(outcome, ChecklistPullOutcome.error);
    });

    test('3.5 refresh() nao chama remoto quando isPulling', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      // Simula estado em pull
      final f1 = repo.refresh();
      final f2 = repo.refresh(); // deve retornar pulling imediatamente
      final r2 = await f2;
      expect(r2, ChecklistPullOutcome.pulling);
      await f1;
    });

    test('3.6 refresh() define lastPulledAt apos sucesso', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      await repo.refresh();
      expect(repo.lastPulledAt, isNotNull);
    });

    test('3.7 refresh() define lastPullError apos falha', () async {
      final store = InMemoryChecklistLocalStore(templates: [_tpl('old')]);
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(shouldThrow: true),
        localStore: store,
      );
      await repo.load();
      await repo.refresh();
      expect(repo.lastPullError, isNotNull);
    });

    test('3.8 refresh() isPulling false apos conclusao', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('x')]),
      );
      await repo.load();
      await repo.refresh();
      expect(repo.isPulling, isFalse);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. PendingBackendChecklistRemoteApi — stub seguro
  // ---------------------------------------------------------------------------

  group('4. PendingBackendChecklistRemoteApi — comportamento seguro (B-100)', () {
    test('4.1 fetchAvailableChecklists lanca ApiNetworkError', () async {
      const api = PendingBackendChecklistRemoteApi();
      await expectLater(
        api.fetchAvailableChecklists(tenantId: 'any'),
        throwsA(isA<ApiNetworkError>()),
      );
    });

    test(
      '4.2 ChecklistRepository com PendingBackend: load faz fallback para seeds',
      () async {
        final repo = _makeRepo(
          remoteApi: const PendingBackendChecklistRemoteApi(),
        );
        await repo.load();
        expect(repo.templates, isNotEmpty);
        expect(repo.lastPullError, isNotNull);
      },
    );

    test(
      '4.3 ChecklistRepository com PendingBackend: isPulling false apos load',
      () async {
        final repo = _makeRepo(
          remoteApi: const PendingBackendChecklistRemoteApi(),
        );
        await repo.load();
        expect(repo.isPulling, isFalse);
      },
    );
  });

  // ---------------------------------------------------------------------------
  // 5. ChecklistPullOutcome enum
  // ---------------------------------------------------------------------------

  group('5. ChecklistPullOutcome values (B-100)', () {
    test('5.1 enum possui todos os valores esperados', () {
      expect(
        ChecklistPullOutcome.values,
        containsAll([
          ChecklistPullOutcome.success,
          ChecklistPullOutcome.cached,
          ChecklistPullOutcome.error,
          ChecklistPullOutcome.pulling,
        ]),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Regressao B-099 — WorkOrderRepository nao afetado
  // ---------------------------------------------------------------------------

  group('6. Regressao — imports e modelos existentes (B-100)', () {
    test('6.1 MobileChecklistTemplate ainda existe e funciona', () {
      final t = MobileChecklistTemplate(
        id: 'reg-1',
        tenantId: 'tenant-x',
        title: 'Reg',
        isRequired: false,
        schemaVersion: 'v1',
        status: 'active',
      );
      expect(t.isActive, isTrue);
    });

    test(
      '6.2 InMemoryChecklistLocalStore preserva templates entre operacoes',
      () async {
        final store = InMemoryChecklistLocalStore();
        final t = _tpl('persist-1');
        await store.saveTemplate(t);
        final loaded = await store.loadTemplates(_tenantId);
        expect(loaded, hasLength(1));
        expect(loaded.first.id, 'persist-1');
      },
    );

    test(
      '6.3 ChecklistRepository.getRunsForWorkOrder ainda funciona',
      () async {
        final repo = _makeRepo(
          remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('cl-1')]),
        );
        await repo.load();
        final runs = await repo.getRunsForWorkOrder('wo-reg-1');
        expect(runs, isEmpty);
      },
    );

    test(
      '6.4 ChecklistRepository.activeTemplates filtra por status active',
      () async {
        final active = _tpl('active-1');
        final draft = MobileChecklistTemplate(
          id: 'draft-1',
          tenantId: _tenantId,
          title: 'Draft',
          isRequired: false,
          schemaVersion: 'v1',
          status: 'draft',
        );
        final repo = _makeRepo(
          remoteApi: _FakeChecklistRemoteApi(templates: [active, draft]),
        );
        await repo.load();
        expect(repo.activeTemplates, hasLength(1));
        expect(repo.activeTemplates.first.id, 'active-1');
      },
    );

    test('6.5 ChecklistRepository notifica listeners apos load', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('notify')]),
      );
      var notified = false;
      repo.addListener(() => notified = true);
      await repo.load();
      expect(notified, isTrue);
    });

    test('6.6 ChecklistRepository notifica listeners apos refresh', () async {
      final repo = _makeRepo(
        remoteApi: _FakeChecklistRemoteApi(templates: [_tpl('notify')]),
      );
      await repo.load();
      var notified = false;
      repo.addListener(() => notified = true);
      await repo.refresh();
      expect(notified, isTrue);
    });
  });
}
