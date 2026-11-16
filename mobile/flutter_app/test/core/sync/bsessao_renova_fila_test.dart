// B-APP-SESSAO-RENOVA (item 68 do portão) — a fila de sincronização com a
// sessão morta (D8, F6).
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
// O terreno é o de `bsessao_renova_test.dart`: o servidor local com o contrato
// novo. O repositório, o notifier, o interceptador, os clientes `Dio` dos lotes,
// a fila escopada por dono e o coordenador são os reais.

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../auth/bsessao_renova_test.dart' hide main;

const _tenant = 't1';

SyncAction _acao(
  String id,
  String type,
  Map<String, Object?> payload, {
  String userId = 'u1',
  int retryCount = 2,
  SyncStatus status = SyncStatus.pending,
  String? lastErrorCode,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  userId: userId,
  type: type,
  payload: payload,
  status: status,
  retryCount: retryCount,
  lastErrorCode: lastErrorCode,
  createdAt: DateTime.utc(2026, 11, 16, 10),
);

WorkOrder _ordem(String localId, String serverId) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 16),
);

BootstrapSession _bootstrapT1() => const BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização t1'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

/// Espera a condição (as passadas do coordenador correm fora do teste).
Future<void> _ate(bool Function() cond, {String? motivo}) async {
  final fim = DateTime.now().add(const Duration(seconds: 5));
  while (!cond()) {
    if (DateTime.now().isAfter(fim)) fail(motivo ?? 'a condição não chegou');
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

/// Um dos 5 replays: a ação dele, o que precisa existir antes, e a passada.
typedef _Replay = ({
  String nome,
  SyncAction acao,
  Future<void> Function(AppDatabase db) antes,
  Future<SyncReplayResult> Function(ProviderContainer c) roda,
});

Future<void> _nada(AppDatabase db) async {}

final List<_Replay> _replays = [
  (
    nome: 'despesa',
    acao: _acao('d-1', ExpenseSyncActionTypes.reportCreate, {
      'local_id': 'rel-1',
      'title': 'Despesa 1',
    }),
    antes: _nada,
    roda: (c) => c.read(syncReplayServiceProvider).replayTenant(_tenant),
  ),
  (
    nome: 'OS',
    acao: _acao('o-1', WorkOrderSyncActionTypes.create, {
      'local_id': 'wo-1',
      'title': 'OS 1',
    }),
    antes: _nada,
    roda: (c) =>
        c.read(workOrderSyncReplayServiceProvider).replayTenant(_tenant),
  ),
  (
    nome: 'checklist',
    acao: _acao('c-1', ChecklistSyncActionTypes.answerUpsert, {
      'server_run_id': 'run-srv-1',
      'item_key': 'pneus',
      'value': 'ok',
    }),
    antes: _nada,
    roda: (c) =>
        c.read(checklistSyncReplayServiceProvider).replayTenant(_tenant),
  ),
  (
    nome: 'estoque',
    acao: _acao('m-1', InventorySyncActionTypes.materialAdd, {
      'work_order_local_id': 'wo-pronta',
      'material_local_id': 'mat-1',
      'sku': 'SKU-1',
      'quantity': 1,
    }),
    antes: (db) => DriftWorkOrderLocalStore(
      db,
    ).saveWorkOrder(_ordem('wo-pronta', 'srv-wo-pronta')),
    roda: (c) =>
        c.read(inventorySyncReplayServiceProvider).replayTenant(_tenant),
  ),
  (
    nome: 'evidência',
    acao: _acao('e-1', EvidenceSyncActionTypes.workOrderObservation, {
      'work_order_id': 'srv-wo-1',
      'local_evidence_id': 'ev-1',
      'note': 'observação',
    }),
    antes: _nada,
    roda: (c) =>
        c.read(evidenceSyncReplayServiceProvider).replayTenant(_tenant),
  ),
];

// ── Espiões do coordenador (o molde de `bmaterial_replay_test.dart`) ─────────

const _vazio = SyncReplayResult(synced: [], failed: [], conflicts: []);

class _Reclaim extends SyncQueueReclaimService {
  _Reclaim(SyncQueueRepository queue)
    : super(queue: queue, expenseChannelOff: () => true);
}

class _FieldLocation extends FieldLocationSyncService {
  _FieldLocation()
    : super(
        store: InMemoryFieldLocationStore(),
        api: const PendingFieldLocationApi(),
      );
}

class _Telemetria extends TelemetrySyncService {
  _Telemetria()
    : super(
        store: InMemoryTelemetryLocalStore(),
        api: const PendingTelemetryApi(),
      );
}

/// O 1º domínio: o que o caso pede (o "Sair", o login de B) e o lote de OS de
/// verdade, sobre a fila escopada e o cliente real.
class _OsQueMata extends WorkOrderSyncReplayService {
  _OsQueMata(
    this.chamadas,
    this.durante, {
    required super.queue,
    required super.api,
  });

  final List<String> chamadas;
  final Future<void> Function() durante;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    chamadas.add('OS');
    await durante();
    return super.replayTenant(tenantId);
  }
}

class _Estoque extends InventorySyncReplayService {
  _Estoque(this.chamadas, SyncQueueRepository queue)
    : super(
        queue: queue,
        api: const PendingBackendInventorySyncBatchApi(),
        workOrders: InMemoryWorkOrderLocalStore(),
      );

  final List<String> chamadas;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    chamadas.add('estoque');
    return _vazio;
  }
}

