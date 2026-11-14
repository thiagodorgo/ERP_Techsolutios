import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/location/gps_service.dart';
import '../../../core/location/location_consent_providers.dart';
import '../../../core/location/location_consent_store.dart';
import '../../../core/location/location_consent_sync.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';

/// Perfil › Privacidade › Localização (B-SAN3-17, itens 18 e 52; opção A da
/// maquete `localizacao-consentimento-3opcoes.reference.html`).
///
/// A tela de hoje refeita no mesmo esqueleto: três cartões (a decisão, a
/// organização e o GPS), as ações logo abaixo deles e, por último, a lista
/// "Como usamos sua localização", em que cada linha abre o detalhe logo abaixo
/// (`MobileExpandableRow`). Cada cartão abre a linha correspondente.
///
/// A decisão (aceitar, revogar e "Agora não") vai à organização pelo
/// `LocationConsentSync`, antes de qualquer posição; sem conexão, ela espera.
class LocationConsentScreen extends ConsumerStatefulWidget {
  const LocationConsentScreen({super.key});

  @override
  ConsumerState<LocationConsentScreen> createState() =>
      _LocationConsentScreenState();
}

class _LocationConsentScreenState extends ConsumerState<LocationConsentScreen> {
  /// Um detalhe aberto por vez (`D-PADRAO-BLOCOS-CLICAVEIS`).
  String? _openRow;

  /// A ação em curso ('accept', 'decline' ou 'revoke'), ou nada.
  String? _busy;

  late final _ConsentScreenSync consentSync = _ConsentScreenSync(this);

  void _toggleRow(String id) =>
      setState(() => _openRow = _openRow == id ? null : id);

  void _openOnly(String id) => setState(() => _openRow = id);

  void _setBusy(String? action) => setState(() => _busy = action);

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(locationConsentStatusProvider);
    final session = ref.watch(bootstrapSessionProvider).asData?.value;
    final tenantId = session?.activeTenant.tenantId ?? '';
    // O backend é a autoridade; a tela só esconde quando a sessão diz "não".
    final canSend =
        session == null || session.permissions.contains('field_location:send');
    final status = statusAsync.asData?.value;
    final needsDecision = status == null || status.needsDecision;

    final title = !canSend
        ? 'Privacidade · Localização'
        : (needsDecision
              ? 'Localização em campo'
              : 'Privacidade · Localização');

    final Widget body;
    if (status == null && statusAsync.hasError) {
      body = EmptyState(
        icon: Icons.error_outline,
        title: 'Não foi possível ler a sua decisão',
        message: 'Tente de novo em instantes.',
        action: TextButton(
          onPressed: () => ref.invalidate(locationConsentStatusProvider),
          child: const Text('Tentar de novo'),
        ),
      );
    } else if (status == null) {
      body = const Center(child: CircularProgressIndicator.adaptive());
    } else {
      body = _ConsentScope(
        status: status,
        tenantId: tenantId,
        busy: _busy,
        consentSync: consentSync,
        child: canSend ? _consentBody(context, status) : const _BlockedBody(),
      );
    }

