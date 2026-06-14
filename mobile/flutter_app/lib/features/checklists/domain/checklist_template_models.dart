/// Rich domain models for dynamic checklists received from the backend.
///
/// These extend the existing [MobileChecklistTemplate]/[MobileChecklistSchema]
/// models with sections, rich question types, visibility rules, validation
/// rules, and sync policies. They are designed to be deserialized from the
/// backend payload and cached locally in Drift.
///
/// Existing models (MobileChecklistTemplate, MobileChecklistSchema,
/// MobileChecklistField) remain intact and are still used for the current
/// Drift persistence layer. These richer models will replace them
/// progressively as the backend integration matures.
library;

// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

enum ChecklistQuestionType {
  text,
  longText,
  integer,
  decimal,
  currency,
  date,
  time,
  dateTime,
  singleChoice,
  multiChoice,
  yesNo,
  photo,
  signature,
  damageMap,
  gps,
  barcode,
  computed,
  sectionNote,
  repeater;

  static ChecklistQuestionType fromApiValue(String v) {
    return switch (v) {
      'text' => text,
      'long_text' => longText,
      'integer' => integer,
      'decimal' => decimal,
      'currency' => currency,
      'date' => date,
      'time' => time,
      'date_time' => dateTime,
      'single_choice' => singleChoice,
      'multi_choice' => multiChoice,
      'yes_no' => yesNo,
      'photo' => photo,
      'signature' => signature,
      'damage_map' => damageMap,
      'gps' => gps,
      'barcode' => barcode,
      'computed' => computed,
      'section_note' => sectionNote,
      'repeater' => repeater,
      _ => text, // safe fallback — renderer handles unknown gracefully
    };
  }

  String get apiValue => switch (this) {
    text => 'text',
    longText => 'long_text',
    integer => 'integer',
    decimal => 'decimal',
    currency => 'currency',
    date => 'date',
    time => 'time',
    dateTime => 'date_time',
    singleChoice => 'single_choice',
    multiChoice => 'multi_choice',
    yesNo => 'yes_no',
    photo => 'photo',
    signature => 'signature',
    damageMap => 'damage_map',
    gps => 'gps',
    barcode => 'barcode',
    computed => 'computed',
    sectionNote => 'section_note',
    repeater => 'repeater',
  };

  bool get isSupported => switch (this) {
    text ||
    longText ||
    integer ||
    decimal ||
    yesNo ||
    singleChoice ||
    multiChoice ||
    photo ||
    damageMap ||
    sectionNote => true,
    _ => false,
  };
}

// ---------------------------------------------------------------------------
// Visibility rule
// ---------------------------------------------------------------------------

class ChecklistVisibilityRule {
  const ChecklistVisibilityRule({
    required this.questionId,
    required this.operator,
    required this.value,
  });

  final String questionId;

  /// Supported: 'eq', 'neq', 'in', 'not_in', 'truthy'
  final String operator;
  final Object? value;

  factory ChecklistVisibilityRule.fromJson(Map<String, dynamic> j) =>
      ChecklistVisibilityRule(
        questionId: j['question_id'] as String,
        operator: j['operator'] as String,
        value: j['value'],
      );

  Map<String, dynamic> toJson() => {
    'question_id': questionId,
    'operator': operator,
    'value': value,
  };
}

// ---------------------------------------------------------------------------
// Validation rule
// ---------------------------------------------------------------------------

class ChecklistValidationRule {
  const ChecklistValidationRule({
    this.minLength,
    this.maxLength,
    this.minValue,
    this.maxValue,
    this.pattern,
    this.patternError,
  });

  final int? minLength;
  final int? maxLength;
  final double? minValue;
  final double? maxValue;
  final String? pattern;
  final String? patternError;

  factory ChecklistValidationRule.fromJson(Map<String, dynamic> j) =>
      ChecklistValidationRule(
        minLength: j['min_length'] as int?,
        maxLength: j['max_length'] as int?,
        minValue: (j['min_value'] as num?)?.toDouble(),
        maxValue: (j['max_value'] as num?)?.toDouble(),
        pattern: j['pattern'] as String?,
        patternError: j['pattern_error'] as String?,
      );
}

// ---------------------------------------------------------------------------
// Evidence policy
// ---------------------------------------------------------------------------

class ChecklistEvidencePolicy {
  const ChecklistEvidencePolicy({
    required this.required,
    this.minCount = 1,
    this.maxCount,
    this.allowedSources,
  });

  final bool required;
  final int minCount;
  final int? maxCount;
  final List<String>? allowedSources; // 'camera', 'gallery'

  factory ChecklistEvidencePolicy.fromJson(Map<String, dynamic> j) =>
      ChecklistEvidencePolicy(
        required: j['required'] as bool? ?? false,
        minCount: j['min_count'] as int? ?? 1,
        maxCount: j['max_count'] as int?,
        allowedSources:
            (j['allowed_sources'] as List<dynamic>?)?.cast<String>(),
      );
}

