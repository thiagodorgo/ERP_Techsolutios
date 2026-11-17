import 'package:flutter/material.dart';

import '../../../../core/network/connectivity_repository.dart';
import '../../../../core/sync/sync_models.dart';
import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_components.dart';
import '../../../../shared/ui/mobile_kit.dart';
import '../../domain/work_order_models.dart';

/// B-GUI-FID1 — o que as 3 aparências do detalhe da OS recebem prontas da tela
/// (`work_order_detail_screen.dart`), pela maquete aprovada
/// `os-detalhe-app-3opcoes.reference.html`.
///
/// As vistas SÓ desenham: a permissão, a ação principal e o que aparece chegam
/// decididos pela tela. Nada é inventado (F2): sem veículo, sem prazo ou sem
/// telefone, o cartão some; não há tipo do veículo, distância nem tempo (o
/// servidor não tem nenhum dos três).

/// O veículo atendido, como o B-GUI-D1 o entrega ao app: a placa SEM os 2
/// caracteres finais (os que o guincheiro digita na chegada), o modelo e a cor.
/// Hoje o app não recebe o veículo (a lista não o manda), e o cartão some.
class DetalheOsVeiculo {
  const DetalheOsVeiculo({required this.plateMasked, this.model, this.color});

  final String plateMasked;
  final String? model;
  final String? color;
}

/// A ação da barra fixa.
enum DetalheOsAcao {
  /// A iniciar: abre o check-in na execução, sem mudar a situação.
  iniciar,

  /// Em rota, no local, em atendimento ou pausada: abre a execução.
  continuar,

  /// OS que não muda mais: abre o histórico.
  verHistorico,

  /// Sem permissão de mudar a situação: só o "Mapa".
  nenhuma,
}

/// A vistoria da OS, pronta para a linha "Vistoria".
class DetalheOsVistoria {
  const DetalheOsVistoria({
    required this.title,
    this.statusLabel,
    required this.tone,
    required this.onOpen,
  });

  final String title;

  /// Nulo: a OS não tem vistoria vinculada (a linha abre a lista de vistorias).
  final String? statusLabel;
  final PillTone tone;
  final VoidCallback onOpen;
}

/// Tudo o que as aparências do detalhe desenham. A tela calcula uma vez.
class DetalheOsViewProps {
  const DetalheOsViewProps({
    required this.wo,
    required this.now,
    required this.onBack,
    required this.onMap,
    required this.acao,
    required this.historico,
    required this.localizacao,
    this.vehicle,
    this.slaDueAt,
    this.offline = false,
    this.pendingSync = false,
    this.stale = false,
    this.onRefresh,
    this.conflictPanel,
    this.onAcao,
    this.onUnableToStart,
    this.onServiceDoor,
    this.onApprovalRequest,
    this.vistoria,
    this.atribuicao,
  });

  final WorkOrder wo;

  /// O relógio da tela (o prazo restante); os testes fixam.
  final DateTime now;

  /// Chegam com o B-GUI-D1; hoje nulos, e os cartões somem.
  final DetalheOsVeiculo? vehicle;
  final DateTime? slaDueAt;

  // As faixas: sem sinal, alterações aguardando envio, dados desatualizados.
  final bool offline;
  final bool pendingSync;
  final bool stale;
  final VoidCallback? onRefresh;

  /// O cartão de conflito de hoje, com as 3 saídas (ou "Chegada não
  /// confirmada"), no alto do corpo, nas três aparências.
  final Widget? conflictPanel;

  final VoidCallback onBack;
  final VoidCallback onMap;
  final DetalheOsAcao acao;
  final VoidCallback? onAcao;

  /// "Não foi possível iniciar" (em rota, com permissão de mudar a situação).
  final VoidCallback? onUnableToStart;

  /// "Diagnóstico e peças" (OS de socorro em atendimento ou pausada).
  final VoidCallback? onServiceDoor;

