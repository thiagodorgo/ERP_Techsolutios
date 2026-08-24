import '../../../core/sync/sync_models.dart';

enum MobileChecklistFieldType {
  text,
  number,
  boolean,
  singleChoice,
  multiChoice,
  photoUpload,
  beforeAfter,
  damageMap,
  vehicleSelector,
  observation,
  acknowledgement,
  signature,
  // Tipo desconhecido/não renderizável nesta versão do app (fallback seguro).
  unsupported;

  String get apiValue => switch (this) {
    MobileChecklistFieldType.text => 'text',
    MobileChecklistFieldType.number => 'number',
    MobileChecklistFieldType.boolean => 'boolean',
    MobileChecklistFieldType.singleChoice => 'single_choice',
    MobileChecklistFieldType.multiChoice => 'multi_choice',
    MobileChecklistFieldType.photoUpload => 'photo_upload',
    MobileChecklistFieldType.beforeAfter => 'before_after',
    MobileChecklistFieldType.damageMap => 'damage_map',
    MobileChecklistFieldType.vehicleSelector => 'vehicle_selector',
    MobileChecklistFieldType.observation => 'observation',
    MobileChecklistFieldType.acknowledgement => 'acknowledgement',
    MobileChecklistFieldType.signature => 'signature',
    MobileChecklistFieldType.unsupported => 'unsupported',
  };

  static MobileChecklistFieldType fromApiValue(String v) => switch (v) {
    'text' => MobileChecklistFieldType.text,
    'number' => MobileChecklistFieldType.number,
    'boolean' => MobileChecklistFieldType.boolean,
    'single_choice' => MobileChecklistFieldType.singleChoice,
    'multi_choice' => MobileChecklistFieldType.multiChoice,
    'photo_upload' => MobileChecklistFieldType.photoUpload,
    'before_after' => MobileChecklistFieldType.beforeAfter,
    'damage_map' => MobileChecklistFieldType.damageMap,
    'vehicle_selector' => MobileChecklistFieldType.vehicleSelector,
    'observation' => MobileChecklistFieldType.observation,
    'acknowledgement' => MobileChecklistFieldType.acknowledgement,
    'signature' => MobileChecklistFieldType.signature,
    _ => MobileChecklistFieldType.unsupported,
  };
}

enum MobileChecklistRunStatus {
  inProgress,
  completed,
  incomplete;

  String get label => switch (this) {
    MobileChecklistRunStatus.inProgress => 'Em andamento',
    MobileChecklistRunStatus.completed => 'Concluído',
    MobileChecklistRunStatus.incomplete => 'Incompleto',
  };
}

/// Fase do run de checklist: coleta (recebimento) x entrega.
/// Distingue os dois runs de uma mesma OS de guincho (prefixos `c_`/`e_`).
enum MobileChecklistRunKind {
  collection,
  delivery,

  /// Fase que ESTA versão do app não reconhece (valor futuro do backend —
  /// ex.: o eixo `role` da aplicabilidade, `generic`). Existe para que valor
  /// desconhecido NUNCA colapse em coleta: o resumo de divergências
  /// coleta × entrega vira prova jurídica do estado do veículo, e duas runs
  /// classificadas por palpite como coleta tornariam a escolha da run
  /// não-determinística — divergência FABRICADA (P-CHK-FLUTTER-KIND-COLAPSA).
  unknown;

  String get apiValue => switch (this) {
    MobileChecklistRunKind.collection => 'collection',
    MobileChecklistRunKind.delivery => 'delivery',
    // Marcador local de "não reconhecido". Nunca é enviado ao backend como
    // fase real, e a persistência local nunca o grava por cima de uma fase
    // conhecida (guarda em DriftChecklistLocalStore.saveRun).
    MobileChecklistRunKind.unknown => 'unknown',
  };

  String get label => switch (this) {
    MobileChecklistRunKind.collection => 'Coleta',
    MobileChecklistRunKind.delivery => 'Entrega',
    MobileChecklistRunKind.unknown => 'Fase não identificada',
  };

