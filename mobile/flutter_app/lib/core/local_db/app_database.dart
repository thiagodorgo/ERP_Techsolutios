import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';

class AppDatabase extends GeneratedDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 10;

  @override
  Iterable<TableInfo<Table, dynamic>> get allTables => const [];

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.database.customStatement(_kExpenseReports);
      await m.database.customStatement(_kExpenseItems);
      await m.database.customStatement(_kExpenseReceipts);
      await m.database.customStatement(_kSyncActions);
      await m.database.customStatement(_kWorkOrders);
      await m.database.customStatement(_kWorkOrderTimeline);
      await m.database.customStatement(_kWorkOrderEvidence);
      await m.database.customStatement(_kChecklistTemplates);
      await m.database.customStatement(_kChecklistSchemas);
      await m.database.customStatement(_kChecklistRuns);
      await m.database.customStatement(_kChecklistMarkers);
      await m.database.customStatement(_kChecklistAttachments);
      await m.database.customStatement(_kChecklistAcknowledgements);
      await m.database.customStatement(_kFieldLocationEvents);
      await m.database.customStatement(_kWorkOrderMaterials);
    },
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.database.customStatement(_kWorkOrders);
        await m.database.customStatement(_kWorkOrderTimeline);
      }
      if (from < 3) {
        await m.database.customStatement(_kChecklistTemplates);
        await m.database.customStatement(_kChecklistSchemas);
        await m.database.customStatement(_kChecklistRuns);
        await m.database.customStatement(_kChecklistMarkers);
        await m.database.customStatement(_kChecklistAttachments);
        await m.database.customStatement(_kChecklistAcknowledgements);
      }
      if (from < 4) {
        await m.database.customStatement(_kWorkOrderEvidence);
      } else if (from < 5) {
        await m.database.customStatement(
          'ALTER TABLE work_order_evidence ADD COLUMN server_id TEXT',
        );
        await m.database.customStatement(
          "ALTER TABLE work_order_evidence ADD COLUMN upload_status TEXT NOT NULL DEFAULT 'pending'",
        );
        await m.database.customStatement(
          'ALTER TABLE work_order_evidence ADD COLUMN uploaded_at INTEGER',
        );
        await m.database.customStatement(
          'ALTER TABLE work_order_evidence ADD COLUMN upload_error_code TEXT',
        );
        await m.database.customStatement(
          'ALTER TABLE work_order_evidence ADD COLUMN local_blob_ref TEXT',
        );
      }
      if (from < 6) {
        await m.database.customStatement(_kFieldLocationEvents);
      }
      if (from < 7) {
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='work_orders'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN service_type TEXT',
          );
        }
      }
      if (from < 8) {
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_runs'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            "ALTER TABLE checklist_runs ADD COLUMN kind TEXT NOT NULL DEFAULT 'collection'",
          );
        }
      }
      if (from < 9) {
        await m.database.customStatement(_kWorkOrderMaterials);
      }
      if (from < 10) {
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='work_orders'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN customer_document TEXT',
          );
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN customer_phone TEXT',
          );
        }
      }
    },
  );

  static Future<AppDatabase> open() async {
    final dir = await getApplicationDocumentsDirectory();
    return AppDatabase(NativeDatabase(File('${dir.path}/erp_mobile.db')));
  }

  static AppDatabase openInMemory() => AppDatabase(NativeDatabase.memory());
}

const _kExpenseReports = '''
CREATE TABLE IF NOT EXISTS expense_reports (
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
)''';

const _kExpenseItems = '''
CREATE TABLE IF NOT EXISTS expense_items (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_local_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date INTEGER NOT NULL,
  city TEXT,
  vendor_name TEXT
)''';

const _kExpenseReceipts = '''
CREATE TABLE IF NOT EXISTS expense_receipts (
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
)''';

const _kSyncActions = '''
CREATE TABLE IF NOT EXISTS sync_actions (
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

const _kWorkOrders = '''
CREATE TABLE IF NOT EXISTS work_orders (
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
  service_type TEXT
)''';

const _kWorkOrderTimeline = '''
CREATE TABLE IF NOT EXISTS work_order_timeline (
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

const _kWorkOrderEvidence = '''
CREATE TABLE IF NOT EXISTS work_order_evidence (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  work_order_local_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  capture_source TEXT NOT NULL,
  checksum TEXT,
  sync_status TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  uploaded_at INTEGER,
  upload_error_code TEXT,
  local_blob_ref TEXT
)''';

const _kChecklistTemplates = '''
CREATE TABLE IF NOT EXISTS checklist_templates (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required INTEGER NOT NULL DEFAULT 0,
  linked_work_order_type TEXT,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL
)''';

const _kChecklistSchemas = '''
CREATE TABLE IF NOT EXISTS checklist_schemas (
  id TEXT NOT NULL PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  fields_json TEXT NOT NULL
)''';

const _kChecklistRuns = '''
CREATE TABLE IF NOT EXISTS checklist_runs (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  checklist_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL,
  executed_by_user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  sync_status TEXT NOT NULL,
  answers_json TEXT NOT NULL DEFAULT '{}',
  kind TEXT NOT NULL DEFAULT 'collection'
)''';

const _kChecklistMarkers = '''
CREATE TABLE IF NOT EXISTS checklist_markers (
  local_id TEXT NOT NULL PRIMARY KEY,
  run_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  description TEXT,
  position_label TEXT,
  sync_status TEXT NOT NULL
)''';

const _kChecklistAttachments = '''
CREATE TABLE IF NOT EXISTS checklist_attachments (
  local_id TEXT NOT NULL PRIMARY KEY,
  run_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum TEXT,
  sync_status TEXT NOT NULL
)''';

const _kChecklistAcknowledgements = '''
CREATE TABLE IF NOT EXISTS checklist_acknowledgements (
  local_id TEXT NOT NULL PRIMARY KEY,
  run_id TEXT NOT NULL,
  acknowledged_by_name TEXT NOT NULL,
  acknowledged_by_role TEXT NOT NULL,
  acknowledged_at INTEGER NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL
)''';

const _kWorkOrderMaterials = '''
CREATE TABLE IF NOT EXISTS work_order_materials (
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

const _kFieldLocationEvents = '''
CREATE TABLE IF NOT EXISTS field_location_events (
  local_id TEXT NOT NULL PRIMARY KEY,
  server_id TEXT,
  tenant_id TEXT NOT NULL,
  work_order_local_id TEXT NOT NULL,
  work_order_server_id TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy_meters REAL,
  heading_degrees REAL,
  speed_meters_per_second REAL,
  battery_level INTEGER,
  recorded_at INTEGER NOT NULL,
  sync_status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_safe_error TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER
)''';
