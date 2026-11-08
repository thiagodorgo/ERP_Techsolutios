// B-FILA-USUARIO (Emenda 1 · A1) — regressão da sonda prerev-512:
// ação dependente de outro dono (legado user_id nulo ou u1) para OS local
// criada pelo usuário da sessão (u2).
//
// Propriedades provadas (PA3 + Emenda 1):
// (a) o server_id da criação chega à dependente de qualquer dono (inclusive
//     user_id nulo), sem alterar o dono nem os demais campos;
// (b) nenhum SyncOwnershipError aborta o replay de OS nem o passe do
//     AutoSyncCoordinator (o restante do lote de OS e as outras filas rodam);
// (c) a dependente de outro dono permanece retida para envio sob u2 e sai, já
//     com server_id, quando o dono dela está na sessão (Assumir ou login).
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-a1';

AuthSession _authSession({required String sub}) => AuthSession(
  tokens: AuthTokens(
    accessToken: 'tok-$sub',
    refreshToken: 'ref-$sub',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 2)),
  ),
  user: AuthUser(
    sub: sub,
    email: '$sub@erp.local',
    tenantId: _tenant,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['work_orders:read', 'work_orders:update'],
    scope: 'tenant',
  ),
);

BootstrapSession _bootstrapSession({required String userId}) =>
    BootstrapSession(
      activeTenant: const TenantContext(
        tenantId: _tenant,
        displayName: 'Organização A1',
      ),
      enabledModules: const [],
      permissions: const PermissionSet({
        'work_orders:read',
        'work_orders:update',
      }),
      user: AuthenticatedUser(
        userId: userId,
        email: '$userId@erp.local',
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        scope: 'tenant',
      ),
    );

SyncAction _action({
  required String id,
  required String type,
  required String? userId,
  required Map<String, Object?> payload,
  SyncStatus status = SyncStatus.pending,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  userId: userId,
  type: type,
  payload: payload,
  status: status,
  createdAt: DateTime.utc(2026, 11, 8, 10),
);

class _StatusRecordingQueue implements SyncQueueRepository {
  _StatusRecordingQueue(this._inner);

  final SyncQueueRepository _inner;
  final Map<String, List<SyncStatus>> recordedStatuses = {};

  List<SyncStatus> statusesFor(String clientActionId) =>
      recordedStatuses[clientActionId] ?? const <SyncStatus>[];

  @override
  Future<void> enqueue(SyncAction action) => _inner.enqueue(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) =>
      _inner.pendingForTenant(tenantId);

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) =>
      _inner.actionsForTenant(tenantId);

  @override
  Future<void> update(SyncAction action) async {
    recordedStatuses
        .putIfAbsent(action.clientActionId, () => <SyncStatus>[])
        .add(action.status);
    await _inner.update(action);
  }
}

