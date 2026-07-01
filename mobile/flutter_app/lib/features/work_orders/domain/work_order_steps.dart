import 'work_order_models.dart';

/// Estado visual de um passo do stepper de execução.
enum WorkOrderStepState { done, active, todo }

/// Um passo do stepper de execução (rótulo + posição + estado).
class WorkOrderStepInfo {
  const WorkOrderStepInfo({
    required this.index,
    required this.label,
    required this.state,
  });

  final int index;
  final String label;
  final WorkOrderStepState state;

  bool get isDone => state == WorkOrderStepState.done;
  bool get isActive => state == WorkOrderStepState.active;
  bool get isTodo => state == WorkOrderStepState.todo;
}

/// Rótulos do stepper por tipo de serviço.
///
/// - Guincho (6): Início · Rota coleta · Coleta · Rota entrega · Entrega · Conclusão
/// - Prestador (4): Início · Rota · Atendimento · Conclusão
///
/// `serviceType == null` é tratado como Prestador (fluxo de 4 passos).
List<String> workOrderStepLabels(WorkOrderServiceType? serviceType) {
  return serviceType == WorkOrderServiceType.tow
      ? const [
          'Inicio',
          'Rota coleta',
          'Coleta',
          'Rota entrega',
          'Entrega',
          'Conclusao',
        ]
      : const ['Inicio', 'Rota', 'Atendimento', 'Conclusao'];
}

/// Índice do passo ativo derivado do status da OS.
///
/// Mapeamento monotônico com a máquina de status. Guincho tem 6 passos;
/// Prestador (ou tipo indefinido), 4. As sub-fases de coleta/entrega do
/// guincho são refinadas nas PRs de checklist (1.7/1.8).
int workOrderActiveStepIndex(
  WorkOrderServiceType? serviceType,
  WorkOrderStatus status,
) {
  final isTow = serviceType == WorkOrderServiceType.tow;
  if (isTow) {
    return switch (status) {
      WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => 0,
      WorkOrderStatus.enRoute => 1,
      WorkOrderStatus.arrived ||
      WorkOrderStatus.inService ||
      WorkOrderStatus.paused ||
      WorkOrderStatus.exception ||
      WorkOrderStatus.rejected => 2,
      WorkOrderStatus.pendingApproval ||
      WorkOrderStatus.completed ||
      WorkOrderStatus.approved ||
      WorkOrderStatus.cancelled => 5,
    };
  }
  return switch (status) {
    WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => 0,
    WorkOrderStatus.enRoute => 1,
    WorkOrderStatus.arrived ||
    WorkOrderStatus.inService ||
    WorkOrderStatus.paused ||
    WorkOrderStatus.exception ||
    WorkOrderStatus.rejected => 2,
    WorkOrderStatus.pendingApproval ||
    WorkOrderStatus.completed ||
    WorkOrderStatus.approved ||
    WorkOrderStatus.cancelled => 3,
  };
}

/// Constrói a lista completa de passos com estado (done/active/todo).
///
/// Em status final (concluída/aprovada/cancelada) todos os passos ficam
/// marcados como concluídos.
List<WorkOrderStepInfo> buildWorkOrderSteps(
  WorkOrderServiceType? serviceType,
  WorkOrderStatus status,
) {
  final labels = workOrderStepLabels(serviceType);
  final active = workOrderActiveStepIndex(serviceType, status);
  final allDone = status.isFinal;
  return [
    for (var i = 0; i < labels.length; i++)
      WorkOrderStepInfo(
        index: i,
        label: labels[i],
        state: allDone || i < active
            ? WorkOrderStepState.done
            : i == active
            ? WorkOrderStepState.active
            : WorkOrderStepState.todo,
      ),
  ];
}
