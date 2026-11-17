import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/gps_service.dart';
import '../data/work_order_conflict_resolution_service.dart';
import '../domain/work_order_models.dart';

// B-GUI-FID1 — os diálogos do check-in, extraídos de `work_order_detail_screen.dart` sem mudar a regra: o da chegada
// (a placa, o GPS e o aviso da OS sem placa) e a folha "Não foi possível iniciar". Quem usa: o check-in da execução
// (`work_order_execute_screen.dart`), o detail da OS (em rota) e o cartão "Chegada não confirmada".
//
// Só o texto mudou, como as maquetes aprovadas pedem (`checkin-app-3opcoes.reference.html`): o selo do GPS diz o que o
// app mede ("GPS ligado", não "você está no local"), e os textos ganharam acento.

/// B-SAN3-26 — o que o diálogo de chegada devolve: `null` = cancelou; [lastDigits] = os 2 caracteres digitados (nulo no
/// serviço sem placa). Quem confere de verdade é o servidor; o app só molda a tela pelo modo que o servidor mandou.
class ArrivalConfirmation {
  const ArrivalConfirmation({this.lastDigits});

  final String? lastDigits;
}

/// B-SAN3-26 — o GPS do aparelho, lido ANTES de abrir o diálogo (quem chama ainda está montado).
Future<bool> readGpsAvailability(WidgetRef ref) =>
    ref.read(gpsAvailableProvider.future).catchError((_) => false);

/// B-SAN3-26 — abre o diálogo de chegada da OS. Usado pelo botão "Cheguei ao local" e pelo "Confirmar a placa de novo"
/// do cartão de conflito. `showDialog` é chamado na hora: o diálogo vive no navegador, mesmo que o cartão saia da tela.
Future<ArrivalConfirmation?> showArrivalConfirmationDialog(
  BuildContext context,
  WorkOrder wo, {
  required bool gpsOk,
}) {
  return showDialog<ArrivalConfirmation>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _PlateDialog(wo: wo, gpsOk: gpsOk),
  );
}

String _normalizePlateChars(String raw) =>
    raw.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');

class _PlateDialog extends StatefulWidget {
  const _PlateDialog({required this.wo, required this.gpsOk});

  final WorkOrder wo;
  final bool gpsOk;

  @override
  State<_PlateDialog> createState() => _PlateDialogState();
}

class _PlateDialogState extends State<_PlateDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  // B-SAN3-26 — o esperado é o fim da PLACA do veículo atendido, que o servidor mandou na lista; nunca o código da OS.
  String? get _expected => widget.wo.checkinPlateTail;

  // B-SAN3-26 (N-03) — a dica mostra a placa mascarada, sem o prefixo do código da OS.
  String _maskedHint() => '•••••';

  String get _typed => _normalizePlateChars(_ctrl.text);

  /// Só o modo `plate` compara aqui; no `unknown` (OS em cache antiga) quem decide é o servidor.
  bool get _mismatch {
    final expected = _expected;
    if (widget.wo.checkinMode != CheckinMode.plate || expected == null) {
      return false;
    }
    final typed = _typed;
    return typed.length == 2 && typed != _normalizePlateChars(expected);
  }

  void _confirm() {
    Navigator.of(context).pop(ArrivalConfirmation(lastDigits: _typed));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.wo.checkinMode == CheckinMode.referenceMissing) {
      return const _MissingReferenceNotice();
    }
    final cs = Theme.of(context).colorScheme;
    final canConfirmWithoutDigits = widget.wo.checkinMode == CheckinMode.exempt;
    final hint = _maskedHint();
    final error = _mismatch;
    final canConfirm =
        widget.gpsOk &&
        (canConfirmWithoutDigits || (_typed.length == 2 && !error));

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: cs.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  canConfirmWithoutDigits
                      ? Icons.location_on_outlined
                      : Icons.local_shipping_outlined,
                  color: cs.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      canConfirmWithoutDigits
                          ? 'Confirmar chegada'
                          : 'Confirmar veículo',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(
                      canConfirmWithoutDigits
                          ? 'Serviço sem placa: confirme que você chegou ao local.'
                          : 'Informe os 2 últimos dígitos da placa do veículo',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // GPS chip
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: widget.gpsOk
                  ? Colors.green.shade50
                  : cs.errorContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(
                  widget.gpsOk ? Icons.gps_fixed : Icons.gps_off_outlined,
                  size: 14,
                  color: widget.gpsOk ? Colors.green.shade700 : cs.error,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    widget.gpsOk
                        ? 'GPS ligado'
                        : 'Ative o GPS para confirmar que chegou ao local',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: widget.gpsOk ? Colors.green.shade700 : cs.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (!canConfirmWithoutDigits) ...[
            const SizedBox(height: 14),
            // 2-digit input
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  hint,
                  key: const Key('plate-masked-hint'),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontFamily: 'monospace',
                    color: cs.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 4),
                SizedBox(
                  width: 64,
                  child: TextField(
                    key: const Key('plate-input'),
                    controller: _ctrl,
                    autofocus: true,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.text,
                    maxLength: 2,
                    textCapitalization: TextCapitalization.characters,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      counterText: '',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: error ? cs.error : cs.outline,
                          width: 1.5,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: error ? cs.error : cs.outline,
                          width: 1.5,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(
                          color: error ? cs.error : cs.primary,
                          width: 2,
                        ),
                      ),
                    ),
                    style: Theme.of(
                      context,
                    ).textTheme.titleLarge?.copyWith(fontFamily: 'monospace'),
                  ),
                ),
              ],
            ),
          ],
          if (error) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.error_outline, size: 14, color: cs.error),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Os dígitos não conferem com a placa do veículo.',
                    style: Theme.of(
                      context,
                    ).textTheme.labelSmall?.copyWith(color: cs.error),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          key: const Key('plate-cancel'),
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const Key('plate-confirm'),
          onPressed: !canConfirm
              ? null
              : canConfirmWithoutDigits
              ? () => Navigator.of(context).pop(const ArrivalConfirmation())
              : _confirm,
          child: const Text('Confirmar chegada'),
        ),
      ],
    );
  }
}