class _Checklist extends ChecklistSyncReplayService {
  _Checklist(this.chamadas, SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final List<String> chamadas;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    chamadas.add('checklist');
    return _vazio;
  }
}

class _Evidencia extends EvidenceSyncReplayService {
  _Evidencia(this.chamadas, SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final List<String> chamadas;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    chamadas.add('evidência');
    return _vazio;
  }
}

/// A despesa: o serviço real sobre a fila escopada e um lote que só registra.
class _Despesa extends SyncReplayService {
  _Despesa(this.chamadas, {required super.queue, required super.api})
    : super(supportedActionTypes: ExpenseSyncActionTypes.backendSupported);

  final List<String> chamadas;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) {
    chamadas.add('despesa');
    return super.replayTenant(tenantId);
  }
}

/// O coordenador sobre o terreno: o 1º domínio (OS) é o lote real, e os
/// seguintes registram se foram chamados.
List<Override> _coordenador(
  List<String> chamadas,
  SyncQueueRepository queue,
  CaptureBatchApi despesas, {
  Future<void> Function()? noDominioOs,
}) => [
  bootstrapSessionProvider.overrideWith((ref) async => _bootstrapT1()),
  syncQueueReclaimServiceProvider.overrideWithValue(_Reclaim(queue)),
  fieldLocationSyncServiceProvider.overrideWithValue(_FieldLocation()),
  telemetrySyncServiceProvider.overrideWithValue(_Telemetria()),
  workOrderSyncReplayServiceProvider.overrideWith(
    (ref) => _OsQueMata(
      chamadas,
      noDominioOs ?? () async {},
      queue: ref.watch(replaySyncQueueRepositoryProvider),
      api: ref.watch(workOrderSyncBatchApiProvider),
    ),
  ),
  inventorySyncReplayServiceProvider.overrideWithValue(
    _Estoque(chamadas, queue),
  ),
  checklistSyncReplayServiceProvider.overrideWithValue(
    _Checklist(chamadas, queue),
  ),
  evidenceSyncReplayServiceProvider.overrideWithValue(
    _Evidencia(chamadas, queue),
  ),
  syncReplayServiceProvider.overrideWith(
    (ref) => _Despesa(
      chamadas,
      queue: ref.watch(replaySyncQueueRepositoryProvider),
      api: despesas,
    ),
  ),
  evidenceBinaryUploadServiceProvider.overrideWithValue(
    EvidenceBinaryUploadService(
      store: InMemoryWorkOrderLocalStore(),
      blobStore: InMemoryEvidenceBlobStore(),
      api: const PendingEvidenceUploadApi(),
    ),
  ),
];

CaptureBatchApi _despesasProcessadas() => CaptureBatchApi(
  (batch) => [
    for (final a in batch)
      SyncActionResult(
        clientActionId: a.clientActionId,
        status: 'processed',
        resultRef: 'srv-${a.clientActionId}',
      ),
  ],
);

