import '../domain/checklist_models.dart';

abstract class ChecklistLocalStore {
  Future<List<MobileChecklistTemplate>> loadTemplates(String tenantId);
  Future<void> saveTemplate(MobileChecklistTemplate template);
  Future<MobileChecklistSchema?> loadSchema(String checklistId);
  Future<void> saveSchema(MobileChecklistSchema schema);
  Future<List<MobileChecklistRun>> loadRunsForWorkOrder(String workOrderId);
  Future<MobileChecklistRun?> loadRun(String localId);
  Future<void> saveRun(MobileChecklistRun run);
  Future<List<MobileChecklistMarker>> loadMarkers(String runId);
  Future<void> saveMarker(MobileChecklistMarker marker);
  Future<MobileChecklistAcknowledgement?> loadAcknowledgement(String runId);
  Future<void> saveAcknowledgement(MobileChecklistAcknowledgement ack);
  Future<List<MobileChecklistAttachmentMetadata>> loadAttachments(
    String runId,
    String fieldId,
  );
  Future<void> saveAttachment(MobileChecklistAttachmentMetadata att);
}

class InMemoryChecklistLocalStore implements ChecklistLocalStore {
  InMemoryChecklistLocalStore({
    List<MobileChecklistTemplate>? templates,
    List<MobileChecklistSchema>? schemas,
  }) : _templates = List<MobileChecklistTemplate>.from(templates ?? []),
       _schemas = List<MobileChecklistSchema>.from(schemas ?? []);

  final List<MobileChecklistTemplate> _templates;
  final List<MobileChecklistSchema> _schemas;
  final List<MobileChecklistRun> _runs = [];
  final List<MobileChecklistMarker> _markers = [];
  final List<MobileChecklistAcknowledgement> _acknowledgements = [];
  final List<MobileChecklistAttachmentMetadata> _attachments = [];

  @override
  Future<List<MobileChecklistTemplate>> loadTemplates(String tenantId) async =>
      _templates.where((t) => t.tenantId == tenantId).toList();

  @override
  Future<void> saveTemplate(MobileChecklistTemplate template) async {
    _templates.removeWhere((t) => t.id == template.id);
    _templates.add(template);
  }

  @override
  Future<MobileChecklistSchema?> loadSchema(String checklistId) async =>
      _schemas.cast<MobileChecklistSchema?>().firstWhere(
        (s) => s?.checklistId == checklistId,
        orElse: () => null,
      );

  @override
  Future<void> saveSchema(MobileChecklistSchema schema) async {
    _schemas.removeWhere((s) => s.checklistId == schema.checklistId);
    _schemas.add(schema);
  }

  @override
  Future<List<MobileChecklistRun>> loadRunsForWorkOrder(
    String workOrderId,
  ) async => _runs.where((r) => r.workOrderId == workOrderId).toList();

  @override
  Future<MobileChecklistRun?> loadRun(String localId) async => _runs
      .cast<MobileChecklistRun?>()
      .firstWhere((r) => r?.localId == localId, orElse: () => null);

  @override
  Future<void> saveRun(MobileChecklistRun run) async {
    _runs.removeWhere((r) => r.localId == run.localId);
    _runs.add(run);
  }

  @override
  Future<List<MobileChecklistMarker>> loadMarkers(String runId) async =>
      _markers.where((m) => m.runId == runId).toList();

  @override
  Future<void> saveMarker(MobileChecklistMarker marker) async {
    _markers.removeWhere((m) => m.localId == marker.localId);
    _markers.add(marker);
  }

  @override
  Future<MobileChecklistAcknowledgement?> loadAcknowledgement(
    String runId,
  ) async => _acknowledgements
      .cast<MobileChecklistAcknowledgement?>()
      .firstWhere((a) => a?.runId == runId, orElse: () => null);

  @override
  Future<void> saveAcknowledgement(MobileChecklistAcknowledgement ack) async {
    _acknowledgements.removeWhere((a) => a.runId == ack.runId);
    _acknowledgements.add(ack);
  }

  @override
  Future<List<MobileChecklistAttachmentMetadata>> loadAttachments(
    String runId,
    String fieldId,
  ) async => _attachments
      .where((a) => a.runId == runId && a.fieldId == fieldId)
      .toList();

  @override
  Future<void> saveAttachment(MobileChecklistAttachmentMetadata att) async {
    _attachments.removeWhere((a) => a.localId == att.localId);
    _attachments.add(att);
  }
}