/// B-SAN3-26 (decisão B do dono) — a OS sem placa não confirma a chegada pelo app: o guincheiro pede à base.
class _MissingReferenceNotice extends StatelessWidget {
  const _MissingReferenceNotice();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return AlertDialog(
      key: const Key('checkin-reference-missing-notice'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      content: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: cs.primary),
          const SizedBox(width: 12),
          const Expanded(child: Text(kCheckinMissingReferenceMessage)),
        ],
      ),
      actions: [
        FilledButton(
          key: const Key('plate-missing-close'),
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Entendi'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// "Não foi possível iniciar"
// ---------------------------------------------------------------------------

/// Abre a folha "Não foi possível iniciar". [onSubmit] recebe o motivo e a explicação.
Future<void> showUnableToStartSheet(
  BuildContext context, {
  required Future<void> Function(String reason, String note) onSubmit,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _BlockSheet(onSubmit: onSubmit),
  );
}

class _BlockSheet extends StatefulWidget {
  const _BlockSheet({required this.onSubmit});

  final Future<void> Function(String reason, String note) onSubmit;

  @override
  State<_BlockSheet> createState() => _BlockSheetState();
}

class _BlockSheetState extends State<_BlockSheet> {
  static const _reasons = [
    'Cliente ausente no local',
    'Endereço não localizado',
    'Veículo inacessível / impedimento',
    'Condições de segurança',
    'Outro motivo',
  ];

  String? _reason;
  String _note = '';
  bool _submitting = false;

  bool get _canSubmit => _reason != null && _note.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          const SizedBox(height: 12),
          Container(
            width: 38,
            height: 4,
            decoration: BoxDecoration(
              color: cs.outlineVariant,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 14),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: cs.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.warning_amber_outlined,
                    color: cs.error,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Não foi possível iniciar',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      Text(
                        'Registre o motivo para avisar a central',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Reasons
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Motivo',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final r in _reasons)
                    GestureDetector(
                      onTap: () => setState(() => _reason = r),
                      child: Container(
                        key: Key('block-reason-$r'),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 13,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: _reason == r ? cs.primary : cs.outline,
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          color: _reason == r
                              ? cs.primaryContainer.withValues(alpha: 0.3)
                              : null,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: _reason == r
                                      ? cs.primary
                                      : cs.outlineVariant,
                                  width: 2,
                                ),
                              ),
                              child: _reason == r
                                  ? Center(
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: cs.primary,
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 11),
                            Expanded(
                              child: Text(
                                r,
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    'Explicação',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('block-note'),
                    maxLines: 3,
                    onChanged: (v) => setState(() => _note = v),
                    decoration: InputDecoration(
                      hintText:
                          'Descreva o que impediu o início do atendimento…',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          // Buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    key: const Key('block-submit'),
                    onPressed: _canSubmit && !_submitting
                        ? () async {
                            setState(() => _submitting = true);
                            try {
                              await widget.onSubmit(_reason!, _note.trim());
                              if (context.mounted) Navigator.of(context).pop();
                            } finally {
                              if (mounted) setState(() => _submitting = false);
                            }
                          }
                        : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: _canSubmit
                          ? Theme.of(context).colorScheme.error
                          : null,
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Avisar a central'),
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
