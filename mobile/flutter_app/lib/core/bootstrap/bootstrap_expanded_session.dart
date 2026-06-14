import 'package:equatable/equatable.dart';

/// Status as reported by the backend for a feature, catalog, or endpoint.
enum CapabilityStatus {
  implemented,
  partial,
  planned,
  unavailable;

  factory CapabilityStatus.fromString(String s) => switch (s) {
    'implemented' => CapabilityStatus.implemented,
    'partial' => CapabilityStatus.partial,
    'planned' => CapabilityStatus.planned,
    _ => CapabilityStatus.unavailable,
  };

  bool get isAvailable =>
      this == CapabilityStatus.implemented || this == CapabilityStatus.partial;
}

/// A feature flag entry from the bootstrap's `feature_flags` block.
class FeatureFlag extends Equatable {
  const FeatureFlag({
    required this.enabled,
    required this.status,
    this.reason,
  });

  final bool enabled;
  final CapabilityStatus status;
  final String? reason;

  @override
  List<Object?> get props => [enabled, status, reason];
}

/// Sync policy from the expanded `mobile_policy.sync` block.
class SyncPolicy extends Equatable {
  const SyncPolicy({
    required this.actionsEnabled,
    required this.maxBatchSize,
    required this.implementedDomains,
    required this.plannedDomains,
  });

  final bool actionsEnabled;
  final int maxBatchSize;
  final List<String> implementedDomains;
  final List<String> plannedDomains;

  static const defaultPolicy = SyncPolicy(
    actionsEnabled: false,
    maxBatchSize: 50,
    implementedDomains: ['expenses'],
    plannedDomains: ['work_orders', 'checklists', 'inventory'],
  );

  @override
  List<Object?> get props => [
    actionsEnabled,
    maxBatchSize,
    implementedDomains,
    plannedDomains,
  ];
}

/// Evidence capabilities from the expanded `mobile_policy.evidence` block.
class EvidencePolicy extends Equatable {
  const EvidencePolicy({
    required this.checklistAttachments,
    required this.workOrderEvidence,
    required this.genericUpload,
    required this.maxUploadMb,
  });

  final CapabilityStatus checklistAttachments;
  final CapabilityStatus workOrderEvidence;
  final CapabilityStatus genericUpload;
  final int maxUploadMb;

  static const defaultPolicy = EvidencePolicy(
    checklistAttachments: CapabilityStatus.implemented,
    workOrderEvidence: CapabilityStatus.planned,
    genericUpload: CapabilityStatus.planned,
    maxUploadMb: 10,
  );

  @override
  List<Object?> get props => [
    checklistAttachments,
    workOrderEvidence,
    genericUpload,
    maxUploadMb,
  ];
}

/// Combined expanded mobile policy, parsed from the `mobile_policy` block.
class ExpandedMobilePolicy extends Equatable {
  const ExpandedMobilePolicy({required this.sync, required this.evidence});

  final SyncPolicy sync;
  final EvidencePolicy evidence;

  static const defaultPolicy = ExpandedMobilePolicy(
    sync: SyncPolicy.defaultPolicy,
    evidence: EvidencePolicy.defaultPolicy,
  );

  @override
  List<Object?> get props => [sync, evidence];
}

/// Metadata from the `contract` block of the expanded bootstrap response.
class BootstrapContractMeta extends Equatable {
  const BootstrapContractMeta({
    required this.version,
    required this.schemaVersion,
    required this.status,
  });

  final String version;
  final int schemaVersion;
  final String status; // "minimal" | "expanded"

  bool get isExpanded => status == 'expanded';

  @override
  List<Object?> get props => [version, schemaVersion, status];
}

/// Sync cursors from the `sync` block — used by B-099+ for incremental pulls.
class SyncCursors extends Equatable {
  const SyncCursors({
    this.workOrdersCursor,
    this.checklistsCursor,
    this.expensesCursor,
    this.inventoryCursor,
  });

  final String? workOrdersCursor;
  final String? checklistsCursor;
  final String? expensesCursor;
  final String? inventoryCursor;

  static const empty = SyncCursors();

  bool get hasAnyCursor =>
      workOrdersCursor != null ||
      checklistsCursor != null ||
      expensesCursor != null ||
      inventoryCursor != null;

  @override
  List<Object?> get props => [
    workOrdersCursor,
    checklistsCursor,
    expensesCursor,
    inventoryCursor,
  ];
}
