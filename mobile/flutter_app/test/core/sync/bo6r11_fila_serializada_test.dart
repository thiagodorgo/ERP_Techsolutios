import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11 (Ω6R-QUA-005, classe) — a fila local é UMA instância partilhada
// (`syncQueueRepositoryProvider`) por replay, conflitos e repositórios de feature. `enqueue` e
// `update` são read-modify-write da fila inteira; duas mutações concorrentes liam o mesmo
// retrato e a última `save` apagava a outra. Estes testes disparam as mutações SEM `await` entre
// si — a forma que o bug tinha em produção — sobre um store com latência real.

const _tenant = 'tenant-bo6r11-fila';

class _StoreLento implements SyncActionStore {
  _StoreLento([List<SyncAction> semente = const []])
    : _acoes = List.unmodifiable(semente);

  List<SyncAction> _acoes;

  @override
  Future<List<SyncAction>> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    return _acoes;
  }

  @override
  Future<void> save(List<SyncAction> actions) async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    _acoes = List.unmodifiable(actions);
  }
}

SyncAction _acao(String id, {String tenantId = _tenant}) => SyncAction(
  clientActionId: id,
  tenantId: tenantId,
  type: 'work_order_material.add',
  payload: {'sku': 'SKU-$id', 'quantity': 1},
  status: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 9, 18),
);

void main() {
  group('B-O6R-11 fila serializada (PersistentSyncQueueRepository)', () {
    test('17. dois enqueue concorrentes não se sobrescrevem', () async {
      final store = _StoreLento();
      final fila = PersistentSyncQueueRepository(store);

      await Future.wait([fila.enqueue(_acao('a')), fila.enqueue(_acao('b'))]);

      final ids = (await store.load()).map((a) => a.clientActionId).toList();
      expect(ids, ['a', 'b']);
    });

    test(
      '18. enqueue concorrente com update: a atualização E a ação nova sobrevivem, nas duas ordens',
      () async {
        for (final updatePrimeiro in [true, false]) {
          final store = _StoreLento([_acao('a')]);
          final fila = PersistentSyncQueueRepository(store);
          final sincronizada = _acao('a').copyWith(status: SyncStatus.synced);

          await Future.wait(
            updatePrimeiro
                ? [fila.update(sincronizada), fila.enqueue(_acao('b'))]
                : [fila.enqueue(_acao('b')), fila.update(sincronizada)],
          );

          final porId = {
            for (final a in await store.load()) a.clientActionId: a.status,
          };
          expect(porId, {
            'a': SyncStatus.synced,
            'b': SyncStatus.pending,
          }, reason: updatePrimeiro ? 'update → enqueue' : 'enqueue → update');
        }
      },
    );

    test(
      '19. um enqueue recusado (tenant vazio) não trava as mutações seguintes',
      () async {
        final store = _StoreLento();
        final fila = PersistentSyncQueueRepository(store);

        final recusado = fila.enqueue(_acao('x', tenantId: '   '));
        final seguinte = fila.enqueue(_acao('b'));

        await expectLater(recusado, throwsArgumentError);
        await seguinte;

        final ids = (await store.load()).map((a) => a.clientActionId).toList();
        expect(ids, ['b']);
      },
    );

    test(
      '20. dedupe por client_action_id continua valendo sob concorrência',
      () async {
        final store = _StoreLento();
        final fila = PersistentSyncQueueRepository(store);

        await Future.wait([fila.enqueue(_acao('a')), fila.enqueue(_acao('a'))]);

        expect(await store.load(), hasLength(1));
      },
    );
  });
}