void main() {
  group('B-FILA-USUARIO · A1 — dependente de outro dono na criação de OS', () {
    test(
      'A1(1): dependente legada (user_id nulo) recebe server_id da OS criada por u2 sem abortar lote nem outras filas, fica retida e sincroniza após Assumir',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final rawQueue = _StatusRecordingQueue(
          PersistentSyncQueueRepository(DriftSyncActionStore(db)),
        );
        final tokenStorage = InMemoryAuthTokenStorage();
        await tokenStorage.saveSession(_authSession(sub: 'u2'));

        final batchesSentToWorkOrders = <List<SyncAction>>[];
        final workOrderApi = CaptureWorkOrderBatchApi((batch) {
          batchesSentToWorkOrders.add(List<SyncAction>.unmodifiable(batch));
          return [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: a.type == WorkOrderSyncActionTypes.create
                    ? 'srv-${a.payload['local_id']}'
                    : null,
              ),
          ];
        });

        final expenseApi = CaptureBatchApi(
          (batch) => [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: 'srv-${a.clientActionId}',
              ),
          ],
        );

        // 1. OS local criada por u2.
        await rawQueue.enqueue(
          _action(
            id: 'wo-create',
            type: WorkOrderSyncActionTypes.create,
            userId: 'u2',
            payload: const {'local_id': 'wo-L', 'title': 'OS L'},
          ),
        );
        // 2. Dependentes legadas (userId nulo): uma sem chave server_id e outra
        //    com server_id: null explícito.
        await rawQueue.enqueue(
          _action(
            id: 'wo-status-leg',
            type: WorkOrderSyncActionTypes.statusUpdate,
            userId: null,
            payload: const {'local_id': 'wo-L', 'new_status': 'in_service'},
          ),
        );
        await rawQueue.enqueue(
          _action(
            id: 'wo-assign-leg',
            type: WorkOrderSyncActionTypes.assign,
            userId: null,
            payload: const {
              'local_id': 'wo-L',
              'server_id': null,
              'operator_id': 'u2',
            },
          ),
        );
        // 3. Segunda criação de u2 no mesmo lote de OS.
        await rawQueue.enqueue(
          _action(
            id: 'wo-create-2',
            type: WorkOrderSyncActionTypes.create,
            userId: 'u2',
            payload: const {'local_id': 'wo-M', 'title': 'OS M'},
          ),
        );
        // 4. Despesa de u2 em fila posterior no passe do AutoSyncCoordinator.
        await rawQueue.enqueue(
          _action(
            id: 'exp-u2',
            type: ExpenseSyncActionTypes.reportCreate,
            userId: 'u2',
            payload: const {'local_id': 'rep-u2', 'title': 'Despesa U2'},
          ),
        );

        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            syncQueueRepositoryProvider.overrideWithValue(rawQueue),
            authTokenStorageProvider.overrideWithValue(tokenStorage),
            bootstrapSessionProvider.overrideWith(
              (ref) async => _bootstrapSession(userId: 'u2'),
            ),
            workOrderSyncBatchApiProvider.overrideWithValue(workOrderApi),
            syncBatchApiProvider.overrideWithValue(expenseApi),
            checklistSyncBatchApiProvider.overrideWithValue(
              const PendingBackendChecklistSyncBatchApi(),
            ),
            evidenceSyncBatchApiProvider.overrideWithValue(
              const PendingEvidenceSyncBatchApi(),
            ),
            evidenceBinaryUploadServiceProvider.overrideWithValue(
              EvidenceBinaryUploadService(
                store: InMemoryWorkOrderLocalStore(),
                blobStore: InMemoryEvidenceBlobStore(),
                api: const PendingEvidenceUploadApi(),
              ),
            ),
            fieldLocationSyncServiceProvider.overrideWithValue(
              FieldLocationSyncService(
                store: InMemoryFieldLocationStore(),
                api: const PendingFieldLocationApi(),
                deviceLocationProvider: const PendingDeviceLocationProvider(),
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapSessionProvider.future);
        expect(container.read(currentSyncUserIdProvider), 'u2');

        // Passe 1 sob u2: cria OS, carimba server_id nas dependentes legadas,
        // conclui o lote de OS e segue para a fila de despesas sem erro.
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        final syncStateAfterPass1 = container.read(autoSyncCoordinatorProvider);
        expect(
          syncStateAfterPass1.lastSafeError,
          isNull,
          reason:
              'Nenhum SyncOwnershipError pode abortar o passe do coordenador',
        );

        expect(batchesSentToWorkOrders, hasLength(1));
        expect(
          batchesSentToWorkOrders.single.map((a) => a.clientActionId).toList(),
          const ['wo-create', 'wo-create-2'],
          reason: 'Dependentes legadas continuam retidas antes de Assumir',
        );
        expect(
          expenseApi.captured?.map((a) => a.clientActionId).toList(),
          const ['exp-u2'],
          reason:
              'A fila de despesas deve rodar no mesmo passe após a fila de OS',
        );

        final afterPass1 = {
          for (final a in await rawQueue.actionsForTenant(_tenant))
            a.clientActionId: a,
        };
        // (b) Lote de OS e outras filas concluídos.
        expect(afterPass1['wo-create']!.status, SyncStatus.synced);
        expect(afterPass1['wo-create-2']!.status, SyncStatus.synced);
        expect(afterPass1['exp-u2']!.status, SyncStatus.synced);
        // (a) server_id carimbado nas dependentes legadas sem tomar posse.
        expect(afterPass1['wo-status-leg']!.payload['server_id'], 'srv-wo-L');
        expect(afterPass1['wo-status-leg']!.userId, isNull);
        expect(afterPass1['wo-status-leg']!.status, SyncStatus.pending);
        expect(afterPass1['wo-status-leg']!.retryCount, 0);
        expect(afterPass1['wo-assign-leg']!.payload['server_id'], 'srv-wo-L');
        expect(afterPass1['wo-assign-leg']!.userId, isNull);
        expect(afterPass1['wo-assign-leg']!.status, SyncStatus.pending);
        expect(afterPass1['wo-assign-leg']!.retryCount, 0);
        expect(
          rawQueue.statusesFor('wo-status-leg'),
          isNot(contains(SyncStatus.syncing)),
        );
        expect(
          rawQueue.statusesFor('wo-assign-leg'),
          isNot(contains(SyncStatus.syncing)),
        );

        // (c) u2 assume os dois itens legados na fila bruta e sincroniza:
        // ambos saem já com server_id ('srv-wo-L') e viram synced.
        final allBeforeAssume = await rawQueue.actionsForTenant(_tenant);
        await rawQueue.update(
          assignActionToUser(
            afterPass1['wo-status-leg']!,
            'u2',
            allTenantActions: allBeforeAssume,
          ),
        );
        await rawQueue.update(
          assignActionToUser(
            afterPass1['wo-assign-leg']!,
            'u2',
            allTenantActions: allBeforeAssume,
          ),
        );

        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        expect(
          container.read(autoSyncCoordinatorProvider).lastSafeError,
          isNull,
        );
        expect(batchesSentToWorkOrders, hasLength(2));
        final secondBatch = batchesSentToWorkOrders[1];
        expect(secondBatch.map((a) => a.clientActionId).toList(), const [
          'wo-status-leg',
          'wo-assign-leg',
        ]);
        for (final sent in secondBatch) {
          expect(sent.payload['server_id'], 'srv-wo-L');
        }
        final encoded =
            const WorkOrderSyncCodec().encodeRequest(secondBatch)['actions']
                as List<Object?>;
        for (final rawItem in encoded) {
          final item = rawItem as Map<String, Object?>;
          final payload = item['payload'] as Map<String, Object?>;
          expect(payload['work_order_id'], 'srv-wo-L');
        }

        final afterPass2 = {
          for (final a in await rawQueue.actionsForTenant(_tenant))
            a.clientActionId: a,
        };
        expect(afterPass2['wo-status-leg']!.status, SyncStatus.synced);
        expect(afterPass2['wo-assign-leg']!.status, SyncStatus.synced);
      },
    );

    test(
      'A1(2): dependente de u1 recebe server_id sob sessão u2 sem abortar lote nem outras filas, fica retida sob u2 e sincroniza quando u1 faz login',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final rawQueue = _StatusRecordingQueue(
          PersistentSyncQueueRepository(DriftSyncActionStore(db)),
        );
        final tokenStorage = InMemoryAuthTokenStorage();
        await tokenStorage.saveSession(_authSession(sub: 'u2'));

        var activeBootstrapUser = 'u2';
        final batchesSentToWorkOrders = <List<SyncAction>>[];
        final workOrderApi = CaptureWorkOrderBatchApi((batch) {
          batchesSentToWorkOrders.add(List<SyncAction>.unmodifiable(batch));
          return [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: a.type == WorkOrderSyncActionTypes.create
                    ? 'srv-${a.payload['local_id']}'
                    : null,
              ),
          ];
        });

        final expenseApi = CaptureBatchApi(
          (batch) => [
            for (final a in batch)
              SyncActionResult(
                clientActionId: a.clientActionId,
                status: 'processed',
                resultRef: 'srv-${a.clientActionId}',
              ),
          ],
        );

        await rawQueue.enqueue(
          _action(
            id: 'wo-create',
            type: WorkOrderSyncActionTypes.create,
            userId: 'u2',
            payload: const {'local_id': 'wo-L', 'title': 'OS L'},
          ),
        );
        await rawQueue.enqueue(
          _action(
            id: 'wo-status-u1',
            type: WorkOrderSyncActionTypes.statusUpdate,
            userId: 'u1',
            payload: const {
              'local_id': 'wo-L',
              'server_id': null,
              'new_status': 'in_service',
            },
          ),
        );
        await rawQueue.enqueue(
          _action(
            id: 'wo-create-2',
            type: WorkOrderSyncActionTypes.create,
            userId: 'u2',
            payload: const {'local_id': 'wo-M', 'title': 'OS M'},
          ),
        );
        await rawQueue.enqueue(
          _action(
            id: 'exp-u2',
            type: ExpenseSyncActionTypes.reportCreate,
            userId: 'u2',
            payload: const {'local_id': 'rep-u2', 'title': 'Despesa U2'},
          ),
        );

        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            syncQueueRepositoryProvider.overrideWithValue(rawQueue),
            authTokenStorageProvider.overrideWithValue(tokenStorage),
            bootstrapSessionProvider.overrideWith(
              (ref) async => _bootstrapSession(userId: activeBootstrapUser),
            ),
            workOrderSyncBatchApiProvider.overrideWithValue(workOrderApi),
            syncBatchApiProvider.overrideWithValue(expenseApi),
            checklistSyncBatchApiProvider.overrideWithValue(
              const PendingBackendChecklistSyncBatchApi(),
            ),
            evidenceSyncBatchApiProvider.overrideWithValue(
              const PendingEvidenceSyncBatchApi(),
            ),
            evidenceBinaryUploadServiceProvider.overrideWithValue(
              EvidenceBinaryUploadService(
                store: InMemoryWorkOrderLocalStore(),
                blobStore: InMemoryEvidenceBlobStore(),
                api: const PendingEvidenceUploadApi(),
              ),
            ),
            fieldLocationSyncServiceProvider.overrideWithValue(
              FieldLocationSyncService(
                store: InMemoryFieldLocationStore(),
                api: const PendingFieldLocationApi(),
                deviceLocationProvider: const PendingDeviceLocationProvider(),
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapSessionProvider.future);
        expect(container.read(currentSyncUserIdProvider), 'u2');

        // Passe 1 sob u2.
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        expect(
          container.read(autoSyncCoordinatorProvider).lastSafeError,
          isNull,
          reason: 'Replay de u2 não pode abortar com SyncOwnershipError',
        );
        expect(batchesSentToWorkOrders, hasLength(1));
        expect(
          batchesSentToWorkOrders.single.map((a) => a.clientActionId).toList(),
          const ['wo-create', 'wo-create-2'],
        );
        expect(
          expenseApi.captured?.map((a) => a.clientActionId).toList(),
          const ['exp-u2'],
        );

        final afterPass1 = {
          for (final a in await rawQueue.actionsForTenant(_tenant))
            a.clientActionId: a,
        };
        expect(afterPass1['wo-create']!.status, SyncStatus.synced);
        expect(afterPass1['wo-create-2']!.status, SyncStatus.synced);
        expect(afterPass1['exp-u2']!.status, SyncStatus.synced);
        // (a) + (c): u1 permanece dono e pending, mas já com server_id carimbado.
        expect(afterPass1['wo-status-u1']!.userId, 'u1');
        expect(afterPass1['wo-status-u1']!.status, SyncStatus.pending);
        expect(afterPass1['wo-status-u1']!.retryCount, 0);
        expect(afterPass1['wo-status-u1']!.payload['server_id'], 'srv-wo-L');
        expect(
          rawQueue.statusesFor('wo-status-u1'),
          isNot(contains(SyncStatus.syncing)),
        );

        // (c) Login de u1 no mesmo aparelho → próximo passe envia wo-status-u1
        // já com server_id ('srv-wo-L') e marca synced.
        activeBootstrapUser = 'u1';
        await tokenStorage.saveSession(_authSession(sub: 'u1'));
        container.invalidate(authStateProvider);
        container.invalidate(bootstrapSessionProvider);
        await container.read(authStateProvider.future);
        await container.read(bootstrapSessionProvider.future);
        expect(container.read(currentSyncUserIdProvider), 'u1');

        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        expect(
          container.read(autoSyncCoordinatorProvider).lastSafeError,
          isNull,
        );
        expect(batchesSentToWorkOrders, hasLength(2));
        final u1Batch = batchesSentToWorkOrders[1];
        expect(u1Batch.map((a) => a.clientActionId).toList(), const [
          'wo-status-u1',
        ]);
        expect(u1Batch.single.payload['server_id'], 'srv-wo-L');
        final encoded =
            const WorkOrderSyncCodec().encodeRequest(u1Batch)['actions']
                as List<Object?>;
        final encodedPayload =
            (encoded.single as Map<String, Object?>)['payload']
                as Map<String, Object?>;
        expect(encodedPayload['work_order_id'], 'srv-wo-L');

        final afterPass2 = {
          for (final a in await rawQueue.actionsForTenant(_tenant))
            a.clientActionId: a,
        };
        expect(afterPass2['wo-status-u1']!.status, SyncStatus.synced);
        expect(afterPass2['wo-status-u1']!.userId, 'u1');
      },
    );

    test(
      'A1(3): exceção de mapeamento é estrita — alterar status, dono, outro campo ou sobrescrever server_id existente de outro usuário continua lançando SyncOwnershipError',
      () async {
        final raw = InMemorySyncQueueRepository();
        final existingU1 = _action(
          id: 'wo-status-u1',
          type: WorkOrderSyncActionTypes.statusUpdate,
          userId: 'u1',
          payload: const {'local_id': 'wo-L', 'new_status': 'in_service'},
        );
        final alreadyMappedU1 = _action(
          id: 'wo-mapped-u1',
          type: WorkOrderSyncActionTypes.statusUpdate,
          userId: 'u1',
          payload: const {
            'local_id': 'wo-L',
            'server_id': 'srv-original',
            'new_status': 'in_service',
          },
        );
        final createU1 = _action(
          id: 'wo-create-u1',
          type: WorkOrderSyncActionTypes.create,
          userId: 'u1',
          payload: const {'local_id': 'wo-U1', 'title': 'OS U1'},
        );
        await raw.enqueue(existingU1);
        await raw.enqueue(alreadyMappedU1);
        await raw.enqueue(createU1);

        final scoped = UserScopedSyncQueueRepository(
          queue: raw,
          currentUserId: () => 'u2',
        );

        // Alterar status junto com server_id -> bloqueado.
        await expectLater(
          scoped.update(
            existingU1.copyWith(
              status: SyncStatus.syncing,
              payload: {...existingU1.payload, 'server_id': 'srv-wo-L'},
            ),
          ),
          throwsA(isA<SyncOwnershipError>()),
        );
        // Alterar userId junto com server_id -> bloqueado.
        await expectLater(
          scoped.update(
            existingU1.copyWith(
              userId: 'u2',
              payload: {...existingU1.payload, 'server_id': 'srv-wo-L'},
            ),
          ),
          throwsA(isA<SyncOwnershipError>()),
        );
        // Alterar qualquer outro campo do payload -> bloqueado.
        await expectLater(
          scoped.update(
            existingU1.copyWith(
              payload: {
                ...existingU1.payload,
                'server_id': 'srv-wo-L',
                'new_status': 'completed',
              },
            ),
          ),
          throwsA(isA<SyncOwnershipError>()),
        );
        // Sobrescrever server_id já preenchido -> bloqueado.
        await expectLater(
          scoped.update(
            alreadyMappedU1.copyWith(
              payload: {...alreadyMappedU1.payload, 'server_id': 'srv-roubo'},
            ),
          ),
          throwsA(isA<SyncOwnershipError>()),
        );
        // Carimbar server_id em ação work_order.create de outro dono -> bloqueado.
        await expectLater(
          scoped.update(
            createU1.copyWith(
              payload: {...createU1.payload, 'server_id': 'srv-wo-U1'},
            ),
          ),
          throwsA(isA<SyncOwnershipError>()),
        );
      },
    );

    test(
      'A1(4): WorkOrderSyncReplayService direto não lança SyncOwnershipError ao mapear server_id em dependente legada (null) ou de u1',
      () async {
        for (final dependentOwner in const <String?>[null, 'u1']) {
          final raw = InMemorySyncQueueRepository();
          await raw.enqueue(
            _action(
              id: 'wo-create',
              type: WorkOrderSyncActionTypes.create,
              userId: 'u2',
              payload: const {'local_id': 'wo-L', 'title': 'OS L'},
            ),
          );
          await raw.enqueue(
            _action(
              id: 'wo-status',
              type: WorkOrderSyncActionTypes.statusUpdate,
              userId: dependentOwner,
              payload: const {'local_id': 'wo-L', 'new_status': 'in_service'},
            ),
          );
          await raw.enqueue(
            _action(
              id: 'wo-create-2',
              type: WorkOrderSyncActionTypes.create,
              userId: 'u2',
              payload: const {'local_id': 'wo-M', 'title': 'OS M'},
            ),
          );

          final scoped = UserScopedSyncQueueRepository(
            queue: raw,
            currentUserId: () => 'u2',
          );
          final api = CaptureWorkOrderBatchApi(
            (batch) => [
              for (final a in batch)
                SyncActionResult(
                  clientActionId: a.clientActionId,
                  status: 'processed',
                  resultRef: 'srv-${a.payload['local_id']}',
                ),
            ],
          );

          final result = await WorkOrderSyncReplayService(
            queue: scoped,
            api: api,
          ).replayTenant(_tenant);
          expect(result.synced.map((a) => a.clientActionId).toList(), const [
            'wo-create',
            'wo-create-2',
          ]);

          final byId = {
            for (final a in await raw.actionsForTenant(_tenant))
              a.clientActionId: a,
          };
          expect(byId['wo-create']!.status, SyncStatus.synced);
          expect(byId['wo-create-2']!.status, SyncStatus.synced);
          expect(byId['wo-status']!.payload['server_id'], 'srv-wo-L');
          expect(byId['wo-status']!.status, SyncStatus.pending);
          expect(byId['wo-status']!.userId, dependentOwner);

          final owner = dependentOwner ?? 'u2';
          if (dependentOwner == null) {
            await raw.update(assignActionToUser(byId['wo-status']!, 'u2'));
          }
          final scopedOwner = UserScopedSyncQueueRepository(
            queue: raw,
            currentUserId: () => owner,
          );
          final api2 = CaptureWorkOrderBatchApi(
            (batch) => [
              for (final a in batch)
                SyncActionResult(
                  clientActionId: a.clientActionId,
                  status: 'processed',
                ),
            ],
          );
          final result2 = await WorkOrderSyncReplayService(
            queue: scopedOwner,
            api: api2,
          ).replayTenant(_tenant);
          expect(result2.synced.map((a) => a.clientActionId).toList(), const [
            'wo-status',
          ]);
          expect(api2.captured!.single.payload['server_id'], 'srv-wo-L');
        }
      },
    );
  });
}