    return ErpScaffold(title: title, body: body);
  }

  Widget _consentBody(BuildContext context, LocationConsentStatus status) {
    final gpsAsync = ref.watch(gpsAvailableProvider);
    final gpsOk = gpsAsync.asData?.value;
    final organization = _OrganizationView.of(status);
    final decision = _DecisionView.of(status);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            key: const Key('consent-status-card'),
            color: status.granted
                ? Theme.of(context).colorScheme.tertiaryContainer
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            child: ListTile(
              onTap: () => _openOnly('mudar'),
              leading: Icon(
                status.granted
                    ? Icons.verified_user_outlined
                    : Icons.privacy_tip_outlined,
              ),
              title: Text(decision.title),
              subtitle: Text(decision.subtitle),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            key: const Key('consent-organization-card'),
            child: ListTile(
              onTap: () => _openOnly('registro'),
              leading: Icon(organization.icon, color: organization.color),
              title: const Text('Na sua organização'),
              subtitle: Text(organization.line),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            key: const Key('consent-gps-card'),
            child: ListTile(
              onTap: () => _openOnly('gps'),
              leading: Icon(
                gpsOk == false
                    ? Icons.gps_off_outlined
                    : Icons.gps_fixed_outlined,
              ),
              title: const Text('GPS do dispositivo'),
              trailing: gpsAsync.when(
                data: (ok) => OperationalStatusChip(
                  label: ok ? 'Disponível' : 'Indisponível',
                  status: ok ? 'success' : 'danger',
                ),
                loading: () => const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                ),
                error: (_, _) => const OperationalStatusChip(
                  label: 'Indisponível',
                  status: 'danger',
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // As ações vêm logo depois dos três cartões (W11): "Agora não" fica
          // inteiro na tela, sem rolar, sempre que "Permitir" aparece.
          const _ConsentActions(),
          const SizedBox(height: 16),
          _ConsentUsageList(
            rows: _rows(status, decision, organization, gpsOk),
            openRow: _openRow,
            onToggle: _toggleRow,
          ),
        ],
      ),
    );
  }

  List<_UsageRow> _rows(
    LocationConsentStatus status,
    _DecisionView decision,
    _OrganizationView organization,
    bool? gpsOk,
  ) {
    return [
      const _UsageRow(
        id: 'uso',
        icon: Icons.map_outlined,
        title: 'Mapa, trajeto e quilometragem',
        lines: [
          'Sua organização usa a sua localização para o mapa do despacho, o trajeto e a quilometragem do dia.',
        ],
      ),
      const _UsageRow(
        id: 'quando',
        icon: Icons.touch_app_outlined,
        title: 'Ao enviar na OS e a cada minuto',
        lines: [locationConsentWhenText],
      ),
      const _UsageRow(
        id: 'fechado',
        icon: Icons.lock_outline,
        title: 'Com o app fechado, nada',
        lines: [locationConsentClosedAppText],
      ),
      const _UsageRow(
        id: 'mudar',
        icon: Icons.undo_outlined,
        title: 'Revogue quando quiser',
        lines: [
          'Você pode revogar a qualquer momento em Perfil › Privacidade.',
          'Ao revogar, a captura para na hora, e o que ainda não foi enviado é apagado do celular.',
          locationConsentHistoryText,
        ],
      ),
      _UsageRow(
        id: 'registro',
        icon: Icons.apartment_outlined,
        title: 'Registro na organização',
        trailing: MobilePill(
          label: organization.short,
          tone: organization.tone,
        ),
        lines: [organization.line],
        facts: [
          ('Sua decisão', decision.short),
          ('Decidida em', _dayTime(status.decidedAt)),
          ('Na organização', organization.short),
        ],
      ),
      _UsageRow(
        id: 'gps',
        icon: gpsOk == false
            ? Icons.gps_off_outlined
            : Icons.gps_fixed_outlined,
        title: 'GPS do dispositivo',
        trailing: MobilePill(
          label: gpsOk == false ? 'Indisponível' : 'Disponível',
          tone: gpsOk == false ? PillTone.danger : PillTone.done,
        ),
        lines: [
          gpsOk == false
              ? 'O GPS do aparelho está desligado ou o app não tem permissão para usá-lo.'
              : 'O GPS do aparelho está ligado e o app tem permissão para usá-lo.',
        ],
        action: gpsOk == false
            ? (
                'Abrir configurações',
                () =>
                    ref.read(geolocatorLocationPortProvider).openAppSettings(),
              )
            : null,
      ),
    ];
  }
}

/// As ações da tela, com o estado de "em curso" e a releitura do estado. Os
/// botões chamam `consentSync.<ação>(tenantId)`.
class _ConsentScreenSync {
  _ConsentScreenSync(this._state);

  final _LocationConsentScreenState _state;

  Future<void> accept(String tenantId) =>
      _run('accept', (sync) => sync.accept(tenantId));

  Future<void> decline(String tenantId) =>
      _run('decline', (sync) => sync.decline(tenantId));

  Future<void> revoke(String tenantId) =>
      _run('revoke', (sync) => sync.revoke(tenantId));

  Future<void> _run(
    String action,
    Future<bool> Function(LocationConsentSync sync) call,
  ) async {
    if (_state._busy != null) return;
    _state._setBusy(action);
    try {
      await call(_state.ref.read(locationConsentSyncProvider));
    } finally {
      if (_state.mounted) {
        _state.ref.invalidate(locationConsentStatusProvider);
        _state._setBusy(null);
      }
    }
  }
}

