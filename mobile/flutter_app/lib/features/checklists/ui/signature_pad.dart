import 'dart:ui' show PointMode;

import 'package:flutter/material.dart';

import '../domain/signature_strokes.dart';

/// Controlador dos traços de uma assinatura em captura.
class SignaturePadController extends ChangeNotifier {
  SignaturePadController({String? initial})
    : _strokes = initial == null
          ? <List<Offset>>[]
          : SignatureStrokes.decode(
              initial,
            ).map((s) => List<Offset>.from(s)).toList();

  final List<List<Offset>> _strokes;

  List<List<Offset>> get strokes =>
      _strokes.map((s) => List<Offset>.unmodifiable(s)).toList();

  bool get isEmpty => _strokes.every((s) => s.isEmpty);
  bool get isNotEmpty => !isEmpty;

  void startStroke(Offset point) {
    _strokes.add(<Offset>[point]);
    notifyListeners();
  }

  void extendStroke(Offset point) {
    if (_strokes.isEmpty) {
      _strokes.add(<Offset>[point]);
    } else {
      _strokes.last.add(point);
    }
    notifyListeners();
  }

  void clear() {
    _strokes.clear();
    notifyListeners();
  }

  String encode() => SignatureStrokes.encode(_strokes);
}

/// Canvas de assinatura — desenho a dedo. Somente leitura quando [readOnly].
class SignaturePad extends StatelessWidget {
  const SignaturePad({
    required this.controller,
    this.height = 180,
    this.readOnly = false,
    super.key,
  });

  final SignaturePadController controller;
  final double height;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final canvas = AnimatedBuilder(
      animation: controller,
      builder: (context, _) => CustomPaint(
        painter: _SignaturePainter(
          strokes: controller.strokes,
          color: scheme.onSurface,
        ),
        size: Size.infinite,
      ),
    );

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        border: Border.all(color: scheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: readOnly
          ? canvas
          : GestureDetector(
              onPanStart: (d) => controller.startStroke(d.localPosition),
              onPanUpdate: (d) => controller.extendStroke(d.localPosition),
              child: canvas,
            ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  _SignaturePainter({required this.strokes, required this.color});

  final List<List<Offset>> strokes;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    for (final stroke in strokes) {
      if (stroke.length == 1) {
        canvas.drawPoints(PointMode.points, stroke, paint);
      } else {
        for (var i = 0; i < stroke.length - 1; i++) {
          canvas.drawLine(stroke[i], stroke[i + 1], paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter old) => true;
}

/// Abre o modal de captura de assinatura. Retorna os traços codificados
/// (string) ao confirmar, ou `null` se cancelado.
Future<String?> showSignatureCaptureSheet(
  BuildContext context, {
  required String title,
  String? initial,
}) {
  final controller = SignaturePadController(initial: initial);
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) {
      return Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(sheetContext).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Assine no quadro abaixo',
              style: Theme.of(sheetContext).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            SignaturePad(controller: controller),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    key: const Key('signature-clear'),
                    onPressed: controller.clear,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Limpar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextButton(
                    key: const Key('signature-cancel'),
                    onPressed: () => Navigator.of(sheetContext).pop(),
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AnimatedBuilder(
                    animation: controller,
                    builder: (context, _) => FilledButton(
                      key: const Key('signature-confirm'),
                      onPressed: controller.isEmpty
                          ? null
                          : () => Navigator.of(
                              sheetContext,
                            ).pop(controller.encode()),
                      child: const Text('Confirmar'),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    },
  );
}
