// B-APP-ORG (itens 69 e 70), ACH-02 da pré-revisão — a fila EM MEMÓRIA
// (`InMemorySyncQueueRepository`) só devolve as ações da organização pedida.
//
// Achado do Codex 4 (`prerev-apporg-cx4`, §6, e a Emenda 1.6): trocar o filtro
// de organização de `pendingForTenant` por `.where((action) => true)` deixava a
// suíte inteira verde. Este arquivo usa a classe em memória diretamente, com
// ações de duas organizações (A e B), do mesmo usuário e de outro usuário.
//
// Mutações que este arquivo pega (uma por ocorrência do filtro de organização
// na classe em memória):
// - M-ACH02-a: `pendingForTenant` com `.where((action) => true)` no lugar de
//   `.where((action) => action.tenantId == tenantId)`;
// - M-ACH02-b: `actionsForTenant` com a mesma troca.
//
// Os dados são fictícios e só existem neste arquivo.
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:flutter_test/flutter_test.dart';

const _orgA = 'org-a';
const _orgB = 'org-b';

SyncAction _action(
  String id, {
  required String tenantId,
  required String userId,
  required SyncStatus status,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: tenantId,
    userId: userId,
    type: 'work_order.status_update',
    payload: <String, Object?>{'local_id': 'wo-$id'},
    status: status,
    createdAt: DateTime.utc(2026, 11, 20, 12, 0),
    retryCount: 0,
  );
}

/// Duas organizações, dois usuários, todos os estados que contam como
/// pendência (pending, failed, conflict) e um que não conta (synced).
Future<InMemorySyncQueueRepository> _seed() async {
  final queue = InMemorySyncQueueRepository();
  for (final action in <SyncAction>[
    _action(
      'a-u1-p',
      tenantId: _orgA,
      userId: 'u1',
      status: SyncStatus.pending,
    ),
    _action('a-u1-f', tenantId: _orgA, userId: 'u1', status: SyncStatus.failed),
    _action(
      'a-u2-c',
      tenantId: _orgA,
      userId: 'u2',
      status: SyncStatus.conflict,
    ),
    _action('a-u1-s', tenantId: _orgA, userId: 'u1', status: SyncStatus.synced),
    _action(
      'b-u1-p',
      tenantId: _orgB,
      userId: 'u1',
      status: SyncStatus.pending,
    ),
    _action('b-u2-f', tenantId: _orgB, userId: 'u2', status: SyncStatus.failed),
    _action(
      'b-u1-c',
      tenantId: _orgB,
      userId: 'u1',
      status: SyncStatus.conflict,
    ),
    _action('b-u2-s', tenantId: _orgB, userId: 'u2', status: SyncStatus.synced),
  ]) {
    await queue.enqueue(action);
  }
  return queue;
}

Set<String> _ids(List<SyncAction> actions) =>
    actions.map((a) => a.clientActionId).toSet();

void main() {
  test(
    'ACH-02(1): pendingForTenant(B) devolve só as pendências de B, dos dois usuários',
    () async {
      final queue = await _seed();

      final pending = await queue.pendingForTenant(_orgB);

      expect(_ids(pending), <String>{'b-u1-p', 'b-u2-f', 'b-u1-c'});
      expect(pending.every((a) => a.tenantId == _orgB), isTrue);
    },
  );

  test(
    'ACH-02(2): pendingForTenant(A) devolve só as pendências de A, dos dois usuários',
    () async {
      final queue = await _seed();

      final pending = await queue.pendingForTenant(_orgA);

      expect(_ids(pending), <String>{'a-u1-p', 'a-u1-f', 'a-u2-c'});
      expect(pending.every((a) => a.tenantId == _orgA), isTrue);
    },
  );

  test(
    'ACH-02(3): actionsForTenant devolve todas as ações da organização pedida, e só elas',
    () async {
      final queue = await _seed();

      final actionsB = await queue.actionsForTenant(_orgB);
      final actionsA = await queue.actionsForTenant(_orgA);

      expect(_ids(actionsB), <String>{'b-u1-p', 'b-u2-f', 'b-u1-c', 'b-u2-s'});
      expect(actionsB.every((a) => a.tenantId == _orgB), isTrue);
      expect(_ids(actionsA), <String>{'a-u1-p', 'a-u1-f', 'a-u2-c', 'a-u1-s'});
      expect(actionsA.every((a) => a.tenantId == _orgA), isTrue);
    },
  );

  test(
    'ACH-02(4): organização sem ações na fila não recebe nada das outras',
    () async {
      final queue = await _seed();

      expect(await queue.pendingForTenant('org-c'), isEmpty);
      expect(await queue.actionsForTenant('org-c'), isEmpty);
    },
  );

  test(
    'ACH-02(5): depois de update, a ação continua só na organização dela',
    () async {
      final queue = await _seed();
      final pendingA = await queue.pendingForTenant(_orgA);
      final aPending = pendingA.firstWhere((a) => a.clientActionId == 'a-u1-p');

      await queue.update(aPending.copyWith(status: SyncStatus.failed));

      expect(_ids(await queue.pendingForTenant(_orgB)), <String>{
        'b-u1-p',
        'b-u2-f',
        'b-u1-c',
      });
      expect(_ids(await queue.pendingForTenant(_orgA)), <String>{
        'a-u1-p',
        'a-u1-f',
        'a-u2-c',
      });
    },
  );

  test(
    'ACH-02(6): a fila do usuário u1 sobre a fila em memória vê só as pendências de u1 em B',
    () async {
      final queue = await _seed();
      final scoped = UserScopedSyncQueueRepository(
        queue: queue,
        currentUserId: () => 'u1',
      );

      final pending = await scoped.pendingForTenant(_orgB);

      expect(_ids(pending), <String>{'b-u1-p', 'b-u1-c'});
    },
  );
}
