// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(d)1, §12.8 do plano do conserto) — Drift 14 → 15:
// `expense_items` ganha `server_id TEXT`, migração ADITIVA (nenhuma linha se perde; as antigas ficam NULL).
//
// RR-D.3  — banco legado v14 com 1 relatório, 2 itens e 1 comprovante, aberto com `AppDatabase`:
//           `user_version = 15`, a coluna presente, as 4 linhas com os mesmos valores, `server_id` NULL.
// RR-D.3b — o REBAIXAMENTO (§12.8, `ATK_MIG`): o app antigo abre o banco 15 e o devolve a `user_version = 14`
//           COM a coluna. Reaberto em 15, sem erro, com as linhas e o `server_id` gravado. É o que a guarda
//           por `PRAGMA table_info` resolve; sem ela, `duplicate column name: server_id`.
// Molde: `bfilausuario_drift_user_id_test.dart` e `atk-app-sondas/atk_app_migration_probe_test.dart`.
import 'dart:io';

import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

/// O banco como o app de schema 14 o deixa (só as tabelas de despesa e a fila; a migração 14 → 15 toca
/// só `expense_items`). [withServerId] = o estado do rebaixamento: a coluna JÁ existe em `user_version 14`.
class _LegacyV14Db extends GeneratedDatabase {
  _LegacyV14Db(super.e, {this.withServerId = false});

  final bool withServerId;

  @override
  int get schemaVersion => 14;

