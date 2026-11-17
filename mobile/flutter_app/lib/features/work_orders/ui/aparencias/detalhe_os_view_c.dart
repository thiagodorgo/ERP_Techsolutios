import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'detalhe_os_shared.dart';
import 'detalhe_os_view_a.dart' show detalheOsComAcao;

/// B-GUI-FID1 — o detalhe da OS na opção C, "Resumo em blocos e linhas"
/// (`os-detalhe-app-3opcoes.reference.html`, `telaC`; padrão
/// `D-PADRAO-BLOCOS-CLICAVEIS`): até três blocos clicáveis no alto, cada um
/// abre a sua linha, e as linhas de uma altura que abrem o detalhe embaixo,
/// uma aberta por vez.
///
/// A maquete tem o bloco da distância; o app não mede distância (F2), e o
/// bloco dá lugar ao da vistoria ou ao do histórico.
///
/// Só desenha: tudo chega pronto em [props].
class DetalheOsViewC extends StatefulWidget {
  const DetalheOsViewC({required this.props, super.key});

  final DetalheOsViewProps props;

  @override
  State<DetalheOsViewC> createState() => _DetalheOsViewCState();
}

class _DetalheOsViewCState extends State<DetalheOsViewC> {
  String? _aberta;

  void _toggle(String id) =>
      setState(() => _aberta = _aberta == id ? null : id);

  @override
  Widget build(BuildContext context) {
    final p = widget.props;
    final prazo = detalheOsPrazo(p.wo, slaDueAt: p.slaDueAt, now: p.now);
    final barra = p.acao == DetalheOsAcao.verHistorico
        ? detalheOsComAcao(p, () => _toggle('historico'))
        : p;
    return ErpScaffold(
      key: const Key('aparencia-detalhe-os-C'),
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
                      _Blocos(
                        props: p,
                        prazo: prazo,
                        aberta: _aberta,
                        onToggle: _toggle,
                      ),
                      const DetalheOsSecao('Dados da OS'),
                      _Linhas(
                        props: p,
                        prazo: prazo,
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
          DetalheOsBarra(props: barra),
        ],
      ),
    );
  }
}

class _Blocos extends StatelessWidget {
  const _Blocos({
    required this.props,
    required this.prazo,
    required this.aberta,
    required this.onToggle,
  });

  final DetalheOsViewProps props;
  final DetalheOsPrazo? prazo;
  final String? aberta;
  final void Function(String id) onToggle;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final pz = prazo;
    final v = p.vehicle;
    final vistoria = p.vistoria;
    final blocos = <Widget>[
      if (pz != null)
        MobileStatTile(
          key: const Key('detalhe-os-bloco-janela'),
          icon: Icons.schedule_outlined,
          value: pz.curto,
          label: pz.sub,
          color: detalheOsPrazoCores(pz.tone).$3,
          selected: aberta == 'janela',
          onTap: () => onToggle('janela'),
        ),
      if (v != null)
        MobileStatTile(
          key: const Key('detalhe-os-bloco-veiculo'),
          icon: Icons.local_shipping_outlined,
          value: v.plateMasked,
          label: v.model ?? 'veículo',
          color: ErpMobileTheme.inkMuted,
          selected: aberta == 'veiculo',
          onTap: () => onToggle('veiculo'),
        ),
      if (vistoria != null)
        MobileStatTile(
          key: const Key('detalhe-os-bloco-vistoria'),
          icon: Icons.checklist_outlined,
          value: vistoria.statusLabel ?? 'Abrir',
          label: 'vistoria',
          color: ErpMobileTheme.primary,
          selected: aberta == 'vistoria',
          onTap: () => onToggle('vistoria'),
        ),
      MobileStatTile(
        key: const Key('detalhe-os-bloco-historico'),
        icon: Icons.history,
        value: p.historico == null ? '…' : '${p.historico!.length}',
        label: p.historico?.length == 1 ? 'registro' : 'registros',
        color: ErpMobileTheme.primary,
        selected: aberta == 'historico',
        onTap: () => onToggle('historico'),
      ),
    ].take(3).toList();
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < blocos.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(child: blocos[i]),
        ],
      ],
    );
  }
}