  /// "Solicitar aprovação" (OS que ainda muda, com permissão de pedir).
  final VoidCallback? onApprovalRequest;

  final DetalheOsVistoria? vistoria;

  /// O histórico: nulo enquanto carrega.
  final List<WorkOrderTimelineEvent>? historico;

  /// As peças de hoje, prontas: a localização operacional e a atribuição de
  /// viatura e equipe (só para quem atribui).
  final Widget localizacao;
  final Widget? atribuicao;

  String? get phone {
    final p = wo.customerPhone?.trim();
    return p == null || p.isEmpty ? null : p;
  }
}

// ---------------------------------------------------------------------------
// Os textos (com acento) e os tons
// ---------------------------------------------------------------------------

/// A situação no selo do cabeçalho ("A iniciar" para agendada e despachada,
/// como no desenho aprovado).
String detalheOsSituacao(WorkOrderStatus s) => switch (s) {
  WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => 'A iniciar',
  WorkOrderStatus.enRoute => 'Em rota',
  WorkOrderStatus.arrived => 'No local',
  WorkOrderStatus.inService => 'Em atendimento',
  WorkOrderStatus.paused => 'Pausada',
  WorkOrderStatus.pendingApproval => 'Aguardando aprovação',
  WorkOrderStatus.completed => 'Concluída',
  WorkOrderStatus.approved => 'Aprovada',
  WorkOrderStatus.rejected => 'Rejeitada',
  WorkOrderStatus.exception => 'Exceção',
  WorkOrderStatus.cancelled => 'Cancelada',
};

PillTone detalheOsSituacaoTom(WorkOrderStatus s) => switch (s) {
  WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => PillTone.neutral,
  WorkOrderStatus.completed || WorkOrderStatus.approved => PillTone.done,
  WorkOrderStatus.rejected ||
  WorkOrderStatus.exception ||
  WorkOrderStatus.cancelled => PillTone.danger,
  _ => PillTone.warning,
};

String detalheOsPrioridade(WorkOrderPriority p) => switch (p) {
  WorkOrderPriority.low => 'Prioridade Baixa',
  WorkOrderPriority.normal => 'Prioridade Normal',
  WorkOrderPriority.high => 'Prioridade Alta',
  WorkOrderPriority.critical => 'Prioridade Crítica',
};

/// "Alta" e "Crítica" em vermelho, como no desenho aprovado.
PillTone detalheOsPrioridadeTom(WorkOrderPriority p) => switch (p) {
  WorkOrderPriority.low => PillTone.neutral,
  WorkOrderPriority.normal => PillTone.info,
  WorkOrderPriority.high || WorkOrderPriority.critical => PillTone.danger,
};

/// O selo do serviço: o tipo que o servidor manda e o título da OS.
String detalheOsServico(WorkOrder wo) {
  final tipo = switch (wo.serviceType) {
    WorkOrderServiceType.tow => 'Guincho',
    WorkOrderServiceType.provider => 'Socorro',
    null => null,
  };
  final titulo = wo.title.trim();
  if (tipo == null) return titulo;
  if (titulo.isEmpty) return tipo;
  return '$tipo · $titulo';
}

String _two(int n) => n.toString().padLeft(2, '0');

String detalheOsHora(DateTime at) {
  final l = at.toLocal();
  return '${_two(l.hour)}:${_two(l.minute)}';
}

String detalheOsDiaHora(DateTime at) {
  final l = at.toLocal();
  return '${_two(l.day)}/${_two(l.month)} · ${_two(l.hour)}:${_two(l.minute)}';
}

/// A janela de atendimento: o início marcado e, no mesmo dia, o prazo
/// ("13/06 · 10:00–12:00"). Sem horário marcado, nulo (a linha some).
String? detalheOsJanela(DateTime? inicio, DateTime? prazo) {
  if (inicio == null) return null;
  final base = detalheOsDiaHora(inicio);
  if (prazo == null) return base;
  final a = inicio.toLocal();
  final b = prazo.toLocal();
  final mesmoDia = a.year == b.year && a.month == b.month && a.day == b.day;
  return mesmoDia ? '$base–${detalheOsHora(prazo)}' : base;
}

