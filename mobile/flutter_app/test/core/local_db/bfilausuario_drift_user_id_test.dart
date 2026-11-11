import 'dart:io';

import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:flutter_test/flutter_test.dart';

class _LegacyV13Db extends GeneratedDatabase {
  _LegacyV13Db(super.e);

  @override
  int get schemaVersion => 13;

  @override
  Iterable<TableInfo<Table, dynamic>> get allTables => const [];

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.database.customStatement('''
CREATE TABLE sync_actions (
  client_action_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  retry_count INTEGER NOT NULL,
  last_error_code TEXT,
  last_safe_error TEXT
)''');
    },
  );
}

Future<Set<String>> _columns(GeneratedDatabase db, String table) async {
  final rows = await db.customSelect("PRAGMA table_info('$table')").get();
  return rows.map((r) => r.read<String>('name')).toSet();
}

Future<int> _userVersion(GeneratedDatabase db) async {
  final row = await db.customSelect('PRAGMA user_version').getSingle();
  return row.read<int>('user_version');
}

Future<String> _seedV13SyncActions(Directory dir) async {
  final path = '${dir.path}/erp_mobile_v13.db';
  final legacy = _LegacyV13Db(NativeDatabase(File(path)));
  await legacy.customStatement(
    "INSERT INTO sync_actions "
    "(client_action_id,tenant_id,type,payload_json,status,created_at,retry_count) "
    "VALUES ('leg-1','tenant-a','work_order.start','{\"local_id\":\"wo-1\"}','pending',1700000000000,0)",
  );
  await legacy.customStatement(
    "INSERT INTO sync_actions "
    "(client_action_id,tenant_id,type,payload_json,status,created_at,retry_count) "
    "VALUES ('leg-2','tenant-a','expense_report.create','{\"local_id\":\"rep-1\"}','failed',1700000001000,2)",
  );
  expect(await _userVersion(legacy), 13);
  await legacy.close();
  return path;
}

void main() {
  test(
    'RA2(1): banco semeado em user_version 13 com 2 linhas migra para 14 preservando ambas com user_id nulo',
    () async {
      final dir = await Directory.systemTemp.createTemp('erp_bfilausr_ra2_1');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedV13SyncActions(dir);
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      expect(await _userVersion(db), 15);
      expect(await _columns(db, 'sync_actions'), contains('user_id'));

      final rows = await db
          .customSelect(
            'SELECT client_action_id, status, retry_count, user_id '
            'FROM sync_actions ORDER BY created_at ASC',
          )
          .get();
      expect(rows, hasLength(2));
      expect(rows[0].read<String>('client_action_id'), 'leg-1');
      expect(rows[0].read<String>('status'), 'pending');
      expect(rows[0].readNullable<String>('user_id'), isNull);
      expect(rows[1].read<String>('client_action_id'), 'leg-2');
      expect(rows[1].read<String>('status'), 'failed');
      expect(rows[1].read<int>('retry_count'), 2);
      expect(rows[1].readNullable<String>('user_id'), isNull);
    },
  );

  test(
    'RA2(2): banco novo nasce com user_id em _kSyncActions e DriftSyncActionStore preserva userId em save + load',
    () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      expect(await _columns(db, 'sync_actions'), contains('user_id'));
      expect(await _userVersion(db), 15);

      final store = DriftSyncActionStore(db);
      final createdAt = DateTime.utc(2026, 11, 8, 10, 0);
      await store.save(<SyncAction>[
        SyncAction(
          clientActionId: 'act-u1',
          tenantId: 'tenant-a',
          userId: 'user-1',
          type: 'work_order.start',
          payload: const <String, Object?>{'local_id': 'wo-1'},
          status: SyncStatus.pending,
          createdAt: createdAt,
          retryCount: 0,
        ),
        SyncAction(
          clientActionId: 'act-null',
          tenantId: 'tenant-a',
          type: 'expense_report.create',
          payload: const <String, Object?>{'local_id': 'rep-1'},
          status: SyncStatus.pending,
          createdAt: createdAt.add(const Duration(seconds: 1)),
          retryCount: 0,
        ),
      ]);

      final loaded = await store.load();
      expect(loaded, hasLength(2));
      expect(loaded[0].clientActionId, 'act-u1');
      expect(loaded[0].userId, 'user-1');
      expect(loaded[1].clientActionId, 'act-null');
      expect(loaded[1].userId, isNull);
    },
  );

  test(
    'RA2(3): DriftSyncActionStore.load em banco migrado devolve antigas com userId == null e aceita save de ação com userId',
    () async {
      final dir = await Directory.systemTemp.createTemp('erp_bfilausr_ra2_3');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedV13SyncActions(dir);
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      final store = DriftSyncActionStore(db);
      final migrated = await store.load();
      expect(migrated.map((a) => a.clientActionId), <String>['leg-1', 'leg-2']);
      expect(migrated[0].userId, isNull);
      expect(migrated[1].userId, isNull);

      final withNew = <SyncAction>[
        ...migrated,
        SyncAction(
          clientActionId: 'new-u2',
          tenantId: 'tenant-a',
          userId: 'user-2',
          type: 'work_order.complete',
          payload: const <String, Object?>{'local_id': 'wo-1'},
          status: SyncStatus.pending,
          createdAt: DateTime.fromMillisecondsSinceEpoch(
            1700000002000,
            isUtc: true,
          ),
          retryCount: 0,
        ),
      ];
      await store.save(withNew);

      final reloaded = await store.load();
      expect(reloaded, hasLength(3));
      expect(reloaded[0].userId, isNull);
      expect(reloaded[1].userId, isNull);
      expect(reloaded[2].clientActionId, 'new-u2');
      expect(reloaded[2].userId, 'user-2');
    },
  );
}
