import 'package:flutter/material.dart';

import '../../../../shared/ui/erp_scaffold.dart';
import 'detalhe_os_shared.dart';

/// B-GUI-FID1 — o detalhe da OS na opção A, "Fiel ao desenho aprovado"
/// (`os-detalhe.png`; `os-detalhe-app-3opcoes.reference.html`, `telaA`): o
/// bloco branco com código, prioridade, serviço e cliente; Veículo; Local e
/// agendamento; o prazo em destaque; Contato; "Mais desta OS"; e a barra fixa
/// com "Mapa" e a ação. É a aparência padrão.
///
/// Só desenha: tudo chega pronto em [props].
class DetalheOsViewA extends StatefulWidget {
  const DetalheOsViewA({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  State<DetalheOsViewA> createState() => _DetalheOsViewAState();
}

class _DetalheOsViewAState extends State<DetalheOsViewA> {
  String? _aberta;

  void _toggle(String id) =>
      setState(() => _aberta = _aberta == id ? null : id);

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final prazo = detalheOsPrazo(p.wo, slaDueAt: p.slaDueAt, now: p.now);
    final vehicle = p.vehicle;
    return ErpScaffold(
      key: const Key('aparencia-detalhe-os-A'),
      showAppBar: false,
      body: Column(
        children: [
          DetalheOsHeader(props: p),
          if (p.offline) const DetalheOsSemConexao(),
          Expanded(
            child: ListView(
              key: const Key('detalhe-os-lista'),
              padding: EdgeInsets.zero,
              children: [
                DetalheOsHero(props: p),
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
                      if (prazo != null) DetalheOsPrazoCard(prazo: prazo),
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
          DetalheOsBarra(props: _comHistorico(p)),
        ],
      ),
    );
  }

  /// "Ver histórico" abre a linha do histórico.
  DetalheOsViewProps _comHistorico(DetalheOsViewProps p) =>
      p.acao == DetalheOsAcao.verHistorico
      ? detalheOsComAcao(p, () => _toggle('historico'))
      : p;
}

/// As mesmas props com outra ação no toque da barra.
DetalheOsViewProps detalheOsComAcao(
  DetalheOsViewProps p,
  VoidCallback onAcao,
) => DetalheOsViewProps(
  wo: p.wo,
  now: p.now,
  onBack: p.onBack,
  onMap: p.onMap,
  acao: p.acao,
  historico: p.historico,
  localizacao: p.localizacao,
  vehicle: p.vehicle,
  slaDueAt: p.slaDueAt,
  offline: p.offline,
  pendingSync: p.pendingSync,
  stale: p.stale,
  onRefresh: p.onRefresh,
  conflictPanel: p.conflictPanel,
  onAcao: onAcao,
  onUnableToStart: p.onUnableToStart,
  onServiceDoor: p.onServiceDoor,
  onApprovalRequest: p.onApprovalRequest,
  vistoria: p.vistoria,
  atribuicao: p.atribuicao,
);
