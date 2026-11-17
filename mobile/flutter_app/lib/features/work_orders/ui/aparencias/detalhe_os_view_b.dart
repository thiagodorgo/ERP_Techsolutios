import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import '../../domain/work_order_models.dart';
import 'detalhe_os_shared.dart';
import 'detalhe_os_view_a.dart' show detalheOsComAcao;

/// B-GUI-FID1 — o detalhe da OS na opção B, "Prazo e etapas à vista"
/// (`os-detalhe-app-3opcoes.reference.html`, `telaB`): a opção A com o prazo
/// preso embaixo do cabeçalho (com a barra de quanto da janela já passou), as
/// 5 etapas da OS no bloco branco e a barra fixa dizendo o próximo passo.
///
/// Só desenha: tudo chega pronto em [props].
class DetalheOsViewB extends StatefulWidget {
  const DetalheOsViewB({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  State<DetalheOsViewB> createState() => _DetalheOsViewBState();
}

class _DetalheOsViewBState extends State<DetalheOsViewB> {
  String? _aberta;

  void _toggle(String id) =>
      setState(() => _aberta = _aberta == id ? null : id);

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final prazo = detalheOsPrazo(p.wo, slaDueAt: p.slaDueAt, now: p.now);
    final vehicle = p.vehicle;
    final (apoio, alerta) = detalheOsProximoPasso(p, prazo);
    final barra = p.acao == DetalheOsAcao.verHistorico
        ? detalheOsComAcao(p, () => _toggle('historico'))
        : p;
    return ErpScaffold(
      key: const Key('aparencia-detalhe-os-B'),
      showAppBar: false,
      body: Column(
        children: [
          DetalheOsHeader(props: p),
          if (p.offline) const DetalheOsSemConexao(),
          if (prazo != null) _FaixaPrazo(prazo: prazo, slaDueAt: p.slaDueAt!),
          Expanded(
            child: ListView(
              key: const Key('detalhe-os-lista'),
              padding: EdgeInsets.zero,
              children: [
                DetalheOsHero(
                  props: p,
                  extra: _Etapas(status: p.wo.status),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      DetalheOsAvisos(props: p),
                      if (vehicle != null) ...[
                        const DetalheOsSecao('Veículo'),
                        DetalheOsVeiculoCard(vehicle: vehicle),
                      ],
                      const DetalheOsSecao('Local e agendamento'),
                      DetalheOsLocalCard(props: p),
                      if (p.phone != null) ...[
                        const DetalheOsSecao('Contato'),
                        DetalheOsContatoCard(props: p),
                      ],
                      const DetalheOsSecao('Mais desta OS'),
                      DetalheOsMais(
                        props: p,
                        aberta: _aberta,
                        onToggle: _toggle,
                      ),
                      if (p.onUnableToStart != null)
                        DetalheOsNaoFoiPossivel(onTap: p.onUnableToStart!),
                    ],
                  ),
                ),
              ],
            ),
          ),
          DetalheOsBarra(
            props: barra,
            supportingText: apoio,
            supportingTextColor: alerta ? ErpMobileTheme.dangerInk : null,
          ),
        ],
      ),
    );
  }
}

/// A frase da barra da B ("Próximo passo: …") e se ela é alerta.
(String, bool) detalheOsProximoPasso(
  DetalheOsViewProps p,
  DetalheOsPrazo? prazo,
) {
  final s = p.wo.status;
  if (s.isFinal) return ('OS encerrada. Nenhuma ação disponível.', false);
  if (p.offline) {
    return (
      'Sem sinal: o que você fizer fica no aparelho e é enviado depois.',
      false,
    );
  }
  if (prazo != null && prazo.vencido) {
    return ('O prazo venceu. Avise a central e siga para o local.', true);
  }
  return switch (s) {
    WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => (
      'Próximo passo: iniciar a rota até o local.',
      false,
    ),
    WorkOrderStatus.enRoute => (
      'Próximo passo: confirmar a chegada com a placa.',
      false,
    ),
    WorkOrderStatus.arrived => ('Próximo passo: iniciar o atendimento.', false),
    _ => ('Próximo passo: continuar o atendimento.', false),
  };
}

/// A faixa de prazo presa no topo, com a barra de quanto da janela passou.
class _FaixaPrazo extends StatelessWidget {
  const _FaixaPrazo({required this.prazo, required this.slaDueAt});

  final DetalheOsPrazo prazo;
  final DateTime slaDueAt;

  @override
  Widget build(BuildContext context) {
    final (bg, border, ink) = detalheOsPrazoCores(prazo.tone);
    final fim = prazo.vencido
        ? 'vencido ${prazo.sub}'
        : prazo.tone == PillTone.warning
        ? 'faltam ${prazo.curto}'
        : prazo.curto;
    return Container(
      key: const Key('detalhe-os-faixa-prazo'),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
        color: bg,
        border: Border(bottom: BorderSide(color: border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.schedule_outlined, size: 18, color: ink),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Prazo ${detalheOsHora(slaDueAt)}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: ink,
                  ),
                ),
              ),
              Text(
                fim,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            label: 'Janela de atendimento usada',
            child: ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: prazo.usado,
                minHeight: 4,
                color: ink,
                backgroundColor: border,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// As 5 etapas da OS (agendada → concluída), com o passo feito em verde.
class _Etapas extends StatelessWidget {
  const _Etapas({required this.status});

  final WorkOrderStatus status;

  static const _labels = [
    'Agendada',
    'Em rota',
    'No local',
    'Em atendimento',
    'Concluída',
  ];

  int get _atual => switch (status) {
    WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => 0,
    WorkOrderStatus.enRoute => 1,
    WorkOrderStatus.arrived => 2,
    WorkOrderStatus.inService ||
    WorkOrderStatus.paused ||
    WorkOrderStatus.pendingApproval ||
    WorkOrderStatus.rejected ||
    WorkOrderStatus.exception => 3,
    _ => 5,
  };

  @override
  Widget build(BuildContext context) {
    final atual = _atual;
    return Padding(
      key: const Key('detalhe-os-etapas'),
      padding: const EdgeInsets.only(top: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < _labels.length; i++)
            Expanded(
              child: Semantics(
                label:
                    'Etapa ${i + 1}, ${_labels[i]}, '
                    '${i < atual
                        ? 'concluída'
                        : i == atual
                        ? 'atual'
                        : 'a fazer'}',
                child: Column(
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i < atual
                            ? ErpMobileTheme.success
                            : i == atual
                            ? ErpMobileTheme.primary
                            : ErpMobileTheme.cardBorder,
                      ),
                      child: i < atual
                          ? const Icon(
                              Icons.check,
                              size: 15,
                              color: Colors.white,
                            )
                          : Text(
                              '${i + 1}',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                color: i == atual
                                    ? Colors.white
                                    : ErpMobileTheme.inkMuted,
                              ),
                            ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _labels[i],
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: i == atual
                            ? FontWeight.w800
                            : FontWeight.w600,
                        color: i <= atual
                            ? ErpMobileTheme.primary
                            : ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
