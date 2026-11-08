import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-ra3';

SyncAction _action(
  String id, {
  String? userId,
  SyncStatus status = SyncStatus.pending,
  String type = 'work_order.status_update',
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenant,
    userId: userId,
    type: type,
    payload: <String, Object?>{'local_id': 'wo-$id'},
    status: status,
    createdAt: DateTime.utc(2026, 11, 8, 12, 0),
    retryCount: 0,
  );
}

Future<(InMemorySyncQueueRepository, UserScopedSyncQueueRepository)> _seed({
  required String? Function() currentUserId,
}) async {
  final inner = InMemorySyncQueueRepository();
  await inner.enqueue(
    _action('u1-p', userId: 'u1', status: SyncStatus.pending),
  );
  await inner.enqueue(_action('u1-f', userId: 'u1', status: SyncStatus.failed));
  await inner.enqueue(
    _action('u2-p', userId: 'u2', status: SyncStatus.pending),
  );
  await inner.enqueue(_action('u2-f', userId: 'u2', status: SyncStatus.failed));
  await inner.enqueue(
    _action('u2-c', userId: 'u2', status: SyncStatus.conflict),
  );
  await inner.enqueue(_action('u2-s', userId: 'u2', status: SyncStatus.synced));
  await inner.enqueue(_action('leg-p', status: SyncStatus.pending));
  await inner.enqueue(_action('leg-f', status: SyncStatus.failed));

  final scoped = UserScopedSyncQueueRepository(
    queue: inner,
    currentUserId: currentUserId,
  );
  return (inner, scoped);
}

void main() {
  test(
    'RA3(1): pendingForTenant sob u2 devolve só as ações de u2 elegíveis (pending/failed/conflict)',
    () async {
      final (_, scoped) = await _seed(currentUserId: () => 'u2');

      final pending = await scoped.pendingForTenant(_tenant);
      expect(pending.map((a) => a.clientActionId).toList(), <String>[
        'u2-p',
        'u2-f',
        'u2-c',
      ]);
      expect(pending.every((a) => a.userId == 'u2'), isTrue);
    },
  );

  test(
    'RA3(2): ações sem usuário (null ou vazio) e sessão nula nunca entram em pendingForTenant',
    () async {
      final (inner, scopedU2) = await _seed(currentUserId: () => 'u2');
      await inner.enqueue(_action('leg-blank', userId: '   '));

      final pendingU2 = await scopedU2.pendingForTenant(_tenant);
      expect(
        pendingU2.any(
          (a) =>
              a.clientActionId.startsWith('leg-') ||
              a.userId == null ||
              a.userId!.trim().isEmpty,
        ),
        isFalse,
      );

      final scopedNull = UserScopedSyncQueueRepository(
        queue: inner,
        currentUserId: () => null,
      );
      expect(await scopedNull.pendingForTenant(_tenant), isEmpty);

      final part = partitionByUser(await inner.actionsForTenant(_tenant), 'u2');
      expect(part.mine.map((a) => a.clientActionId), <String>[
        'u2-p',
        'u2-f',
        'u2-c',
        'u2-s',
      ]);
      expect(part.others.map((a) => a.clientActionId), <String>[
        'u1-p',
        'u1-f',
      ]);
      expect(part.legacy.map((a) => a.clientActionId), <String>[
        'leg-p',
        'leg-f',
        'leg-blank',
      ]);
    },
  );

  test(
    'RA3(3): actionsForTenant devolve todas as ações do tenant (inclusive de u1 e null)',
    () async {
      final (_, scoped) = await _seed(currentUserId: () => 'u2');

      final all = await scoped.actionsForTenant(_tenant);
      expect(all.map((a) => a.clientActionId).toList(), <String>[
        'u1-p',
        'u1-f',
        'u2-p',
        'u2-f',
        'u2-c',
        'u2-s',
        'leg-p',
        'leg-f',
      ]);
    },
  );

  test(
    'RA3(4): enqueue e update passam ao repositório interno sem alterar userId e recusam update alheio',
    () async {
      final (inner, scoped) = await _seed(currentUserId: () => 'u2');

      await scoped.enqueue(_action('new-u2', userId: 'u2'));
      await scoped.enqueue(_action('new-null'));

      final updatedU2 = _action(
        'u2-p',
        userId: 'u2',
        status: SyncStatus.synced,
      );
      await scoped.update(updatedU2);

      final all = {
        for (final a in await inner.actionsForTenant(_tenant))
          a.clientActionId: a,
      };
      expect(all['new-u2']!.userId, 'u2');
      expect(all['new-null']!.userId, isNull);
      expect(all['u2-p']!.status, SyncStatus.synced);
      expect(all['u2-p']!.userId, 'u2');

      await expectLater(
        scoped.update(_action('u1-p', userId: 'u1', status: SyncStatus.synced)),
        throwsA(isA<SyncOwnershipError>()),
      );
      expect(
        (await inner.actionsForTenant(
          _tenant,
        )).singleWhere((a) => a.clientActionId == 'u1-p').status,
        SyncStatus.pending,
      );
    },
  );
}
