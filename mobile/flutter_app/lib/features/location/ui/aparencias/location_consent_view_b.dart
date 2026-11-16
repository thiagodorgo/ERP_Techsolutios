import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'location_consent_aparencias_shared.dart';

/// B-APP-APARENCIA (F1) — opção B da localização, "Como o protótipo"
/// (`localizacao-consentimento-3opcoes.reference.html`, `locB`).
///
/// Antes da decisão: a apresentação centrada, três blocos curtos de situação,
/// as ações (logo depois dos blocos: "Agora não" inteiro sem rolar, W11) e a
/// lista. Depois: o cartão de situação (verde só com o consentimento
/// concedido), dois blocos, a faixa da organização, a lista e as ações no fim,
/// com "Revogar consentimento" em vermelho de contorno.
///
/// Só desenha: tudo chega pronto em [props] (Emenda 1, A4).
class LocationConsentViewB extends StatelessWidget {
  const LocationConsentViewB({required this.props, super.key});

  final LocationConsentViewProps props;

  /// As linhas que levam o check na B, antes e depois da decisão (Emenda 2,
  /// R2-3 (a); maquete :810).
  static const checkRows = {'uso', 'quando', 'fechado', 'mudar'};

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: const Key('aparencia-localizacao-consentimento-B'),
      child: props.blocked
          ? LocationConsentBlockedView(props: props)
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: props.decisionPending
                  ? _beforeDecision()
                  : _afterDecision(),
            ),
    );
  }

  Widget _gpsBlock() => MobileStatusBlock(
    key: const Key('consent-b-block-gps'),
    label: 'GPS',
    value: props.gpsOff ? 'Indisponível' : 'Disponível',
    tone: props.gpsOff ? PillTone.danger : PillTone.done,
    selected: props.openRow == 'gps',
    onTap: () => props.onOpenRow('gps'),
  );

  Widget _organizationBlock() => MobileStatusBlock(
    key: const Key('consent-b-block-organization'),
    label: 'Organização',
    value: props.organizationShort,
    tone: props.organizationTone,
    selected: props.openRow == 'registro',
    onTap: () => props.onOpenRow('registro'),
  );

  Widget _usageList() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const LocationConsentUsageLabel(),
      LocationConsentUsageList(
        rows: props.rows,
        openRow: props.openRow,
        onToggle: props.onToggleRow,
        checkRows: checkRows,
        background: const Color(0xFFF8FAFC),
      ),
    ],
  );

  Widget _actions() => IgnorePointer(
    ignoring: props.busy != null,
    child: Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (props.granted)
            LocationConsentRevokeButton(props: props)
          else ...[
            LocationConsentPermitButton(props: props),
            if (props.askDecline) ...[
              const SizedBox(height: 8),
              LocationConsentDeclineButton(props: props),
              const SizedBox(height: 8),
              const Text(
                locationConsentLaterNote,
                key: Key('consent-later-note'),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ],
          ],
        ],
      ),
    ),
  );

  Widget _beforeDecision() {
    const intro = MobileIntroHeader(
      key: Key('consent-b-intro'),
      icon: Icons.location_on_outlined,
      title: 'Localização em campo',
      message:
          'Sua organização usa a sua localização para o mapa do despacho, o trajeto e a quilometragem do dia.',
    );
    final statusBlocks = Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: MobileStatusBlock(
                    key: const Key('consent-status-card'),
                    label: 'Sua decisão',
                    value: props.decisionShort,
                    selected: props.openRow == 'mudar',
                    onTap: () => props.onOpenRow('mudar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(child: _organizationBlock()),
                const SizedBox(width: 8),
                Expanded(child: _gpsBlock()),
              ],
            ),
          ),
          if (props.showReconfirm)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: LocationConsentStateBanner(
                key: const Key('consent-b-reconfirm-banner'),
                props: props,
              ),
            ),
        ],
      ),
    );
    final actions = _actions();
    final usageList = _usageList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [intro, statusBlocks, actions, usageList],
    );
  }

  Widget _afterDecision() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MobileStatusCard(
          key: const Key('consent-status-card'),
          icon: props.granted ? Icons.check : Icons.block_outlined,
          title: props.decisionTitle,
          subtitle: props.decisionSubtitle,
          success: props.granted,
          onTap: () => props.onOpenRow('mudar'),
        ),
        const SizedBox(height: 8),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _organizationBlock()),
              const SizedBox(width: 8),
              Expanded(child: _gpsBlock()),
            ],
          ),
        ),
        const SizedBox(height: 10),
        LocationConsentStateBanner(
          key: const Key('consent-b-organization-banner'),
          props: props,
        ),
        _usageList(),
        _actions(),
      ],
    );
  }
}
