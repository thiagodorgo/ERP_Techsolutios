import 'package:flutter/material.dart';

import '../../../../shared/ui/mobile_kit.dart';

/// B-APP-APARENCIA (F2) — o que as aparências B e C da execução do guincho
/// recebem prontas da tela (`work_order_execute_screen.dart`).
///
/// As vistas SÓ desenham (Emenda 1, A4): a trava, a fase, a comparação, a
/// próxima ação e a lista do que falta chegam calculadas pela tela, a partir
/// do `_ExecData` (`deliveryGateOpen`, `canConclude`, `canCompare`, `towLeg`).
/// Nenhuma regra de vistoria mora aqui; as três aparências mostram o mesmo.

/// A fase do guincho que dá o título da opção B.
enum ExecucaoGuinchoFase {
  /// A coleta ainda não foi concluída.
  coleta,

  /// A coleta terminou e a entrega confirmada ainda não começou.
  rotaEntrega,

  /// A entrega confirmada está em andamento.
  entrega,

  /// Coleta e entrega concluídas.
  pronta,

  /// Sem entrega confirmada (OS antiga, aguardando despacho, sem sinal) ou
  /// fora do atendimento: o título de hoje.
  semFase,
}

/// Uma vistoria (coleta ou entrega), pronta para desenhar.
class ExecucaoGuinchoFaseView {
  const ExecucaoGuinchoFaseView({
    required this.label,
    required this.statusLabel,
    required this.statusTone,
    required this.nodeState,
    required this.marker,
    this.current = false,
    this.timelineMeta,
    this.cardValue,
    this.cardMeta,
    this.cardMetaEmphasis,
    this.progress,
    this.message,
    this.queuePill,
    this.actionLabel,
    this.shortActionLabel,
    this.actionIcon = Icons.checklist_outlined,
    this.onAction,
    this.nodeAction = false,
    this.nodeActionIcon,
  });

  /// "Coleta" ou "Entrega".
  final String label;

  /// A situação ("Concluída", "Em andamento", "Não iniciada", "Não
  /// verificada"…), no tom da pílula.
  final String statusLabel;
  final PillTone statusTone;

  /// O nó da linha do tempo (B) e a marca dele.
  final MobilePhaseState nodeState;
  final IconData marker;

  /// A fase de agora: o cartão da C ganha a borda azul.
  final bool current;

  /// A linha de apoio do nó da B ("Vistoria do Veículo · 7 de 12
  /// obrigatórios").
  final String? timelineMeta;

  /// O número grande da C ("7/12") e a linha de apoio ("Em andamento").
  final String? cardValue;
  final String? cardMeta;
  final String? cardMetaEmphasis;

  /// De 0 a 1, quando o modelo está no aparelho.
  final double? progress;

  /// A frase no lugar do número (a entrega que o servidor não confirmou).
  final String? message;

  /// "Na fila" ou "Salvo no aparelho".
  final (String, PillTone)? queuePill;

  /// A ação inteira ("Continuar vistoria de entrega", "Atualizar"), o texto
  /// curto do botão da C ("Continuar") e o ícone.
  final String? actionLabel;
  final String? shortActionLabel;
  final IconData actionIcon;

  /// Nulo desabilita a ação (por exemplo, "Atualizar" sem conexão).
  final VoidCallback? onAction;

  /// A ação aparece embaixo do nó da B (ver a vistoria concluída, abrir a
  /// entrega antes de concluir a coleta, atualizar). A ação da fase de agora
  /// fica na barra fixa.
  final bool nodeAction;

  /// O ícone da ação embaixo do nó da B: só "Atualizar" leva ícone; "Ver" e
  /// "Abrir" são links de texto (CV2-3).
  final IconData? nodeActionIcon;
}

/// O que a barra fixa da opção B oferece agora.
enum ExecucaoGuinchoAcao { abrirColeta, abrirEntrega, concluir }

/// A próxima ação da opção B: o que fazer, o porquê e se a OS está travada.
class ExecucaoGuinchoProximaAcao {
  const ExecucaoGuinchoProximaAcao({
    required this.kind,
    required this.supportingText,
    this.locked = false,
  });

  final ExecucaoGuinchoAcao kind;
  final String supportingText;
  final bool locked;
}

/// Uma mudança de situação ("Pausada", "Ag. aprovação", "Exceção"): o rótulo
/// do botão da C, o do menu "Mais ações" da B, o ícone, a cor e o toque.
class ExecucaoGuinchoTransicao {
  const ExecucaoGuinchoTransicao({
    required this.label,
    required this.menuLabel,
    required this.icon,
    required this.color,
    required this.onPressed,
    this.key,
  });

  final String label;
  final String menuLabel;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final Key? key;
}