/// "1h48", "52 min".
String detalheOsDuracao(Duration d) {
  final min = d.inMinutes.abs();
  if (min < 60) return '$min min';
  return '${min ~/ 60}h${_two(min % 60)}';
}

/// O prazo, pronto: o texto inteiro, o curto (blocos), a linha de baixo e o tom.
class DetalheOsPrazo {
  const DetalheOsPrazo({
    required this.texto,
    required this.curto,
    required this.sub,
    required this.tone,
    required this.usado,
    required this.vencido,
  });

  /// "Janela até 12:00 · 1h48 restante".
  final String texto;

  /// "1h48" / "Vencido" / "No prazo".
  final String curto;

  /// "restante" / "há 25 min" / "às 11:42".
  final String sub;
  final PillTone tone;

  /// De 0 a 1: quanto da janela já passou (a barra da B).
  final double usado;
  final bool vencido;
}

/// O prazo da OS, ou nulo sem `slaDueAt` (o cartão some).
DetalheOsPrazo? detalheOsPrazo(
  WorkOrder wo, {
  required DateTime? slaDueAt,
  required DateTime now,
}) {
  final prazo = slaDueAt;
  if (prazo == null) return null;
  final ate = 'Janela até ${detalheOsHora(prazo)}';
  final fim = wo.completedAt;
  if (wo.status.isFinal && fim != null) {
    final noPrazo = !fim.isAfter(prazo);
    return DetalheOsPrazo(
      texto: noPrazo
          ? 'Concluída às ${detalheOsHora(fim)}, dentro do prazo'
          : 'Concluída às ${detalheOsHora(fim)}, fora do prazo',
      curto: noPrazo ? 'No prazo' : 'Fora do prazo',
      sub: 'às ${detalheOsHora(fim)}',
      tone: noPrazo ? PillTone.done : PillTone.danger,
      usado: 1,
      vencido: !noPrazo,
    );
  }
  final resta = prazo.difference(now);
  final inicio = wo.scheduledAt;
  double usado = 0;
  if (inicio != null && prazo.isAfter(inicio)) {
    final total = prazo.difference(inicio).inSeconds;
    final passou = now.difference(inicio).inSeconds;
    usado = (passou / total).clamp(0, 1).toDouble();
  }
  if (resta.isNegative) {
    final ha = detalheOsDuracao(resta);
    return DetalheOsPrazo(
      texto: '$ate · vencida há $ha',
      curto: 'Vencido',
      sub: 'há $ha',
      tone: PillTone.danger,
      usado: 1,
      vencido: true,
    );
  }
  final dur = detalheOsDuracao(resta);
  final palavra = resta.inMinutes < 60 ? 'restantes' : 'restante';
  return DetalheOsPrazo(
    texto: '$ate · $dur $palavra',
    curto: dur,
    sub: palavra,
    tone: PillTone.warning,
    usado: usado,
    vencido: false,
  );
}

/// O rótulo de cada evento do histórico, com acento.
String detalheOsEvento(WorkOrderTimelineEventType t) => switch (t) {
  WorkOrderTimelineEventType.created => 'Criada',
  WorkOrderTimelineEventType.statusChanged => 'Situação alterada',
  WorkOrderTimelineEventType.assigned => 'Atribuída',
  WorkOrderTimelineEventType.arrivedOnSite => 'Chegada ao local',
  WorkOrderTimelineEventType.serviceStarted => 'Atendimento iniciado',
  WorkOrderTimelineEventType.paused => 'Pausada',
  WorkOrderTimelineEventType.resumed => 'Retomada',
  WorkOrderTimelineEventType.approvalRequested => 'Aprovação solicitada',
  WorkOrderTimelineEventType.approvalGranted => 'Aprovada',
  WorkOrderTimelineEventType.approvalDenied => 'Reprovada',
  WorkOrderTimelineEventType.completed => 'Concluída',
  WorkOrderTimelineEventType.cancelled => 'Cancelada',
  WorkOrderTimelineEventType.exceptionRaised => 'Exceção registrada',
  WorkOrderTimelineEventType.note => 'Observação',
};

