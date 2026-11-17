import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import '../../domain/work_order_models.dart';
import 'checkin_chegada_shared.dart';
import 'detalhe_os_shared.dart';

/// B-GUI-FID1 — o check-in na opção B, "Por fases"
/// (`checkin-app-3opcoes.reference.html`, `telaB`; o mesmo padrão da opção B
/// da execução do guincho): uma ação por vez, a linha do tempo da chegada
/// (iniciar rota → ir até o local → confirmar com a placa → iniciar
/// atendimento), e a barra fixa com a frase do porquê. "Não foi possível
/// iniciar" fica em "Mais ações".
///
/// A placa é confirmada no diálogo de hoje: a folha da maquete pede a placa
/// sem o fim, que chega com o B-GUI-D1.
class CheckinChegadaViewB extends StatelessWidget {
  const CheckinChegadaViewB({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final (title, subtitle) = checkinTitulo(p);
    final (situacao, tom) = checkinSituacao(p);
    final (apoio, trava) = _apoio(p);
    return ErpScaffold(
      key: const Key('aparencia-checkin-B'),
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: title,
            subtitle: subtitle,
            onBack: p.onBack,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                MobilePill(label: situacao.toUpperCase(), tone: tom),
                if (p.onUnableToStart != null)
                  PopupMenuButton<String>(
                    key: const Key('checkin-b-mais-acoes'),
                    tooltip: 'Mais ações',
                    icon: const Icon(
                      Icons.more_vert,
                      color: ErpMobileTheme.ink,
                    ),
                    onSelected: (_) => p.onUnableToStart!(),
                    itemBuilder: (_) => const [
                      PopupMenuItem<String>(
                        key: Key('checkin-block'),
                        value: 'nao-foi-possivel',
                        child: Row(
                          children: [
                            Icon(
                              Icons.cancel_outlined,
                              color: ErpMobileTheme.danger,
                            ),
                            SizedBox(width: 10),
                            Flexible(
                              child: Text(
                                'Não foi possível iniciar',
                                style: TextStyle(color: ErpMobileTheme.danger),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          CheckinPassos(props: p),
          if (p.offline) const CheckinSemConexao(),
          Expanded(
            child: ListView(
              key: const Key('checkin-lista'),
              padding: const EdgeInsets.all(12),
              children: [
                CheckinAvisos(props: p),
                Card(
                  key: const Key('checkin-b-linha-do-tempo'),
                  margin: EdgeInsets.zero,
                  child: MobilePhaseTimeline(
                    title: p.isTow ? 'Chegada à coleta' : 'Chegada ao local',
                    titleTrailing: p.wo.scheduledAt == null
                        ? null
                        : MobilePill(
                            label: detalheOsJanela(
                              p.wo.scheduledAt,
                              p.slaDueAt,
                            )!,
                          ),
                    nodes: _nos(p),
                  ),
                ),
                const SizedBox(height: 10),
                CheckinOsCard(props: p),
                if (p.phone != null) CheckinContatoCard(props: p),
              ],
            ),
          ),
          MobileStickyBar(
            key: const Key('checkin-barra'),
            supportingText: apoio,
            supportingTextColor: trava ? ErpMobileTheme.warningInk : null,
            children: [Expanded(child: CheckinBotaoPrincipal(props: p))],
          ),
        ],
      ),
    );
  }

  /// A frase da barra e se ela é trava.
  static (String, bool) _apoio(CheckinChegadaViewProps p) {
    switch (p.fase) {
      case CheckinFase.inicio:
        return ('Ao sair para o local, avise que você está em rota.', false);
      case CheckinFase.local:
        return (
          p.pendingSync
              ? 'A chegada vai para o servidor quando o sinal voltar. Você já pode começar.'
              : 'Comece pela vistoria.',
          false,
        );
      case CheckinFase.rota:
        if (p.gpsOk == false) {
          return ('Ligue o GPS para confirmar a chegada.', true);
        }
        if (p.wo.checkinMode == CheckinMode.referenceMissing) {
          return ('Esta OS está sem placa cadastrada. Peça à base.', true);
        }
        if (p.offline) {
          return (
            'Sem sinal: a chegada fica salva e vai quando o sinal voltar.',
            false,
          );
        }
        return p.wo.checkinMode == CheckinMode.exempt
            ? ('Ao chegar, confirme a chegada.', false)
            : ('Ao chegar, confirme com os 2 últimos dígitos da placa.', false);
    }
  }

  static List<MobilePhaseNode> _nos(CheckinChegadaViewProps p) {
    final passo = switch (p.fase) {
      CheckinFase.inicio => 0,
      CheckinFase.rota => 1,
      CheckinFase.local => 3,
    };
    MobilePhaseState estado(int k) => k < passo
        ? MobilePhaseState.done
        : k == passo
        ? MobilePhaseState.active
        : MobilePhaseState.todo;
    IconData marca(int k, IconData icon) => k < passo ? Icons.check : icon;
    final chegada = p.wo.arrivedAt;
    final placa = switch (p.wo.checkinMode) {
      CheckinMode.exempt => 'Serviço sem placa: confirme que você chegou.',
      CheckinMode.referenceMissing =>
        'Esta OS está sem placa cadastrada: peça à base.',
      _ => 'Com os 2 últimos dígitos da placa.',
    };
    return [
      MobilePhaseNode(
        title: 'Iniciar rota',
        state: estado(0),
        marker: marca(0, Icons.directions_outlined),
        meta: passo > 0
            ? 'A central vê que você está a caminho.'
            : 'Avise que você saiu para o local.',
      ),
      MobilePhaseNode(
        title: p.isTow ? 'Ir até o local da coleta' : 'Ir até o local',
        state: estado(1),
        marker: marca(1, Icons.location_on_outlined),
        meta: p.wo.serviceAddress,
      ),
      MobilePhaseNode(
        title: 'Confirmar a chegada',
        state: estado(2),
        marker: marca(2, Icons.pin_outlined),
        meta: passo > 2
            ? (chegada == null
                  ? 'Chegada registrada.'
                  : 'Às ${detalheOsHora(chegada)}.')
            : '$placa A chegada não é avisada sozinha.',
        pills: [
          if (passo > 2)
            p.pendingSync
                ? const MobilePill(label: 'Na fila', tone: PillTone.warning)
                : const MobilePill(label: 'Confirmada', tone: PillTone.done),
        ],
      ),
      MobilePhaseNode(
        title: 'Iniciar atendimento',
        state: estado(3),
        marker: marca(3, Icons.play_arrow_outlined),
        meta: 'Abre o atendimento e a vistoria.',
      ),
    ];
  }
}
