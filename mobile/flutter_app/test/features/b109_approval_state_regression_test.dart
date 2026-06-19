import 'dart:convert';

import 'package:erp_techsolutions_mobile/core/sync/approval_state.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('B-109 approval state regression', () {
    test('parsing pending_approval preserva estado', () {
      final state = MobileApprovalState.fromBody(
        _response(status: 'pending_approval', message: 'Aprovacao pendente.'),
      );

      expect(state.status, MobileApprovalStatus.pendingApproval);
      expect(
        workOrderStatusFromApiValue('pending_approval'),
        WorkOrderStatus.pendingApproval,
      );
    });

    test('parsing approved preserva mensagem segura', () {
      final state = MobileApprovalState.fromBody(
        _response(status: 'approved', message: 'Aprovacao registrada.'),
      );

      expect(state.status, MobileApprovalStatus.approved);
      expect(state.safeMessage, 'Aprovacao registrada.');
      expect(workOrderStatusFromApiValue('approved'), WorkOrderStatus.approved);
    });

    test('parsing rejected preserva motivo e mensagem segura', () {
      final state = MobileApprovalState.fromBody(
        _response(
          status: 'rejected',
          message: 'Reprovacao registrada.',
          reason: 'Foto obrigatoria ausente.',
        ),
      );

      expect(state.status, MobileApprovalStatus.rejected);
      expect(state.safeMessage, 'Reprovacao registrada.');
      expect(state.reason, 'Foto obrigatoria ausente.');
      expect(workOrderStatusFromApiValue('rejected'), WorkOrderStatus.rejected);
    });

    test('payload de decisao usa allowlist sem tenant/token/path/binario', () {
      final payloads = [
        ApprovalDecisionPayload.approve(
          note: 'Conferido com evidencias.',
        ).toJson(),
        ApprovalDecisionPayload.reject(
          reason: 'Foto obrigatoria ausente.',
        ).toJson(),
      ];

      for (final payload in payloads) {
        final serialized = jsonEncode(payload);
        for (final forbidden in [
          'tenant_id',
          'tenantId',
          'Authorization',
          'Bearer',
          'accessToken',
          'refreshToken',
          'base64',
          'file_data',
          'local_path',
          '"path"',
        ]) {
          expect(serialized, isNot(contains(forbidden)));
        }
      }
    });

    test('reject sem motivo falha localmente', () {
      expect(
        () => ApprovalDecisionPayload.reject(reason: '   '),
        throwsFormatException,
      );
    });
  });
}

Map<String, Object?> _response({
  required String status,
  required String message,
  String? reason,
}) {
  return {
    'data': {
      'id': 'approval_0123456789abcdef',
      'entity_type': 'evidence',
      'entity_id': 'evidence-safe-reference',
      'status': status,
      'safe_message': message,
      'reason': ?reason,
    },
  };
}
