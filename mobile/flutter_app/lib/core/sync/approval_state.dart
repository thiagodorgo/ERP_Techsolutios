enum MobileApprovalStatus { pendingApproval, approved, rejected }

class MobileApprovalState {
  const MobileApprovalState({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.safeMessage,
    this.reason,
  });

  final String id;
  final String entityType;
  final String entityId;
  final MobileApprovalStatus status;
  final String safeMessage;
  final String? reason;

  factory MobileApprovalState.fromBody(Object? body) {
    final outer = _asMap(body);
    final data = _asMap(outer['data'] ?? outer);
    return MobileApprovalState(
      id: _requiredString(data, 'id'),
      entityType: _requiredString(data, 'entity_type'),
      entityId: _requiredString(data, 'entity_id'),
      status: mobileApprovalStatusFromApi(_requiredString(data, 'status')),
      safeMessage:
          _optionalString(data['safe_message']) ??
          'A decisao operacional foi registrada.',
      reason: _optionalString(data['reason']),
    );
  }
}

class ApprovalDecisionPayload {
  const ApprovalDecisionPayload._(this._values);

  factory ApprovalDecisionPayload.approve({String? note}) {
    final normalized = _optionalString(note);
    return ApprovalDecisionPayload._({'note': ?normalized});
  }

  factory ApprovalDecisionPayload.reject({required String reason}) {
    final normalized = _optionalString(reason);
    if (normalized == null) {
      throw const FormatException('Approval rejection reason is required');
    }
    return ApprovalDecisionPayload._({'reason': normalized});
  }

  final Map<String, Object?> _values;

  Map<String, Object?> toJson() => Map.unmodifiable(_values);
}

MobileApprovalStatus mobileApprovalStatusFromApi(String value) {
  return switch (value.trim().toLowerCase()) {
    'pending_approval' => MobileApprovalStatus.pendingApproval,
    'approved' => MobileApprovalStatus.approved,
    'rejected' => MobileApprovalStatus.rejected,
    _ => throw const FormatException('Invalid approval status'),
  };
}

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

String _requiredString(Map<String, dynamic> source, String key) {
  final value = _optionalString(source[key]);
  if (value != null) return value;
  throw const FormatException('Invalid approval response');
}

String? _optionalString(Object? value) {
  return value is String && value.trim().isNotEmpty ? value.trim() : null;
}