/// O aviso no lugar das ações (OS em status final, ou sem transição).
class ExecucaoGuinchoAviso {
  const ExecucaoGuinchoAviso({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;
}

/// Tudo o que as aparências B e C desenham. A tela calcula uma vez.
class ExecucaoGuinchoViewProps {
  const ExecucaoGuinchoViewProps({
    required this.code,
    required this.workOrderTitle,
    required this.customerName,
    required this.serviceTypeLabel,
    required this.address,
    required this.statusLabel,
    required this.statusPillTone,
    required this.onBack,
    required this.stepper,
    required this.locationCard,
    required this.evidenceSection,
    required this.showVistorias,
    required this.fase,
    required this.collection,
    required this.delivery,
    required this.transitions,
    required this.requirements,
    required this.onConclude,
    this.vehiclePlate,
    this.teamName,
    this.showOfflineBanner = false,
    this.offlineMessage = '',
    this.showPendingBanner = false,
    this.pendingMessage = '',
    this.safeError,
    this.notice,
    this.showStaleBanner = false,
    this.staleMessage = '',
    this.onRefresh,
    this.canCompare = false,
    this.compareModelTitle,
    this.compareText = '',
    this.timelineCompareText = '',
    this.onCompare,
    this.lockTitle,
    this.lockMessage,
    this.canComplete = false,
    this.canConclude = false,
    this.busy = false,
    this.unverifiedNotice,
    this.queueNotice,
    this.deliveryQueueNotice,
    this.conclusionMeta = '',
    this.nextAction,
    this.onApprovalRequest,
  });

  // O cabeçalho.
  final String code;
  final String workOrderTitle;
  final String customerName;
  final String serviceTypeLabel;
  final String address;
  final String statusLabel;
  final PillTone statusPillTone;
  final VoidCallback onBack;

  /// A viatura e a equipe, quando a OS as tem. A OS do app não tem a placa nem
  /// o modelo do veículo atendido (`vehiclePlate` é a VIATURA).
  final String? vehiclePlate;
  final String? teamName;

  // As faixas.
  final bool showOfflineBanner;
  final String offlineMessage;
  final bool showPendingBanner;
  final String pendingMessage;
  final String? safeError;

  /// As peças de hoje, prontas: os passos, a localização e as evidências.
  final Widget stepper;
  final Widget locationCard;
  final Widget evidenceSection;

  /// O aviso no lugar das ações, quando a OS não muda mais.
  final ExecucaoGuinchoAviso? notice;

  /// A seção das vistorias (OS de guincho com checklist, com ações).
  final bool showVistorias;
  final ExecucaoGuinchoFase fase;
  final ExecucaoGuinchoFaseView collection;
  final ExecucaoGuinchoFaseView delivery;

  // Dados desatualizados (estado 10).
  final bool showStaleBanner;
  final String staleMessage;
  final VoidCallback? onRefresh;

  // A comparação.
  final bool canCompare;
  final String? compareModelTitle;

  /// O texto do cartão da C ("2 itens mudaram: …" ou "Fica completa…").
  final String compareText;

  /// O texto da linha da B.
  final String timelineCompareText;
  final VoidCallback? onCompare;

  // A trava e a conclusão.
  final String? lockTitle;
  final String? lockMessage;
  final bool canComplete;
  final bool canConclude;
  final bool busy;
  final VoidCallback onConclude;

  /// Os avisos de sem sinal (estados 5, 6 e 7).
  final String? unverifiedNotice;
  final String? queueNotice;
  final String? deliveryQueueNotice;

  /// A linha de apoio do nó "Conclusão da OS" quando liberada.
  final String conclusionMeta;

  /// A barra fixa da B; nula sem ação.
  final ExecucaoGuinchoProximaAcao? nextAction;

  /// "Para concluir a OS" da C.
  final List<MobileRequirement> requirements;

  final List<ExecucaoGuinchoTransicao> transitions;

  /// B-SAN3-16 — "Solicitar aprovação": o mesmo toque e a mesma condição do
  /// botão próprio da opção A (`work_orders:update` e a OS que pode pedir).
  /// Nulo: a ação não aparece.
  final VoidCallback? onApprovalRequest;
}

/// O título e o subtítulo da opção B, pela fase.
(String, String) execucaoGuinchoTituloB(ExecucaoGuinchoViewProps p) =>
    switch (p.fase) {
      ExecucaoGuinchoFase.coleta => (
        'Coleta',
        '${p.code} · vistoria no local da coleta',
      ),
      ExecucaoGuinchoFase.rotaEntrega => (
        'Rota de entrega',
        '${p.code} · leve o veículo à entrega',
      ),
      ExecucaoGuinchoFase.entrega => (
        'Entrega',
        '${p.code} · vistoria no local da entrega',
      ),
      ExecucaoGuinchoFase.pronta => (
        'Pronta para concluir',
        '${p.code} · coleta e entrega feitas',
      ),
      ExecucaoGuinchoFase.semFase => (
        'Atendimento',
        '${p.code} · ${p.customerName}',
      ),
    };
