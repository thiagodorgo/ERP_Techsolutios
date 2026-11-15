import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// B-SAN3-15b (P9) — migração REAL v17 → v18 (work_order_service_notes).
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-M2, T-M2b; M-A19 e M-A21) e a Emenda 5 (abertura) §3.2 (`v17 → v18`,
// `if (from < 18) {`). A tabela guarda o diagnóstico e o serviço executado por (organização, usuário, OS):
// `work_order_service_notes(tenant_id, user_id, work_order_local_id, diagnosis, execution, updated_at)`, com a
// chave primária nas três primeiras. A v18 é ADITIVA: nenhuma linha de outra tabela se perde, inclusive a lista
// salva do estoque que o 15a criou na v17. Molde: `bsan315_migracao_v17_test.dart`.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): o banco está na versão 17 e a tabela não existe; as asserções da
// tabela e da versão ficam vermelhas.
// ===========================================================================

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

// As tabelas da ERA v17 que o bloco precisa preservar (as do v16 do 15a mais a lista salva do estoque).
const _v17SyncActions = '''
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
)''';

const _v17WorkOrders = '''
CREATE TABLE work_orders (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_document TEXT,
  customer_phone TEXT,
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
  updated_at INTEGER,
  service_type TEXT,
  vehicle_id TEXT,
  vehicle_plate TEXT,
  team_id TEXT,
  team_name TEXT,
  checkin_mode TEXT,
  checkin_plate_tail TEXT
)''';

const _v17WorkOrderMaterials = '''
CREATE TABLE work_order_materials (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  work_order_local_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  created_at INTEGER NOT NULL
)''';

const _v17TechnicianStockCache = '''
CREATE TABLE technician_stock_cache (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  items_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
)''';

const _v17SyncRow =
    "INSERT INTO sync_actions (client_action_id, tenant_id, type, payload_json, status, "
    "created_at, retry_count, user_id) VALUES "
    "('act-v17-1', 'tenant-v17', 'work_order.status_change', '{}', 'pending', 1763078400000, 0, 'user-v17')";

const _v17WorkOrderRow =
    "INSERT INTO work_orders (local_id, server_id, tenant_id, code, title, customer_name, "
    "service_address, status, priority, sync_status, created_at, service_type) VALUES "
    "('wo-v17', 'srv-v17', 'tenant-v17', 'OS-1717', 'OS antiga', 'Cliente', 'Rua', "
    "'inService', 'normal', 'synced', 1763078400000, 'provider')";

const _v17MaterialRow =
    "INSERT INTO work_order_materials (local_id, tenant_id, work_order_local_id, sku, name, "
    "quantity, unit, source, sync_status, created_at) VALUES "
    "('mat-v17', 'tenant-v17', 'wo-v17', 'ELE-0102', 'Disjuntor', 1, 'un', 'technician_stock', 'pending', 1763078400000)";

const _v17StockRow =
    "INSERT INTO technician_stock_cache (tenant_id, user_id, items_json, fetched_at) VALUES "
    "('tenant-v17', 'user-v17', '[]', 1763078400000)";

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
  await legacy.customSelect('SELECT 1').get();
  await legacy.close();
  return path;
}

Future<int> _count(GeneratedDatabase db, String table) async {
  final row = await db
      .customSelect('SELECT COUNT(*) AS n FROM $table')
      .getSingle();
  return row.read<int>('n');
}

Future<bool> _tableExists(GeneratedDatabase db, String table) async {
  final rows = await db
      .customSelect(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='$table'",
      )
      .get();
  return rows.isNotEmpty;
}

Future<int> _userVersion(GeneratedDatabase db) async {
  final row = await db.customSelect('PRAGMA user_version').getSingle();
  return row.read<int>('user_version');
}

/// Colunas da tabela, na ordem, e as da chave primária (pela posição `pk` do PRAGMA).
Future<(List<String>, List<String>)> _colunas(
  GeneratedDatabase db,
  String table,
) async {
  final rows = await db.customSelect('PRAGMA table_info($table)').get();
  final nomes = [for (final r in rows) r.read<String>('name')];
  final pk = [
    for (final r
        in rows.where((r) => r.read<int>('pk') > 0).toList()
          ..sort((a, b) => a.read<int>('pk').compareTo(b.read<int>('pk'))))
      r.read<String>('name'),
  ];
  return (nomes, pk);
}

const _colunasEsperadas = [
  'tenant_id',
  'user_id',
  'work_order_local_id',
  'diagnosis',
  'execution',
  'updated_at',
];
const _chaveEsperada = ['tenant_id', 'user_id', 'work_order_local_id'];

void main() {
  test(
    'T-M2 — v17 com dados reais → v18: cria work_order_service_notes e preserva technician_stock_cache e as demais',
    () async {
      final dir = await Directory.systemTemp.createTemp('erp_bsan315_v17');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedLegacyDb(
        dir,
        version: 17,
        ddl: const [
          _v17SyncActions,
          _v17WorkOrders,
          _v17WorkOrderMaterials,
          _v17TechnicianStockCache,
          _v17SyncRow,
          _v17WorkOrderRow,
          _v17MaterialRow,
          _v17StockRow,
        ],
      );

      final legacy = _LegacyDb(
        NativeDatabase(File(path)),
        legacyVersion: 17,
        onCreateSql: const [],
      );
      expect(await _tableExists(legacy, 'work_order_service_notes'), isFalse);
      final before = {
        for (final table in [
          'sync_actions',
          'work_orders',
          'work_order_materials',
          'technician_stock_cache',
        ])
          table: await _count(legacy, table),
      };
      await legacy.close();
      expect(before.values.every((n) => n == 1), isTrue, reason: '$before');

      // Abre a AppDatabase sobre o MESMO arquivo → onUpgrade v17 → v18.
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      expect(await _tableExists(db, 'work_order_service_notes'), isTrue);
      expect(await _userVersion(db), 18);
      final after = {
        for (final table in before.keys) table: await _count(db, table),
      };
      expect(after, before);

      final (colunas, chave) = await _colunas(db, 'work_order_service_notes');
      expect(colunas, _colunasEsperadas);
      expect(chave, _chaveEsperada);

      // A OS da era v17 sobrevive íntegra, com o tipo.
      final order = await db
          .customSelect('SELECT local_id, service_type FROM work_orders')
          .getSingle();
      expect(order.read<String>('local_id'), 'wo-v17');
      expect(order.read<String>('service_type'), 'provider');
    },
  );

  test(
    'T-M2b — instalação nova (openInMemory) tem work_order_service_notes com a chave de 3 colunas',
    () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      expect(await _tableExists(db, 'work_order_service_notes'), isTrue);
      final (colunas, chave) = await _colunas(db, 'work_order_service_notes');
      expect(colunas, _colunasEsperadas);
      expect(chave, _chaveEsperada);
    },
  );
}
