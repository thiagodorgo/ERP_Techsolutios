import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/gps_service.dart';
import '../../../core/location/location_consent_store.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';

/// Consentimento e status de localização (LGPD — captura manual).
///
/// Sem rastreamento em segundo plano: a localização só é capturada quando o
/// usuário toca em "Enviar localização agora" nas telas de OS. Aqui ele
/// concede ou revoga o consentimento e vê o status do GPS.
class LocationConsentScreen extends ConsumerStatefulWidget {
  const LocationConsentScreen({super.key});

  @override
  ConsumerState<LocationConsentScreen> createState() =>
      _LocationConsentScreenState();
}

class _LocationConsentScreenState extends ConsumerState<LocationConsentScreen> {
  bool? _accepted;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final store = ref.read(locationConsentStoreProvider);
    final accepted = await store.hasAcceptedManualCapture();
    if (mounted) setState(() => _accepted = accepted);
  }

  Future<void> _accept() async {
    setState(() => _busy = true);
    await ref.read(locationConsentStoreProvider).acceptManualCapture();
    await _reload();
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _revoke() async {
    setState(() => _busy = true);
    await ref.read(locationConsentStoreProvider).clearManualCapture();
    await _reload();
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final accepted = _accepted;
    final gpsAsync = ref.watch(gpsAvailableProvider);
    return ErpScaffold(
      title: 'Localizacao',
      body: accepted == null
          ? const Center(child: CircularProgressIndicator.adaptive())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  key: const Key('consent-status-card'),
                  color: accepted
                      ? Theme.of(context).colorScheme.tertiaryContainer
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: ListTile(
                    leading: Icon(
                      accepted
                          ? Icons.verified_user_outlined
                          : Icons.privacy_tip_outlined,
                    ),
                    title: Text(
                      accepted
                          ? 'Consentimento concedido'
                          : 'Consentimento pendente',
                    ),
                    subtitle: Text(
                      accepted
                          ? 'Captura manual autorizada.'
                          : 'Autorize para poder enviar sua localizacao.',
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Como usamos sua localizacao',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          manualLocationConsentText,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.gps_fixed_outlined),
                    title: const Text('GPS do dispositivo'),
                    trailing: gpsAsync.when(
                      data: (ok) => OperationalStatusChip(
                        label: ok ? 'Disponivel' : 'Indisponivel',
                        status: ok ? 'success' : 'danger',
                      ),
                      loading: () => const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                      ),
                      error: (_, _) => const OperationalStatusChip(
                        label: 'Indisponivel',
                        status: 'danger',
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (accepted)
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      key: const Key('consent-revoke'),
                      onPressed: _busy ? null : _revoke,
                      icon: const Icon(Icons.block_outlined),
                      label: const Text('Revogar consentimento'),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const Key('consent-accept'),
                      onPressed: _busy ? null : _accept,
                      icon: const Icon(Icons.check_circle_outline),
                      label: const Text('Autorizar captura manual'),
                    ),
                  ),
              ],
            ),
    );
  }
}