// ---------------------------------------------------------------------------
// Option
// ---------------------------------------------------------------------------

class ChecklistOption {
  const ChecklistOption({
    required this.value,
    required this.label,
    this.description,
    this.triggerVisibilityFor,
  });

  final String value;
  final String label;
  final String? description;

  /// Question IDs that become visible when this option is selected.
  final List<String>? triggerVisibilityFor;

  factory ChecklistOption.fromJson(Map<String, dynamic> j) => ChecklistOption(
    value: j['value'] as String,
    label: j['label'] as String,
    description: j['description'] as String?,
    triggerVisibilityFor:
        (j['trigger_visibility_for'] as List<dynamic>?)?.cast<String>(),
  );
}

// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

class ChecklistQuestion {
  const ChecklistQuestion({
    required this.id,
    required this.code,
    required this.type,
    required this.label,
    required this.required,
    required this.order,
    this.helpText,
    this.options,
    this.validation,
    this.visibleWhen,
    this.evidencePolicy,
  });

  final String id;
  final String code;
  final ChecklistQuestionType type;
  final String label;
  final String? helpText;
  final bool required;
  final int order;
  final List<ChecklistOption>? options;
  final ChecklistValidationRule? validation;
  final ChecklistVisibilityRule? visibleWhen;
  final ChecklistEvidencePolicy? evidencePolicy;

  factory ChecklistQuestion.fromJson(Map<String, dynamic> j) =>
      ChecklistQuestion(
        id: j['id'] as String,
        code: j['code'] as String,
        type: ChecklistQuestionType.fromApiValue(j['type'] as String),
        label: j['label'] as String,
        helpText: j['help_text'] as String?,
        required: j['required'] as bool? ?? false,
        order: j['order'] as int? ?? 0,
        options: (j['options'] as List<dynamic>?)
            ?.map((o) => ChecklistOption.fromJson(o as Map<String, dynamic>))
            .toList(),
        validation: j['validation'] == null
            ? null
            : ChecklistValidationRule.fromJson(
                j['validation'] as Map<String, dynamic>,
              ),
        visibleWhen: j['visible_when'] == null
            ? null
            : ChecklistVisibilityRule.fromJson(
                j['visible_when'] as Map<String, dynamic>,
              ),
        evidencePolicy: j['evidence_policy'] == null
            ? null
            : ChecklistEvidencePolicy.fromJson(
                j['evidence_policy'] as Map<String, dynamic>,
              ),
      );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

class ChecklistSection {
  const ChecklistSection({
    required this.id,
    required this.title,
    required this.order,
    required this.questions,
    this.description,
    this.visibleWhen,
  });

  final String id;
  final String title;
  final String? description;
  final int order;
  final List<ChecklistQuestion> questions;
  final ChecklistVisibilityRule? visibleWhen;

  factory ChecklistSection.fromJson(Map<String, dynamic> j) => ChecklistSection(
    id: j['id'] as String,
    title: j['title'] as String,
    description: j['description'] as String?,
    order: j['order'] as int? ?? 0,
    questions: (j['questions'] as List<dynamic>? ?? [])
        .map((q) => ChecklistQuestion.fromJson(q as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order)),
    visibleWhen: j['visible_when'] == null
        ? null
        : ChecklistVisibilityRule.fromJson(
            j['visible_when'] as Map<String, dynamic>,
          ),
  );
}

// ---------------------------------------------------------------------------
// Sync policy
// ---------------------------------------------------------------------------

class ChecklistSyncPolicy {
  const ChecklistSyncPolicy({
    this.offlineAllowed = true,
    this.requiresOnlineToComplete = false,
    this.maxOfflineDays = 7,
  });

  final bool offlineAllowed;
  final bool requiresOnlineToComplete;
  final int maxOfflineDays;

  factory ChecklistSyncPolicy.fromJson(Map<String, dynamic> j) =>
      ChecklistSyncPolicy(
        offlineAllowed: j['offline_allowed'] as bool? ?? true,
        requiresOnlineToComplete:
            j['requires_online_to_complete'] as bool? ?? false,
        maxOfflineDays: j['max_offline_days'] as int? ?? 7,
      );

  static const permissive = ChecklistSyncPolicy();
}

// ---------------------------------------------------------------------------
// Template (rich, versioned)
// ---------------------------------------------------------------------------

class ChecklistTemplate {
  const ChecklistTemplate({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.version,
    required this.status,
    required this.sections,
    required this.syncPolicy,
    required this.updatedAt,
    this.enabledForModules = const [],
    this.serviceTypes = const [],
    this.branchIds = const [],
  });

