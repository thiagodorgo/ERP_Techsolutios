import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fake HTTP adapter — intercepts Dio requests without network
// ---------------------------------------------------------------------------

class _FakeHttpAdapter implements HttpClientAdapter {
  _FakeHttpAdapter({this.handler, this.shouldThrow = false});

  final Map<String, dynamic> Function(RequestOptions)? handler;
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
      200,
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
  bool shouldThrow = false,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _FakeHttpAdapter(
    handler: handler,
    shouldThrow: shouldThrow,
  );
  return dio;
}

// ---------------------------------------------------------------------------
// Fake ChecklistRemoteApi — for repository fallback tests
// ---------------------------------------------------------------------------

class _FakeChecklistRemoteApi implements ChecklistRemoteApi {
  _FakeChecklistRemoteApi({
    this.availableTemplates = const [],
    this.schemaByChecklistId = const {},
    this.shouldThrow = false,
  });

  final List<MobileChecklistTemplate> availableTemplates;
  final Map<String, MobileChecklistSchema> schemaByChecklistId;
  final bool shouldThrow;

  String? lastFetchedTenantId;
  String? lastFetchedSchemaId;

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
    lastFetchedTenantId = tenantId;
    return availableTemplates;
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) async {
    if (shouldThrow) throw const ApiNetworkError();
    lastFetchedSchemaId = checklistId;
    final schema = schemaByChecklistId[checklistId];
    if (schema == null) throw const ApiNetworkError();
    return schema;
  }

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
    return 'srv-run-test-1';
  }

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
  }

  @override
  Future<void> completeRun(String runId) async {
    if (shouldThrow) throw const ApiNetworkError();
  }

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
  }

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
  }

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
  }

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) async {
    if (shouldThrow) throw const ApiNetworkError();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

ChecklistRepository _makeRepo({
  required ChecklistRemoteApi remoteApi,
  ChecklistLocalStore? localStore,
}) {
  return ChecklistRepository(
    session: devBootstrapSession,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: localStore ?? InMemoryChecklistLocalStore(),
    remoteApi: remoteApi,
  );
}

MobileChecklistTemplate _tpl(String id) => MobileChecklistTemplate(
  id: id,
  tenantId: 'tenant-demo',
  title: 'Checklist $id',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

MobileChecklistSchema _schema(String checklistId) => MobileChecklistSchema(
  id: 'schema-$checklistId',
  checklistId: checklistId,
  version: 'v1',
  title: 'Schema $checklistId',
  fields: const [
    MobileChecklistField(
      id: 'f-1',
      type: MobileChecklistFieldType.text,
      label: 'Campo 1',
      required: true,
      order: 1,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // -------------------------------------------------------------------------
  // Group 1: authenticatedApiConfigProvider — token injection
  // -------------------------------------------------------------------------

  group('authenticatedApiConfigProvider — token injection (B-089)', () {
    test('1. com sessao autenticada injeta accessToken no ApiConfig', () async {
      final storage = InMemoryAuthTokenStorage();
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(storage),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'tec@demo.com', password: 'pass123');

      final config = container.read(authenticatedApiConfigProvider);
      expect(config.accessToken, isNotNull);
      expect(config.accessToken, isNotEmpty);
    });

    test('2. sem sessao ApiConfig.accessToken e null', () {
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(
            InMemoryAuthTokenStorage(),
          ),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
        ],
      );
      addTearDown(container.dispose);

      final config = container.read(authenticatedApiConfigProvider);
      expect(config.accessToken, isNull);
    });
  });

  // -------------------------------------------------------------------------
  // Group 2: checklistRemoteApiProvider — wiring
  // -------------------------------------------------------------------------

  group('checklistRemoteApiProvider — wiring (B-089)', () {
    test('3. sem token retorna PendingBackendChecklistRemoteApi', () {
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(
            InMemoryAuthTokenStorage(),
          ),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
        ],
      );
      addTearDown(container.dispose);

      final api = container.read(checklistRemoteApiProvider);
      expect(api, isA<PendingBackendChecklistRemoteApi>());
    });

    test('4. com token retorna DioChecklistRemoteApi', () async {
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(
            InMemoryAuthTokenStorage(),
          ),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
        ],
      );
      addTearDown(container.dispose);

      await container
          .read(authStateProvider.notifier)
          .login(email: 'tec@demo.com', password: 'pass123');

      final api = container.read(checklistRemoteApiProvider);
      expect(api, isA<DioChecklistRemoteApi>());
    });
  });

  // -------------------------------------------------------------------------
  // Group 3: DioChecklistRemoteApi — HTTP endpoints
  // -------------------------------------------------------------------------

  group('DioChecklistRemoteApi — endpoints HTTP (B-089)', () {
    test(
      '5. fetchAvailableChecklists faz GET no endpoint correto e parseia templates',
      () async {
        final adapter = _FakeHttpAdapter(
          handler: (options) => {
            'checklists': [
              {
                'id': 'cl-remote-1',
                'tenantId': 'tenant-demo',
                'title': 'Checklist Remoto',
                'isRequired': true,
                'schemaVersion': 'v1',
                'status': 'active',
              },
            ],
          },
        );
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
        dio.transformer = SyncTransformer();
        dio.httpClientAdapter = adapter;

        final api = DioChecklistRemoteApi(dio);
        final templates = await api.fetchAvailableChecklists(
          tenantId: 'tenant-demo',
        );

        expect(templates.length, 1);
        expect(templates.first.id, 'cl-remote-1');
        expect(templates.first.isActive, isTrue);
        expect(templates.first.isRequired, isTrue);

        final req = adapter.captured.first;
        expect(req.method, 'GET');
        expect(req.path, ChecklistApiEndpoints.available);
        expect(req.queryParameters['tenantId'], 'tenant-demo');
      },
    );

    test(
      '6. fetchChecklistRender faz GET e parseia schema com campos',
      () async {
        final adapter = _FakeHttpAdapter(
          handler: (options) => {
            'id': 'schema-cl-1',
            'checklistId': 'cl-1',
            'version': 'v1',
            'title': 'Schema Remoto',
            'instructions': 'Preencha tudo.',
            'fields': [
              {
                'id': 'f-text',
                'type': 'text',
                'label': 'Descricao',
                'required': true,
                'order': 1,
              },
              {
                'id': 'f-choice',
                'type': 'single_choice',
                'label': 'Estado',
                'required': false,
                'order': 2,
                'options': [
                  {'value': 'ok', 'label': 'OK'},
                  {'value': 'nok', 'label': 'NOK'},
                ],
              },
            ],
          },
        );
        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
        dio.transformer = SyncTransformer();
        dio.httpClientAdapter = adapter;

        final api = DioChecklistRemoteApi(dio);
        final schema = await api.fetchChecklistRender('cl-1');

        expect(schema.checklistId, 'cl-1');
        expect(schema.fields.length, 2);
        expect(schema.fields.first.type, MobileChecklistFieldType.text);
        expect(schema.fields.last.type, MobileChecklistFieldType.singleChoice);
        expect(schema.fields.last.options?.length, 2);

        final req = adapter.captured.first;
        expect(req.method, 'GET');
        expect(req.path, ChecklistApiEndpoints.checklistRender('cl-1'));
      },
    );

    test('7. createRun faz POST e retorna runId do servidor', () async {
      final adapter = _FakeHttpAdapter(
        handler: (options) => {'runId': 'srv-run-abc123'},
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);
      final runId = await api.createRun(
        checklistId: 'cl-1',
        workOrderId: 'wo-1',
        tenantId: 'tenant-demo',
        userId: 'user-1',
      );

      expect(runId, 'srv-run-abc123');

      final req = adapter.captured.first;
      expect(req.method, 'POST');
      expect(req.path, ChecklistApiEndpoints.runs());
    });

    test('8. patchRun faz PATCH no endpoint correto', () async {
      final adapter = _FakeHttpAdapter(handler: (options) => {});
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);
      await api.patchRun(runId: 'run-srv-1', answers: {'f-text': 'valor'});

      final req = adapter.captured.first;
      expect(req.method, 'PATCH');
      expect(req.path, ChecklistApiEndpoints.run('run-srv-1'));
    });

    test('9. completeRun faz POST no endpoint de complete', () async {
      final adapter = _FakeHttpAdapter(handler: (options) => {});
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);
      await api.completeRun('run-srv-1');

      final req = adapter.captured.first;
      expect(req.method, 'POST');
      expect(req.path, ChecklistApiEndpoints.completeRun('run-srv-1'));
    });
  });

  // -------------------------------------------------------------------------
  // Group 4: DioChecklistRemoteApi — error mapping
  // -------------------------------------------------------------------------

  group('DioChecklistRemoteApi — mapeamento de erros (B-089)', () {
    test('10. erro de conexao lanca ApiNetworkError', () async {
      final dio = _fakeDio((_) => {}, shouldThrow: true);
      final api = DioChecklistRemoteApi(dio);

      expect(
        () => api.fetchAvailableChecklists(tenantId: 'tenant-demo'),
        throwsA(isA<ApiNetworkError>()),
      );
    });

    test('11. resposta 401 lanca ApiUnauthorizedError', () async {
      final adapter = _FakeHttpAdapter(
        handler: (options) {
          throw DioException(
            requestOptions: options,
            type: DioExceptionType.badResponse,
            response: Response(requestOptions: options, statusCode: 401),
          );
        },
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);

      expect(
        () => api.fetchAvailableChecklists(tenantId: 'tenant-demo'),
        throwsA(isA<ApiUnauthorizedError>()),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Group 5: ChecklistRepository — fallback local
  // -------------------------------------------------------------------------

  group('ChecklistRepository — fallback local-first (B-089)', () {
    test('12. load() usa templates remotos quando disponivel', () async {
      final remoteTemplates = [_tpl('remote-cl-1'), _tpl('remote-cl-2')];
      final remoteApi = _FakeChecklistRemoteApi(
        availableTemplates: remoteTemplates,
      );

      final repo = _makeRepo(remoteApi: remoteApi);
      await repo.load(seedIfEmpty: false);

      expect(repo.templates.length, 2);
      expect(repo.templates.first.id, 'remote-cl-1');
      expect(
        remoteApi.lastFetchedTenantId,
        devBootstrapSession.activeTenant.tenantId,
      );
    });

    test('13. load() cai para local quando remote lanca erro', () async {
      final localStore = InMemoryChecklistLocalStore();
      await localStore.saveTemplate(_tpl('local-cl-1'));

      final remoteApi = _FakeChecklistRemoteApi(shouldThrow: true);
      final repo = _makeRepo(remoteApi: remoteApi, localStore: localStore);
      await repo.load(seedIfEmpty: false);

      expect(repo.templates.length, 1);
      expect(repo.templates.first.id, 'local-cl-1');
    });

    test(
      '14. load() semeia local quando remote falha e local esta vazio',
      () async {
        final remoteApi = _FakeChecklistRemoteApi(shouldThrow: true);
        final repo = _makeRepo(remoteApi: remoteApi);
        await repo.load(seedIfEmpty: true);

        expect(repo.templates, isNotEmpty);
      },
    );

    test(
      '15. getSchema() retorna schema remoto e persiste localmente',
      () async {
        final remoteSchema = _schema('cl-1');
        final localStore = InMemoryChecklistLocalStore();
        final remoteApi = _FakeChecklistRemoteApi(
          schemaByChecklistId: {'cl-1': remoteSchema},
        );

        final repo = _makeRepo(remoteApi: remoteApi, localStore: localStore);
        final result = await repo.getSchema('cl-1');

        expect(result, isNotNull);
        expect(result!.checklistId, 'cl-1');
        expect(remoteApi.lastFetchedSchemaId, 'cl-1');

        // Confirm persisted to local store
        final cached = await localStore.loadSchema('cl-1');
        expect(cached, isNotNull);
      },
    );

    test('16. getSchema() cai para local quando remote lanca erro', () async {
      final localStore = InMemoryChecklistLocalStore();
      final localSchema = _schema('cl-1');
      await localStore.saveSchema(localSchema);

      final remoteApi = _FakeChecklistRemoteApi(shouldThrow: true);
      final repo = _makeRepo(remoteApi: remoteApi, localStore: localStore);
      final result = await repo.getSchema('cl-1');

      expect(result, isNotNull);
      expect(result!.checklistId, 'cl-1');
    });
  });

  // -------------------------------------------------------------------------
  // Group 6: Payload safety
  // -------------------------------------------------------------------------

  group('DioChecklistRemoteApi — payload seguro (B-089)', () {
    test('17. createRun nao inclui token/senha/path no payload', () async {
      final adapter = _FakeHttpAdapter(
        handler: (options) => {'runId': 'srv-run-safe'},
      );
      final dio = Dio(
        BaseOptions(
          baseUrl: 'https://test.local',
          headers: {
            'Authorization': 'Bearer test-token-safe',
            'Content-Type': 'application/json',
          },
        ),
      );
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);
      await api.createRun(
        checklistId: 'cl-1',
        workOrderId: 'wo-1',
        tenantId: 'tenant-demo',
        userId: 'user-1',
      );

      final payload = adapter.captured.first.data as Map<String, dynamic>;
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('bearer'), isFalse);
      expect(payload.containsKey('password'), isFalse);
      expect(payload.containsKey('checklistId'), isTrue);
      expect(payload.containsKey('workOrderId'), isTrue);
    });

    test('18. attachMetadata payload nao contem base64/path/token', () async {
      final adapter = _FakeHttpAdapter(handler: (options) => {});
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;

      final api = DioChecklistRemoteApi(dio);
      await api.attachMetadata(
        runId: 'run-srv-1',
        fieldId: 'f-photo',
        fileName: 'foto-evidencia.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
      );

      final payload = adapter.captured.first.data as Map<String, dynamic>;
      expect(payload.containsKey('base64'), isFalse);
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload['fileName'], 'foto-evidencia.jpg');
      expect(payload['sizeBytes'], 204800);
    });
  });
}
