import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/appearance/app_appearance.dart';
import '../../../core/appearance/app_appearance_providers.dart';

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

/// B-APP-APARENCIA (F1) — o aviso do Início na aparência que a pessoa escolheu
/// para a tela de localização (a mesma chave; Emenda 1, A1): A, o cartão de
/// hoje; B, o cartão branco com "Revisar" em pílula; C, a faixa com "Revisar"
/// à direita. A posição no Início (B e C sobem para logo depois do cartão do
/// usuário) é do `home_screen.dart`.
class LocationConsentHomeEntry extends StatelessWidget {
  const LocationConsentHomeEntry({required this.appearance, super.key});

  final AppAppearance appearance;

  @override
  Widget build(BuildContext context) {
    void open() => GoRouter.of(context).push('/location');
    return switch (appearance) {
      AppAppearance.a => const LocationConsentHomeCard(),
      AppAppearance.b => LocationConsentHomeCardB(onOpen: open),
      AppAppearance.c => LocationConsentHomeBandC(onOpen: open),
    };
  }
}

/// A aparência do aviso no Início: a escolha da tela de localização, ou nada
/// enquanto ela carrega (o aviso não aparece num lugar e pula para outro).
AppAppearance? locationConsentHomeAppearance(WidgetRef ref) {
  final async = ref.watch(
    screenAppearanceProvider(kLocationConsentAppearanceKey),
  );
  final value = async.asData?.value;
  if (value != null) return value;
  return async.isLoading ? null : AppAppearance.a;
}

const _homeCardTitle = 'Localização';
const _homeCardMessage =
    'Autorize o envio da sua localização durante o trabalho.';

/// Opção B: o cartão branco, com o ícone num quadrado azul-claro e "Revisar"
/// numa pílula.
class LocationConsentHomeCardB extends StatelessWidget {
  const LocationConsentHomeCardB({required this.onOpen, super.key});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final colors = MobilePill.colorsFor(PillTone.info);
    return Semantics(
      button: true,
      label: 'Localização. Revisar',
      excludeSemantics: true,
      child: InkWell(
        key: const Key('location-consent-home-card'),
        onTap: onOpen,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          key: const Key('location-consent-home-card-B'),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: ErpMobileTheme.cardBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colors.$1,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.location_on_outlined, color: colors.$2),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _homeCardTitle,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: ErpMobileTheme.ink,
                      ),
                    ),
                    Text(
                      _homeCardMessage,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                height: 32,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: ErpMobileTheme.primary,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Text(
                  'Revisar',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opção C: a faixa no desenho da faixa de dados desatualizados, com "Revisar"
/// à direita.
class LocationConsentHomeBandC extends StatelessWidget {
  const LocationConsentHomeBandC({required this.onOpen, super.key});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('location-consent-home-band-C'),
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: ErpMobileTheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: ErpMobileTheme.primary.withValues(alpha: 0.30),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.location_on_outlined,
            size: 18,
            color: ErpMobileTheme.primary,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _homeCardTitle,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
                Text(
                  _homeCardMessage,
                  style: TextStyle(
                    fontSize: 13,
                    height: 18 / 13,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            key: const Key('location-consent-home-card'),
            onPressed: onOpen,
            style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
            child: const Text('Revisar'),
          ),
        ],
      ),
    );
  }
}