  @override
  Iterable<TableInfo<Table, dynamic>> get allTables => const [];

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.database.customStatement('''
CREATE TABLE expense_reports (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  title TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL,
  advance_amount REAL,
  advance_tenant_id TEXT,
  created_at INTEGER,
  updated_at INTEGER
)''');
      await m.database.customStatement('''
CREATE TABLE expense_items (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_local_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date INTEGER NOT NULL,
  city TEXT,
  vendor_name TEXT${withServerId ? ',\n  server_id TEXT' : ''}
)''');
      await m.database.customStatement('''
CREATE TABLE expense_receipts (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  report_local_id TEXT,
  item_local_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  local_reference TEXT,
  sha256_hash TEXT,
  capture_source TEXT NOT NULL,
  upload_status TEXT NOT NULL,
  ocr_status TEXT NOT NULL,
  ocr_extracted_fields_json TEXT,
  user_reviewed_fields_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
)''');
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
  last_safe_error TEXT,
  user_id TEXT
)''');
    },
  );
}

Future<int> _userVersion(GeneratedDatabase db) async {
  final row = await db.customSelect('PRAGMA user_version').getSingle();
  return row.read<int>('user_version');
}

Future<Set<String>> _columns(GeneratedDatabase db, String table) async {
  final rows = await db.customSelect("PRAGMA table_info('$table')").get();
  return rows.map((r) => r.read<String>('name')).toSet();
}

Future<Directory> _tempDir(String prefix) async {
  final dir = await Directory.systemTemp.createTemp(prefix);
  addTearDown(() async {
    if (await dir.exists()) await dir.delete(recursive: true);
  });
  return dir;
}

void main() {
  test(
    'RR-D.3 banco legado v14 (1 relatório, 2 itens, 1 comprovante) migra para 15: coluna server_id presente, as 4 linhas iguais, server_id NULL',
    () async {
      final dir = await _tempDir('brdvcomp_c1_d3');
      final path = '${dir.path}/erp_mobile_v14.db';

      final legacy = _LegacyV14Db(NativeDatabase(File(path)));
      await legacy.customStatement(
        "INSERT INTO expense_reports (local_id,server_id,tenant_id,employee_id,title,policy_version,status,advance_amount,advance_tenant_id,created_at,updated_at) "
        "VALUES ('PC-local-1','rep-srv-1','tenant-a','emp-1','Viagem','v1','submitted',80.0,'tenant-a',1700000000000,1700000000500)",
      );
      await legacy.customStatement(
        "INSERT INTO expense_items (local_id,tenant_id,report_local_id,category_id,amount,date,city,vendor_name) "
        "VALUES ('item-local-1','tenant-a','PC-local-1','fuel',120.5,1700000001000,'Campinas','Posto')",
      );
      await legacy.customStatement(
        "INSERT INTO expense_items (local_id,tenant_id,report_local_id,category_id,amount,date,city,vendor_name) "
        "VALUES ('item-local-2','tenant-a','PC-local-1','meal',42.0,1700000002000,NULL,NULL)",
      );
      await legacy.customStatement(
        "INSERT INTO expense_receipts (local_id,server_id,tenant_id,report_local_id,item_local_id,file_name,mime_type,size_bytes,local_reference,sha256_hash,capture_source,upload_status,ocr_status,created_at) "
        "VALUES ('receipt-local-1',NULL,'tenant-a','PC-local-1','item-local-1','nota.jpg','image/jpeg',2048,'blob-1','${'a' * 64}','camera','pending','notStarted',1700000003000)",
      );
      expect(await _userVersion(legacy), 14);
      expect(
        await _columns(legacy, 'expense_items'),
        isNot(contains('server_id')),
      );
      await legacy.close();

      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);
      // B-SAN3-15a (só fixture): o schema atual do app é 17; a migração 14 → 15 segue a mesma.
      expect(await _userVersion(db), 17);
      expect(
        await _columns(db, 'expense_items'),
        contains('server_id'),
        reason: 'a migração 14 → 15 não criou expense_items.server_id',
      );

      final report = await db
          .customSelect(
            'SELECT local_id, server_id, status, advance_amount FROM expense_reports',
          )
          .getSingle();
      expect(report.read<String>('local_id'), 'PC-local-1');
      expect(report.read<String>('server_id'), 'rep-srv-1');
      expect(report.read<String>('status'), 'submitted');
      expect(report.read<double>('advance_amount'), 80.0);

      final items = await db
          .customSelect(
            'SELECT local_id, category_id, amount, date, city, vendor_name, server_id '
            'FROM expense_items ORDER BY local_id ASC',
          )
          .get();
      expect(items, hasLength(2));
      expect(items[0].read<String>('local_id'), 'item-local-1');
      expect(items[0].read<String>('category_id'), 'fuel');
      expect(items[0].read<double>('amount'), 120.5);
      expect(items[0].read<int>('date'), 1700000001000);
      expect(items[0].read<String>('city'), 'Campinas');
      expect(items[0].read<String>('vendor_name'), 'Posto');
      expect(items[0].readNullable<String>('server_id'), isNull);
      expect(items[1].read<String>('local_id'), 'item-local-2');
      expect(items[1].read<String>('category_id'), 'meal');
      expect(items[1].read<double>('amount'), 42.0);
      expect(items[1].readNullable<String>('city'), isNull);
      expect(items[1].readNullable<String>('server_id'), isNull);

      final receipt = await db
          .customSelect(
            'SELECT local_id, item_local_id, upload_status, local_reference FROM expense_receipts',
          )
          .getSingle();
      expect(receipt.read<String>('local_id'), 'receipt-local-1');
      expect(receipt.read<String>('item_local_id'), 'item-local-1');
      expect(receipt.read<String>('upload_status'), 'pending');
      expect(receipt.read<String>('local_reference'), 'blob-1');
    },
  );

  test(
    'RR-D.3b rebaixamento: banco em user_version 14 COM a coluna server_id abre em 15 sem erro e preserva as linhas e o server_id gravado',
    () async {
      final dir = await _tempDir('brdvcomp_c1_d3b');
      final path = '${dir.path}/erp_mobile_rebaixado.db';

      // O estado que o app antigo (14) deixa depois de abrir um banco 15: a coluna fica, a versão volta a 14.
      final downgraded = _LegacyV14Db(
        NativeDatabase(File(path)),
        withServerId: true,
      );
      await downgraded.customStatement(
        "INSERT INTO expense_items (local_id,tenant_id,report_local_id,category_id,amount,date,city,vendor_name,server_id) "
        "VALUES ('item-local-9','tenant-a','PC-local-9','fuel',10.0,1700000009000,'c','v','srv-9')",
      );
      expect(await _userVersion(downgraded), 14);
      expect(
        await _columns(downgraded, 'expense_items'),
        contains('server_id'),
      );
      await downgraded.close();

      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);
      // B-SAN3-15a (só fixture): o schema atual do app é 17.
      expect(
        await _userVersion(db),
        17,
        reason: 'o banco rebaixado não abriu na versão atual (17)',
      );
      final rows = await db
          .customSelect('SELECT local_id, amount, server_id FROM expense_items')
          .get();
      expect(rows, hasLength(1));
      expect(rows.single.read<String>('local_id'), 'item-local-9');
      expect(rows.single.read<double>('amount'), 10.0);
      expect(rows.single.readNullable<String>('server_id'), 'srv-9');
    },
  );
}
