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

/// B-SAN3-14 (P3) — a perna do guincho no atendimento, derivada das vistorias
/// CONFIRMADAS pelo servidor (a entrega local sem serverId não conta).
enum TowLeg {
  /// Sem entrega confirmada: o passo é o de hoje (2, depois 5).
  none,

  /// Coleta ainda não concluída.
  collection,

  /// Coleta concluída e entrega sem resposta ("Rota entrega").
  deliveryRoute,

  /// Entrega com resposta, até a OS ir para concluída ("Entrega").
  delivery,
}

/// Função pura das vistorias confirmadas: ver [TowLeg].
TowLeg deriveTowLeg({
  required bool deliveryConfirmed,
  required bool collectionComplete,
  required bool deliveryStarted,
}) {
  if (!deliveryConfirmed) return TowLeg.none;
  if (!collectionComplete) return TowLeg.collection;
  return deliveryStarted ? TowLeg.delivery : TowLeg.deliveryRoute;
}

/// Índice do passo ativo derivado do status da OS.
///
/// Mapeamento monotônico com a máquina de status. Guincho tem 6 passos;
/// Prestador (ou tipo indefinido), 4. No atendimento do guincho, [towLeg]
/// acende "Rota entrega" (3) e "Entrega" (4); o padrão mantém o de hoje.
int workOrderActiveStepIndex(
  WorkOrderServiceType? serviceType,
  WorkOrderStatus status, {
  TowLeg towLeg = TowLeg.none,
}) {
  final isTow = serviceType == WorkOrderServiceType.tow;
  if (isTow) {
    final base = _towStatusStepIndex(status);
    if (base != 2) return base;
    return switch (towLeg) {
      TowLeg.none || TowLeg.collection => 2,
      TowLeg.deliveryRoute => 3,
      TowLeg.delivery => 4,
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

// O passo do guincho só pelo status (o comportamento de antes do B-SAN3-14).
int _towStatusStepIndex(WorkOrderStatus status) => switch (status) {
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

/// Constrói a lista completa de passos com estado (done/active/todo).
///
/// Em status final (concluída/aprovada/cancelada) todos os passos ficam
/// marcados como concluídos.
List<WorkOrderStepInfo> buildWorkOrderSteps(
  WorkOrderServiceType? serviceType,
  WorkOrderStatus status, {
  TowLeg towLeg = TowLeg.none,
}) {
  final labels = workOrderStepLabels(serviceType);
  final active = workOrderActiveStepIndex(serviceType, status, towLeg: towLeg);
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