/// A linha de apoio do histórico ("Atribuída · 09:05", "3 registros").
String detalheOsHistoricoResumo(List<WorkOrderTimelineEvent>? eventos) {
  if (eventos == null) return 'Carregando o histórico…';
  if (eventos.isEmpty) return 'Nenhum registro ainda';
  final ultimo = eventos.reduce(
    (a, b) => a.occurredAt.isAfter(b.occurredAt) ? a : b,
  );
  return '${detalheOsEvento(ultimo.eventType)} às ${detalheOsHora(ultimo.occurredAt)}';
}

/// As iniciais do contato ("IA" para "Indústria Alfa").
String detalheOsIniciais(String nome) {
  final partes = nome
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty)
      .toList();
  if (partes.isEmpty) return '?';
  final a = partes.first.substring(0, 1);
  final b = partes.length > 1 ? partes[1].substring(0, 1) : '';
  return '$a$b'.toUpperCase();
}

const kDetalheOsSemConexao =
    'Sem conexão. O que você fizer fica salvo no aparelho e é enviado quando '
    'o sinal voltar.';
const kDetalheOsPendente =
    'Esta OS tem alterações salvas no aparelho, aguardando envio.';
const kDetalheOsDesatualizada =
    'Não foi possível atualizar esta OS agora. Os dados podem estar '
    'desatualizados.';

// ---------------------------------------------------------------------------
// As peças comuns às três aparências
// ---------------------------------------------------------------------------

/// O cabeçalho: "Detalhe da OS", "Somente leitura" e o selo da situação.
class DetalheOsHeader extends StatelessWidget {
  const DetalheOsHeader({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  Widget build(BuildContext context) {
    final wo = props.wo;
    return MobileScreenHeader(
      key: const Key('detalhe-os-cabecalho'),
      title: 'Detalhe da OS',
      subtitle: 'Somente leitura',
      onBack: props.onBack,
      trailing: MobilePill(
        key: const Key('detalhe-os-situacao'),
        label: detalheOsSituacao(wo.status).toUpperCase(),
        tone: detalheOsSituacaoTom(wo.status),
      ),
    );
  }
}

/// A faixa "Sem conexão", logo abaixo do cabeçalho.
class DetalheOsSemConexao extends StatelessWidget {
  const DetalheOsSemConexao({super.key});

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
    child: NetworkStatusBanner(
      key: ValueKey('detalhe-os-sem-conexao'),
      status: NetworkStatus.offline,
      offlineMessage: kDetalheOsSemConexao,
    ),
  );
}

/// O bloco branco do topo: código, prioridade, o selo do serviço e o cliente.
class DetalheOsHero extends StatelessWidget {
  const DetalheOsHero({required this.props, this.extra, super.key});

  final DetalheOsViewProps props;

  /// Embaixo do cliente (as etapas da B).
  final Widget? extra;

  @override
  Widget build(BuildContext context) {
    final wo = props.wo;
    final doc = wo.customerDocument?.trim();
    final documento = doc == null || doc.isEmpty ? null : doc;
    return Container(
      key: const Key('detalhe-os-topo'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: ErpMobileTheme.cardBorder)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  wo.code,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                    color: ErpMobileTheme.primary,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              MobilePill(
                label: detalheOsPrioridade(wo.priority),
                tone: detalheOsPrioridadeTom(wo.priority),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            key: const Key('detalhe-os-servico'),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: MobilePill.colorsFor(PillTone.info).$1,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.build_outlined,
                  size: 15,
                  color: ErpMobileTheme.primaryDark,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    detalheOsServico(wo),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: ErpMobileTheme.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            wo.customerName,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Solicitante do atendimento',
            style: TextStyle(fontSize: 13, color: ErpMobileTheme.inkMuted),
          ),
          // O documento do cliente, quando a OS o tem (B-125).
          if (documento != null) ...[
            const SizedBox(height: 6),
            Row(
              key: const Key('detalhe-os-documento'),
              children: [
                const Text(
                  'Documento',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: ErpMobileTheme.inkMuted,
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    documento,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: ErpMobileTheme.ink,
                    ),
                  ),
                ),
              ],
            ),
          ],
          ?extra,
        ],
      ),
    );
  }
}

