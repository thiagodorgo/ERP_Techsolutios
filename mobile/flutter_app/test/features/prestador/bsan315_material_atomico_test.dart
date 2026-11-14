// B-SAN3-15b (P11, itens 35 e 36 do portão) — a peça e a ação da fila gravadas numa unidade só, na fila do app.
//
// Plano: `plano-B-SAN3-15-v2.md` §2.2 (P11) e §3.3 (T-U1 a T-U5 e T-U7), com a Emenda 1 (N-02, N-06, N-07) e a
// Emenda 5 (abertura) §2.6:
//   T-U1 — falha injetada na k-ésima gravação (k de 1 a 6: 3 materiais e 3 ações), Drift em memória, os dois stores
//          sobre o mesmo `AppDatabase` → 0 materiais e 0 ações novas;
//   T-U2 — sucesso → 3 materiais e 3 ações;
//   T-U3 — durante o lançamento (store Drift lento, o MESMO `AppDatabase`, Emenda 1 N-02) entram um `enqueue` de outra
//          ação, um `update` de ação pelo replay, um `removeMaterial` e um `applyMaterialSyncStatus` do C → todas as
//          ações gravadas e nada travado (tempo limite de 5 s);
//   T-U4 — o `prestadorRepositoryProvider` de produção (`ProviderContainer`, `appDatabaseProvider` em memória) monta a
//          unidade atômica;
//   T-U5 — fiação de produção: 20 `enqueue` concorrentes por `syncQueueRepositoryProvider` durante um `addSelection`
//          de 3 peças → 23 ações e 3 materiais (a guarda de fonte da M-U4 é o teste 21 de
//          `test/core/sync/bo6r11_fila_serializada_test.dart`, Emenda 1 N-06);
//   T-U7 — fila Drift num `AppDatabase` e materiais em outro → `StateError('material_unit_db_mismatch')` e nada
//          gravado nos dois.
//
// A falha da k-ésima gravação é injetada no próprio banco (um `QueryInterceptor` do Drift conta os INSERT em
// `work_order_materials` e em `sync_actions`), e não num store falso: assim o teste mede o que o banco guardou,
// qualquer que seja a forma do código.
//
// LEITURA do dev, declarada (§A6): o T-U4 prova a montagem pelo EFEITO (pelo provider de produção, uma falha no meio
// não deixa nada gravado), para compilar na `main` e ficar vermelho por asserção; a M-U3 (`DriftMaterialEnqueueUnit`
// → `SequentialMaterialEnqueueUnit`) o derruba do mesmo jeito. A conferência do TIPO da unidade montada (T-U4 e a
// pré-condição do T-U3, Emenda 1 N-02) entra na F6, quando o tipo existir.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): `addSelection` grava em duas fases (materiais, depois ações), então a
// falha no meio deixa k−1 gravações (T-U1 de k=2 a 6, T-U4) e não há a recusa do banco trocado (T-U7). T-U2, T-U3 e
// T-U5 são verdes hoje (uma instância da fila) e são as guardas da M-U2 e da M-U4.
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bsan315-material';
const _woId = 'wo-bsan315-material';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: 'user-bsan315-material',
    email: 'tecnico@bsan315.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

const _catalogo = [
  TechnicianStockItem(
    sku: 'ELE-0001',
    name: 'Disjuntor',
    available: 9,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'ELE-0002',
    name: 'Contator',
    available: 9,
    unit: 'un',
  ),
  TechnicianStockItem(sku: 'ELE-0003', name: 'Relé', available: 9, unit: 'un'),
  TechnicianStockItem(
    sku: 'ELE-0009',
    name: 'Fusível',
    available: 9,
    unit: 'un',
  ),
  TechnicianStockItem(sku: 'ELE-0010', name: 'Borne', available: 9, unit: 'un'),
];

const _tresPecas = {'ELE-0001': 1, 'ELE-0002': 1, 'ELE-0003': 1};

/// Conta os INSERT em `work_order_materials` e em `sync_actions` e falha no de número [falharNa].
class _FalhaNaGravacao extends QueryInterceptor {
  int? falharNa;
  int gravacoes = 0;

  void armar(int k) {
    falharNa = k;
    gravacoes = 0;
  }

  void _contar(String sql) {
    final s = sql.trimLeft().toUpperCase();
    final alvo =
        s.startsWith('INSERT') &&
        (s.contains('WORK_ORDER_MATERIALS') || s.contains('SYNC_ACTIONS'));
    if (!alvo) return;
    gravacoes += 1;
    if (gravacoes == falharNa) {
      throw StateError('falha injetada na gravação $gravacoes');
    }
  }

  @override
  Future<int> runInsert(
    QueryExecutor executor,
    String statement,
    List<Object?> args,
  ) {
    _contar(statement);
    return executor.runInsert(statement, args);
  }

