import 'dart:convert';
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final fixedCreatedAt = DateTime.utc(2026, 11, 8, 12, 0, 0);

  test(
    'RA1(1): SyncAction.copyWith(userId:) e props incluem userId sem quebrar igualdade legada',
    () {
      final legacyA = SyncAction(
        clientActionId: 'act-1',
        tenantId: 'tenant-1',
        type: 'work_order.status_update',
        payload: const {'status': 'in_progress'},
        status: SyncStatus.pending,
        createdAt: fixedCreatedAt,
      );
      final legacyB = SyncAction(
        clientActionId: 'act-1',
        tenantId: 'tenant-1',
        type: 'work_order.status_update',
        payload: const {'status': 'in_progress'},
        status: SyncStatus.pending,
        createdAt: fixedCreatedAt,
      );

      expect(legacyA.userId, isNull);
      expect(legacyA, equals(legacyB));

      final ownedU1 = legacyA.copyWith(userId: 'user-1');
      final ownedU2 = legacyA.copyWith(userId: 'user-2');
      final ownedU1Retried = ownedU1.copyWith(retryCount: 2);

      expect(ownedU1.userId, 'user-1');
      expect(ownedU1Retried.userId, 'user-1');
      expect(ownedU1, isNot(equals(legacyA)));
      expect(ownedU1, isNot(equals(ownedU2)));
      expect(ownedU1.props, contains('user-1'));
    },
  );

  test(
    'RA1(2): SyncActionCodec roundtrip preserva user_id e lê JSON antigo sem a chave como null',
    () async {
      final stamped = SyncAction(
        clientActionId: 'act-json-1',
        tenantId: 'tenant-1',
        userId: 'user-42',
        type: 'expense_report.create',
        payload: const {'local_id': 'rep-1'},
        status: SyncStatus.pending,
        createdAt: fixedCreatedAt,
      );

      final encoded = SyncActionCodec.toJson(stamped);
      expect(encoded['user_id'], 'user-42');

      final decoded = SyncActionCodec.fromJson(
        jsonDecode(jsonEncode(encoded)) as Map<String, dynamic>,
      );
      expect(decoded, equals(stamped));
      expect(decoded.userId, 'user-42');

      // JSON antigo (10 chaves, sem user_id) continua carregando como userId == null.
      final dir = await Directory.systemTemp.createTemp('ra1_legacy_json_');
      addTearDown(() async {
        if (await dir.exists()) {
          await dir.delete(recursive: true);
        }
      });
      final legacyFile = File('${dir.path}/sync_actions.json');
      await legacyFile.writeAsString(
        jsonEncode([
          {
            'client_action_id': 'act-old-1',
            'tenant_id': 'tenant-1',
            'type': 'work_order.status_update',
            'payload': {'status': 'completed'},
            'status': 'pending',
            'created_at': fixedCreatedAt.toIso8601String(),
            'retry_count': 1,
            'last_error_code': null,
            'last_safe_error': null,
            'processed_at': null,
          },
        ]),
      );

      final loaded = await JsonFileSyncActionStore.file(legacyFile).load();
      expect(loaded, hasLength(1));
      expect(loaded.single.clientActionId, 'act-old-1');
      expect(loaded.single.userId, isNull);
    },
  );

  test(
    'RA1(3): SyncActionFactory carimba currentUserId, userId explícito prevalece e sem sessão fica null',
    () {
      var activeSessionUser = 'u1';
      final factoryWithSession = SyncActionFactory(
        currentUserId: () => activeSessionUser,
      );

      final fromSession = factoryWithSession.create(
        clientActionId: 'f-1',
        tenantId: 'tenant-1',
        type: 'work_order.status_update',
        payload: const {'status': 'in_progress'},
        createdAt: fixedCreatedAt,
      );
      expect(fromSession.userId, 'u1');

      activeSessionUser = 'u2';
      final fromUpdatedSession = factoryWithSession.create(
        clientActionId: 'f-2',
        tenantId: 'tenant-1',
        type: 'work_order.status_update',
        payload: const {'status': 'completed'},
        createdAt: fixedCreatedAt,
      );
      expect(fromUpdatedSession.userId, 'u2');

      final explicitOverride = factoryWithSession.create(
        clientActionId: 'f-3',
        tenantId: 'tenant-1',
        userId: 'u9',
        type: 'work_order.status_update',
        payload: const {'status': 'completed'},
        createdAt: fixedCreatedAt,
      );
      expect(explicitOverride.userId, 'u9');

      final withoutSession = SyncActionFactory().create(
        clientActionId: 'f-4',
        tenantId: 'tenant-1',
        type: 'work_order.status_update',
        payload: const {'status': 'completed'},
        createdAt: fixedCreatedAt,
      );
      expect(withoutSession.userId, isNull);
    },
  );
}
