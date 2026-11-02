import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_presentation.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:flutter_test/flutter_test.dart';

SyncAction _action(
  String id,
  String type,
  SyncStatus status, {
  int retryCount = 0,
  String? errorCode = 'OLD_CODE',
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-awaiting',
    type: type,
    payload: {
      'id': id,
      'nested': const {'value': 7},
    },
    status: status,
    createdAt: DateTime.utc(2026, 11, 2, 12, 0, int.parse(id)),
    retryCount: retryCount,
    lastErrorCode: errorCode,
    lastSafeError: errorCode == null ? null : 'erro anterior',
    processedAt: DateTime.utc(2026, 11, 1),
  );
}

void main() {
  test('r1 resgata failed e syncing dos quatro tipos de despesa', () {
    final originals = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.failed,
        retryCount: 1,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 3,
      ),
      _action(
        '3',
        ExpenseSyncActionTypes.reportSubmit,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '4',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '5',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.syncing,
        retryCount: 2,
      ),
      _action(
        '6',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.syncing,
        retryCount: 4,
      ),
    ];

    final result = reclaimExpensesAwaitingBackend(originals);

    expect(result.map((a) => a.clientActionId), ['1', '2', '3', '4', '5', '6']);
    for (var index = 0; index < originals.length; index++) {
      final before = originals[index];
      final after = result[index];
      expect(after.status, SyncStatus.pending);
      expect(after.retryCount, 0);
      expect(after.lastErrorCode, isNull);
      expect(after.lastSafeError, isNull);
      expect(after.processedAt, isNull);
      expect(after.clientActionId, before.clientActionId);
      expect(after.tenantId, before.tenantId);
      expect(after.type, before.type);
      expect(after.payload, before.payload);
      expect(after.createdAt, before.createdAt);
    }
  });

  test('r2 não resgata outros domínios nem despesa fora de failed/syncing', () {
    final actions = [
      _action('1', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.failed),
      _action('2', ChecklistSyncActionTypes.answerUpsert, SyncStatus.syncing),
      _action('3', EvidenceSyncActionTypes.fieldPhoto, SyncStatus.failed),
      _action('4', 'unknown.action', SyncStatus.syncing),
      _action('5', ExpenseSyncActionTypes.reportCreate, SyncStatus.pending),
      _action('6', ExpenseSyncActionTypes.itemCreate, SyncStatus.conflict),
      _action('7', ExpenseSyncActionTypes.reportSubmit, SyncStatus.synced),
    ];

    expect(reclaimExpensesAwaitingBackend(actions), isEmpty);
  });

  test('r3 apresentação distingue canal desligado, encalhe e descarte', () {
    for (final status in [
      SyncStatus.pending,
      SyncStatus.failed,
      SyncStatus.syncing,
    ]) {
      final expense = _action(
        '${status.index + 1}',
        ExpenseSyncActionTypes.reportCreate,
        status,
        retryCount: status == SyncStatus.failed ? 5 : 0,
      );
      expect(
        presentSyncAction(expense, expenseChannelOff: true),
        SyncPresentation.awaitingBackend,
      );
    }
    expect(
      presentSyncAction(
        _action(
          '4',
          ExpenseSyncActionTypes.reportCreate,
          SyncStatus.failed,
          retryCount: 2,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.failed,
    );
    expect(
      presentSyncAction(
        _action(
          '5',
          ExpenseSyncActionTypes.reportCreate,
          SyncStatus.failed,
          retryCount: 5,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.stalled,
    );
    expect(
      presentSyncAction(
        _action(
          '6',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.failed,
          retryCount: 5,
        ),
        expenseChannelOff: true,
      ),
      SyncPresentation.stalled,
    );
    expect(
      presentSyncAction(
        _action(
          '7',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.synced,
          errorCode: syncDiscardedErrorCode,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.discarded,
    );
    expect(
      presentSyncAction(
        _action(
          '8',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.synced,
          errorCode: null,
        ),
        expenseChannelOff: false,
      ),
      SyncPresentation.synced,
    );
  });

  test('r4 contadores usam apresentação e não contam descartado', () {
    final actions = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 2,
      ),
      _action('3', ExpenseSyncActionTypes.reportSubmit, SyncStatus.pending),
      _action('4', ExpenseSyncActionTypes.receiptAttach, SyncStatus.syncing),
      _action(
        '5',
        WorkOrderSyncActionTypes.statusUpdate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '6',
        WorkOrderSyncActionTypes.create,
        SyncStatus.synced,
        errorCode: null,
      ),
      _action(
        '7',
        WorkOrderSyncActionTypes.assign,
        SyncStatus.synced,
        errorCode: syncDiscardedErrorCode,
      ),
      _action('8', ChecklistSyncActionTypes.answerUpsert, SyncStatus.conflict),
    ];

    final counts = SyncPresentationCounts.fromActions(
      actions,
      expenseChannelOff: true,
    );
    expect(counts.pending, 4);
    expect(counts.errors, 1);
    expect(counts.synced, 1);
    expect(counts.conflicts, 1);
  });

  test('r5 resgate do início da passada separa despesas pelo canal', () {
    final actions = [
      _action(
        '1',
        ExpenseSyncActionTypes.reportCreate,
        SyncStatus.syncing,
        retryCount: 3,
      ),
      _action(
        '2',
        ExpenseSyncActionTypes.receiptAttach,
        SyncStatus.syncing,
        retryCount: 4,
      ),
      _action(
        '3',
        WorkOrderSyncActionTypes.statusUpdate,
        SyncStatus.syncing,
        retryCount: 2,
      ),
      _action(
        '4',
        ExpenseSyncActionTypes.itemCreate,
        SyncStatus.failed,
        retryCount: 5,
      ),
      _action(
        '5',
        WorkOrderSyncActionTypes.create,
        SyncStatus.failed,
        retryCount: 2,
      ),
    ];

    final channelOff = reclaimQueueAtPassStart(
      actions,
      expenseChannelOff: true,
    );
    expect(channelOff.map((a) => a.clientActionId), ['1', '2', '3', '4']);
    expect(
      channelOff
          .where((a) => a.clientActionId != '3')
          .every(
            (a) =>
                a.status == SyncStatus.pending &&
                a.retryCount == 0 &&
                a.lastErrorCode == null,
          ),
      isTrue,
    );
    expect(
      channelOff.singleWhere((a) => a.clientActionId == '3').status,
      SyncStatus.conflict,
    );
    expect(
      channelOff.singleWhere((a) => a.clientActionId == '3').lastErrorCode,
      syncInterruptedErrorCode,
    );

    final channelOn = reclaimQueueAtPassStart(
      actions,
      expenseChannelOff: false,
    );
    expect(channelOn.map((a) => a.clientActionId), ['1', '2', '3']);
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '1').status,
      SyncStatus.pending,
    );
    expect(channelOn.singleWhere((a) => a.clientActionId == '1').retryCount, 3);
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '2').status,
      SyncStatus.conflict,
    );
    expect(
      channelOn.singleWhere((a) => a.clientActionId == '3').status,
      SyncStatus.conflict,
    );
    expect(
      channelOn.map((a) => a.clientActionId).toSet().length,
      channelOn.length,
    );
  });
}
