import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

/// "O que o console fala, o app tem que entender."
///
/// O backend (`WORK_ORDER_STATUSES` / `WORK_ORDER_PRIORITIES` em
/// `src/modules/work-orders/work-order.types.ts`) e o enum do app usam
/// vocabulários DIFERENTES para os mesmos estados. Enquanto o parser comparava
/// só `enum.name`, toda ordem ativa caía no `orElse` e o guincheiro via
/// "Agendada"/"Normal" onde o console mostrava "Em rota"/"Urgente".
///
/// Valores medidos na API real do tenant de demonstração em 2026-08-23.
void main() {
  group('status do backend → enum do app', () {
    const casos = <String, WorkOrderStatus>{
      'open': WorkOrderStatus.scheduled,
      'assigned': WorkOrderStatus.dispatched,
      'accepted': WorkOrderStatus.dispatched,
      'on_route': WorkOrderStatus.enRoute,
      'on_site': WorkOrderStatus.arrived,
      'in_progress': WorkOrderStatus.inService,
      'paused': WorkOrderStatus.paused,
      'completed': WorkOrderStatus.completed,
      'cancelled': WorkOrderStatus.cancelled,
      'rejected': WorkOrderStatus.rejected,
      'pending_approval': WorkOrderStatus.pendingApproval,
    };

    casos.forEach((doBackend, esperado) {
      test('$doBackend → ${esperado.name}', () {
        expect(workOrderStatusFromApiValue(doBackend), esperado);
      });
    });

    test('cache local que gravou o próprio enum.name continua sendo lido', () {
      for (final status in WorkOrderStatus.values) {
        expect(workOrderStatusFromApiValue(status.name), status);
      }
    });

    test('valor desconhecido não derruba a tela — cai em Agendada', () {
      expect(
        workOrderStatusFromApiValue('inventado'),
        WorkOrderStatus.scheduled,
      );
      expect(workOrderStatusFromApiValue(null), WorkOrderStatus.scheduled);
    });
  });

  group('prioridade do backend → enum do app', () {
    const casos = <String, WorkOrderPriority>{
      'low': WorkOrderPriority.low,
      'medium': WorkOrderPriority.normal,
      'high': WorkOrderPriority.high,
      'urgent': WorkOrderPriority.critical,
    };

    casos.forEach((doBackend, esperado) {
      test('$doBackend → ${esperado.name}', () {
        expect(workOrderPriorityFromApiValue(doBackend), esperado);
      });
    });

    test('cache local que gravou o próprio enum.name continua sendo lido', () {
      for (final priority in WorkOrderPriority.values) {
        expect(workOrderPriorityFromApiValue(priority.name), priority);
      }
    });

    test('valor desconhecido cai em Normal', () {
      expect(
        workOrderPriorityFromApiValue('inventada'),
        WorkOrderPriority.normal,
      );
      expect(workOrderPriorityFromApiValue(null), WorkOrderPriority.normal);
    });
  });
}
