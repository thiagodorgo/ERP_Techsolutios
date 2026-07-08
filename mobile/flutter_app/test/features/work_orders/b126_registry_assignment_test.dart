import 'dart:convert';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/registry_options_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/registry_options.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/registry_assignment_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// D1 — Seleção viatura/equipe na OS mobile.
// Aditivo/offline-safe: vincula viatura/equipe local (otimista) + enfileira
// `work_order.assign` reenviando o operador atual (operator_id obrigatório).
// ---------------------------------------------------------------------------

const _tenant = 'tenant-d1';
const _operatorId = 'operator-d1';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant D1'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:assign'}),
  user: AuthenticatedUser(
    userId: _operatorId,
    email: 'op@d1.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

const _vehicles = [
  VehicleOption(id: 'veh-1', plate: 'ABC-1234', model: 'Ducato'),
  VehicleOption(id: 'veh-2', plate: 'DEF-5678', model: 'Sprinter'),
];

const _teams = [
  TeamOption(id: 'team-1', name: 'Equipe Alpha'),
  TeamOption(id: 'team-2', name: 'Equipe Bravo'),
];

WorkOrder _makeWo({
  String localId = 'wo-d1-01',
  String? serverId = 'srv-wo-d1-01',
  String? assignedUserId = _operatorId,
  String? vehicleId,
  String? teamId,
}) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-D1-01',
  title: 'OS de teste D1',
  customerName: 'Cliente D1',
  serviceAddress: 'Rua Teste, 1',
  status: WorkOrderStatus.dispatched,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
  assignedUserId: assignedUserId,
  vehicleId: vehicleId,
  teamId: teamId,
);

WorkOrderRepository _repo(
  WorkOrder wo,
  SyncQueueRepository queue,
  WorkOrderLocalStore store,
) {
  return WorkOrderRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );
}

SyncAction _assignAction({
  String id = 'assign-1',
  Map<String, Object?>? payload,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  type: WorkOrderSyncActionTypes.assign,
  payload:
      payload ??
      const {
        'local_id': 'wo-d1-01',
        'server_id': 'srv-wo-d1-01',
        'operator_id': _operatorId,
        'vehicle_id': 'veh-1',
        'team_id': 'team-1',
        'occurred_at': '2026-07-01T12:00:00.000Z',
        'message': 'Mobile definiu viatura/equipe.',
      },
  status: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 7, 1, 12),
);

Map<String, Object?> _encodedSingle(SyncAction action) {
  final request = const WorkOrderSyncCodec().encodeRequest([action]);
  final actions = request['actions'] as List<Object?>;
  return Map<String, Object?>.from(actions.single as Map);
}

Widget _wrapSection(
  WorkOrder wo,
  WorkOrderRepository repo, {
  RegistryOptions options = const RegistryOptions(
    vehicles: _vehicles,
    teams: _teams,
  ),
}) {
  return ProviderScope(
    overrides: [
      workOrderRepositoryProvider.overrideWithValue(repo),
      registryOptionsControllerProvider.overrideWith((ref) => options),
    ],
    child: MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: RegistryAssignmentSection(workOrder: wo),
        ),
      ),
    ),
  );
}

