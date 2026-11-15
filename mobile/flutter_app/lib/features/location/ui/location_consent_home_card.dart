import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/mobile_kit.dart';

/// O aviso do Início enquanto o técnico não decidiu sobre a localização (ou a
/// organização pediu "confirme de novo") — B-SAN3-17, P1. No molde do
/// `_ApprovalsBanner` do Início; leva a Perfil › Privacidade › Localização.
class LocationConsentHomeCard extends StatelessWidget {
  const LocationConsentHomeCard({super.key});

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = MobilePill.colorsFor(PillTone.info);
    return Semantics(
      button: true,
      label: 'Localização. Revisar',
      excludeSemantics: true,
      child: InkWell(
        key: const Key('location-consent-home-card'),
        onTap: () => GoRouter.of(context).push('/location'),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: ErpMobileTheme.cardBorder),
          ),
          child: Row(
            children: [
              Icon(Icons.location_on_outlined, color: fg),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Localização',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: fg,
                      ),
                    ),
                    const Text(
                      'Autorize o envio da sua localização durante o trabalho.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Revisar',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: fg,
                ),
              ),
              Icon(Icons.chevron_right, color: fg),
            ],
          ),
        ),
      ),
    );
  }
}