/// O título de seção do desenho ("Veículo", "Local e agendamento"…).
class DetalheOsSecao extends StatelessWidget {
  const DetalheOsSecao(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 18, 2, 10),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 14.5,
        fontWeight: FontWeight.w700,
        color: ErpMobileTheme.ink,
      ),
    ),
  );
}

BoxDecoration _cardDecoration() => BoxDecoration(
  color: Colors.white,
  borderRadius: BorderRadius.circular(14),
  border: Border.all(color: ErpMobileTheme.cardBorder),
);

/// As faixas do alto do corpo: o conflito, o aguardando envio e o
/// desatualizado. Iguais nas três aparências.
class DetalheOsAvisos extends StatelessWidget {
  const DetalheOsAvisos({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final conflito = p.conflictPanel;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (conflito != null) ...[conflito, const SizedBox(height: 8)],
        if (p.pendingSync) ...[
          const SyncStatusBanner(
            key: ValueKey('detalhe-os-pendente'),
            status: SyncStatus.pending,
            message: kDetalheOsPendente,
          ),
          const SizedBox(height: 8),
        ],
        if (p.stale) ...[
          StaleDataBanner(
            key: const ValueKey('detalhe-os-desatualizada'),
            message: kDetalheOsDesatualizada,
            onRefresh: p.offline ? null : p.onRefresh,
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

/// Um par rótulo/valor da grade do veículo.
class _Kv extends StatelessWidget {
  const _Kv(this.k, this.v, {this.mono = false, this.valueKey});

  final String k;
  final String v;
  final bool mono;
  final Key? valueKey;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        k.toUpperCase(),
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: ErpMobileTheme.inkFaint,
        ),
      ),
      const SizedBox(height: 2),
      Text(
        v,
        key: valueKey,
        style: TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w700,
          color: ErpMobileTheme.ink,
          letterSpacing: mono ? 1 : 0,
          fontFeatures: mono ? const [FontFeature.tabularFigures()] : null,
        ),
      ),
    ],
  );
}

/// A grade do veículo: placa (sem o fim), modelo e cor. Sem tipo (o servidor
/// não tem).
class DetalheOsVeiculoGrade extends StatelessWidget {
  const DetalheOsVeiculoGrade({required this.vehicle, super.key});

  final DetalheOsVeiculo vehicle;

  @override
  Widget build(BuildContext context) {
    final v = vehicle;
    final itens = <Widget>[
      _Kv(
        'Placa',
        v.plateMasked,
        mono: true,
        valueKey: const Key('detalhe-os-placa'),
      ),
      if (v.model != null) _Kv('Modelo', v.model!),
      if (v.color != null) _Kv('Cor', v.color!),
    ];
    return Wrap(
      spacing: 24,
      runSpacing: 10,
      children: [for (final i in itens) SizedBox(width: 118, child: i)],
    );
  }
}

/// O cartão "Veículo" (A e B).
class DetalheOsVeiculoCard extends StatelessWidget {
  const DetalheOsVeiculoCard({required this.vehicle, super.key});

  final DetalheOsVeiculo vehicle;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('detalhe-os-veiculo'),
    padding: const EdgeInsets.all(14),
    decoration: _cardDecoration(),
    child: Row(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: ErpMobileTheme.pageBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: ErpMobileTheme.cardBorder),
          ),
          child: const Icon(
            Icons.local_shipping_outlined,
            color: ErpMobileTheme.ink,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(child: DetalheOsVeiculoGrade(vehicle: vehicle)),
      ],
    ),
  );
}

