import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';

class AppDatabase extends GeneratedDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 18;

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
      await m.database.customStatement(_kTelemetryEvents);
      await m.database.customStatement(_kTechnicianStockCache); // onCreate
      await m.database.customStatement(_kWorkOrderServiceNotes); // onCreate
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
      // ATENÇÃO (guarda de idempotência): as constantes de CREATE (`_kWorkOrders`,
      // `_kChecklistRuns`, `_kChecklistAttachments`) JÁ trazem as colunas
      // adicionadas em versões posteriores. Logo, quando o CREATE fresco roda
      // nesta mesma migração (device muito antigo: `from < 2` cria work_orders
      // completo, `from < 3` cria as tabelas de checklist completas), os ALTER
      // ADD COLUMN abaixo DUPLICARIAM a coluna → SQLite "duplicate column name" →
      // migração falha → banco não abre. Por isso cada ALTER só roda quando a
      // tabela NÃO nasceu completa nesta migração: work_orders nasce em `from<2`
      // (ALTER só com `from>=2`); tabelas de checklist nascem em `from<3`
      // (ALTER só com `from>=3`). Mesma intenção do par create/else-if do
      // work_order_evidence acima.
      if (from >= 2 && from < 7) {
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
      if (from >= 3 && from < 8) {
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
      if (from >= 2 && from < 10) {
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
      if (from >= 2 && from < 11) {
        // D1 (seleção viatura/equipe): vínculo opcional de viatura/equipe.
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='work_orders'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN vehicle_id TEXT',
          );
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN vehicle_plate TEXT',
          );
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN team_id TEXT',
          );
          await m.database.customStatement(
            'ALTER TABLE work_orders ADD COLUMN team_name TEXT',
          );
        }
      }
      if (from < 12) {
        // Ω4C PR-13 (D-Ω4C-TELE-FLUTTER-BUFFER): buffer DEDICADO de telemetria.
        // Migração ADITIVA — só CREATE TABLE IF NOT EXISTS, nenhuma tabela
        // existente é alterada. NÃO reusa `sync_actions`.
        await m.database.customStatement(_kTelemetryEvents);
      }
      if (from >= 3 && from < 13) {
        // PR-B (D-CHK-DISPATCH-CREATE): o binário da foto de checklist passa a
        // ter fila de upload durável (offline → multipart quando online), no
        // molde de work_order_evidence. Migração ADITIVA: só ALTER TABLE ADD
        // COLUMN na checklist_attachments (nenhuma tabela existente é apagada).
        // Guarda `from >= 3`: quando `from < 3` a tabela nasce já com estas 5
        // colunas via `_kChecklistAttachments`, então o ALTER duplicaria.
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_attachments'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            'ALTER TABLE checklist_attachments ADD COLUMN local_blob_ref TEXT',
          );
          await m.database.customStatement(
            "ALTER TABLE checklist_attachments ADD COLUMN upload_status TEXT NOT NULL DEFAULT 'pending'",
          );
          await m.database.customStatement(
            'ALTER TABLE checklist_attachments ADD COLUMN attachment_server_id TEXT',
          );
          await m.database.customStatement(
            'ALTER TABLE checklist_attachments ADD COLUMN uploaded_at INTEGER',
          );
          await m.database.customStatement(
            'ALTER TABLE checklist_attachments ADD COLUMN upload_error_code TEXT',
          );
        }
      }
      if (from < 14) {
        // B-FILA-USUARIO: carimbo durável do usuário criador na fila de sync.
        // Migração ADITIVA: só ALTER TABLE ADD COLUMN user_id TEXT (nenhuma
        // linha antiga é perdida; registros anteriores ficam com user_id NULL).
        final rows = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_actions'",
            )
            .get();
        if (rows.isNotEmpty) {
          await m.database.customStatement(
            'ALTER TABLE sync_actions ADD COLUMN user_id TEXT',
          );
        }
      }
      if (from < 15) {
        // B-RDV-COMPROVANTE (conserto c1 do #525, §2(d)1 e §12.8): o id do item no
        // servidor persiste (`expense_items.server_id`). Migração ADITIVA: nenhuma
        // linha se perde; as antigas ficam com server_id NULL. GUARDA da coluna por
        // `PRAGMA table_info`: o app antigo (14) que abre um banco 15 o devolve a
        // user_version 14 COM a coluna, e o ALTER duplicaria ("duplicate column").
        final tables = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='expense_items'",
            )
            .get();
        if (tables.isNotEmpty) {
          final columns = await m.database
              .customSelect("PRAGMA table_info('expense_items')")
              .get();
          final hasServerId = columns.any(
            (column) => column.read<String>('name') == 'server_id',
          );
          if (!hasServerId) {
            await m.database.customStatement(
              'ALTER TABLE expense_items ADD COLUMN server_id TEXT',
            );
          }
        }
      }
      if (from >= 2 && from < 16) {
        // B-SAN3-26 (item 53): o modo do check-in e os 2 caracteres finais da placa, que o servidor manda na lista.
        // Migração ADITIVA: as linhas antigas ficam com as duas colunas NULL (modo `unknown`, que pede os dígitos sem
        // comparar). Guarda `from >= 2`: abaixo disso a tabela nasce já com as colunas via `_kWorkOrders`. GUARDA da
        // coluna por `PRAGMA table_info`, no padrão da v15: o app antigo que abre um banco 16 o devolve à versão 15
        // COM as colunas, e o ALTER duplicaria ("duplicate column").
        final tables = await m.database
            .customSelect(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='work_orders'",
            )
            .get();
        if (tables.isNotEmpty) {
          final columns = await m.database
              .customSelect("PRAGMA table_info('work_orders')")
              .get();
          final hasCheckinMode = columns.any(
            (column) => column.read<String>('name') == 'checkin_mode',
          );
          if (!hasCheckinMode) {
            await m.database.customStatement(
              'ALTER TABLE work_orders ADD COLUMN checkin_mode TEXT',
            );
            await m.database.customStatement(
              'ALTER TABLE work_orders ADD COLUMN checkin_plate_tail TEXT',
            );
          }
        }
      }
      if (from < 17) {
        // B-SAN3-15a — a última resposta do estoque do técnico, por (organização, usuário).
        // Migração ADITIVA: só CREATE TABLE IF NOT EXISTS, nenhuma linha de outra tabela se perde.
        await m.database.customStatement(_kTechnicianStockCache);
      }
      if (from < 18) {
        // B-SAN3-15b (P9) — o diagnóstico e o serviço executado, por (organização, usuário, OS).
        // Migração ADITIVA: só CREATE TABLE IF NOT EXISTS, nenhuma linha de outra tabela se perde.
        await m.database.customStatement(_kWorkOrderServiceNotes);
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

// B-RDV-COMPROVANTE (conserto c1 do #525, §2(d)1): `server_id` do item, para instalação nova. Quem vem de
// uma versão anterior ganha a coluna pela migração do `onUpgrade`.
const _kExpenseItems = '''
CREATE TABLE IF NOT EXISTS expense_items (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_local_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date INTEGER NOT NULL,
  city TEXT,
  vendor_name TEXT,
  server_id TEXT
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
  last_safe_error TEXT,
  user_id TEXT
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
  service_type TEXT,
  vehicle_id TEXT,
  vehicle_plate TEXT,
  team_id TEXT,
  team_name TEXT,
  checkin_mode TEXT,
  checkin_plate_tail TEXT
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
  sync_status TEXT NOT NULL,
  local_blob_ref TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  attachment_server_id TEXT,
  uploaded_at INTEGER,
  upload_error_code TEXT
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

// B-SAN3-15a — lista salva do estoque do técnico, chave (tenant_id, user_id).
// B-SAN3-15b (P9) — as notas do atendimento do prestador, por usuário: outro usuário no mesmo aparelho vê os campos
// vazios. A purga da OS (B-SAN3-13) apaga as notas dela de todos os usuários.
const _kWorkOrderServiceNotes = '''
CREATE TABLE IF NOT EXISTS work_order_service_notes (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  work_order_local_id TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  execution TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id, work_order_local_id)
)''';

const _kTechnicianStockCache = '''
CREATE TABLE IF NOT EXISTS technician_stock_cache (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  items_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
)''';

// Ω4C PR-13 — buffer DEDICADO da telemetria do app (heartbeat/acessos/recusas),
// mobile-local, espelha `field_location_events`. Coexiste com ele
// (D-007): `field_location_events` = ponto vivo do mapa Ω1 (1 ponto/OS);
// `telemetry_events` = fila de telemetria. NÃO se fundem. Colunas
// battery_pct/device_model/sdk_int OMITIDAS (D-NODEPS — pacotes ausentes).
const _kTelemetryEvents = '''
CREATE TABLE IF NOT EXISTS telemetry_events (
  local_id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  client_action_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  captured_at INTEGER NOT NULL,
  latitude REAL,
  longitude REAL,
  accuracy_meters REAL,
  speed_kmh REAL,
  signal_type TEXT,
  app_version TEXT,
  work_order_id TEXT,
  refusal_reason TEXT,
  sync_status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  last_safe_error TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER
)''';