  @override
  Future<void> runCustom(
    QueryExecutor executor,
    String statement,
    List<Object?> args,
  ) {
    _contar(statement);
    return executor.runCustom(statement, args);
  }
}

/// Store da fila sobre Drift, com atraso na leitura (molde do `_StoreLento` do bo6r11, mas no MESMO banco).
class _DriftLento extends DriftSyncActionStore {
  _DriftLento(super.db);

  @override
  Future<List<SyncAction>> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    return super.load();
  }
}

class _Banco {
  _Banco({bool lento = false}) : _lento = lento {
    db = AppDatabase(NativeDatabase.memory().interceptWith(falha));
    addTearDown(db.close);
  }

  final bool _lento;
  final falha = _FalhaNaGravacao();
  late final AppDatabase db;
  late final DriftSyncActionStore acoes = _lento
      ? _DriftLento(db)
      : DriftSyncActionStore(db);
  late final PersistentSyncQueueRepository fila = PersistentSyncQueueRepository(
    acoes,
  );
  late final DriftPrestadorLocalStore materiais = DriftPrestadorLocalStore(db);

  PrestadorRepository repositorio() => PrestadorRepository(
    session: _session,
    syncQueue: fila,
    actionFactory: SyncActionFactory(),
    localStore: materiais,
  );

  Future<int> nMateriais() async =>
      (await materiais.loadMaterials(_woId)).length;

  Future<int> nAcoes() async => (await acoes.load()).length;
}

SyncAction _outra(String id) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  type: WorkOrderSyncActionTypes.statusUpdate,
  payload: const {'local_id': 'wo-outra', 'new_status': 'paused'},
  status: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 11, 14),
);

