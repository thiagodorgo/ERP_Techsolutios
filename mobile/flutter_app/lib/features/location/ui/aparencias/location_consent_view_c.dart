import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'location_consent_aparencias_shared.dart';

/// B-APP-APARENCIA (F1) — opção C da localização, "Resumo e ações fixas"
/// (`localizacao-consentimento-3opcoes.reference.html`, `locC`).
///
/// A faixa da decisão logo abaixo do cabeçalho; três blocos no topo ("Na
/// organização", "GPS" e "Captura"), cada um abre a sua linha da lista; a
/// linha de estado numa faixa; e as ações numa barra fixa embaixo, com
/// "Permitir" e "Agora não" sempre à vista. O desenho é o mesmo antes e depois
/// da decisão.
///
/// Só desenha: tudo chega pronto em [props] (Emenda 1, A4).
class LocationConsentViewC extends StatelessWidget {
  const LocationConsentViewC({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) {
    if (props.blocked) {
      return KeyedSubtree(
        key: const Key('aparencia-localizacao-consentimento-C'),
        child: LocationConsentBlockedView(props: props),
      );
    }
    final rows = [
      for (final row in props.rows)
        row.id == 'fechado' &&
                props.capture == LocationCaptureSummary.deviceOnly
            ? row.withLeadingLine(locationCaptureDeviceOnlyDetail)
            : row,
    ];
    return Column(
      key: const Key('aparencia-localizacao-consentimento-C'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _DecisionBand(props: props),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: MobileStatTile(
                          key: const Key('consent-c-block-organization'),
                          icon: props.organizationIcon,
                          value: props.organizationShort,
                          label: 'Na organização',
                          color: _toneColor(props.organizationTone),
                          selected: props.openRow == 'registro',
                          onTap: () => props.onOpenRow('registro'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MobileStatTile(
                          key: const Key('consent-c-block-gps'),
                          icon: props.gpsOff
                              ? Icons.gps_off_outlined
                              : Icons.gps_fixed_outlined,
                          value: props.gpsOff ? 'Indisponível' : 'Disponível',
                          label: 'GPS',
                          color: props.gpsOff
                              ? ErpMobileTheme.danger
                              : ErpMobileTheme.success,
                          selected: props.openRow == 'gps',
                          onTap: () => props.onOpenRow('gps'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MobileStatTile(
                          key: const Key('consent-c-block-capture'),
                          icon: props.capture.icon,
                          value: props.capture.label,
                          label: 'Captura',
                          color: props.capture.color,
                          selected: props.openRow == 'fechado',
                          onTap: () => props.onOpenRow('fechado'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                LocationConsentStateBanner(
                  key: const Key('consent-c-organization-banner'),
                  props: props,
                ),
                const LocationConsentUsageLabel(),
                LocationConsentUsageList(
                  rows: rows,
                  openRow: props.openRow,
                  onToggle: props.onToggleRow,
                ),
              ],
            ),
          ),
        ),
        MobileStickyBar(
          key: const Key('consent-c-sticky'),
          children: [
            Expanded(
              child: IgnorePointer(
                ignoring: props.busy != null,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (props.granted)
                      LocationConsentRevokeButton(props: props)
                    else ...[
                      LocationConsentPermitButton(props: props),
                      if (props.askDecline) ...[
                        const SizedBox(height: 8),
                        LocationConsentDeclineButton(props: props),
                        const SizedBox(height: 6),
                        const Text(
                          locationConsentLaterNote,
                          key: Key('consent-later-note'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  static Color _toneColor(PillTone tone) => switch (tone) {
    PillTone.done => ErpMobileTheme.success,
    PillTone.warning || PillTone.scheduled => ErpMobileTheme.warning,
    PillTone.danger => ErpMobileTheme.danger,
    _ => const Color(0xFF475569),
  };
}

/// A faixa da decisão, logo abaixo do cabeçalho (o `c-band` da maquete).
class _DecisionBand extends StatelessWidget {
  const _DecisionBand({required this.props});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) {
    final (successBg, _) = MobilePill.colorsFor(PillTone.done);
    final (neutralBg, neutralFg) = MobilePill.colorsFor(PillTone.neutral);
    return Container(
      key: const Key('consent-status-card'),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: ErpMobileTheme.cardBorder)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: props.granted ? successBg : neutralBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              props.granted
                  ? Icons.verified_user_outlined
                  : Icons.privacy_tip_outlined,
              color: props.granted ? ErpMobileTheme.success : neutralFg,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  props.decisionTitle,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    height: 21 / 16,
                    color: ErpMobileTheme.ink,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  props.decisionSubtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 18 / 13,
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
