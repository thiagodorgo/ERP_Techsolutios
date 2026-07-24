class ExpenseApiEndpoints {
  const ExpenseApiEndpoints._();

  static const expensePolicies = '/api/v1/expense-policies';
  static const expenseCategories = '/api/v1/expense-categories';
  static const expenseReports = '/api/v1/expense-reports';
  static const mobileBootstrap = '/api/v1/mobile/bootstrap';
  static const mobileExpenseSync = '/api/v1/mobile/sync/expense-actions';

  static String expenseReport(String reportId) {
    return '/api/v1/expense-reports/$reportId';
  }

  static String expenseReportItems(String reportId) {
    return '/api/v1/expense-reports/$reportId/items';
  }

  static String submitExpenseReport(String reportId) {
    return '/api/v1/expense-reports/$reportId/submit';
  }
}

class WorkOrderApiEndpoints {
  const WorkOrderApiEndpoints._();

  static const workOrders = '/api/v1/work-orders';
  static const mobileFieldAssignments = '/api/v1/mobile/field-assignments';
  static const mobileWorkOrderSync = '/api/v1/mobile/sync/work-order-actions';

  // D1 (seleção viatura/equipe): listas de cadastro para os seletores.
  static const vehicles = '/api/v1/vehicles';
  static const teams = '/api/v1/teams';

  static String workOrder(String id) => '/api/v1/work-orders/$id';
  static String workOrderStatus(String id) => '/api/v1/work-orders/$id/status';
  static String workOrderTimeline(String id) =>
      '/api/v1/work-orders/$id/timeline';
  static String workOrderAssign(String id) => '/api/v1/work-orders/$id/assign';
  static String workOrderEvidence(String id) =>
      '/api/v1/work-orders/$id/evidence';
  static String workOrderApprovalRequests(String id) =>
      '/api/v1/work-orders/$id/approval-requests';
  static String mobileFieldAssignment(String assignmentId) =>
      '/api/v1/mobile/field-assignments/$assignmentId/status';
  static String mobileWorkOrderEvidence(String workOrderId) =>
      '/api/v1/mobile/work-orders/$workOrderId/evidence';
}

class WorkOrderSyncActionTypes {
  const WorkOrderSyncActionTypes._();

  static const statusUpdate = 'work_order.status_update';
  static const create = 'work_order.create';
  static const approvalRequest = 'work_order.approval_request';
  static const evidenceAttach = 'work_order.evidence_attach';
  static const unableToStart = 'work_order.unable_to_start';

  // D1 (seleção viatura/equipe): carrega vehicle_id/team_id opcionais + o
  // operator_id atual da OS (obrigatório no backend).
  static const assign = 'work_order.assign';
}

class ExpenseSyncActionTypes {
  const ExpenseSyncActionTypes._();

  static const reportCreate = 'expense_report.create';
  static const itemCreate = 'expense_item.create';
  static const reportSubmit = 'expense_report.submit';
  static const receiptAttach = 'expense_receipt.attach';

  static const supported = {
    reportCreate,
    itemCreate,
    reportSubmit,
    receiptAttach,
  };
}

class ChecklistApiEndpoints {
  const ChecklistApiEndpoints._();

  static const available = '/api/v1/mobile/checklists/available';
  static const mobileChecklistSync = '/api/v1/mobile/sync/checklist-actions';

  static String checklistRender(String checklistId) =>
      '/api/v1/mobile/checklists/$checklistId/render';
  static String runs() => '/api/v1/mobile/checklist-runs';
  static String run(String runId) => '/api/v1/mobile/checklist-runs/$runId';
  static String completeRun(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/complete';
  static String markers(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/markers';
  static String divergence(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/divergence';
  static String acknowledgement(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/acknowledgement';
  static String attachments(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/attachments';
  static String downloadAttachment(String runId, String attachmentId) =>
      '/api/v1/mobile/checklist-runs/$runId/attachments/$attachmentId/download';
  static String comparison(String runId) =>
      '/api/v1/mobile/checklist-runs/$runId/comparison';
}

class ChecklistSyncActionTypes {
  const ChecklistSyncActionTypes._();

  static const runCreate = 'checklist_run.create';
  static const answerUpsert = 'checklist_answer.upsert';
  static const runComplete = 'checklist_run.complete';
  static const markerCreate = 'checklist_marker.create';
  static const divergenceCreate = 'checklist_divergence.create';
  static const acknowledgementCreate = 'checklist_acknowledgement.create';
  static const attachmentAttach = 'checklist_attachment.attach';
}

class InventoryApiEndpoints {
  const InventoryApiEndpoints._();

  static const items = '/api/v1/mobile/inventory/items';
  static const movements = '/api/v1/mobile/inventory/movements';
  static const sync = '/api/v1/mobile/sync/inventory-actions';
  static const technicianStock = '/api/v1/mobile/technician/stock';

  static String item(String id) => '/api/v1/mobile/inventory/items/$id';
  static String workOrderMaterials(String workOrderId) =>
      '/api/v1/mobile/work-orders/$workOrderId/materials';
}

class InventorySyncActionTypes {
  const InventorySyncActionTypes._();

  static const entryCreate = 'inventory_entry.create';
  static const exitCreate = 'inventory_exit.create';
  static const materialAdd = 'work_order_material.add';
}

class EvidenceApiEndpoints {
  const EvidenceApiEndpoints._();

  static const sync = '/api/v1/mobile/sync/evidence-actions';
  static const upload = '/api/v1/mobile/evidence-uploads';
}

class FieldLocationApiEndpoints {
  const FieldLocationApiEndpoints._();

  static const mobileFieldLocations = '/api/v1/mobile/field-locations';
}

class TelemetryApiEndpoints {
  const TelemetryApiEndpoints._();

  // Ω4C PR-13 — ingestão em lote de telemetria (heartbeat GPS consent-gated +
  // acessos + recusas). Produtor do que o backend PR-12 ingere.
  static const mobileTelemetry = '/api/v1/mobile/telemetry';
}

class EvidenceSyncActionTypes {
  const EvidenceSyncActionTypes._();

  static const workOrderPhoto = 'evidence.work_order_photo';
  static const workOrderSignature = 'evidence.work_order_signature';
  static const workOrderObservation = 'evidence.work_order_observation';
  static const fieldPhoto = 'evidence.field_photo';
  static const fieldSignature = 'evidence.field_signature';
  static const fieldObservation = 'evidence.field_observation';

  static const supported = {
    workOrderPhoto,
    workOrderSignature,
    workOrderObservation,
    fieldPhoto,
    fieldSignature,
    fieldObservation,
  };
}

class ExpenseBackendStatuses {
  const ExpenseBackendStatuses._();

  static const draft = 'draft';
  static const syncPending = 'sync_pending';
  static const readyToSubmit = 'ready_to_submit';
  static const submitted = 'submitted';
  static const underReview = 'under_review';
  static const returned = 'returned';
  static const approvedManager = 'approved_manager';
  static const approvedFinance = 'approved_finance';
  static const rejected = 'rejected';
  static const scheduledForPayment = 'scheduled_for_payment';
  static const paid = 'paid';
  static const cancelled = 'cancelled';
}