/// O estado da tela para as ações (a decisão, a organização ativa e a ação em
/// curso).
class _ConsentScope extends InheritedWidget {
  const _ConsentScope({
    required this.status,
    required this.tenantId,
    required this.busy,
    required this.consentSync,
    required super.child,
  });

  final LocationConsentStatus status;
  final String tenantId;
  final String? busy;
  final _ConsentScreenSync consentSync;

  static _ConsentScope of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_ConsentScope>()!;

  @override
  bool updateShouldNotify(_ConsentScope oldWidget) =>
      status != oldWidget.status ||
      tenantId != oldWidget.tenantId ||
      busy != oldWidget.busy;
}

/// As ações da decisão. O nome curto é um apelido, para o bloco das ações ter
/// uma marca única na tela (a âncora da MA25 é o uso, logo depois dos cartões).
typedef _ConsentActions = _ConsentActionsView;

class _ConsentActionsView extends StatelessWidget {
  const _ConsentActionsView();

  @override
  Widget build(BuildContext context) {
    final scope = _ConsentScope.of(context);
    final status = scope.status;
    final consentSync = scope.consentSync;
    final tenantId = scope.tenantId;
    final busy = scope.busy;
    // Enquanto uma decisão é registrada, nenhuma outra ação aceita toque.
    return IgnorePointer(
      ignoring: busy != null,
      child: _buttons(status, consentSync, tenantId, busy),
    );
  }

  Widget _buttons(
    LocationConsentStatus status,
    _ConsentScreenSync consentSync,
    String tenantId,
    String? busy,
  ) {
    if (status.granted) {
      return OutlinedButton.icon(
        key: const Key('consent-revoke'),
        onPressed: () => consentSync.revoke(tenantId),
        icon: busy == 'revoke'
            ? const _ButtonSpinner()
            : const Icon(Icons.block_outlined),
        label: const Text('Revogar consentimento'),
      );
    }
    final permit = FilledButton.icon(
      key: const Key('consent-accept'),
      onPressed: () => consentSync.accept(tenantId),
      icon: busy == 'accept'
          ? const _ButtonSpinner(onPrimary: true)
          : const Icon(Icons.check_circle_outline),
      label: const Text('Permitir durante o uso do app'),
    );
    if (!status.needsDecision) return permit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        permit,
        const SizedBox(height: 10),
        OutlinedButton(
          key: const Key('consent-decline'),
          onPressed: () => consentSync.decline(tenantId),
          child: const Text('Agora não'),
        ),
        const SizedBox(height: 10),
        const Text(
          'Você pode mudar isso depois em Perfil › Privacidade.',
          key: Key('consent-later-note'),
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12.5, color: ErpMobileTheme.inkMuted),
        ),
      ],
    );
  }
}

class _ButtonSpinner extends StatelessWidget {
  const _ButtonSpinner({this.onPrimary = false});

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

/// Uma linha da lista "Como usamos sua localização".
class _UsageRow {
  const _UsageRow({
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
}

class _ConsentUsageList extends StatelessWidget {
  const _ConsentUsageList({
    required this.rows,
    required this.openRow,
    required this.onToggle,
  });

  final List<_UsageRow> rows;
  final String? openRow;
  final void Function(String id) onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
            child: Text(
              'Como usamos sua localização',
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          for (final row in rows)
            MobileExpandableRow(
              key: Key('consent-row-${row.id}'),
              title: row.title,
              expanded: openRow == row.id,
              onToggle: () => _toggleRow(row.id),
              leading: Icon(row.icon, size: 20, color: ErpMobileTheme.inkMuted),
              trailing: row.trailing,
              detail: _RowDetail(row: row, onClose: () => onToggle(row.id)),
            ),
          const SizedBox(height: 6),
        ],
      ),
    );
  }

  void _toggleRow(String id) => onToggle(id);
}

class _RowDetail extends StatelessWidget {
  const _RowDetail({required this.row, required this.onClose});

  final _UsageRow row;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final action = row.action;
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in row.lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                line,
                style: const TextStyle(fontSize: 13, color: ErpMobileTheme.ink),
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
    );
  }
}

/// "Acesso não permitido" (padrão do #540). Se havia consentimento, a
/// revogação continua e funciona: a rota de revogar não exige a permissão de
/// enviar (P6).
class _BlockedBody extends StatelessWidget {
  const _BlockedBody();