  final String id;
  final String tenantId;
  final String code;
  final String name;
  final int version;
  final String status;
  final List<String> enabledForModules;
  final List<String> serviceTypes;
  final List<String> branchIds;
  final List<ChecklistSection> sections;
  final ChecklistSyncPolicy syncPolicy;
  final DateTime updatedAt;

  bool get isPublished => status == 'published';

  List<ChecklistQuestion> get allQuestions =>
      sections.expand((s) => s.questions).toList();

  List<ChecklistQuestion> get requiredQuestions =>
      allQuestions.where((q) => q.required).toList();

  factory ChecklistTemplate.fromJson(Map<String, dynamic> j) {
    final appliesTo =
        j['applies_to'] as Map<String, dynamic>? ?? const {};
    return ChecklistTemplate(
      id: j['id'] as String,
      tenantId: j['tenant_id'] as String,
      code: j['code'] as String,
      name: j['name'] as String,
      version: j['version'] as int,
      status: j['status'] as String? ?? 'draft',
      enabledForModules:
          (appliesTo['modules'] as List<dynamic>?)?.cast<String>() ?? [],
      serviceTypes:
          (appliesTo['service_types'] as List<dynamic>?)?.cast<String>() ?? [],
      branchIds:
          (appliesTo['branch_ids'] as List<dynamic>?)?.cast<String>() ?? [],
      sections: (j['sections'] as List<dynamic>? ?? [])
          .map((s) => ChecklistSection.fromJson(s as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
      syncPolicy: j['sync_policy'] == null
          ? ChecklistSyncPolicy.permissive
          : ChecklistSyncPolicy.fromJson(
              j['sync_policy'] as Map<String, dynamic>,
            ),
      updatedAt: DateTime.tryParse(j['updated_at'] as String? ?? '') ??
          DateTime.now().toUtc(),
    );
  }
}

// ---------------------------------------------------------------------------
// Run context (passed to renderers)
// ---------------------------------------------------------------------------

class ChecklistRunContext {
  const ChecklistRunContext({
    required this.runId,
    required this.templateId,
    required this.templateVersion,
    required this.tenantId,
    required this.userId,
    required this.workOrderId,
  });

  final String runId;
  final String templateId;
  final int templateVersion;
  final String tenantId;
  final String userId;
  final String workOrderId;
}

// ---------------------------------------------------------------------------
// Answer (typed value container)
// ---------------------------------------------------------------------------

class ChecklistAnswer {
  const ChecklistAnswer({
    required this.questionId,
    required this.questionCode,
    required this.type,
    required this.answeredAt,
    this.textValue,
    this.numberValue,
    this.boolValue,
    this.singleChoiceValue,
    this.multiChoiceValues,
    this.attachmentIds,
  });

  final String questionId;
  final String questionCode;
  final ChecklistQuestionType type;
  final DateTime answeredAt;
  final String? textValue;
  final double? numberValue;
  final bool? boolValue;
  final String? singleChoiceValue;
  final List<String>? multiChoiceValues;
  final List<String>? attachmentIds;

  bool get hasValue =>
      textValue != null ||
      numberValue != null ||
      boolValue != null ||
      singleChoiceValue != null ||
      (multiChoiceValues?.isNotEmpty ?? false) ||
      (attachmentIds?.isNotEmpty ?? false);

  ChecklistAnswer copyWith({
    String? textValue,
    double? numberValue,
    bool? boolValue,
    String? singleChoiceValue,
    List<String>? multiChoiceValues,
    List<String>? attachmentIds,
  }) => ChecklistAnswer(
    questionId: questionId,
    questionCode: questionCode,
    type: type,
    answeredAt: DateTime.now().toUtc(),
    textValue: textValue ?? this.textValue,
    numberValue: numberValue ?? this.numberValue,
    boolValue: boolValue ?? this.boolValue,
    singleChoiceValue: singleChoiceValue ?? this.singleChoiceValue,
    multiChoiceValues: multiChoiceValues ?? this.multiChoiceValues,
    attachmentIds: attachmentIds ?? this.attachmentIds,
  );

  Map<String, dynamic> toSyncPayload() => {
    'question_id': questionId,
    'question_code': questionCode,
    'type': type.apiValue,
    'answered_at': answeredAt.toIso8601String(),
    'value': switch (type) {
      ChecklistQuestionType.yesNo ||
      ChecklistQuestionType.text ||
      ChecklistQuestionType.longText ||
      ChecklistQuestionType.sectionNote => textValue,
      ChecklistQuestionType.integer ||
      ChecklistQuestionType.decimal ||
      ChecklistQuestionType.currency => numberValue,
      ChecklistQuestionType.singleChoice => singleChoiceValue,
      ChecklistQuestionType.multiChoice => multiChoiceValues,
      _ => textValue ?? numberValue ?? boolValue,
    },
  };
}