class _LinhaIcone extends StatelessWidget {
  const _LinhaIcone({
    required this.icon,
    required this.bg,
    required this.fg,
    required this.label,
    required this.value,
    this.valueKey,
  });

  final IconData icon;
  final Color bg;
  final Color fg;
  final String label;
  final String value;
  final Key? valueKey;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    child: Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: fg),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                key: valueKey,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: ErpMobileTheme.ink,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// O cartão "Local e agendamento": o endereço e, com horário marcado, a
/// janela. Sem distância nem "Abrir rota" (o B-GUI-15 traz o botão).
class DetalheOsLocalCard extends StatelessWidget {
  const DetalheOsLocalCard({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  Widget build(BuildContext context) {
    final janela = detalheOsJanela(props.wo.scheduledAt, props.slaDueAt);
    return Container(
      key: const Key('detalhe-os-local'),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          _LinhaIcone(
            icon: Icons.location_on_outlined,
            bg: MobilePill.colorsFor(PillTone.info).$1,
            fg: ErpMobileTheme.primary,
            label: 'Endereço',
            value: props.wo.serviceAddress,
          ),
          if (janela != null) ...[
            const Divider(height: 1, color: ErpMobileTheme.cardBorder),
            _LinhaIcone(
              icon: Icons.schedule_outlined,
              bg: MobilePill.colorsFor(PillTone.warning).$1,
              fg: ErpMobileTheme.warning,
              label: 'Janela de atendimento',
              value: janela,
              valueKey: const Key('detalhe-os-janela'),
            ),
          ],
        ],
      ),
    );
  }
}

/// O cartão do prazo ("SLA · Janela até 12:00 · 1h48 restante"), com texto
/// escuro sobre o fundo claro do tom (AA).
class DetalheOsPrazoCard extends StatelessWidget {
  const DetalheOsPrazoCard({required this.prazo, super.key});

  final DetalheOsPrazo prazo;

