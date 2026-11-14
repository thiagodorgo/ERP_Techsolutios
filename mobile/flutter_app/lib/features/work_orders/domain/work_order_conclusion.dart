import '../../checklists/domain/checklist_models.dart';
import 'work_order_models.dart';

/// B-SAN3-15b (P10, decisão 1.C) — a vistoria obrigatória da OS está concluída: há uma execução de COLETA concluída.
/// É a MESMA regra da tela Atendimento (`_ExecData.isCollectionComplete` chama esta função): uma regra só para as
/// duas telas.
bool isCollectionChecklistComplete(Iterable<MobileChecklistRun> runs) =>
    runs.any(
      (r) =>
          r.kind == MobileChecklistRunKind.collection &&
          r.status == MobileChecklistRunStatus.completed,
    );

/// Estados de sincronização de evidência (LGPD/offline) — CLAUDE.md §6.
enum EvidenceSyncState {
  pendingLocal,
  accepted,
  stored,
  rejected,
  scanFailed,
  pendingReview,
  networkError,
  timeout;

  static EvidenceSyncState fromCode(String code) => switch (code) {
    'accepted' => EvidenceSyncState.accepted,
    'stored' => EvidenceSyncState.stored,
    'rejected' => EvidenceSyncState.rejected,
    'scan_failed' => EvidenceSyncState.scanFailed,
    'pending_review' => EvidenceSyncState.pendingReview,
    'network_error' => EvidenceSyncState.networkError,
    'timeout' => EvidenceSyncState.timeout,
    _ => EvidenceSyncState.pendingLocal,
  };

  String get label => switch (this) {
    EvidenceSyncState.pendingLocal => 'Salvo no aparelho',
    EvidenceSyncState.accepted => 'Aceito',
    EvidenceSyncState.stored => 'Armazenado',
    EvidenceSyncState.rejected => 'Recusado',
    EvidenceSyncState.scanFailed => 'Falha na leitura',
    EvidenceSyncState.pendingReview => 'Em revisao',
    EvidenceSyncState.networkError => 'Erro de rede',
    EvidenceSyncState.timeout => 'Tempo esgotado',
  };

  /// Tom visual reutilizando a convenção do design system.
  String get tone => switch (this) {
    EvidenceSyncState.stored || EvidenceSyncState.accepted => 'success',
    EvidenceSyncState.rejected ||
    EvidenceSyncState.scanFailed ||
    EvidenceSyncState.networkError => 'danger',
    EvidenceSyncState.timeout || EvidenceSyncState.pendingReview => 'warning',
    EvidenceSyncState.pendingLocal => 'info',
  };

  bool get isTerminalOk =>
      this == EvidenceSyncState.stored || this == EvidenceSyncState.accepted;
}

/// Calcula a comissão em centavos a partir de um valor-base e um percentual.
/// Função pura (arredonda para o centavo mais próximo, nunca negativa).
/// B-SAN3-15b (P10) — sem uso na conclusão: o app não tem a comissão do atendimento (Pergunta 3 (a)).
int computeCommissionCents({
  required int baseValueCents,
  required double ratePercent,
}) {
  if (baseValueCents <= 0 || ratePercent <= 0) return 0;
  return (baseValueCents * ratePercent / 100).round();
}

/// Formata centavos como moeda BRL (ex.: 142000 -> "R$ 1.420,00").
String formatBrlCents(int cents) {
  final negative = cents < 0;
  final abs = cents.abs();
  final reais = abs ~/ 100;
  final centavos = (abs % 100).toString().padLeft(2, '0');
  final reaisStr = reais.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+$)'),
    (m) => '${m[1]}.',
  );
  return '${negative ? '-' : ''}R\$ $reaisStr,$centavos';
}

/// Resumo do atendimento para a tela de conclusão.
/// B-SAN3-15b (P10) — sem comissão (Pergunta 3 (a)); a linha do bem atendido só no guincho (decisão 1.D): na OS de
/// prestador, [assetLabel] e [assetValue] são nulos e a tela não desenha a linha.
class WorkOrderConclusionSummary {
  const WorkOrderConclusionSummary({
    required this.service,
    required this.customer,
    required this.assetLabel,
    required this.assetValue,
    required this.materialsCount,
    required this.elapsed,
  });

  final String service;
  final String customer;
  final String? assetLabel;
  final String? assetValue;
  final int materialsCount;
  final Duration? elapsed;

  String get elapsedLabel {
    final e = elapsed;
    if (e == null) return '—';
    final h = e.inHours;
    final m = e.inMinutes % 60;
    return h > 0 ? '${h}h ${m}min' : '${m}min';
  }

  static WorkOrderConclusionSummary fromWorkOrder(
    WorkOrder wo, {
    int materialsCount = 0,
  }) {
    final isTow = wo.serviceType == WorkOrderServiceType.tow;
    final start = wo.startedAt ?? wo.arrivedAt;
    final end = wo.completedAt;
    final elapsed = (start != null && end != null && end.isAfter(start))
        ? end.difference(start)
        : null;
    return WorkOrderConclusionSummary(
      service: wo.title,
      customer: wo.customerName,
      assetLabel: isTow ? 'Veiculo' : null,
      assetValue: isTow ? wo.code : null,
      materialsCount: materialsCount,
      elapsed: elapsed,
    );
  }
}
