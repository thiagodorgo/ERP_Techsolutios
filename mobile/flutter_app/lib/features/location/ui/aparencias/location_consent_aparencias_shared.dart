import 'package:flutter/material.dart';

import '../../../../core/sync/sync_models.dart';
import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_components.dart';
import '../../../../shared/ui/mobile_kit.dart';

/// B-APP-APARENCIA (F1) — o que as aparências B e C da localização recebem
/// prontas da tela (`location_consent_screen.dart`).
///
/// As vistas SÓ desenham (Emenda 1, A4): a decisão, a organização, o GPS, a
/// captura e as ações chegam calculadas; nenhuma regra de consentimento mora
/// aqui. A tela calcula tudo uma vez, e as três aparências mostram o mesmo.

/// O bloco "Captura" da opção C (plano §2.1, com o A4 da Emenda 1).
enum LocationCaptureSummary {
  /// Concedido no aparelho, GPS disponível e a decisão registrada na
  /// organização: a posição sai com o app aberto.
  withAppOpen,

  /// Concedido e GPS disponível, mas a decisão ainda não registrada: a posição
  /// fica guardada no celular.
  deviceOnly,

  /// Sem consentimento ou sem GPS.
  off,
}

/// Junta o valor pronto `captureRegistered` (a conferência de envio,
/// `positionsStillAllowed`, que a tela chama), o consentimento no aparelho e o
/// GPS nos três valores do bloco. Não repete a regra de envio.
LocationCaptureSummary locationCaptureSummary({
  required bool captureRegistered,
  required bool consentOnDevice,
  required bool gpsAvailable,
}) {
  if (!consentOnDevice || !gpsAvailable) return LocationCaptureSummary.off;
  return captureRegistered
      ? LocationCaptureSummary.withAppOpen
      : LocationCaptureSummary.deviceOnly;
}

/// A frase do detalhe da linha que o bloco "Captura" abre, quando a posição
/// fica no aparelho (plano §2.1; apensa à `P-LOCALIZACAO-TEXTO-PARA-O-ADVOGADO`).
const locationCaptureDeviceOnlyDetail =
    'A posição fica guardada no celular e só vai para a sua organização '
    'depois que a sua decisão for registrada.';

extension LocationCaptureSummaryView on LocationCaptureSummary {
  String get label => switch (this) {
    LocationCaptureSummary.withAppOpen => 'Com o app aberto',
    LocationCaptureSummary.deviceOnly => 'Só no aparelho',
    LocationCaptureSummary.off => 'Desligada',
  };

  Color get color => switch (this) {
    LocationCaptureSummary.withAppOpen => ErpMobileTheme.success,
    LocationCaptureSummary.deviceOnly => ErpMobileTheme.warning,
    LocationCaptureSummary.off => const Color(0xFF475569),
  };

  IconData get icon => switch (this) {
    LocationCaptureSummary.withAppOpen => Icons.schedule_outlined,
    LocationCaptureSummary.deviceOnly => Icons.phone_android_outlined,
    LocationCaptureSummary.off => Icons.block_outlined,
  };
}

/// Uma linha da lista "Como usamos sua localização", com o texto da opção A
/// (a tela monta a lista uma vez; as três aparências mostram as mesmas linhas).
class LocationConsentUsageRowData {
  const LocationConsentUsageRowData({
    required this.id,
    required this.icon,
    required this.title,
    required this.lines,
    this.trailing,
    this.facts = const [],
    this.action,
  });

  final String id;
  final IconData icon;
  final String title;
  final List<String> lines;
  final Widget? trailing;
  final List<(String, String)> facts;
  final (String, VoidCallback)? action;

  /// A mesma linha com [line] antes das outras.
  LocationConsentUsageRowData withLeadingLine(String line) =>
      LocationConsentUsageRowData(
        id: id,
        icon: icon,
        title: title,
        lines: [line, ...lines],
        trailing: trailing,
        facts: facts,
        action: action,
      );
}

