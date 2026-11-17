import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// B-GUI-D1 — a subida REAL do banco do aparelho, 18 → 19 (destino, veículo atendido e prazo da OS).
//
// Plano: `plano-APP-GUINCHO-emenda1.md` §5.4, `plano-B-GUI-D1-emenda1.md` §4 e `-emenda1.1.md` §3.4 (`if (from < 19)`).
// A v19 só faz `ALTER TABLE work_orders ADD COLUMN`, guardado POR COLUNA (`PRAGMA table_info`): sem DROP, sem recriar
// tabela, sem tocar `sync_actions`. A fila não enviada fica intacta (D5).
//   D5  — 18 cheio → 19: contagens e linhas iguais coluna a coluna; as 7 novas NULL;
//   D5b — rebaixamento (o app antigo devolve o banco 19 à 18 COM as colunas): abre sem "duplicate column";
//   D5c — degrau interrompido (só 3 das 7): termina com as 7;
//   D6  — instalação nova, vindo da 18 e vindo da 1 (com e sem uma `work_orders` já existente): o MESMO esquema.
// Molde: `bsan315_migracao_v18_test.dart` (`_LegacyDb` em arquivo).
//
// VERMELHO-CONTROLE (F0, `main` 77f0df07): o `user_version` fica 18 e as 7 colunas não existem.
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

const _sete = [
  'destination_address',
  'destination_latitude',
  'destination_longitude',
  'attended_vehicle_plate_masked',
  'attended_vehicle_model',
  'attended_vehicle_color',
  'sla_due_at',
];

const _seteTipos = {
  'destination_address': 'TEXT',
  'destination_latitude': 'REAL',
  'destination_longitude': 'REAL',
  'attended_vehicle_plate_masked': 'TEXT',
  'attended_vehicle_model': 'TEXT',
  'attended_vehicle_color': 'TEXT',
  'sla_due_at': 'INTEGER',
};

// O esquema da ERA 18 (congelado aqui, independente do código novo).
const _v18SyncActions = '''
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

String _v18WorkOrders({List<String> extra = const []}) =>
    '''
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
  checkin_plate_tail TEXT${extra.map((c) => ',\n  $c ${_seteTipos[c]}').join()}
)''';

const _v18Timeline = '''
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

