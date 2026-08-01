import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// PR-B (junta) — teste de MIGRAÇÃO REAL do onUpgrade.
//
// Até aqui NENHUM teste exercitava `onUpgrade`: todos usam `openInMemory()`
// (= onCreate fresco em schema 13), por isso a bola-preta da migração passava
// verde. Aqui semeamos o arquivo sqlite num schema ANTIGO (user_version 1 ou 2)
// e abrimos a AppDatabase real (schema 13) sobre o MESMO arquivo → dispara o
// onUpgrade de verdade. O bug: como as constantes de CREATE já trazem as colunas
// novas, o CREATE fresco (from<3 p/ checklist, from<2 p/ work_orders) + o ALTER
// ADD COLUMN posterior duplicariam a coluna → "duplicate column name" → o banco
// nem abre. As guardas `from>=3`/`from>=2` consertam isso.
// ===========================================================================

// DB "legado" — só serve para gravar o arquivo num schema antigo com as tabelas
// da época (sem as colunas adicionadas depois). Fecha e a AppDatabase reabre.
class _LegacyDb extends GeneratedDatabase {
  _LegacyDb(super.e, {required this.legacyVersion, required this.onCreateSql});

  final int legacyVersion;
  final List<String> onCreateSql;

  @override
  int get schemaVersion => legacyVersion;

  @override
  Iterable<TableInfo<Table, dynamic>> get allTables => const [];

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      for (final stmt in onCreateSql) {
        await m.database.customStatement(stmt);
      }
    },
  );
}

// work_orders da ERA schema 2 — SEM service_type/customer_*/vehicle_*/team_*
// (essas colunas foram adicionadas via ALTER nos schemas 7/10/11).
const _legacyWorkOrders = '''
CREATE TABLE work_orders (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  service_address TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assigned_user_id TEXT,
  scheduled_at INTEGER,
  started_at INTEGER,
  arrived_at INTEGER,
  completed_at INTEGER,
  checklist_id TEXT,
  sync_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
)''';

const _legacyWorkOrderTimeline = '''
CREATE TABLE work_order_timeline (
  local_id TEXT NOT NULL PRIMARY KEY,
  work_order_local_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  actor_user_id TEXT,
  note TEXT,
  from_status TEXT,
  to_status TEXT,
  sync_status TEXT NOT NULL
)''';

const _legacySyncActions = '''
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
)''';

Future<Set<String>> _columns(GeneratedDatabase db, String table) async {
  final rows = await db.customSelect("PRAGMA table_info('$table')").get();
  return rows.map((r) => r.read<String>('name')).toSet();
}

Future<int> _userVersion(GeneratedDatabase db) async {
  final row = await db.customSelect('PRAGMA user_version').getSingle();
  return row.read<int>('user_version');
}

Future<String> _seedLegacyDb(
  Directory dir, {
  required int version,
  required List<String> ddl,
}) async {
  final path = '${dir.path}/erp_mobile.db';
  final legacy = _LegacyDb(
    NativeDatabase(File(path)),
    legacyVersion: version,
    onCreateSql: ddl,
  );
  // Força o open → roda onCreate → grava user_version = version.
  await legacy.customSelect('SELECT 1').get();
  expect(await _userVersion(legacy), version);
  await legacy.close();
  return path;
}

void main() {
  test(
    'schema 2 → 13: onUpgrade não crasha; colunas da checklist_attachments presentes',
    () async {
      final dir = await Directory.systemTemp.createTemp('erp_mig_v2');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedLegacyDb(
        dir,
        version: 2,
        ddl: const [
          _legacySyncActions,
          _legacyWorkOrders,
          _legacyWorkOrderTimeline,
        ],
      );

      // Abre a AppDatabase real (schema 13) sobre o mesmo arquivo → onUpgrade.
      // Se a migração crashar ("duplicate column name"), a 1ª query lança.
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      final attCols = await _columns(db, 'checklist_attachments');
      expect(
        attCols,
        containsAll(<String>[
          'local_blob_ref',
          'upload_status',
          'attachment_server_id',
          'uploaded_at',
          'upload_error_code',
        ]),
      );

      // As colunas ALTERadas do work_orders também chegam (schema-2 não as tinha).
      final woCols = await _columns(db, 'work_orders');
      expect(
        woCols,
        containsAll(<String>[
          'service_type',
          'customer_document',
          'customer_phone',
          'vehicle_id',
          'vehicle_plate',
          'team_id',
          'team_name',
        ]),
      );

      // checklist_runs.kind (ALTER do schema 8) presente.
      expect(await _columns(db, 'checklist_runs'), contains('kind'));

      expect(await _userVersion(db), 13);
    },
  );

  test(
    'schema 1 → 13: CREATE fresco (work_orders/checklist) + ALTER não duplicam coluna',
    () async {
      // No schema 1 NÃO existem work_orders nem tabelas de checklist: o onUpgrade
      // as cria FRESCAS (já completas) em from<2/from<3. Sem as guardas, o ALTER
      // posterior duplicaria a coluna e a migração falharia. Este é o caminho que
      // realmente exercita o conserto das OUTRAS tabelas.
      final dir = await Directory.systemTemp.createTemp('erp_mig_v1');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedLegacyDb(
        dir,
        version: 1,
        ddl: const [_legacySyncActions],
      );

      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      // Migração não crashou e as colunas estão presentes (via CREATE completo).
      expect(
        await _columns(db, 'checklist_attachments'),
        containsAll(<String>[
          'local_blob_ref',
          'upload_status',
          'attachment_server_id',
          'uploaded_at',
          'upload_error_code',
        ]),
      );
      expect(
        await _columns(db, 'work_orders'),
        containsAll(<String>['service_type', 'vehicle_id', 'team_id']),
      );
      expect(await _columns(db, 'checklist_runs'), contains('kind'));
      expect(await _userVersion(db), 13);
    },
  );
}