void main() {
  late Terreno terreno;
  late Aparelho app;
  late AppDatabase db;
  late InMemorySyncQueueRepository queue;

  setUp(() async {
    terreno = Terreno();
    await terreno.start();
    app = Aparelho(terreno);
    db = AppDatabase.openInMemory();
    queue = InMemorySyncQueueRepository();
  });

  tearDown(() async {
    try {
      app.fechar();
    } catch (_) {}
    await db.close();
    await terreno.stop();
  });

  List<Override> base() => [
    ...clientesNoTerreno(terreno),
    appDatabaseProvider.overrideWithValue(db),
    syncQueueRepositoryProvider.overrideWithValue(queue),
  ];

  Future<SyncAction> guardada(String id) async => (await queue.actionsForTenant(
    _tenant,
  )).singleWhere((a) => a.clientActionId == id);

  group('[T5] a sessão morta no lote devolve a ação a pendente', () {
    for (final replay in _replays) {
      test(
        '[T5] ${replay.nome}: o lote leva 401 e a renovação é recusada; a ação volta a pending, com o mesmo retryCount, SESSION_EXPIRED, e sem SyncOwnershipError',
        () async {
          await app.storage.saveSession(sessaoGuardada(acesso: 'A0'));
          await app.abrir(extras: base());
          expect(app.estado?.status, AuthStatus.authenticated);
          await replay.antes(db);
          await queue.enqueue(replay.acao);
          terreno.revogada = true; // o servidor derrubou a sessão

          // Sem SyncOwnershipError: a passada termina sem lançar.
          await replay.roda(app.container);

          expect(app.estado?.status, AuthStatus.expired);
          expect(app.estado?.expiredOwnerSub, 'u1');
          expect(terreno.renovacoes, 1);
          final depois = await guardada(replay.acao.clientActionId);
          expect(depois.status, SyncStatus.pending, reason: replay.nome);
          expect(depois.retryCount, 2, reason: replay.nome);
          expect(depois.lastErrorCode, 'SESSION_EXPIRED', reason: replay.nome);
        },
      );
    }
  });

  group('[T5b] a passada para quando a época muda', () {
    for (final caso in const ['expira', 'sair', 'sair e login de B']) {
      test(
        '[T5b] $caso no 1º domínio: os domínios seguintes não são chamados, nenhuma ação muda o retryCount, e a mensagem só no expirar',
        () async {
          final chamadas = <String>[];
          final despesas = _despesasProcessadas();
          await app.storage.saveSession(sessaoGuardada(acesso: 'A0'));
          await app.abrir(
            extras: [
              ...base(),
              ..._coordenador(
                chamadas,
                queue,
                despesas,
                noDominioOs: () async {
                  if (caso == 'expira') return;
                  await app.notifier.logout();
                  if (caso == 'sair e login de B') {
                    await app.notifier.login(
                      email: 'b@t1.test',
                      password: 'senha',
                    );
                  }
                },
              ),
            ],
          );
          await app.container.read(bootstrapSessionProvider.future);
          await queue.enqueue(
            _acao('o-1', WorkOrderSyncActionTypes.create, {
              'local_id': 'wo-1',
              'title': 'OS 1',
            }, retryCount: 1),
          );
          await queue.enqueue(
            _acao('d-1', ExpenseSyncActionTypes.reportCreate, {
              'local_id': 'rel-1',
              'title': 'Despesa 1',
            }, retryCount: 1),
          );
          if (caso == 'expira') terreno.revogada = true;

          await app.container
              .read(autoSyncCoordinatorProvider.notifier)
              .triggerManual();

          expect(chamadas, ['OS'], reason: caso);
          expect(despesas.captured, isNull, reason: caso);
          for (final a in await queue.actionsForTenant(_tenant)) {
            expect(a.retryCount, 1, reason: '$caso: ${a.clientActionId}');
          }
          final sync = app.container.read(autoSyncCoordinatorProvider);
          expect(sync.isRunning, isFalse);
          expect(
            sync.lastSafeError,
            caso == 'expira' ? kSessionExpiredMessage : isNull,
            reason: caso,
          );
          if (caso == 'sair e login de B') {
            expect(app.estado?.session?.user.sub, 'b');
          }
        },
      );
    }
  });

  group('[T5c] depois do novo login do mesmo dono, uma passada roda sozinha', () {
    for (final quem in const ['u1', 'b']) {
      test(
        '[T5c] expirou com uma despesa pending SESSION_EXPIRED; entra ${quem == 'u1' ? 'o mesmo dono' : 'outra pessoa (controle)'}: ${quem == 'u1' ? 'uma passada, sem toque, e a despesa fica synced' : 'a passada roda e a despesa de u1 não é tocada'}',
        () async {
          final chamadas = <String>[];
          final despesas = _despesasProcessadas();
          await app.storage.saveSession(sessaoGuardada(acesso: 'A0'));
          await app.abrir(
            extras: [...base(), ..._coordenador(chamadas, queue, despesas)],
          );
          app.container.listen(autoSyncCoordinatorProvider, (_, _) {});
          await queue.enqueue(
            _acao(
              'd-1',
              ExpenseSyncActionTypes.reportCreate,
              {'local_id': 'rel-1', 'title': 'Despesa 1'},
              retryCount: 0,
              lastErrorCode: 'SESSION_EXPIRED',
            ),
          );

          await app.notifier.expireSession(app.notifier.epoch);
          expect(app.estado?.status, AuthStatus.expired);
          expect(chamadas, isEmpty);

          await app.notifier.login(email: '$quem@t1.test', password: 'senha');
          expect(app.estado?.session?.user.sub, quem);

          await _ate(
            () =>
                chamadas.contains('despesa') &&
                !app.container.read(autoSyncCoordinatorProvider).isRunning,
            motivo: 'nenhuma passada nasceu do novo login',
          );
          await Future<void>.delayed(const Duration(milliseconds: 100));
          expect(chamadas.where((c) => c == 'OS'), hasLength(1));
          expect(chamadas.where((c) => c == 'despesa'), hasLength(1));

          final d = await guardada('d-1');
          if (quem == 'u1') {
            expect(despesas.captured?.map((a) => a.clientActionId), ['d-1']);
            expect(d.status, SyncStatus.synced);
          } else {
            expect(despesas.captured, isNull);
            expect(d.status, SyncStatus.pending);
            expect(d.lastErrorCode, 'SESSION_EXPIRED');
            expect(d.userId, 'u1');
          }
        },
      );
    }
  });
}
