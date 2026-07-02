import 'dart:convert';

import 'package:drift/drift.dart';

import '../../features/checklists/data/checklist_local_store.dart';
import '../../features/checklists/domain/checklist_models.dart';
import '../../core/sync/sync_models.dart';
import 'app_database.dart';

class DriftChecklistLocalStore implements ChecklistLocalStore {
  DriftChecklistLocalStore(this._db);

  final AppDatabase _db;

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  @override
  Future<List<MobileChecklistTemplate>> loadTemplates(String tenantId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_templates WHERE tenant_id = ?',
          variables: [Variable<String>(tenantId)],
        )
        .get();
    return rows.map(_templateFromRow).toList();
  }

  @override
  Future<void> saveTemplate(MobileChecklistTemplate t) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_templates '
      '(id, tenant_id, title, description, is_required, '
      'linked_work_order_type, schema_version, status) '
      'VALUES (?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(t.id),
        Variable<String>(t.tenantId),
        Variable<String>(t.title),
        Variable<String>(t.description),
        Variable<int>(t.isRequired ? 1 : 0),
        Variable<String>(t.linkedWorkOrderType),
        Variable<String>(t.schemaVersion),
        Variable<String>(t.status),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Schemas
  // ---------------------------------------------------------------------------

  @override
  Future<MobileChecklistSchema?> loadSchema(String checklistId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_schemas WHERE checklist_id = ? LIMIT 1',
          variables: [Variable<String>(checklistId)],
        )
        .get();
    if (rows.isEmpty) return null;
    return _schemaFromRow(rows.first);
  }

  @override
  Future<void> saveSchema(MobileChecklistSchema s) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_schemas '
      '(id, checklist_id, version, title, instructions, fields_json) '
      'VALUES (?,?,?,?,?,?)',
      variables: [
        Variable<String>(s.id),
        Variable<String>(s.checklistId),
        Variable<String>(s.version),
        Variable<String>(s.title),
        Variable<String>(s.instructions),
        Variable<String>(json.encode(s.fields.map(_fieldToJson).toList())),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Runs
  // ---------------------------------------------------------------------------

  @override
  Future<List<MobileChecklistRun>> loadRunsForWorkOrder(
    String workOrderId,
  ) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_runs WHERE work_order_id = ?',
          variables: [Variable<String>(workOrderId)],
        )
        .get();
    return rows.map(_runFromRow).toList();
  }

  @override
  Future<MobileChecklistRun?> loadRun(String localId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_runs WHERE local_id = ? LIMIT 1',
          variables: [Variable<String>(localId)],
        )
        .get();
    if (rows.isEmpty) return null;
    return _runFromRow(rows.first);
  }

  @override
  Future<void> saveRun(MobileChecklistRun run) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_runs '
      '(local_id, server_id, tenant_id, checklist_id, work_order_id, '
      'schema_version, status, executed_by_user_id, started_at, '
      'completed_at, sync_status, answers_json, kind) '
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(run.localId),
        Variable<String>(run.serverId),
        Variable<String>(run.tenantId),
        Variable<String>(run.checklistId),
        Variable<String>(run.workOrderId),
        Variable<String>(run.schemaVersion),
        Variable<String>(run.status.name),
        Variable<String>(run.executedByUserId),
        Variable<int>(run.startedAt.millisecondsSinceEpoch),
        Variable<int>(run.completedAt?.millisecondsSinceEpoch),
        Variable<String>(run.syncStatus.name),
        Variable<String>(json.encode(_answersToJson(run.answers))),
        Variable<String>(run.kind.apiValue),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Markers
  // ---------------------------------------------------------------------------

  @override
  Future<List<MobileChecklistMarker>> loadMarkers(String runId) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_markers WHERE run_id = ?',
          variables: [Variable<String>(runId)],
        )
        .get();
    return rows.map(_markerFromRow).toList();
  }

  @override
  Future<void> saveMarker(MobileChecklistMarker m) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_markers '
      '(local_id, run_id, type, label, description, position_label, sync_status) '
      'VALUES (?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(m.localId),
        Variable<String>(m.runId),
        Variable<String>(m.type),
        Variable<String>(m.label),
        Variable<String>(m.description),
        Variable<String>(m.positionLabel),
        Variable<String>(m.syncStatus.name),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Acknowledgements
  // ---------------------------------------------------------------------------

  @override
  Future<MobileChecklistAcknowledgement?> loadAcknowledgement(
    String runId,
  ) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_acknowledgements WHERE run_id = ? LIMIT 1',
          variables: [Variable<String>(runId)],
        )
        .get();
    if (rows.isEmpty) return null;
    return _ackFromRow(rows.first);
  }

  @override
  Future<void> saveAcknowledgement(MobileChecklistAcknowledgement ack) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_acknowledgements '
      '(local_id, run_id, acknowledged_by_name, acknowledged_by_role, '
      'acknowledged_at, confirmed, sync_status) '
      'VALUES (?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(ack.localId),
        Variable<String>(ack.runId),
        Variable<String>(ack.acknowledgedByName),
        Variable<String>(ack.acknowledgedByRole),
        Variable<int>(ack.acknowledgedAt.millisecondsSinceEpoch),
        Variable<int>(ack.confirmed ? 1 : 0),
        Variable<String>(ack.syncStatus.name),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------

  @override
  Future<List<MobileChecklistAttachmentMetadata>> loadAttachments(
    String runId,
    String fieldId,
  ) async {
    final rows = await _db
        .customSelect(
          'SELECT * FROM checklist_attachments WHERE run_id = ? AND field_id = ?',
          variables: [Variable<String>(runId), Variable<String>(fieldId)],
        )
        .get();
    return rows.map(_attachmentFromRow).toList();
  }

  @override
  Future<void> saveAttachment(MobileChecklistAttachmentMetadata att) async {
    await _db.customInsert(
      'INSERT OR REPLACE INTO checklist_attachments '
      '(local_id, run_id, field_id, file_name, mime_type, size_bytes, '
      'checksum, sync_status) '
      'VALUES (?,?,?,?,?,?,?,?)',
      variables: [
        Variable<String>(att.localId),
        Variable<String>(att.runId),
        Variable<String>(att.fieldId),
        Variable<String>(att.fileName),
        Variable<String>(att.mimeType),
        Variable<int>(att.sizeBytes),
        Variable<String>(att.checksum),
        Variable<String>(att.syncStatus.name),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Serialization helpers
  // ---------------------------------------------------------------------------

  MobileChecklistTemplate _templateFromRow(QueryRow row) =>
      MobileChecklistTemplate(
        id: row.read<String>('id'),
        tenantId: row.read<String>('tenant_id'),
        title: row.read<String>('title'),
        description: row.readNullable<String>('description'),
        isRequired: row.read<int>('is_required') == 1,
        linkedWorkOrderType: row.readNullable<String>('linked_work_order_type'),
        schemaVersion: row.read<String>('schema_version'),
        status: row.read<String>('status'),
      );

  MobileChecklistSchema _schemaFromRow(QueryRow row) {
    final fieldsJson =
        json.decode(row.read<String>('fields_json')) as List<dynamic>;
    return MobileChecklistSchema(
      id: row.read<String>('id'),
      checklistId: row.read<String>('checklist_id'),
      version: row.read<String>('version'),
      title: row.read<String>('title'),
      instructions: row.readNullable<String>('instructions'),
      fields: fieldsJson
          .map((f) => _fieldFromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }

  MobileChecklistRun _runFromRow(QueryRow row) {
    final answersJson =
        json.decode(row.read<String>('answers_json')) as Map<String, dynamic>;
    return MobileChecklistRun(
      localId: row.read<String>('local_id'),
      serverId: row.readNullable<String>('server_id'),
      tenantId: row.read<String>('tenant_id'),
      checklistId: row.read<String>('checklist_id'),
      workOrderId: row.read<String>('work_order_id'),
      schemaVersion: row.read<String>('schema_version'),
      status: MobileChecklistRunStatus.values.byName(
        row.read<String>('status'),
      ),
      executedByUserId: row.read<String>('executed_by_user_id'),
      startedAt: DateTime.fromMillisecondsSinceEpoch(
        row.read<int>('started_at'),
        isUtc: true,
      ),
      completedAt: row.readNullable<int>('completed_at') != null
          ? DateTime.fromMillisecondsSinceEpoch(
              row.read<int>('completed_at'),
              isUtc: true,
            )
          : null,
      syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      answers: _answersFromJson(answersJson),
      kind: MobileChecklistRunKind.fromApiValue(
        row.readNullable<String>('kind'),
      ),
    );
  }

  MobileChecklistMarker _markerFromRow(QueryRow row) => MobileChecklistMarker(
    localId: row.read<String>('local_id'),
    runId: row.read<String>('run_id'),
    type: row.read<String>('type'),
    label: row.readNullable<String>('label'),
    description: row.readNullable<String>('description'),
    positionLabel: row.readNullable<String>('position_label'),
    syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
  );

  MobileChecklistAcknowledgement _ackFromRow(QueryRow row) =>
      MobileChecklistAcknowledgement(
        localId: row.read<String>('local_id'),
        runId: row.read<String>('run_id'),
        acknowledgedByName: row.read<String>('acknowledged_by_name'),
        acknowledgedByRole: row.read<String>('acknowledged_by_role'),
        acknowledgedAt: DateTime.fromMillisecondsSinceEpoch(
          row.read<int>('acknowledged_at'),
          isUtc: true,
        ),
        confirmed: row.read<int>('confirmed') == 1,
        syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      );

  MobileChecklistAttachmentMetadata _attachmentFromRow(QueryRow row) =>
      MobileChecklistAttachmentMetadata(
        localId: row.read<String>('local_id'),
        runId: row.read<String>('run_id'),
        fieldId: row.read<String>('field_id'),
        fileName: row.read<String>('file_name'),
        mimeType: row.read<String>('mime_type'),
        sizeBytes: row.read<int>('size_bytes'),
        checksum: row.readNullable<String>('checksum'),
        syncStatus: SyncStatus.values.byName(row.read<String>('sync_status')),
      );

  // ---------------------------------------------------------------------------
  // JSON codec for MobileChecklistField
  // ---------------------------------------------------------------------------

  Map<String, dynamic> _fieldToJson(MobileChecklistField f) => {
    'id': f.id,
    'type': f.type.apiValue,
    'label': f.label,
    'description': f.description,
    'required': f.required,
    'order': f.order,
    'options': f.options
        ?.map(
          (o) => {
            'value': o.value,
            'label': o.label,
            'description': o.description,
          },
        )
        .toList(),
    'metadata': f.metadata,
  };

  MobileChecklistField _fieldFromJson(Map<String, dynamic> j) =>
      MobileChecklistField(
        id: j['id'] as String,
        type: MobileChecklistFieldType.fromApiValue(j['type'] as String),
        label: j['label'] as String,
        description: j['description'] as String?,
        required: j['required'] as bool,
        order: j['order'] as int,
        options: (j['options'] as List<dynamic>?)?.map((o) {
          final m = o as Map<String, dynamic>;
          return MobileChecklistFieldOption(
            value: m['value'] as String,
            label: m['label'] as String,
            description: m['description'] as String?,
          );
        }).toList(),
        metadata: (j['metadata'] as Map<String, dynamic>?)
            ?.cast<String, String>(),
      );

  // ---------------------------------------------------------------------------
  // JSON codec for answers map
  // ---------------------------------------------------------------------------

  Map<String, dynamic> _answersToJson(
    Map<String, MobileChecklistAnswer> answers,
  ) => answers.map(
    (k, a) => MapEntry(k, {
      'field_id': a.fieldId,
      'text_value': a.textValue,
      'number_value': a.numberValue,
      'bool_value': a.boolValue,
      'choice_value': a.choiceValue,
      'multi_choice_values': a.multiChoiceValues,
      'observation_text': a.observationText,
      'answered_at': a.answeredAt.millisecondsSinceEpoch,
    }),
  );

  Map<String, MobileChecklistAnswer> _answersFromJson(
    Map<String, dynamic> json,
  ) => json.map((k, v) {
    final m = v as Map<String, dynamic>;
    return MapEntry(
      k,
      MobileChecklistAnswer(
        fieldId: m['field_id'] as String,
        textValue: m['text_value'] as String?,
        numberValue: (m['number_value'] as num?)?.toDouble(),
        boolValue: m['bool_value'] as bool?,
        choiceValue: m['choice_value'] as String?,
        multiChoiceValues: (m['multi_choice_values'] as List<dynamic>?)
            ?.cast<String>(),
        observationText: m['observation_text'] as String?,
        answeredAt: DateTime.fromMillisecondsSinceEpoch(
          m['answered_at'] as int,
          isUtc: true,
        ),
      ),
    );
  });
}
