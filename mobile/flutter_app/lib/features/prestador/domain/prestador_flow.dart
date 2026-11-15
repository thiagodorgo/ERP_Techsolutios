import '../../work_orders/domain/work_order_models.dart';

/// B-SAN3-15b (P8) — os predicados do fluxo do prestador, usados pelo detalhe da OS e pela tela Atendimento. O tipo
/// vem do servidor (`serviceKind`, P7); tipo nulo (servidor antigo, `unknown`) não é prestador: fail-closed.

/// A OS segue o fluxo do prestador: conclui pela tela de conclusão (um caminho só, para o diagnóstico viajar).
bool isProviderFlow(WorkOrder wo) =>
    wo.serviceType == WorkOrderServiceType.provider;

/// A ação "Diagnóstico e peças" do detalhe: só na OS de prestador em atendimento ou pausada.
bool showsProviderServiceDoor(WorkOrder wo) {
  if (wo.serviceType != WorkOrderServiceType.provider) return false;
  return wo.status == WorkOrderStatus.inService ||
      wo.status == WorkOrderStatus.paused;
}
