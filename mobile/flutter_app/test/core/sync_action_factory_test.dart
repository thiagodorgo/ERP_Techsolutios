import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('creates idempotent action when client action id is supplied', () {
    final factory = SyncActionFactory();
    final createdAt = DateTime.utc(2026, 6, 11);

    final first = factory.create(
      tenantId: 'tenant-a',
      type: 'expense_report.create',
      clientActionId: 'action-1',
      createdAt: createdAt,
      payload: const {'local_id': 'pc-1'},
    );
    final replay = factory.create(
      tenantId: 'tenant-a',
      type: 'expense_report.create',
      clientActionId: 'action-1',
      createdAt: createdAt,
      payload: const {'local_id': 'pc-1'},
    );

    expect(first, replay);
    expect(first.status, SyncStatus.pending);
  });

  test('requires tenant id for local sync actions', () {
    final factory = SyncActionFactory();

    expect(
      () => factory.create(
        tenantId: '',
        type: 'expense_report.create',
        payload: const {},
      ),
      throwsArgumentError,
    );
  });
}
