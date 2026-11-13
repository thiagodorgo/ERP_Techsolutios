import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_technician_stock_cache.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// B-SAN3-15a — migração REAL v16 → v17 (technician_stock_cache).
//
// A v17 é ADITIVA: cria `technician_stock_cache` e não pode perder nenhuma
// linha que já existia no aparelho. Semeamos um arquivo sqlite no schema 16
// (o do #534, com o check-in) com dados reais, contamos as linhas ANTES, e
// reabrimos a AppDatabase (v17) sobre o MESMO arquivo para disparar o
// onUpgrade de verdade. Contamos DEPOIS e exigimos igualdade.
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

// sync_actions da ERA v16 (o user_id da v14 já presente).
const _v16SyncActions = '''
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

// work_orders da ERA v16: todas as colunas de hoje (com o check-in do #534).
const _v16WorkOrders = '''
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

const _v16WorkOrderMaterials = '''
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

const _v16SyncRow =
    "INSERT INTO sync_actions (client_action_id, tenant_id, type, payload_json, status, "
    "created_at, retry_count, user_id) VALUES "
    "('act-v16-1', 'tenant-v16', 'work_order_material.add', '{}', 'pending', 1762819200000, 0, 'user-v16')";

const _v16WorkOrderRow =
    "INSERT INTO work_orders (local_id, server_id, tenant_id, code, title, customer_name, "
    "service_address, status, priority, sync_status, created_at, checkin_mode, checkin_plate_tail) VALUES "
    "('wo-v16', 'srv-v16', 'tenant-v16', 'OS-1616', 'OS antiga', 'Cliente', 'Rua', "
    "'enRoute', 'normal', 'synced', 1762819200000, 'plate', '23')";

const _v16MaterialRow =
    "INSERT INTO work_order_materials (local_id, tenant_id, work_order_local_id, sku, name, "
    "quantity, unit, source, sync_status, created_at) VALUES "
    "('mat-v16', 'tenant-v16', 'wo-v16', 'ELE-0102', 'Disjuntor', 2, 'un', 'technician_stock', 'pending', 1762819200000)";

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

void main() {
  test(
    'v16 com dados reais → v17: cria technician_stock_cache e preserva sync_actions, work_orders e work_order_materials',
    () async {
      final dir = await Directory.systemTemp.createTemp('erp_bsan315_v16');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final path = await _seedLegacyDb(
        dir,
        version: 16,
        ddl: const [
          _v16SyncActions,
          _v16WorkOrders,
          _v16WorkOrderMaterials,
          _v16SyncRow,
          _v16WorkOrderRow,
          _v16MaterialRow,
        ],
      );

      // Contagem ANTES, ainda no schema 16.
      final legacy = _LegacyDb(
        NativeDatabase(File(path)),
        legacyVersion: 16,
        onCreateSql: const [],
      );
      final before = {
        'sync_actions': await _count(legacy, 'sync_actions'),
        'work_orders': await _count(legacy, 'work_orders'),
        'work_order_materials': await _count(legacy, 'work_order_materials'),
      };
      await legacy.close();

      // Abre a AppDatabase v17 sobre o MESMO arquivo → onUpgrade v16→v17.
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);

      expect(await _tableExists(db, 'technician_stock_cache'), isTrue);

      final after = {
        'sync_actions': await _count(db, 'sync_actions'),
        'work_orders': await _count(db, 'work_orders'),
        'work_order_materials': await _count(db, 'work_order_materials'),
      };
      expect(after, before);

      // A linha do check-in do #534 sobrevive íntegra.
      final order = await db
          .customSelect('SELECT local_id, checkin_mode FROM work_orders')
          .getSingle();
      expect(order.read<String>('local_id'), 'wo-v16');
      expect(order.read<String>('checkin_mode'), 'plate');
    },
  );

  test(
    'instalação nova (openInMemory) tem technician_stock_cache e aceita uma gravação',
    () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final cache = DriftTechnicianStockCache(db);
      const scope = TechnicianStockCacheScope(
        tenantId: 'tenant-1',
        userId: 'user-1',
      );
      final fetchedAt = DateTime.utc(2026, 11, 11, 10, 0);
      const items = [
        TechnicianStockItem(
          sku: 'ELE-0102',
          name: 'Disjuntor tripolar 25A',
          category: 'Protecao',
          available: 6,
          unit: 'un',
        ),
      ];

      await cache.save(scope, items, fetchedAt);
      final loaded = await cache.load(scope);

      expect(loaded, isNotNull);
      expect(loaded!.items.single.sku, 'ELE-0102');
      expect(
        loaded.fetchedAt.millisecondsSinceEpoch,
        fetchedAt.millisecondsSinceEpoch,
      );

      await cache.clear(scope);
      expect(await cache.load(scope), isNull);
    },
  );
}