  @override
  Widget build(BuildContext context) {
    final (bg, border, ink) = detalheOsPrazoCores(prazo.tone);
    return Container(
      key: const Key('detalhe-os-prazo'),
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Icon(Icons.schedule_outlined, color: ink),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SLA',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
                Text(
                  prazo.texto,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: ink,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// O fundo, a borda e a tinta do prazo por tom.
(Color, Color, Color) detalheOsPrazoCores(PillTone tone) => switch (tone) {
  PillTone.done => (
    MobilePill.colorsFor(PillTone.done).$1,
    const Color(0xFFA7F3D0),
    const Color(0xFF065F46),
  ),
  PillTone.danger => (
    MobilePill.colorsFor(PillTone.danger).$1,
    const Color(0xFFFECACA),
    ErpMobileTheme.dangerInk,
  ),
  _ => (
    const Color(0xFFFFF7ED),
    const Color(0xFFFED7AA),
    const Color(0xFF9A3412),
  ),
};

/// O cartão "Contato": o cliente e o telefone. Sem botão de ligar: o app ainda
/// não abre o discador (não nasce botão morto).
class DetalheOsContatoCard extends StatelessWidget {
  const DetalheOsContatoCard({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  Widget build(BuildContext context) {
    final wo = props.wo;
    return Container(
      key: const Key('detalhe-os-contato'),
      padding: const EdgeInsets.all(14),
      decoration: _cardDecoration(),
      child: Row(
        children: [
          CircleAvatar(
            radius: 21,
            backgroundColor: MobilePill.colorsFor(PillTone.info).$1,
            child: Text(
              detalheOsIniciais(wo.customerName),
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: ErpMobileTheme.primaryDark,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  wo.customerName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: ErpMobileTheme.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Telefone · ${props.phone}',
                  key: const Key('detalhe-os-telefone'),
                  style: const TextStyle(
                    fontSize: 13,
                    color: ErpMobileTheme.inkMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// O histórico, aberto numa linha.
class DetalheOsHistoricoLista extends StatelessWidget {
  const DetalheOsHistoricoLista({required this.eventos, super.key});

  final List<WorkOrderTimelineEvent>? eventos;

  @override
  Widget build(BuildContext context) {
    final lista = eventos;
    if (lista == null) {
      return const Padding(
        padding: EdgeInsets.all(14),
        child: LinearProgressIndicator(),
      );
    }
    if (lista.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(14),
        child: Text('Nenhum registro ainda.'),
      );
    }
    final ordenada = [...lista]
      ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: [
          for (final e in ordenada)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 82,
                    child: Text(
                      detalheOsDiaHora(e.occurredAt),
                      style: const TextStyle(
                        fontSize: 12,
                        color: ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      e.note == null
                          ? detalheOsEvento(e.eventType)
                          : '${detalheOsEvento(e.eventType)} · ${e.note}',
                      style: const TextStyle(fontSize: 13.5),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Uma linha que leva a outra tela (sem detalhe embaixo), da altura da linha
/// do kit.
class DetalheOsLinkRow extends StatelessWidget {
  const DetalheOsLinkRow({
    required this.icon,
    required this.title,
    required this.onTap,
    this.meta,
    super.key,
  });

  final IconData icon;
  final String title;
  final String? meta;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    child: InkWell(
      onTap: onTap,
      child: SizedBox(
        height: MobileExpandableRow.rowHeight,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 6, 0),
          child: Row(
            children: [
              Icon(icon, size: 20, color: ErpMobileTheme.inkMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  meta == null ? title : '$title · $meta',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: ErpMobileTheme.ink,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right,
                size: 20,
                color: ErpMobileTheme.inkFaint,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// "Mais desta OS" da A e da B: vistoria, histórico, localização operacional,
/// viatura e equipe (quem atribui) e o pedido de aprovação. Uma linha aberta
/// por vez.
class DetalheOsMais extends StatelessWidget {
  const DetalheOsMais({
    required this.props,
    required this.aberta,
    required this.onToggle,
    super.key,
  });

  final DetalheOsViewProps props;
  final String? aberta;
  final void Function(String id) onToggle;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final v = p.vistoria;
    final linhas = <Widget>[
      if (v != null)
        DetalheOsLinkRow(
          key: const Key('detalhe-os-vistoria'),
          icon: Icons.checklist_outlined,
          title: 'Vistoria',
          meta: v.statusLabel == null
              ? v.title
              : '${v.title} · ${v.statusLabel!.toLowerCase()}',
          onTap: v.onOpen,
        ),
      MobileExpandableRow(
        key: const Key('detalhe-os-linha-historico'),
        leading: const Icon(
          Icons.history,
          size: 20,
          color: ErpMobileTheme.inkMuted,
        ),
        title: 'Histórico',
        // O meta começa com " · ", como nas outras linhas do kit.
        meta: ' · ${detalheOsHistoricoResumo(p.historico)}',
        expanded: aberta == 'historico',
        onToggle: () => onToggle('historico'),
        detail: DetalheOsHistoricoLista(eventos: p.historico),
      ),
      MobileExpandableRow(
        key: const Key('detalhe-os-linha-localizacao'),
        leading: const Icon(
          Icons.my_location_outlined,
          size: 20,
          color: ErpMobileTheme.inkMuted,
        ),
        title: 'Localização operacional',
        expanded: aberta == 'localizacao',
        onToggle: () => onToggle('localizacao'),
        detail: Padding(padding: const EdgeInsets.all(8), child: p.localizacao),
      ),
      if (p.atribuicao != null)
        MobileExpandableRow(
          key: const Key('detalhe-os-linha-atribuicao'),
          leading: const Icon(
            Icons.groups_outlined,
            size: 20,
            color: ErpMobileTheme.inkMuted,
          ),
          title: 'Viatura e equipe',
          expanded: aberta == 'atribuicao',
          onToggle: () => onToggle('atribuicao'),
          detail: Padding(
            padding: const EdgeInsets.all(8),
            child: p.atribuicao,
          ),
        ),
      if (p.onApprovalRequest != null)
        DetalheOsLinkRow(
          key: const Key('detalhe-os-aprovacao'),
          icon: Icons.approval_outlined,
          title: 'Solicitar aprovação',
          onTap: p.onApprovalRequest!,
        ),
    ];
    return Container(
      key: const Key('detalhe-os-mais'),
      clipBehavior: Clip.antiAlias,
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < linhas.length; i++) ...[
            if (i > 0)
              const Divider(height: 1, color: ErpMobileTheme.cardBorder),
            linhas[i],
          ],
        ],
      ),
    );
  }
}

/// "Não foi possível iniciar", abaixo da lista (em rota).
class DetalheOsNaoFoiPossivel extends StatelessWidget {
  const DetalheOsNaoFoiPossivel({required this.onTap, super.key});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Center(
      child: TextButton.icon(
        key: const Key('checkin-block'),
        onPressed: onTap,
        style: TextButton.styleFrom(foregroundColor: ErpMobileTheme.danger),
        icon: const Icon(Icons.cancel_outlined),
        label: const Text('Não foi possível iniciar'),
      ),
    ),
  );
}

/// A barra fixa: "Mapa" e a ação da OS. [supportingText]: a frase da B.
class DetalheOsBarra extends StatelessWidget {
  const DetalheOsBarra({
    required this.props,
    this.supportingText,
    this.supportingTextColor,
    super.key,
  });

  final DetalheOsViewProps props;
  final String? supportingText;
  final Color? supportingTextColor;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final acao = switch (p.acao) {
      DetalheOsAcao.iniciar => FilledButton.icon(
        key: const Key('detalhe-os-iniciar'),
        onPressed: p.onAcao,
        icon: const Icon(Icons.navigation_outlined),
        label: const Text('Iniciar atendimento'),
      ),
      DetalheOsAcao.continuar => FilledButton.icon(
        key: const Key('checkin-continue'),
        onPressed: p.onAcao,
        icon: const Icon(Icons.play_arrow_outlined),
        label: const Text('Continuar atendimento'),
      ),
      DetalheOsAcao.verHistorico => OutlinedButton.icon(
        key: const Key('detalhe-os-ver-historico'),
        onPressed: p.onAcao,
        icon: const Icon(Icons.history),
        label: const Text('Ver histórico'),
      ),
      DetalheOsAcao.nenhuma => null,
    };
    final mapa = OutlinedButton.icon(
      key: const Key('work-order-map-action'),
      onPressed: p.onMap,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12),
      ),
      icon: const Icon(Icons.location_on_outlined),
      label: const Text('Mapa'),
    );
    return MobileStickyBar(
      key: const Key('detalhe-os-barra'),
      supportingText: supportingText,
      supportingTextColor: supportingTextColor,
      children: [
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  // A OS que não muda mais tem só "Ver histórico" (maquete, estado 4).
                  if (p.acao == DetalheOsAcao.verHistorico && acao != null)
                    Expanded(child: acao)
                  else if (acao == null)
                    Expanded(child: mapa)
                  else ...[
                    Expanded(flex: 3, child: mapa),
                    const SizedBox(width: 10),
                    Expanded(flex: 7, child: acao),
                  ],
                ],
              ),
              // "Diagnóstico e peças" do socorro, em contorno logo abaixo de "Continuar atendimento" (a opção A
              // aprovada de `prestador-atendimento-3opcoes.reference.html`).
              if (p.onServiceDoor != null) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  key: const Key('provider-service-door'),
                  onPressed: p.onServiceDoor,
                  icon: const Icon(Icons.build_outlined),
                  label: const Text('Diagnóstico e peças'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