  /// Mapeia APENAS os valores conhecidos; qualquer outro — inclusive null —
  /// vira [unknown], nunca um palpite de coleta (P-CHK-FLUTTER-KIND-COLAPSA).
  /// Fluxos legados em que a AUSÊNCIA do valor é legítima (rota de run sem
  /// `?kind=`) usam [fromLegacyApiValue].
  static MobileChecklistRunKind fromApiValue(String? v) => switch (v) {
    'collection' => MobileChecklistRunKind.collection,
    'delivery' => MobileChecklistRunKind.delivery,
    _ => MobileChecklistRunKind.unknown,
  };

  /// Uso EXCLUSIVO dos pontos onde `null` é legado legítimo: as navegações
  /// antigas do guincheiro (OS → checklist) nunca passaram `?kind=` porque a
  /// coleta era a única fase que existia — ausência do parâmetro preserva o
  /// comportamento histórico (coleta). Valor PRESENTE mas não reconhecido
  /// segue a regra estrita e vira [unknown].
  static MobileChecklistRunKind fromLegacyApiValue(String? v) =>
      v == null ? MobileChecklistRunKind.collection : fromApiValue(v);
}

class MobileChecklistFieldOption {
  const MobileChecklistFieldOption({
    required this.value,
    required this.label,
    this.description,
  });

  final String value;
  final String label;
  final String? description;
}

class MobileChecklistField {
  const MobileChecklistField({
    required this.id,
    required this.type,
    required this.label,
    required this.required,
    required this.order,
    this.description,
    this.options,
    this.metadata,
  });

  final String id;
  final MobileChecklistFieldType type;
  final String label;
  final String? description;
  final bool required;
  final int order;
  final List<MobileChecklistFieldOption>? options;
  final Map<String, String>? metadata;
}

class MobileChecklistSchema {
  const MobileChecklistSchema({
    required this.id,
    required this.checklistId,
    required this.version,
    required this.title,
    required this.fields,
    this.instructions,
  });

  final String id;
  final String checklistId;
  final String version;
  final String title;
  final String? instructions;
  final List<MobileChecklistField> fields;

  List<MobileChecklistField> get sortedFields {
    final list = List<MobileChecklistField>.from(fields);
    list.sort((a, b) => a.order.compareTo(b.order));
    return list;
  }

  List<MobileChecklistField> get requiredFields =>
      fields.where((f) => f.required).toList();
}

class MobileChecklistTemplate {
  const MobileChecklistTemplate({
    required this.id,
    required this.tenantId,
    required this.title,
    required this.isRequired,
    required this.schemaVersion,
    required this.status,
    this.description,
    this.linkedWorkOrderType,
  });

  final String id;
  final String tenantId;
  final String title;
  final String? description;
  final bool isRequired;
  final String? linkedWorkOrderType;
  final String schemaVersion;
  final String status;

  bool get isActive => status == 'active';
}

class MobileChecklistAnswer {
  const MobileChecklistAnswer({
    required this.fieldId,
    required this.answeredAt,
    this.textValue,
    this.numberValue,
    this.boolValue,
    this.choiceValue,
    this.multiChoiceValues,
    this.observationText,
  });

  final String fieldId;
  final String? textValue;
  final double? numberValue;
  final bool? boolValue;
  final String? choiceValue;
  final List<String>? multiChoiceValues;
  final String? observationText;
  final DateTime answeredAt;

  bool get hasValue =>
      textValue != null ||
      numberValue != null ||
      boolValue != null ||
      choiceValue != null ||
      (multiChoiceValues?.isNotEmpty ?? false) ||
      observationText != null;

  String get displayValue {
    if (boolValue != null) return boolValue! ? 'Sim' : 'Não';
    if (choiceValue != null) return choiceValue!;
    if (multiChoiceValues != null) return multiChoiceValues!.join(', ');
    if (numberValue != null) return numberValue!.toString();
    if (textValue != null) return textValue!;
    if (observationText != null) return observationText!;
    return '';
  }
}

class MobileChecklistRun {
  const MobileChecklistRun({
    required this.localId,
    required this.tenantId,
    required this.checklistId,
    required this.workOrderId,
    required this.schemaVersion,
    required this.status,
    required this.executedByUserId,
    required this.startedAt,
    required this.syncStatus,
    required this.answers,
    this.kind = MobileChecklistRunKind.collection,
    this.serverId,
    this.completedAt,
  });