void main() {
  group('B-SAN3-15b T-U1 — falha no meio não deixa nada gravado', () {
    for (var k = 1; k <= 6; k++) {
      test('falha na gravação $k de 6 → 0 materiais e 0 ações novas', () async {
        final banco = _Banco();
        final repo = banco.repositorio();
        banco.falha.armar(k);

        await expectLater(
          repo.addSelection(
            workOrderLocalId: _woId,
            selection: _tresPecas,
            catalog: _catalogo,
          ),
          throwsA(isA<StateError>()),
          reason: 'a falha foi injetada',
        );
        banco.falha.armar(0);

        expect(await banco.nMateriais(), 0, reason: 'materiais');
        expect(await banco.nAcoes(), 0, reason: 'ações');
      });
    }
  });

  group('B-SAN3-15b T-U2 — sucesso grava tudo', () {
    test('3 peças → 3 materiais e 3 ações', () async {
      final banco = _Banco();
      final merged = await banco.repositorio().addSelection(
        workOrderLocalId: _woId,
        selection: _tresPecas,
        catalog: _catalogo,
      );
      expect(merged, hasLength(3));
      expect(await banco.nMateriais(), 3);
      final acoes = await banco.acoes.load();
      expect(acoes, hasLength(3));
      expect(
        acoes.every((a) => a.type == InventorySyncActionTypes.materialAdd),
        isTrue,
      );
    });
  });

  group('B-SAN3-15b T-U3 — concorrência na mesma fila não perde nem trava', () {
    test(
      'enqueue, update do replay, removeMaterial e applyMaterialSyncStatus durante o lançamento',
      () async {
        final banco = _Banco(lento: true);
        final repo = banco.repositorio();

        // Preparo (com await): a peça M0, já baixada (synced, com result_ref), e a peça M9, pendente.
        final m0 = (await repo.addSelection(
          workOrderLocalId: _woId,
          selection: const {'ELE-0009': 1},
          catalog: _catalogo,
        )).single;
        final a0 = (await banco.acoes.load()).single;
        await banco.fila.update(
          a0.copyWith(
            status: SyncStatus.synced,
            payload: {...a0.payload, 'result_ref': 'mov-0'},
          ),
        );
        final m9 = (await repo.addSelection(
          workOrderLocalId: _woId,
          selection: const {'ELE-0010': 1},
          catalog: _catalogo,
        )).firstWhere((m) => m.sku == 'ELE-0010');
        final a9 = (await banco.acoes.load()).firstWhere(
          (a) => a.payload['material_local_id'] == m9.localId,
        );
        expect(await banco.nAcoes(), 2);
        expect(m0.sku, 'ELE-0009');

        // Tudo ao mesmo tempo, sem await entre as chamadas.
        await Future.wait<void>([
          repo.addSelection(
            workOrderLocalId: _woId,
            selection: _tresPecas,
            catalog: _catalogo,
          ),
          banco.fila.enqueue(_outra('act-outra-1')),
          banco.fila.update(
            a9.copyWith(
              status: SyncStatus.synced,
              payload: {...a9.payload, 'result_ref': 'mov-9'},
            ),
          ),
          repo.applyMaterialSyncStatus(m9.localId, SyncStatus.synced),
          repo.removeMaterial(m0.localId),
        ]).timeout(const Duration(seconds: 5));

        final acoes = await banco.acoes.load();
        final porId = {for (final a in acoes) a.clientActionId: a};
        // A0 e A9 (do preparo), o remove da M0, a outra ação e as 3 adições novas.
        expect(
          acoes,
          hasLength(7),
          reason: acoes.map((a) => a.type).join(', '),
        );
        expect(
          porId['act-outra-1'],
          isNotNull,
          reason: 'o enqueue concorrente',
        );
        expect(
          porId[a9.clientActionId]!.status,
          SyncStatus.synced,
          reason: 'o update do replay não foi perdido',
        );
        expect(
          acoes.where(
            (a) =>
                a.type == InventorySyncActionTypes.materialRemove &&
                a.payload['material_local_id'] == m0.localId,
          ),
          hasLength(1),
          reason: 'o remove da M0',
        );
        expect(
          acoes.where(
            (a) =>
                a.type == InventorySyncActionTypes.materialAdd &&
                _tresPecas.containsKey(a.payload['sku']),
          ),
          hasLength(3),
          reason: 'as 3 adições novas',
        );
        final skus = {
          for (final m in await banco.materiais.loadMaterials(_woId)) m.sku,
        };
        expect(skus, {'ELE-0010', ..._tresPecas.keys});
      },
    );
  });

  group('B-SAN3-15b T-U4 — o provider de produção monta a unidade atômica', () {
    test(
      'pelo prestadorRepositoryProvider, a falha no meio não deixa nada',
      () async {
        final falha = _FalhaNaGravacao();
        final db = AppDatabase(NativeDatabase.memory().interceptWith(falha));
        addTearDown(db.close);
        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            bootstrapSessionProvider.overrideWith((_) async => _session),
          ],
        );
        addTearDown(container.dispose);
        await container.read(bootstrapSessionProvider.future);
        final repo = container.read(prestadorRepositoryProvider);

        falha.armar(2);
        await expectLater(
          repo.addSelection(
            workOrderLocalId: _woId,
            selection: _tresPecas,
            catalog: _catalogo,
          ),
          throwsA(isA<StateError>()),
        );
        falha.armar(0);

        expect(await repo.loadMaterials(_woId), isEmpty, reason: 'materiais');
        expect(
          await container.read(syncActionStoreProvider).load(),
          isEmpty,
          reason: 'ações',
        );
      },
    );
  });

  group('B-SAN3-15b T-U5 — a fiação de produção usa a fila partilhada', () {
    test(
      '20 enqueue concorrentes durante addSelection de 3 peças → 23 ações e 3 materiais',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final container = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(db),
            bootstrapSessionProvider.overrideWith((_) async => _session),
          ],
        );
        addTearDown(container.dispose);
        await container.read(bootstrapSessionProvider.future);
        final repo = container.read(prestadorRepositoryProvider);
        final fila = container.read(syncQueueRepositoryProvider);

        await Future.wait<void>([
          repo.addSelection(
            workOrderLocalId: _woId,
            selection: _tresPecas,
            catalog: _catalogo,
          ),
          for (var i = 0; i < 20; i++)
            fila.enqueue(_outra('act-concorrente-$i')),
        ]).timeout(const Duration(seconds: 5));

        expect(
          await container.read(syncActionStoreProvider).load(),
          hasLength(23),
        );
        expect(await repo.loadMaterials(_woId), hasLength(3));
      },
    );
  });

  group('B-SAN3-15b T-U7 — fila e materiais em bancos diferentes: recusa', () {
    test(
      'StateError("material_unit_db_mismatch") e nada gravado nos dois',
      () async {
        final db1 = AppDatabase.openInMemory();
        final db2 = AppDatabase.openInMemory();
        addTearDown(db1.close);
        addTearDown(db2.close);
        final acoes = DriftSyncActionStore(db1);
        final materiais = DriftPrestadorLocalStore(db2);
        final repo = PrestadorRepository(
          session: _session,
          syncQueue: PersistentSyncQueueRepository(acoes),
          actionFactory: SyncActionFactory(),
          localStore: materiais,
        );

        await expectLater(
          repo.addSelection(
            workOrderLocalId: _woId,
            selection: _tresPecas,
            catalog: _catalogo,
          ),
          throwsA(
            isA<StateError>().having(
              (e) => e.message,
              'message',
              'material_unit_db_mismatch',
            ),
          ),
        );
        expect(await acoes.load(), isEmpty, reason: 'ações em db1');
        expect(
          await materiais.loadMaterials(_woId),
          isEmpty,
          reason: 'materiais em db2',
        );
      },
    );
  });
}