const _v18Evidence = '''
CREATE TABLE work_order_evidence (
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

const _v18ChecklistRuns = '''
CREATE TABLE checklist_runs (
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

const _v18ServiceNotes = '''
CREATE TABLE work_order_service_notes (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  work_order_local_id TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  execution TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id, work_order_local_id)
)''';

const _linhas = [
  "INSERT INTO work_orders (local_id, server_id, tenant_id, code, title, customer_name, service_address, "
      "latitude, longitude, status, priority, sync_status, created_at, service_type, checkin_mode, "
      "checkin_plate_tail) VALUES ('wo-1', 'srv-1', 't-18', 'OS-1801', 'Reboque', 'Cliente', 'Rua A', "
      "-23.55, -46.63, 'enRoute', 'normal', 'pending', 1763078400000, 'tow', 'plate', '23')",
  "INSERT INTO work_orders (local_id, server_id, tenant_id, code, title, customer_name, service_address, "
      "status, priority, sync_status, created_at) VALUES ('wo-2', 'srv-2', 't-18', 'OS-1802', 'Outra', "
      "'Cliente 2', 'Rua B', 'dispatched', 'high', 'synced', 1763078400001)",
  "INSERT INTO sync_actions (client_action_id, tenant_id, type, payload_json, status, created_at, retry_count, "
      "user_id) VALUES ('a1', 't-18', 'work_order.status_change', "
      "'{\"local_id\":\"wo-1\",\"new_status\":\"arrived\",\"checkin_confirmation\":{\"last_digits\":\"23\"}}', "
      "'pending', 1763078400100, 0, 'u-18')",
  "INSERT INTO sync_actions (client_action_id, tenant_id, type, payload_json, status, created_at, retry_count, "
      "user_id) VALUES ('a2', 't-18', 'work_order.status_change', '{\"local_id\":\"wo-1\"}', 'pending', "
      "1763078400200, 1, 'u-18')",
  "INSERT INTO sync_actions (client_action_id, tenant_id, type, payload_json, status, created_at, retry_count, "
      "user_id) VALUES ('a3', 't-18', 'checklist.run_submit', '{}', 'pending', 1763078400300, 0, 'u-18')",
  "INSERT INTO work_order_timeline (local_id, work_order_local_id, tenant_id, event_type, occurred_at, "
      "sync_status) VALUES ('ev-1', 'wo-1', 't-18', 'statusChanged', 1763078400050, 'pending')",
  "INSERT INTO checklist_runs (local_id, tenant_id, checklist_id, work_order_id, schema_version, status, "
      "executed_by_user_id, started_at, sync_status, answers_json, kind) VALUES ('run-1', 't-18', 'chk-1', "
      "'wo-1', 'v1', 'inProgress', 'u-18', 1763078400060, 'pending', '{\"q1\":\"ok\"}', 'collection')",
  "INSERT INTO work_order_evidence (local_id, work_order_local_id, tenant_id, file_name, mime_type, "
      "size_bytes, capture_source, sync_status, upload_status, created_at, local_blob_ref) VALUES "
      "('evi-1', 'wo-1', 't-18', 'foto.jpg', 'image/jpeg', 1234, 'camera', 'pending', 'pending', "
      "1763078400070, 'blob-opaco-1')",
  "INSERT INTO work_order_service_notes (tenant_id, user_id, work_order_local_id, diagnosis, execution, "
      "updated_at) VALUES ('t-18', 'u-18', 'wo-1', 'Diagnóstico', 'Serviço', 1763078400080)",
];

const _tabelas = [
  'work_orders',
  'sync_actions',
  'work_order_timeline',
  'checklist_runs',
  'work_order_evidence',
  'work_order_service_notes',
];

List<String> _ddl18({List<String> extra = const []}) => [
  _v18SyncActions,
  _v18WorkOrders(extra: extra),
  _v18Timeline,
  _v18Evidence,
  _v18ChecklistRuns,
  _v18ServiceNotes,
];

Future<String> _semear(
  Directory dir,
  String nome, {
  required int version,
  required List<String> sql,
}) async {
  final path = '${dir.path}/$nome.db';
  final legacy = _LegacyDb(
    NativeDatabase(File(path)),
    legacyVersion: version,
    onCreateSql: sql,
  );
  await legacy.customSelect('SELECT 1').get();
  await legacy.close();
  return path;
}

Future<int> _userVersion(GeneratedDatabase db) async =>
    (await db.customSelect('PRAGMA user_version').getSingle()).read<int>(
      'user_version',
    );

/// `PRAGMA table_info` de `work_orders`, como conjunto de "nome:tipo".
Future<Set<String>> _esquema(GeneratedDatabase db) async => {
  for (final r in await db
      .customSelect("PRAGMA table_info('work_orders')")
      .get())
    '${r.read<String>('name')}:${r.read<String>('type')}',
};

/// Todas as linhas de todas as tabelas, por chave, como mapas coluna → valor.
Future<Map<String, List<Map<String, Object?>>>> _foto(
  GeneratedDatabase db,
) async => {
  for (final t in _tabelas)
    t: [
      for (final r in await db.customSelect('SELECT * FROM $t ORDER BY 1').get())
        Map<String, Object?>.from(r.data),
    ],
};

Future<GeneratedDatabase> _abrirLegado(String path, int version) async =>
    _LegacyDb(
      NativeDatabase(File(path)),
      legacyVersion: version,
      onCreateSql: const [],
    );

void main() {
  late Directory dir;
  setUp(() async {
    dir = await Directory.systemTemp.createTemp('erp_bguid1_v19');
  });
  tearDown(() async {
    if (await dir.exists()) await dir.delete(recursive: true);
  });

  test(
    'D5 — 18 cheio → 19: as contagens, a fila pendente e cada linha antiga iguais; as 7 novas NULL',
    () async {
      final path = await _semear(
        dir,
        'v18',
        version: 18,
        sql: [..._ddl18(), ..._linhas],
      );
      final legado = await _abrirLegado(path, 18);
      final antes = await _foto(legado);
      await legado.close();
      expect(antes['work_orders'], hasLength(2));
      expect(antes['sync_actions'], hasLength(3));

      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);
      expect(await _userVersion(db), 19);
      final depois = await _foto(db);

      for (final t in _tabelas) {
        expect(depois[t]!.length, antes[t]!.length, reason: 'contagem de $t');
        for (var i = 0; i < antes[t]!.length; i++) {
          final velha = antes[t]![i];
          final nova = depois[t]![i];
          for (final coluna in velha.keys) {
            expect(nova[coluna], velha[coluna], reason: '$t[$i].$coluna');
          }
          if (t == 'work_orders') {
            for (final coluna in _sete) {
              expect(nova.containsKey(coluna), isTrue, reason: coluna);
              expect(nova[coluna], isNull, reason: '$t[$i].$coluna');
            }
          } else {
            expect(nova.keys.toSet(), velha.keys.toSet(), reason: t);
          }
        }
      }
      final fila = [
        for (final a in depois['sync_actions']!)
          '${a['client_action_id']}:${a['status']}',
      ];
      expect(fila, ['a1:pending', 'a2:pending', 'a3:pending']);
      expect(
        depois['sync_actions']!.first['payload_json'] as String,
        contains('checkin_confirmation'),
      );
    },
  );

  test(
    'D5b — rebaixamento: um banco 18 que JÁ tem as 7 colunas abre em 19 sem "duplicate column", com as linhas intactas',
    () async {
      final path = await _semear(
        dir,
        'v18-com-7',
        version: 18,
        sql: [
          ..._ddl18(extra: _sete),
          ..._linhas,
          "UPDATE work_orders SET destination_address = 'Rua Destino', sla_due_at = 1764601200000 "
              "WHERE local_id = 'wo-1'",
        ],
      );
      final legado = await _abrirLegado(path, 18);
      final antes = await _foto(legado);
      await legado.close();

      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);
      expect(await _userVersion(db), 19);
      expect(await _foto(db), antes);
      final wo1 = (await _foto(db))['work_orders']!.first;
      expect(wo1['destination_address'], 'Rua Destino');
      expect(wo1['sla_due_at'], 1764601200000);
    },
  );

  test(
    'D5c — degrau interrompido: um banco 18 com só 3 das 7 colunas termina com as 7',
    () async {
      final path = await _semear(
        dir,
        'v18-parcial',
        version: 18,
        sql: [
          ..._ddl18(extra: _sete.take(3).toList()),
          ..._linhas,
        ],
      );
      final db = AppDatabase(NativeDatabase(File(path)));
      addTearDown(db.close);
      expect(await _userVersion(db), 19);
      final esquema = await _esquema(db);
      for (final c in _sete) {
        expect(esquema, contains('$c:${_seteTipos[c]}'));
      }
      expect((await _foto(db))['work_orders'], hasLength(2));
    },
  );

  test(
    'D6 — instalação nova, vindo da 18 e vindo da 1 (com e sem work_orders) terminam com o MESMO esquema de work_orders',
    () async {
      final nova = AppDatabase.openInMemory();
      addTearDown(nova.close);
      final esperado = await _esquema(nova);
      for (final c in _sete) {
        expect(esperado, contains('$c:${_seteTipos[c]}'), reason: 'onCreate');
      }

      Future<Set<String>> subir(
        String nome,
        int version,
        List<String> sql,
      ) async {
        final path = await _semear(dir, nome, version: version, sql: sql);
        final db = AppDatabase(NativeDatabase(File(path)));
        addTearDown(db.close);
        expect(await _userVersion(db), 19, reason: nome);
        return _esquema(db);
      }

      // A fila da v1 ainda não tinha `user_id` (entra na v14).
      const v1SyncActions = '''
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

      expect(await subir('de18', 18, _ddl18()), esperado, reason: 'de 18');
      expect(
        await subir('de1', 1, const [v1SyncActions]),
        esperado,
        reason: 'de 1',
      );
      // Vindo da 1 com uma `work_orders` que já existe sem as 7 (o `CREATE TABLE IF NOT EXISTS` não a completa): só o
      // degrau `if (from < 19)` a completa (emenda 1.1, §3.4).
      expect(
        await subir('de1-com-tabela', 1, [v1SyncActions, _v18WorkOrders()]),
        esperado,
        reason: 'de 1 com work_orders',
      );
    },
  );
}