/// Tudo o que a vista B e a vista C recebem. As duas recebem o mesmo objeto
/// (a M1.4 troca uma pela outra e compila).
class LocationConsentViewProps {
  const LocationConsentViewProps({
    required this.blocked,
    required this.granted,
    required this.decisionPending,
    required this.askDecline,
    required this.showReconfirm,
    required this.decisionTitle,
    required this.decisionSubtitle,
    required this.decisionShort,
    required this.organizationLine,
    required this.organizationShort,
    required this.organizationTone,
    required this.organizationIcon,
    required this.gpsAvailable,
    required this.capture,
    required this.rows,
    required this.openRow,
    required this.onToggleRow,
    required this.onOpenRow,
    required this.busy,
    required this.onAccept,
    required this.onDecline,
    required this.onRevoke,
  });

  /// O perfil não tem permissão de enviar localização ("acesso não
  /// permitido"); a revogação continua, se havia consentimento.
  final bool blocked;

  /// O consentimento está concedido no aparelho: a ação é revogar.
  final bool granted;

  /// Ainda não há decisão a mostrar (a apresentação da B antes da decisão).
  final bool decisionPending;

  /// "Agora não" aparece junto de "Permitir".
  final bool askDecline;

  /// A organização pediu "Confirme de novo".
  final bool showReconfirm;

  final String decisionTitle;
  final String decisionSubtitle;

  /// A decisão em uma palavra ("Pendente", "Permitido"...), para os blocos.
  final String decisionShort;
  final String organizationLine;
  final String organizationShort;
  final PillTone organizationTone;
  final IconData organizationIcon;

  /// `false` só com o GPS desligado ou sem permissão; `null` enquanto lê.
  final bool? gpsAvailable;
  final LocationCaptureSummary capture;
  final List<LocationConsentUsageRowData> rows;
  final String? openRow;
  final ValueChanged<String> onToggleRow;
  final ValueChanged<String> onOpenRow;

  /// A ação em curso ('accept', 'decline' ou 'revoke'), ou nada.
  final String? busy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onRevoke;

  bool get gpsOff => gpsAvailable == false;
}

/// O tom da faixa da linha de estado, no `SyncStatusBanner` do app.
SyncStatus locationConsentBannerStatus(PillTone tone) => switch (tone) {
  PillTone.done => SyncStatus.synced,
  PillTone.warning || PillTone.scheduled => SyncStatus.pending,
  PillTone.danger => SyncStatus.failed,
  _ => SyncStatus.syncing,
};

/// A faixa da linha de estado da organização (B e C).
class LocationConsentStateBanner extends StatelessWidget {
  const LocationConsentStateBanner({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) => SyncStatusBanner(
    status: locationConsentBannerStatus(props.organizationTone),
    icon: props.organizationIcon,
    message: props.organizationLine,
  );
}

/// O rótulo "Como usamos sua localização" das opções B e C.
class LocationConsentUsageLabel extends StatelessWidget {
  const LocationConsentUsageLabel({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 14, 2, 6),
    child: Text(
      'Como usamos sua localização',
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
        fontWeight: FontWeight.w800,
        color: ErpMobileTheme.ink,
      ),
    ),
  );
}

/// A lista "Como usamos sua localização" das opções B e C: as linhas da A,
/// cada uma abrindo o detalhe logo abaixo (`MobileExpandableRow`).
class LocationConsentUsageList extends StatelessWidget {
  const LocationConsentUsageList({
    required this.rows,
    required this.openRow,
    required this.onToggle,
    this.checkRows = const {},
    this.background,
    super.key,
  });

  final List<LocationConsentUsageRowData> rows;
  final String? openRow;
  final ValueChanged<String> onToggle;

