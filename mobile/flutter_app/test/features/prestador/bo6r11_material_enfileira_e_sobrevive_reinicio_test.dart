import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11 (Ω6R-QUA-005) — o material lançado em campo não pode sumir.
//
// No head-base, `PrestadorRepository.addSelection` enfileirava as ações num `selection.forEach`
// cujo callback é `void`: a `Future` de cada `enqueue` era descartada. O método retornava — e
// notificava a tela — ANTES de qualquer ação estar gravada; e como cada `enqueue` é um
// read-modify-write da fila inteira, as N gravações leram o MESMO retrato e a última venceu.
// Reinício logo após o retorno: 0 ações. Deixando terminar: 1 de N.
//
// O teste do gate é o 14: N SKUs + reinício (Drift de verdade) → N ações pendentes.

const _tenant = 'tenant-bo6r11';
const _wo = 'wo-local-bo6r11';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant BO6R11'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

const _catalogo = [
  TechnicianStockItem(
    sku: 'ELE-0031',
    name: 'Fusivel 20A',
    category: 'Protecao',
    available: 24,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'CON-0009',
    name: 'Fita isolante 19mm',
    category: 'Consumivel',
    available: 8,
    unit: 'rolo',
  ),
  TechnicianStockItem(
    sku: 'ELE-0102',
    name: 'Disjuntor tripolar 25A',
    category: 'Protecao',
    available: 6,
    unit: 'un',
  ),
];

/// Três SKUs, em ordem de inserção (o `Map` literal preserva a ordem).
Map<String, int> _tresSkus() => {'ELE-0031': 2, 'CON-0009': 1, 'ELE-0102': 4};

/// Store com latência real em `load` e `save` — o que um SQLite em disco faz. O retrato da fila
/// é tirado DEPOIS da espera, como numa leitura de verdade.
class _StoreLento implements SyncActionStore {
  List<SyncAction> _acoes = const [];

  @override
  Future<List<SyncAction>> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    return List.unmodifiable(_acoes);
  }

  @override
  Future<void> save(List<SyncAction> actions) async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    _acoes = List.unmodifiable(actions);
  }
}

PrestadorRepository _repo({
  required SyncActionStore acoes,
  PrestadorLocalStore? materiais,
}) => PrestadorRepository(
  session: _session,
  syncQueue: PersistentSyncQueueRepository(acoes),
  actionFactory: SyncActionFactory(),
  localStore: materiais ?? InMemoryPrestadorLocalStore(),
);

List<SyncAction> _materialAdd(List<SyncAction> acoes) => acoes
    .where((a) => a.type == InventorySyncActionTypes.materialAdd)
    .toList(growable: false);

void main() {
  group('B-O6R-11 material do prestador — fila local', () {
    test(
      '13. addSelection só retorna depois de gravar as N ações (store com latência)',
      () async {
        final store = _StoreLento();
        final repo = _repo(acoes: store);

        await repo.addSelection(
          workOrderLocalId: _wo,
          selection: _tresSkus(),
          catalog: _catalogo,
        );

        // Nenhuma espera extra: o que está na fila AGORA é o que sobrevive a um reinício agora.
        final gravadas = _materialAdd(await store.load());
        expect(gravadas, hasLength(3));
        expect(
          {for (final a in gravadas) a.payload['sku']: a.payload['quantity']},
          {'ELE-0031': 2, 'CON-0009': 1, 'ELE-0102': 4},
        );
        expect(gravadas.every((a) => a.tenantId == _tenant), isTrue);
      },
    );

    test(
      '14. o teste do gate: 3 SKUs + reinício sobre o Drift → 3 ações pendentes, na ordem',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final repo = PrestadorRepository(
          session: _session,
          syncQueue: PersistentSyncQueueRepository(DriftSyncActionStore(db)),
          actionFactory: SyncActionFactory(),
          localStore: DriftPrestadorLocalStore(db),
        );

        final materiais = await repo.addSelection(
          workOrderLocalId: _wo,
          selection: _tresSkus(),
          catalog: _catalogo,
        );
        expect(materiais, hasLength(3));

        // "Reinício": nada da instância anterior é reaproveitado — só o banco.
        final filaAposReinicio = PersistentSyncQueueRepository(
          DriftSyncActionStore(db),
        );
        final pendentes = await filaAposReinicio.pendingForTenant(_tenant);

        expect(pendentes, hasLength(3));
        expect(
          pendentes.map((a) => a.payload['sku']).toList(),
          ['ELE-0031', 'CON-0009', 'ELE-0102'],
          reason: 'o replay envia na ordem de criação',
        );
        for (final acao in pendentes) {
          expect(acao.type, InventorySyncActionTypes.materialAdd);
          expect(acao.status, SyncStatus.pending);
          expect(acao.tenantId, _tenant);
          expect(acao.payload['work_order_local_id'], _wo);
          expect(acao.payload.containsKey('token'), isFalse);
          expect(acao.payload.containsKey('tenant_id'), isFalse);
        }
        expect(
          pendentes.map((a) => a.clientActionId).toSet(),
          hasLength(3),
          reason: 'idempotência: um client_action_id por ação',
        );

        final materiaisAposReinicio = await DriftPrestadorLocalStore(
          db,
        ).loadMaterials(_wo);
        expect(materiaisAposReinicio, hasLength(3));
      },
    );

    test('15. quantidade <= 0 não enfileira nem vira material', () async {
      final store = _StoreLento();
      final materiais = InMemoryPrestadorLocalStore();
      final repo = _repo(acoes: store, materiais: materiais);

      await repo.addSelection(
        workOrderLocalId: _wo,
        selection: {'ELE-0031': 0, 'CON-0009': 2},
        catalog: _catalogo,
      );

      final gravadas = _materialAdd(await store.load());
      expect(gravadas, hasLength(1));
      expect(gravadas.single.payload['sku'], 'CON-0009');
      expect(gravadas.single.payload['quantity'], 2);
      final locais = await materiais.loadMaterials(_wo);
      expect(locais, hasLength(1));
      expect(locais.single.sku, 'CON-0009');
    });

    test(
      '16. duas seleções iguais → 2×N ações distintas e materiais somados',
      () async {
        final store = _StoreLento();
        final materiais = InMemoryPrestadorLocalStore();
        final repo = _repo(acoes: store, materiais: materiais);
        final selecao = {'ELE-0031': 2, 'CON-0009': 1};

        await repo.addSelection(
          workOrderLocalId: _wo,
          selection: selecao,
          catalog: _catalogo,
        );
        await repo.addSelection(
          workOrderLocalId: _wo,
          selection: selecao,
          catalog: _catalogo,
        );

        final gravadas = _materialAdd(await store.load());
        expect(gravadas, hasLength(4));
        expect(gravadas.map((a) => a.clientActionId).toSet(), hasLength(4));
        final locais = {
          for (final m in await materiais.loadMaterials(_wo)) m.sku: m.quantity,
        };
        expect(locais, {'ELE-0031': 4, 'CON-0009': 2});
      },
    );
  });
}
