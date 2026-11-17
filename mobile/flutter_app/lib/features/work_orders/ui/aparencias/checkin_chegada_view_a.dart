import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'checkin_chegada_shared.dart';

/// B-GUI-FID1 — o check-in na opção A, "Fiel ao aprovado"
/// (`checkin-chegada.png`; `checkin-app-3opcoes.reference.html`, `telaA`): o
/// título da fase, os passos, a faixa do local (no lugar do mapa), o cartão da
/// OS com o veículo, o contato, e a barra fixa com os passos curtos e um botão
/// só. É a aparência padrão.
class CheckinChegadaViewA extends StatelessWidget {
  const CheckinChegadaViewA({required this.props, super.key});

  final CheckinChegadaViewProps props;

  static const _curtos = [
    'Iniciar',
    'Em rota',
    'Cheguei',
    'Serviço',
    'Concluir',
  ];

  @override
  Widget build(BuildContext context) {
    final p = props;
    final (title, subtitle) = checkinTitulo(p);
    final (situacao, tom) = checkinSituacao(p);
    return ErpScaffold(
      key: const Key('aparencia-checkin-A'),
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: title,
            subtitle: subtitle,
            onBack: p.onBack,
            trailing: MobilePill(label: situacao.toUpperCase(), tone: tom),
          ),
          CheckinPassos(props: p),
          if (p.offline) const CheckinSemConexao(),
          _Faixa(props: p),
          Expanded(
            child: ListView(
              key: const Key('checkin-lista'),
              padding: const EdgeInsets.all(12),
              children: [
                CheckinAvisos(props: p),
                CheckinOsCard(props: p),
                if (p.phone != null) CheckinContatoCard(props: p),
                if (p.onUnableToStart != null)
                  CheckinNaoFoiPossivel(onTap: p.onUnableToStart!),
              ],
            ),
          ),
          MobileStickyBar(
            key: const Key('checkin-barra'),
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    MobileShortSteps(
                      labels: _curtos,
                      current: switch (p.fase) {
                        CheckinFase.inicio => 0,
                        CheckinFase.rota => 1,
                        CheckinFase.local => 3,
                      },
                    ),
                    const SizedBox(height: 10),
                    CheckinBotaoPrincipal(props: p),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A faixa do alto: o local da coleta e o GPS. No MVP, sem mapa de ruas nem
/// distância (F2); "Ir para a coleta" entra aqui com o B-GUI-15. No local, a
/// chegada registrada.
class _Faixa extends StatelessWidget {
  const _Faixa({required this.props});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final chegada = checkinChegadaTexto(p);
    return Container(
      key: const Key('checkin-faixa'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: ErpMobileTheme.pageBg,
        border: Border(bottom: BorderSide(color: ErpMobileTheme.cardBorder)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (chegada != null) ...[
            Row(
              children: [
                Icon(
                  p.pendingSync ? Icons.sync_outlined : Icons.check_circle,
                  color: p.pendingSync
                      ? ErpMobileTheme.warning
                      : ErpMobileTheme.success,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    chegada,
                    key: const Key('checkin-chegada'),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: ErpMobileTheme.ink,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
          Text(
            p.localLabel.toUpperCase(),
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            p.wo.serviceAddress,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: ErpMobileTheme.ink,
            ),
          ),
          if (chegada == null) ...[
            const SizedBox(height: 8),
            CheckinSeloGps(gpsOk: p.gpsOk),
          ],
        ],
      ),
    );
  }
}
