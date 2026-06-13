import 'package:equatable/equatable.dart';

import '../../../core/sync/sync_models.dart';

enum WorkOrderStatus {
  scheduled,
  dispatched,
  enRoute,
  arrived,
  inService,
  paused,
  pendingApproval,
  completed,
  approved,
  rejected,
  exception,
  cancelled,
}

enum WorkOrderPriority { low, normal, high, critical }

extension WorkOrderStatusX on WorkOrderStatus {
  String get label => switch (this) {
    WorkOrderStatus.scheduled => 'Agendada',
    WorkOrderStatus.dispatched => 'Despachada',
    WorkOrderStatus.enRoute => 'Em rota',
    WorkOrderStatus.arrived => 'No local',
    WorkOrderStatus.inService => 'Em atendimento',
    WorkOrderStatus.paused => 'Pausada',
    WorkOrderStatus.pendingApproval => 'Ag. aprovacao',
    WorkOrderStatus.completed => 'Concluida',
    WorkOrderStatus.approved => 'Aprovada',
    WorkOrderStatus.rejected => 'Rejeitada',
    WorkOrderStatus.exception => 'Excecao',
    WorkOrderStatus.cancelled => 'Cancelada',
  };

  String get statusTone => switch (this) {
    WorkOrderStatus.scheduled => 'info',
    WorkOrderStatus.dispatched => 'info',
    WorkOrderStatus.enRoute => 'warning',
    WorkOrderStatus.arrived => 'warning',
    WorkOrderStatus.inService => 'warning',
    WorkOrderStatus.paused => 'warning',
    WorkOrderStatus.pendingApproval => 'warning',
    WorkOrderStatus.completed => 'success',
    WorkOrderStatus.approved => 'success',
    WorkOrderStatus.rejected => 'danger',
    WorkOrderStatus.exception => 'danger',
    WorkOrderStatus.cancelled => 'danger',
  };

  bool get isFinal =>
      this == WorkOrderStatus.completed ||
      this == WorkOrderStatus.approved ||
      this == WorkOrderStatus.cancelled;

  Set<WorkOrderStatus> get allowedTransitions => switch (this) {
    WorkOrderStatus.scheduled => {
      WorkOrderStatus.dispatched,
      WorkOrderStatus.cancelled,
    },
    WorkOrderStatus.dispatched => {
      WorkOrderStatus.enRoute,
      WorkOrderStatus.cancelled,
    },
    WorkOrderStatus.enRoute => {
      WorkOrderStatus.arrived,
      WorkOrderStatus.cancelled,
    },
    WorkOrderStatus.arrived => {
      WorkOrderStatus.inService,
      WorkOrderStatus.cancelled,
    },
    WorkOrderStatus.inService => {
      WorkOrderStatus.paused,
      WorkOrderStatus.completed,
      WorkOrderStatus.pendingApproval,
      WorkOrderStatus.exception,
    },
    WorkOrderStatus.paused => {
      WorkOrderStatus.inService,
      WorkOrderStatus.cancelled,
    },
    WorkOrderStatus.pendingApproval => {
      WorkOrderStatus.approved,
      WorkOrderStatus.rejected,
    },
    WorkOrderStatus.rejected => {WorkOrderStatus.inService},
    WorkOrderStatus.exception => {WorkOrderStatus.inService},
    WorkOrderStatus.completed ||
    WorkOrderStatus.approved ||
    WorkOrderStatus.cancelled => {},
  };

  bool canTransitionTo(WorkOrderStatus next) =>
      allowedTransitions.contains(next);
}

extension WorkOrderPriorityX on WorkOrderPriority {
  String get label => switch (this) {
    WorkOrderPriority.low => 'Baixa',
    WorkOrderPriority.normal => 'Normal',
    WorkOrderPriority.high => 'Alta',
    WorkOrderPriority.critical => 'Critica',
  };

  String get statusTone => switch (this) {
    WorkOrderPriority.low => 'info',
    WorkOrderPriority.normal => 'info',
    WorkOrderPriority.high => 'warning',
    WorkOrderPriority.critical => 'danger',
  };
}

class WorkOrder extends Equatable {
  const WorkOrder({
    required this.localId,
    required this.tenantId,
    required this.code,
    required this.title,
    required this.customerName,
    required this.serviceAddress,
    required this.status,
    required this.priority,
    required this.syncStatus,
    required this.createdAt,
    this.serverId,
    this.latitude,
    this.longitude,
    this.assignedUserId,
    this.scheduledAt,
    this.startedAt,
    this.arrivedAt,
    this.completedAt,
    this.checklistId,
    this.updatedAt,
  });

  final String localId;
  final String? serverId;
  final String tenantId;
  final String code;
  final String title;
  final String customerName;
  final String serviceAddress;
  final double? latitude;
  final double? longitude;
  final WorkOrderStatus status;
  final WorkOrderPriority priority;
  final String? assignedUserId;
  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? arrivedAt;
  final DateTime? completedAt;
  final String? checklistId;
  final SyncStatus syncStatus;
  final DateTime createdAt;
  final DateTime? updatedAt;

