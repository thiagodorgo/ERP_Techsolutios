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
  acknowledgement;

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
    _ => MobileChecklistFieldType.text,
  };
}

enum MobileChecklistRunStatus {
  inProgress,
  completed,
  incomplete;

  String get label => switch (this) {
    MobileChecklistRunStatus.inProgress => 'Em andamento',
    MobileChecklistRunStatus.completed => 'Concluido',
    MobileChecklistRunStatus.incomplete => 'Incompleto',
  };
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
    if (boolValue != null) return boolValue! ? 'Sim' : 'Nao';
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
  final String executedByUserId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final SyncStatus syncStatus;
  final Map<String, MobileChecklistAnswer> answers;

  MobileChecklistRun copyWith({
    MobileChecklistRunStatus? status,
    DateTime? completedAt,
    SyncStatus? syncStatus,
    Map<String, MobileChecklistAnswer>? answers,
  }) => MobileChecklistRun(
    localId: localId,
    serverId: serverId,
    tenantId: tenantId,
    checklistId: checklistId,
    workOrderId: workOrderId,
    schemaVersion: schemaVersion,
    status: status ?? this.status,
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