  /// As linhas que levam o ícone de check no lugar do ícone da linha (B).
  final Set<String> checkRows;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: background,
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 4),
          for (final row in rows)
            MobileExpandableRow(
              key: Key('consent-row-${row.id}'),
              title: row.title,
              expanded: openRow == row.id,
              onToggle: () => onToggle(row.id),
              leading: checkRows.contains(row.id)
                  ? Icon(
                      Icons.check_circle_outline,
                      key: Key('consent-row-check-${row.id}'),
                      size: 20,
                      color: ErpMobileTheme.success,
                    )
                  : Icon(row.icon, size: 20, color: ErpMobileTheme.inkMuted),
              trailing: row.trailing,
              detail: LocationConsentRowDetail(
                row: row,
                onClose: () => onToggle(row.id),
              ),
            ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

/// O detalhe aberto de uma linha (as frases, os fatos e as ações).
class LocationConsentRowDetail extends StatelessWidget {
  const LocationConsentRowDetail({
    required this.row,
    required this.onClose,
    super.key,
  });

  final LocationConsentUsageRowData row;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final action = row.action;
    return Semantics(
      container: true,
      label: row.title,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final line in row.lines)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  line,
                  style: const TextStyle(
                    fontSize: 13,
                    color: ErpMobileTheme.ink,
                  ),
                ),
              ),
            if (row.facts.isNotEmpty)
              Wrap(
                spacing: 18,
                runSpacing: 6,
                children: [
                  for (final (label, value) in row.facts)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                        Text(
                          value,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: ErpMobileTheme.ink,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 8,
                children: [
                  if (action != null)
                    TextButton(onPressed: action.$2, child: Text(action.$1)),
                  TextButton(onPressed: onClose, child: const Text('Fechar')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// O giro dentro do botão enquanto a decisão é registrada.
class LocationConsentButtonSpinner extends StatelessWidget {
  const LocationConsentButtonSpinner({this.onPrimary = false, super.key});

  final bool onPrimary;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 18,
    height: 18,
    child: CircularProgressIndicator(
      strokeWidth: 2,
      color: onPrimary ? Colors.white : null,
      semanticsLabel: 'Registrando',
    ),
  );
}

/// "Permitir durante o uso do app" (as mesmas chave e ação da A).
class LocationConsentPermitButton extends StatelessWidget {
  const LocationConsentPermitButton({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) => FilledButton.icon(
    key: const Key('consent-accept'),
    onPressed: props.onAccept,
    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
    icon: props.busy == 'accept'
        ? const LocationConsentButtonSpinner(onPrimary: true)
        : const Icon(Icons.check_circle_outline),
    label: const Text('Permitir durante o uso do app'),
  );
}

/// "Agora não" (as mesmas chave e ação da A).
class LocationConsentDeclineButton extends StatelessWidget {
  const LocationConsentDeclineButton({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) => OutlinedButton(
    key: const Key('consent-decline'),
    onPressed: props.onDecline,
    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
    child: const Text('Agora não'),
  );
}

/// "Revogar consentimento" em vermelho de contorno (B e C; a A mantém o
/// contorno azul).
class LocationConsentRevokeButton extends StatelessWidget {
  const LocationConsentRevokeButton({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) => MobileDangerOutlineButton(
    key: const Key('consent-revoke'),
    onPressed: props.onRevoke,
    icon: props.busy == 'revoke'
        ? const LocationConsentButtonSpinner()
        : const Icon(Icons.block_outlined),
    label: 'Revogar consentimento',
  );
}

/// A nota de "Agora não".
const locationConsentLaterNote =
    'Você pode mudar isso depois em Perfil › Privacidade.';

/// "Acesso não permitido" das opções B e C: o mesmo estado da A, com o
/// "Revogar consentimento" vermelho quando havia consentimento.
class LocationConsentBlockedView extends StatelessWidget {
  const LocationConsentBlockedView({required this.props, super.key});

  final LocationConsentViewProps props;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: IgnorePointer(
        ignoring: props.busy != null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const PermissionBlockedState(
              title: 'Acesso não permitido',
              message:
                  'Seu perfil não tem permissão para enviar localização. Fale com o administrador da sua organização.',
            ),
            if (props.granted) ...[
              const SizedBox(height: 14),
              const Text(
                'Consentimento concedido · Permitido durante o uso do app.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 12),
              LocationConsentRevokeButton(props: props),
            ],
          ],
        ),
      ),
    );
  }
}
