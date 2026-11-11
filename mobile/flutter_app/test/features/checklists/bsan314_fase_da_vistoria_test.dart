import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-SAN3-14 — A FASE DA VISTORIA NO APP: o servidor declara a fase (`role`, só
// sob `roleAware=1`), o app casa por (modelo, fase) sem atalho, a entrega só
// existe no aparelho quando o servidor a confirmou, e a pré-carga deixa a
// coleta e a entrega no aparelho antes da estrada sem duplicar nem apagar.

final _tenant = devBootstrapSession.activeTenant.tenantId;
const _wo = 'wo-bsan314';
const _cl = 'cl-bsan314';

const _template = MobileChecklistTemplate(
  id: _cl,
  tenantId: 'ignored',
  title: 'Vistoria do Veículo',
  isRequired: true,
  schemaVersion: 'v1',
  status: 'active',
);

const _schema = MobileChecklistSchema(
  id: 'schema-bsan314',
  checklistId: _cl,
  version: 'v1',
  title: 'Vistoria do Veículo',
  fields: [],
);

class _FakeRemoteApi implements ChecklistRemoteApi {
  _FakeRemoteApi({this.runs = const [], this.offline = false});

  List<RemoteChecklistRun> runs;
  bool offline;
  final List<String> fetchedWorkOrderIds = [];
  final List<String> renderedChecklistIds = [];

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    fetchedWorkOrderIds.add(workOrderId);
    if (offline) throw const ApiNetworkError();
    return checklistId == null
        ? runs
        : runs.where((r) => r.checklistId == checklistId).toList();
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) {
    renderedChecklistIds.add(checklistId);
    if (offline) return Future.error(const ApiNetworkError());
    return Future.value(_schema);
  }

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

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

// Dio que responde a lista sem rede e guarda a query de cada chamada.
class _CaptureAdapter implements HttpClientAdapter {
  final List<Uri> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options.uri);
    return ResponseBody.fromString(
      '{"data":[{"id":"srv-e","templateId":"$_cl","status":"in_progress",'
      '"role":"delivery"},{"id":"srv-c","templateId":"$_cl",'
      '"status":"in_progress","role":"collection"}]}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

RemoteChecklistRun _remote(
  String id,
  MobileChecklistRunKind kind, {
  String status = 'in_progress',
  String checklistId = _cl,
}) => RemoteChecklistRun(
  id: id,
  checklistId: checklistId,
  status: status,
  relatedEntityType: 'work_order',
  relatedEntityId: _wo,
  kind: kind,
);

InMemoryChecklistLocalStore _store() =>
    InMemoryChecklistLocalStore(templates: [_template], schemas: [_schema]);

ChecklistRepository _repo(
  InMemoryChecklistLocalStore store,
  SyncQueueRepository queue,
  ChecklistRemoteApi remote,
) => ChecklistRepository(
  session: devBootstrapSession,
  syncQueue: queue,
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: remote,
);

MobileChecklistRun _local(
  String localId,
  MobileChecklistRunKind kind, {
  String? serverId,
  Map<String, MobileChecklistAnswer> answers = const {},
}) => MobileChecklistRun(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  checklistId: _cl,
  workOrderId: _wo,
  schemaVersion: 'v1',
  status: MobileChecklistRunStatus.inProgress,
  kind: kind,
  executedByUserId: 'u-bsan314',
  startedAt: DateTime.utc(2026, 11, 11),
  syncStatus: SyncStatus.pending,
  answers: answers,
);

final _answer = MobileChecklistAnswer(
  fieldId: 'f-retrovisor',
  textValue: 'Trincado',
  answeredAt: DateTime.utc(2026, 11, 11, 11),
);

Future<List<MobileChecklistRun>> _runs(InMemoryChecklistLocalStore s) =>
    s.loadRunsForWorkOrder(_wo);

void main() {
  group('B-SAN3-14 · a fase vem do servidor', () {
    test(
      'role generic e collection viram coleta; null e ausente viram coleta '
      'legada; delivery vira entrega; desconhecido vira unknown e não casa',
      () {
        expect(
          MobileChecklistRunKind.fromServerRole('generic'),
          MobileChecklistRunKind.collection,
        );
        expect(
          MobileChecklistRunKind.fromServerRole('collection'),
          MobileChecklistRunKind.collection,
        );
        expect(
          MobileChecklistRunKind.fromServerRole(null),
          MobileChecklistRunKind.collection,
        );
        expect(
          MobileChecklistRunKind.fromServerRole('delivery'),
          MobileChecklistRunKind.delivery,
        );
        expect(
          MobileChecklistRunKind.fromServerRole('custody_yard'),
          MobileChecklistRunKind.unknown,
        );
        // O estrito de antes não muda (protege o b123).
        expect(
          MobileChecklistRunKind.fromApiValue('generic'),
          MobileChecklistRunKind.unknown,
        );
      },
    );

    test('a busca de execuções envia roleAware=1 e lê a fase', () async {
      final adapter = _CaptureAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://erp.invalid/api/v1'))
        ..httpClientAdapter = adapter;
      final api = DioChecklistRemoteApi(dio);

      final runs = await api.fetchRunsForWorkOrder(_wo);

      expect(adapter.requests.single.queryParameters['roleAware'], '1');
      expect(adapter.requests.single.queryParameters['workOrderId'], _wo);
      expect(
        {for (final r in runs) r.id: r.kind},
        {
          'srv-e': MobileChecklistRunKind.delivery,
          'srv-c': MobileChecklistRunKind.collection,
        },
      );
    });
  });

  group('B-SAN3-14 · casamento por (modelo, fase), sem atalho', () {
    for (final status in ['in_progress', 'completed']) {
      test('servidor só com a coleta ($status): a entrega fica aguardando '
          'envio e não recebe serverId', () async {
        final store = _store();
        final repo = _repo(
          store,
          InMemorySyncQueueRepository(),
          _FakeRemoteApi(
            runs: [
              _remote(
                'srv-c',
                MobileChecklistRunKind.collection,
                status: status,
              ),
            ],
          ),
        );

        final res = await repo.resolveRunForWorkOrder(
          checklistId: _cl,
          workOrderId: _wo,
          schemaVersion: 'v1',
          kind: MobileChecklistRunKind.delivery,
        );

        expect(res.isAwaitingDispatch, isTrue);
        expect(
          (await _runs(
            store,
          )).where((r) => r.kind == MobileChecklistRunKind.delivery),
          isEmpty,
        );
      });
    }

    for (final order in ['coleta primeiro', 'entrega primeiro']) {
      test('coleta e entrega do mesmo modelo recebem serverIds distintos, '
          'em qualquer ordem da lista ($order)', () async {
        final collection = _remote('srv-c', MobileChecklistRunKind.collection);
        final delivery = _remote('srv-e', MobileChecklistRunKind.delivery);
        final store = _store();
        final repo = _repo(
          store,
          InMemorySyncQueueRepository(),
          _FakeRemoteApi(
            runs: order == 'coleta primeiro'
                ? [collection, delivery]
                : [delivery, collection],
          ),
        );

        final c = await repo.resolveRunForWorkOrder(
          checklistId: _cl,
          workOrderId: _wo,
          schemaVersion: 'v1',
        );
        final e = await repo.resolveRunForWorkOrder(
          checklistId: _cl,
          workOrderId: _wo,
          schemaVersion: 'v1',
          kind: MobileChecklistRunKind.delivery,
        );

        expect(c.run!.serverId, 'srv-c');
        expect(e.run!.serverId, 'srv-e');
        expect(e.run!.kind, MobileChecklistRunKind.delivery);
      });
    }

    test('entrega reaberta (role delivery) casa com a entrega local; a coleta '
        'segue na coleta', () async {
      final store = _store();
      final repo = _repo(
        store,
        InMemorySyncQueueRepository(),
        _FakeRemoteApi(
          runs: [
            // A versão reaberta da entrega vem primeiro (created_at desc).
            _remote('srv-e2', MobileChecklistRunKind.delivery),
            _remote(
              'srv-e1',
              MobileChecklistRunKind.delivery,
              status: 'completed',
            ),
            _remote(
              'srv-c',
              MobileChecklistRunKind.collection,
              status: 'completed',
            ),
          ],
        ),
      );

      final e = await repo.resolveRunForWorkOrder(
        checklistId: _cl,
        workOrderId: _wo,
        schemaVersion: 'v1',
        kind: MobileChecklistRunKind.delivery,
      );
      final c = await repo.resolveRunForWorkOrder(
        checklistId: _cl,
        workOrderId: _wo,
        schemaVersion: 'v1',
      );

      expect(e.run!.serverId, 'srv-e2');
      expect(c.run!.serverId, 'srv-c');
    });
  });

  group('B-SAN3-14 · a entrega só com confirmação do servidor (R-R2-02)', () {
    test('CRIT14R2-OFF1: entrega aberta sem sinal numa OS só com a coleta não '
        'cria run local (deliveryUnverified); com o sinal de volta fica '
        'aguardando envio e a OS não exige a entrega', () async {
      final store = _store();
      final remote = _FakeRemoteApi(
        runs: [_remote('srv-c', MobileChecklistRunKind.collection)],
        offline: true,
      );
      final repo = _repo(store, InMemorySyncQueueRepository(), remote);

      final off = await repo.resolveRunForWorkOrder(
        checklistId: _cl,
        workOrderId: _wo,
        schemaVersion: 'v1',
        kind: MobileChecklistRunKind.delivery,
      );
      expect(off.isDeliveryUnverified, isTrue);
      expect(off.run, isNull);
      expect(await _runs(store), isEmpty);

      remote.offline = false;
      final on = await repo.resolveRunForWorkOrder(
        checklistId: _cl,
        workOrderId: _wo,
        schemaVersion: 'v1',
        kind: MobileChecklistRunKind.delivery,
      );
      expect(on.isAwaitingDispatch, isTrue);
      expect(
        (await _runs(
          store,
        )).any((r) => r.kind == MobileChecklistRunKind.delivery),
        isFalse,
      );
    });

    test(
      'sem sinal, a entrega já confirmada no aparelho abre (offline)',
      () async {
        final store = _store();
        await store.saveRun(
          _local(
            'clrun-e_1',
            MobileChecklistRunKind.delivery,
            serverId: 'srv-e',
          ),
        );
        final repo = _repo(
          store,
          InMemorySyncQueueRepository(),
          _FakeRemoteApi(offline: true),
        );

        final res = await repo.resolveRunForWorkOrder(
          checklistId: _cl,
          workOrderId: _wo,
          schemaVersion: 'v1',
          kind: MobileChecklistRunKind.delivery,
        );

        expect(res.isReady, isTrue);
        expect(res.offline, isTrue);
        expect(res.run!.serverId, 'srv-e');
      },
    );

    test('run local de entrega sem serverId, com respostas, e servidor só com '
        'a coleta: awaitingDispatch, run e respostas preservadas, nenhuma '
        'ação nova na fila', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      await store.saveRun(
        _local(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          answers: {_answer.fieldId: _answer},
        ),
      );
      final repo = _repo(
        store,
        queue,
        _FakeRemoteApi(
          runs: [_remote('srv-c', MobileChecklistRunKind.collection)],
        ),
      );

      final res = await repo.resolveRunForWorkOrder(
        checklistId: _cl,
        workOrderId: _wo,
        schemaVersion: 'v1',
        kind: MobileChecklistRunKind.delivery,
      );

      expect(res.isAwaitingDispatch, isTrue);
      final stored = await store.loadRun('clrun-e_1');
      expect(stored, isNotNull);
      expect(stored!.serverId, isNull);
      expect(stored.answers.keys, [_answer.fieldId]);
      expect(await queue.actionsForTenant(_tenant), isEmpty);
    });
  });

  group('B-SAN3-14 · pré-carga (R-A5, R-R2-04)', () {
    test('pré-carga grava a entrega local com serverId e o schema do modelo '
        'em cache', () async {
      final store = InMemoryChecklistLocalStore(templates: [_template]);
      final remote = _FakeRemoteApi(
        runs: [
          _remote('srv-c', MobileChecklistRunKind.collection),
          _remote('srv-e', MobileChecklistRunKind.delivery),
        ],
      );
      final repo = _repo(store, InMemorySyncQueueRepository(), remote);

      await repo.prefetchRunsForWorkOrder(_wo);

      final runs = await _runs(store);
      final delivery = runs.singleWhere(
        (r) => r.kind == MobileChecklistRunKind.delivery,
      );
      expect(delivery.serverId, 'srv-e');
      expect(delivery.answers, isEmpty);
      expect(
        runs
            .singleWhere((r) => r.kind == MobileChecklistRunKind.collection)
            .serverId,
        'srv-c',
      );
      // O modelo fica no aparelho: a entrega abre sem sinal.
      expect(await store.loadSchema(_cl), isNotNull);
      expect(remote.fetchedWorkOrderIds, [_wo]);
    });

    test('entrega respondida sem serverId + pré-carga = uma run só, com '
        'respostas e kind preservados e as ações carimbadas', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      await store.saveRun(_local('clrun-e_1', MobileChecklistRunKind.delivery));
      final repo = _repo(
        store,
        queue,
        _FakeRemoteApi(
          runs: [_remote('srv-e', MobileChecklistRunKind.delivery)],
        ),
      );
      await repo.saveAnswer(runId: 'clrun-e_1', answer: _answer);

      await repo.prefetchRunsForWorkOrder(_wo);

      final deliveries = (await _runs(
        store,
      )).where((r) => r.kind == MobileChecklistRunKind.delivery).toList();
      expect(deliveries, hasLength(1));
      expect(deliveries.single.localId, 'clrun-e_1');
      expect(deliveries.single.serverId, 'srv-e');
      expect(deliveries.single.answers.keys, [_answer.fieldId]);
      final actions = await queue.actionsForTenant(_tenant);
      expect(actions, isNotEmpty);
      expect(
        actions.every((a) => a.payload['server_run_id'] == 'srv-e'),
        isTrue,
        reason: 'as respostas da fila não foram carimbadas com o serverId',
      );
    });

    test('o role do servidor nunca muda o kind de uma run local conhecida: '
        'entrega local sem serverId e servidor só com a coleta do mesmo '
        'modelo → a entrega continua entrega e sem serverId', () async {
      final store = _store();
      await store.saveRun(_local('clrun-e_1', MobileChecklistRunKind.delivery));
      final repo = _repo(
        store,
        InMemorySyncQueueRepository(),
        _FakeRemoteApi(
          runs: [_remote('srv-c', MobileChecklistRunKind.collection)],
        ),
      );

      await repo.prefetchRunsForWorkOrder(_wo);

      final delivery = await store.loadRun('clrun-e_1');
      expect(delivery!.kind, MobileChecklistRunKind.delivery);
      expect(delivery.serverId, isNull);
      final collection = (await _runs(
        store,
      )).singleWhere((r) => r.kind == MobileChecklistRunKind.collection);
      expect(collection.serverId, 'srv-c');
    });

    test('pré-carga não regrava serverId já casado', () async {
      final store = _store();
      await store.saveRun(
        _local(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          serverId: 'srv-e1',
        ),
      );
      final repo = _repo(
        store,
        InMemorySyncQueueRepository(),
        _FakeRemoteApi(
          runs: [_remote('srv-e2', MobileChecklistRunKind.delivery)],
        ),
      );

      await repo.prefetchRunsForWorkOrder(_wo);

      final deliveries = (await _runs(
        store,
      )).where((r) => r.kind == MobileChecklistRunKind.delivery).toList();
      expect(deliveries, hasLength(1));
      expect(deliveries.single.serverId, 'srv-e1');
    });

    test(
      'entrega já concluída no servidor não vira run local em andamento',
      () async {
        final store = _store();
        final repo = _repo(
          store,
          InMemorySyncQueueRepository(),
          _FakeRemoteApi(
            runs: [
              _remote(
                'srv-e',
                MobileChecklistRunKind.delivery,
                status: 'completed',
              ),
              _remote('srv-x', MobileChecklistRunKind.unknown),
            ],
          ),
        );

        await repo.prefetchRunsForWorkOrder(_wo);

        expect(await _runs(store), isEmpty);
      },
    );
  });
}