void main() {
  group('D1 — repository assignRegistry', () {
    test(
      '1. Com operador: atualiza OS local e enfileira work_order.assign',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryWorkOrderLocalStore([_makeWo()]);
        final repo = _repo(_makeWo(), queue, store);
        await repo.load(seedIfEmpty: false);

        final result = await repo.assignRegistry(
          'wo-d1-01',
          vehicleId: 'veh-1',
          vehiclePlate: 'ABC-1234',
          teamId: 'team-1',
          teamName: 'Equipe Alpha',
        );

        // OS local atualizada (otimista, pending).
        expect(result.workOrder.vehicleId, 'veh-1');
        expect(result.workOrder.vehiclePlate, 'ABC-1234');
        expect(result.workOrder.teamId, 'team-1');
        expect(result.workOrder.teamName, 'Equipe Alpha');
        expect(result.workOrder.syncStatus, SyncStatus.pending);

        final stored = (await store.loadWorkOrders()).single;
        expect(stored.vehicleId, 'veh-1');
        expect(stored.teamId, 'team-1');

        // Ação de sync enfileirada com vehicle_id/team_id/operator_id.
        final actions = await queue.pendingForTenant(_tenant);
        expect(actions, hasLength(1));
        final action = actions.single;
        expect(action.type, WorkOrderSyncActionTypes.assign);
        expect(action.payload['vehicle_id'], 'veh-1');
        expect(action.payload['team_id'], 'team-1');
        expect(action.payload['operator_id'], _operatorId);
        expect(action.payload['server_id'], 'srv-wo-d1-01');
      },
    );

    test(
      '2. Sem operador: lança StateError e NÃO enfileira nada (safe)',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryWorkOrderLocalStore([
          _makeWo(assignedUserId: null),
        ]);
        final repo = _repo(_makeWo(assignedUserId: null), queue, store);
        await repo.load(seedIfEmpty: false);

        await expectLater(
          repo.assignRegistry('wo-d1-01', vehicleId: 'veh-1', teamId: 'team-1'),
          throwsA(isA<StateError>()),
        );

        final actions = await queue.actionsForTenant(_tenant);
        expect(actions, isEmpty);
      },
    );

    test('3. operator_id vem do operador atualmente atribuído à OS', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _makeWo(assignedUserId: 'other-operator'),
      ]);
      final repo = _repo(
        _makeWo(assignedUserId: 'other-operator'),
        queue,
        store,
      );
      await repo.load(seedIfEmpty: false);

      await repo.assignRegistry('wo-d1-01', vehicleId: 'veh-2');

      final action = (await queue.pendingForTenant(_tenant)).single;
      expect(action.payload['operator_id'], 'other-operator');
      expect(action.payload['vehicle_id'], 'veh-2');
      expect(action.payload.containsKey('team_id'), isFalse);
    });
  });

  group('D1 — codec work_order.assign', () {
    test('4. payload emite vehicle_id/team_id/operator_id/work_order_id', () {
      final encoded = _encodedSingle(_assignAction());
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);

      expect(encoded['type'], 'work_order.assign');
      expect(payload['work_order_id'], 'srv-wo-d1-01');
      expect(payload['operator_id'], _operatorId);
      expect(payload['vehicle_id'], 'veh-1');
      expect(payload['team_id'], 'team-1');

      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);
      expect(metadata['source'], 'mobile_offline');
      expect(metadata['local_id'], 'wo-d1-01');
    });

    test('5. payload não vaza tenant/token/path', () {
      final encoded = _encodedSingle(
        _assignAction(
          payload: const {
            'local_id': 'wo-d1-01',
            'server_id': 'srv-wo-d1-01',
            'operator_id': _operatorId,
            'vehicle_id': 'veh-1',
            'team_id': 'team-1',
            'tenant_id': 'spoof',
            'tenantId': 'spoof',
            'token': 'secret',
          },
        ),
      );
      final serialized = jsonEncode(encoded['payload']).toLowerCase();
      for (final forbidden in ['tenant_id', 'tenantid', 'token', 'bearer']) {
        expect(serialized, isNot(contains(forbidden)));
      }
    });

    test('6. eligibility: assign pronto exige serverId + operator_id', () {
      expect(b103WorkOrderActionReadyForBackend(_assignAction()), isTrue);

      // Sem operator_id → não elegível.
      expect(
        b103WorkOrderActionReadyForBackend(
          _assignAction(
            payload: const {
              'local_id': 'wo-d1-01',
              'server_id': 'srv-wo-d1-01',
              'vehicle_id': 'veh-1',
            },
          ),
        ),
        isFalse,
      );

      // Somente local (sem server_id) → não elegível.
      expect(
        b103WorkOrderActionReadyForBackend(
          _assignAction(
            payload: const {
              'local_id': 'wo-d1-01',
              'operator_id': _operatorId,
              'vehicle_id': 'veh-1',
            },
          ),
        ),
        isFalse,
      );
    });

    test('7. assign faz parte dos tipos elegíveis de backend (B-107)', () {
      expect(
        b107BackendWorkOrderActionTypes.contains(
          WorkOrderSyncActionTypes.assign,
        ),
        isTrue,
      );
    });
  });

  group('D1 — round-trip SQLite (Drift) de viatura/equipe', () {
    late AppDatabase db;
    late DriftWorkOrderLocalStore store;

    setUp(() {
      db = AppDatabase.openInMemory();
      store = DriftWorkOrderLocalStore(db);
    });

    tearDown(() => db.close());

    test('8. vehicle_id/plate/team_id/name persistem e recarregam', () async {
      await store.saveWorkOrder(
        _makeWo(
          vehicleId: 'veh-1',
          teamId: 'team-1',
        ).copyWith(vehiclePlate: 'ABC-1234', teamName: 'Equipe Alpha'),
      );

      final loaded = (await store.loadWorkOrders()).single;
      expect(loaded.vehicleId, 'veh-1');
      expect(loaded.vehiclePlate, 'ABC-1234');
      expect(loaded.teamId, 'team-1');
      expect(loaded.teamName, 'Equipe Alpha');
    });

    test('9. OS sem viatura/equipe round-trips como null', () async {
      await store.saveWorkOrder(_makeWo());

      final loaded = (await store.loadWorkOrders()).single;
      expect(loaded.vehicleId, isNull);
      expect(loaded.vehiclePlate, isNull);
      expect(loaded.teamId, isNull);
      expect(loaded.teamName, isNull);
    });
  });

  group('D1 — UI seção viatura/equipe', () {
    testWidgets('10. Sem operador: exibe orientação e nenhum seletor', (
      t,
    ) async {
      final queue = InMemorySyncQueueRepository();
      final wo = _makeWo(assignedUserId: null);
      final store = InMemoryWorkOrderLocalStore([wo]);
      final repo = _repo(wo, queue, store);

      await t.pumpWidget(_wrapSection(wo, repo));
      await t.pumpAndSettle();

      expect(find.text('Viatura e equipe'), findsOneWidget);
      expect(
        find.byKey(const Key('registry-assignment-operator-hint')),
        findsOneWidget,
      );
      expect(
        find.text('Atribua um operador antes de definir viatura/equipe.'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('registry-assignment-save')), findsNothing);
      expect(await queue.actionsForTenant(_tenant), isEmpty);
    });

    testWidgets('11. Com operador + seleção: salvar enfileira assign', (
      t,
    ) async {
      final queue = InMemorySyncQueueRepository();
      // Pré-seleciona viatura+equipe (valores iniciais dos dropdowns).
      final wo = _makeWo(vehicleId: 'veh-1', teamId: 'team-1');
      final store = InMemoryWorkOrderLocalStore([wo]);
      final repo = _repo(wo, queue, store);
      await repo.load(seedIfEmpty: false);

      await t.pumpWidget(_wrapSection(wo, repo));
      await t.pumpAndSettle();

      final saveBtn = find.byKey(const Key('registry-assignment-save'));
      expect(saveBtn, findsOneWidget);

      await t.tap(saveBtn);
      await t.pumpAndSettle();

      final actions = await queue.pendingForTenant(_tenant);
      expect(actions, hasLength(1));
      expect(actions.single.type, WorkOrderSyncActionTypes.assign);
      expect(actions.single.payload['vehicle_id'], 'veh-1');
      expect(actions.single.payload['team_id'], 'team-1');
      expect(actions.single.payload['operator_id'], _operatorId);
    });

    testWidgets('12. Catálogo vazio (offline): sem seletores, sem quebra', (
      t,
    ) async {
      final queue = InMemorySyncQueueRepository();
      final wo = _makeWo();
      final store = InMemoryWorkOrderLocalStore([wo]);
      final repo = _repo(wo, queue, store);

      await t.pumpWidget(
        _wrapSection(wo, repo, options: RegistryOptions.empty),
      );
      await t.pumpAndSettle();

      expect(
        find.byKey(const Key('registry-assignment-empty')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('registry-assignment-vehicle')),
        findsNothing,
      );
      expect(t.takeException(), isNull);
    });
  });
}