  @override
  Widget build(BuildContext context) {
    final scope = _ConsentScope.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const PermissionBlockedState(
            title: 'Acesso não permitido',
            message:
                'Seu perfil não tem permissão para enviar localização. Fale com o administrador da sua organização.',
          ),
          if (scope.status.granted) ...[
            const SizedBox(height: 14),
            const Text(
              'Consentimento concedido · Permitido durante o uso do app.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: ErpMobileTheme.inkMuted),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const Key('consent-revoke'),
              onPressed: () => scope.consentSync.revoke(scope.tenantId),
              icon: scope.busy == 'revoke'
                  ? const _ButtonSpinner()
                  : const Icon(Icons.block_outlined),
              label: const Text('Revogar consentimento'),
            ),
          ],
        ],
      ),
    );
  }
}

/// O cartão e a linha da decisão.
class _DecisionView {
  const _DecisionView(this.title, this.subtitle, this.short);

  factory _DecisionView.of(LocationConsentStatus status) {
    final kind = status.kind;
    if (status.needsDecision || kind == null) {
      return const _DecisionView(
        'Consentimento pendente',
        'Autorize para poder enviar sua localização.',
        'Pendente',
      );
    }
    return switch (kind) {
      LocationConsentDecisionKind.granted => const _DecisionView(
        'Consentimento concedido',
        'Permitido durante o uso do app.',
        'Permitido',
      ),
      LocationConsentDecisionKind.revoked => _DecisionView(
        'Consentimento pendente',
        locationConsentDeclineLine(kind),
        'Revogado',
      ),
      LocationConsentDecisionKind.declined => _DecisionView(
        'Consentimento pendente',
        locationConsentDeclineLine(kind),
        'Não permitido',
      ),
    };
  }

  final String title;
  final String subtitle;
  final String short;
}

/// O cartão e a linha da organização: a linha de estado (§2.4 do plano v2).
class _OrganizationView {
  const _OrganizationView(this.line, this.short, this.tone, this.icon);

  factory _OrganizationView.of(LocationConsentStatus status) {
    final line = locationConsentOrganizationLine(status);
    if (status.needsReconfirm) {
      return _OrganizationView(
        line,
        'Confirme de novo',
        PillTone.warning,
        Icons.error_outline,
      );
    }
    return switch (status.serverState) {
      LocationConsentServerState.none => _OrganizationView(
        line,
        'Sem decisão',
        PillTone.neutral,
        Icons.apartment_outlined,
      ),
      LocationConsentServerState.pending => _OrganizationView(
        line,
        'Aguardando conexão',
        PillTone.warning,
        Icons.cloud_off_outlined,
      ),
      LocationConsentServerState.registered => _OrganizationView(
        line,
        'Registrado',
        PillTone.done,
        Icons.apartment_outlined,
      ),
      LocationConsentServerState.profileMissing => _OrganizationView(
        line,
        'Sem cadastro',
        PillTone.warning,
        Icons.person_off_outlined,
      ),
    };
  }

  final String line;
  final String short;
  final PillTone tone;
  final IconData icon;

  Color get color => switch (tone) {
    PillTone.done => ErpMobileTheme.success,
    PillTone.warning => ErpMobileTheme.warning,
    _ => ErpMobileTheme.inkMuted,
  };
}

/// A linha de estado da organização (§2.4 do plano v2; "Revogado" e "Não
/// permitido" moram no cartão da decisão, E2.6).
String locationConsentOrganizationLine(LocationConsentStatus status) {
  if (status.needsReconfirm) {
    return 'Confirme de novo: a sua organização não registrou a decisão anterior.';
  }
  return switch (status.serverState) {
    LocationConsentServerState.none =>
      'Sua decisão fica registrada na sua organização.',
    // dart format off
    LocationConsentServerState.pending => 'Aguardando conexão para registrar na sua organização',
    // dart format on
    LocationConsentServerState.registered =>
      'Registrado na sua organização em ${_dayTime(status.registeredAt)}',
    LocationConsentServerState.profileMissing =>
      'Seu cadastro de profissional ainda não existe nesta organização. Peça ao gestor para cadastrar você em Profissionais.',
  };
}

String _dayTime(DateTime? value) {
  if (value == null) return '—';
  final local = value.toLocal();
  String p(int n) => n.toString().padLeft(2, '0');
  return '${p(local.day)}/${p(local.month)} ${p(local.hour)}:${p(local.minute)}';
}