class _Linhas extends StatelessWidget {
  const _Linhas({
    required this.props,
    required this.prazo,
    required this.aberta,
    required this.onToggle,
  });

  final DetalheOsViewProps props;
  final DetalheOsPrazo? prazo;
  final String? aberta;
  final void Function(String id) onToggle;

  Widget _icone(IconData i) =>
      Icon(i, size: 20, color: ErpMobileTheme.inkMuted);

  Widget _texto(String t) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
    child: Text(t, style: const TextStyle(fontSize: 13.5)),
  );

  @override
  Widget build(BuildContext context) {
    final p = props;
    final v = p.vehicle;
    final pz = prazo;
    final janela = detalheOsJanela(p.wo.scheduledAt, p.slaDueAt);
    final vistoria = p.vistoria;
    MobileExpandableRow linha(
      String id,
      IconData icon,
      String title,
      Widget detail, {
      String? meta,
      Widget? trailing,
    }) => MobileExpandableRow(
      key: Key('detalhe-os-linha-$id'),
      leading: _icone(icon),
      title: title,
      meta: meta,
      trailing: trailing,
      expanded: aberta == id,
      onToggle: () => onToggle(id),
      detail: detail,
    );
    final linhas = <Widget>[
      if (v != null)
        linha(
          'veiculo',
          Icons.local_shipping_outlined,
          'Veículo',
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: DetalheOsVeiculoGrade(vehicle: v),
          ),
          meta: [?v.model, ?v.color, v.plateMasked].join(' · '),
        ),
      linha(
        'endereco',
        Icons.location_on_outlined,
        'Endereço',
        _texto(p.wo.serviceAddress),
        meta: p.wo.serviceAddress,
      ),
      if (janela != null || pz != null)
        linha(
          'janela',
          Icons.schedule_outlined,
          'Janela',
          _texto(
            [
              if (janela != null) 'Janela de atendimento: $janela',
              if (pz != null) 'SLA: ${pz.texto}',
            ].join('\n'),
          ),
          meta: janela,
          trailing: pz == null
              ? null
              : MobilePill(label: pz.curto, tone: pz.tone),
        ),
      if (p.phone != null)
        linha(
          'contato',
          Icons.person_outline,
          'Contato',
          _texto('${p.wo.customerName}\nTelefone · ${p.phone}'),
          meta: p.wo.customerName,
        ),
      if (vistoria != null)
        linha(
          'vistoria',
          Icons.checklist_outlined,
          'Vistoria',
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    vistoria.title,
                    style: const TextStyle(fontSize: 13.5),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 150,
                  child: OutlinedButton(
                    key: const Key('detalhe-os-vistoria'),
                    onPressed: vistoria.onOpen,
                    child: const Text('Abrir vistoria'),
                  ),
                ),
              ],
            ),
          ),
          meta: vistoria.title,
          trailing: vistoria.statusLabel == null
              ? null
              : MobilePill(label: vistoria.statusLabel!, tone: vistoria.tone),
        ),
      linha(
        'historico',
        Icons.history,
        'Histórico',
        DetalheOsHistoricoLista(eventos: p.historico),
        meta: detalheOsHistoricoResumo(p.historico),
      ),
      linha(
        'mais',
        Icons.my_location_outlined,
        'Mais',
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(padding: const EdgeInsets.all(8), child: p.localizacao),
            if (p.atribuicao != null)
              Padding(padding: const EdgeInsets.all(8), child: p.atribuicao),
            if (p.onApprovalRequest != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: OutlinedButton.icon(
                  key: const Key('detalhe-os-aprovacao'),
                  onPressed: p.onApprovalRequest,
                  icon: const Icon(Icons.approval_outlined),
                  label: const Text('Solicitar aprovação'),
                ),
              ),
          ],
        ),
        meta: p.onApprovalRequest == null
            ? 'Localização operacional'
            : 'Localização e aprovação',
      ),
    ];
    return Container(
      key: const Key('detalhe-os-linhas'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
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