  WorkOrder copyWith({
    String? localId,
    String? serverId,
    String? tenantId,
    String? code,
    String? title,
    String? customerName,
    String? serviceAddress,
    double? latitude,
    double? longitude,
    WorkOrderStatus? status,
    WorkOrderPriority? priority,
    String? assignedUserId,
    DateTime? scheduledAt,
    DateTime? startedAt,
    DateTime? arrivedAt,
    DateTime? completedAt,
    String? checklistId,
    SyncStatus? syncStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool clearServerId = false,
    bool clearAssignedUserId = false,
  }) {
    return WorkOrder(
      localId: localId ?? this.localId,
      serverId: clearServerId ? null : (serverId ?? this.serverId),
      tenantId: tenantId ?? this.tenantId,
      code: code ?? this.code,
      title: title ?? this.title,
      customerName: customerName ?? this.customerName,
      serviceAddress: serviceAddress ?? this.serviceAddress,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      assignedUserId: clearAssignedUserId
          ? null
          : (assignedUserId ?? this.assignedUserId),
      scheduledAt: scheduledAt ?? this.scheduledAt,
      startedAt: startedAt ?? this.startedAt,
      arrivedAt: arrivedAt ?? this.arrivedAt,
      completedAt: completedAt ?? this.completedAt,
      checklistId: checklistId ?? this.checklistId,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
    localId,
    serverId,
    tenantId,
    code,
    title,
    customerName,
    serviceAddress,
    latitude,
    longitude,
    status,
    priority,
    assignedUserId,
    scheduledAt,
    startedAt,
    arrivedAt,
    completedAt,
    checklistId,
    syncStatus,
    createdAt,
    updatedAt,
  ];
}

enum WorkOrderTimelineEventType {
  created,
  statusChanged,
  assigned,
  arrivedOnSite,
  serviceStarted,
  paused,
  resumed,
  approvalRequested,
  approvalGranted,
  approvalDenied,
  completed,
  cancelled,
  exceptionRaised,
  note,
}

extension WorkOrderTimelineEventTypeX on WorkOrderTimelineEventType {
  String get label => switch (this) {
    WorkOrderTimelineEventType.created => 'Criada',
    WorkOrderTimelineEventType.statusChanged => 'Status alterado',
    WorkOrderTimelineEventType.assigned => 'Atribuida',
    WorkOrderTimelineEventType.arrivedOnSite => 'Chegada ao local',
    WorkOrderTimelineEventType.serviceStarted => 'Atendimento iniciado',
    WorkOrderTimelineEventType.paused => 'Pausada',
    WorkOrderTimelineEventType.resumed => 'Retomada',
    WorkOrderTimelineEventType.approvalRequested => 'Aprovacao solicitada',
    WorkOrderTimelineEventType.approvalGranted => 'Aprovado',
    WorkOrderTimelineEventType.approvalDenied => 'Reprovado',
    WorkOrderTimelineEventType.completed => 'Concluida',
    WorkOrderTimelineEventType.cancelled => 'Cancelada',
    WorkOrderTimelineEventType.exceptionRaised => 'Excecao registrada',
    WorkOrderTimelineEventType.note => 'Observacao',
  };
}

class WorkOrderTimelineEvent extends Equatable {
  const WorkOrderTimelineEvent({
    required this.localId,
    required this.workOrderLocalId,
    required this.tenantId,
    required this.eventType,
    required this.occurredAt,
    this.actorUserId,
    this.note,
    this.fromStatus,
    this.toStatus,
    this.syncStatus = SyncStatus.local,
  });

  final String localId;
  final String workOrderLocalId;
  final String tenantId;
  final WorkOrderTimelineEventType eventType;
  final DateTime occurredAt;
  final String? actorUserId;
  final String? note;
  final WorkOrderStatus? fromStatus;
  final WorkOrderStatus? toStatus;
  final SyncStatus syncStatus;

  @override
  List<Object?> get props => [
    localId,
    workOrderLocalId,
    tenantId,
    eventType,
    occurredAt,
    actorUserId,
    note,
    fromStatus,
    toStatus,
    syncStatus,
  ];
}

class WorkOrderAssignment extends Equatable {
  const WorkOrderAssignment({
    required this.workOrderLocalId,
    required this.userId,
    required this.assignedAt,
    this.note,
  });

  final String workOrderLocalId;
  final String userId;
  final DateTime assignedAt;
  final String? note;

  @override
  List<Object?> get props => [workOrderLocalId, userId, assignedAt, note];
}

class WorkOrderApprovalRequest extends Equatable {
  const WorkOrderApprovalRequest({
    required this.workOrderLocalId,
    required this.tenantId,
    required this.reason,
    required this.impact,
    required this.urgency,
    required this.requestedAt,
    this.requestedByUserId,
  });

  final String workOrderLocalId;
  final String tenantId;
  final String reason;
  final String impact;
  final String urgency;
  final DateTime requestedAt;
  final String? requestedByUserId;

  @override
  List<Object?> get props => [
    workOrderLocalId,
    tenantId,
    reason,
    impact,
    urgency,
    requestedAt,
    requestedByUserId,
  ];
}

class WorkOrderEvidence {
  const WorkOrderEvidence({
    required this.localId,
    required this.workOrderLocalId,
    required this.tenantId,
    required this.fileName,
    required this.mimeType,
    required this.sizeBytes,
    required this.captureSource,
    required this.syncStatus,
    required this.createdAt,
    this.checksum,
  });

  final String localId;
  final String workOrderLocalId;
  final String tenantId;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final String captureSource; // 'camera' | 'gallery'
  final String? checksum;
  final SyncStatus syncStatus;
  final DateTime createdAt;
}