  final String localId;
  final String? serverId;
  final String tenantId;
  final String checklistId;
  final String workOrderId;
  final String schemaVersion;
  final MobileChecklistRunStatus status;
  final MobileChecklistRunKind kind;
  final String executedByUserId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final SyncStatus syncStatus;
  final Map<String, MobileChecklistAnswer> answers;

  MobileChecklistRun copyWith({
    String? serverId,
    MobileChecklistRunStatus? status,
    DateTime? completedAt,
    SyncStatus? syncStatus,
    Map<String, MobileChecklistAnswer>? answers,
  }) => MobileChecklistRun(
    localId: localId,
    // serverId só cresce (nunca é apagado): o despacho cria a run, o app baixa
    // o server_run_id (D-CHK-DISPATCH-CREATE) e o grava aqui.
    serverId: serverId ?? this.serverId,
    tenantId: tenantId,
    checklistId: checklistId,
    workOrderId: workOrderId,
    schemaVersion: schemaVersion,
    status: status ?? this.status,
    kind: kind,
    executedByUserId: executedByUserId,
    startedAt: startedAt,
    completedAt: completedAt ?? this.completedAt,
    syncStatus: syncStatus ?? this.syncStatus,
    answers: answers ?? this.answers,
  );
}

class MobileChecklistMarker {
  const MobileChecklistMarker({
    required this.localId,
    required this.runId,
    required this.type,
    required this.syncStatus,
    this.label,
    this.description,
    this.positionLabel,
  });

  final String localId;
  final String runId;
  final String type;
  final String? label;
  final String? description;
  final String? positionLabel;
  final SyncStatus syncStatus;
}

class MobileChecklistAttachmentMetadata {
  const MobileChecklistAttachmentMetadata({
    required this.localId,
    required this.runId,
    required this.fieldId,
    required this.fileName,
    required this.mimeType,
    required this.sizeBytes,
    required this.syncStatus,
    this.checksum,
    this.captureSource,
    this.localBlobRef,
    this.serverId,
    this.uploadStatus = SyncStatus.pending,
    this.uploadedAt,
    this.uploadErrorCode,
  });

  final String localId;
  final String runId;
  final String fieldId;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final String? checksum;
  final String? captureSource;
  final SyncStatus syncStatus;

  // Binário local da foto (blob store) — o JSON de sync carrega só o metadado;
  // o binário sobe pelo multipart POST /mobile/checklist-runs/:runId/attachments.
  final String? localBlobRef;

  // Id do anexo no servidor (após o upload multipart concluir).
  final String? serverId;

  // Estado do upload do binário (independente do sync do metadado).
  final SyncStatus uploadStatus;
  final DateTime? uploadedAt;
  final String? uploadErrorCode;

  MobileChecklistAttachmentMetadata copyWith({
    String? serverId,
    SyncStatus? uploadStatus,
    DateTime? uploadedAt,
    String? uploadErrorCode,
    bool clearUploadErrorCode = false,
    bool clearLocalBlobRef = false,
  }) => MobileChecklistAttachmentMetadata(
    localId: localId,
    runId: runId,
    fieldId: fieldId,
    fileName: fileName,
    mimeType: mimeType,
    sizeBytes: sizeBytes,
    syncStatus: syncStatus,
    checksum: checksum,
    captureSource: captureSource,
    localBlobRef: clearLocalBlobRef ? null : localBlobRef,
    serverId: serverId ?? this.serverId,
    uploadStatus: uploadStatus ?? this.uploadStatus,
    uploadedAt: uploadedAt ?? this.uploadedAt,
    uploadErrorCode: clearUploadErrorCode
        ? null
        : (uploadErrorCode ?? this.uploadErrorCode),
  );
}

class MobileChecklistAcknowledgement {
  const MobileChecklistAcknowledgement({
    required this.localId,
    required this.runId,
    required this.acknowledgedByName,
    required this.acknowledgedByRole,
    required this.acknowledgedAt,
    required this.confirmed,
    required this.syncStatus,
  });

  final String localId;
  final String runId;
  final String acknowledgedByName;
  final String acknowledgedByRole;
  final DateTime acknowledgedAt;
  final bool confirmed;
  final SyncStatus syncStatus;
}
