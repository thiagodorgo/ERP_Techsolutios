import 'dart:ui';

/// Serialização de traços de assinatura para persistência local/sync.
///
/// A assinatura é uma lista de traços; cada traço é uma lista de pontos.
/// Formato compacto: traços separados por `;`, pontos por ` `, coordenadas
/// por `,` (uma casa decimal). Isso permite persistir a assinatura como
/// texto no `answer.textValue` — restaurando o desenho ao reabrir o checklist.
class SignatureStrokes {
  const SignatureStrokes._();

  static String encode(List<List<Offset>> strokes) {
    return strokes
        .where((stroke) => stroke.isNotEmpty)
        .map(
          (stroke) => stroke
              .map(
                (p) => '${p.dx.toStringAsFixed(1)},${p.dy.toStringAsFixed(1)}',
              )
              .join(' '),
        )
        .join(';');
  }

  static List<List<Offset>> decode(String? data) {
    if (data == null || data.trim().isEmpty) return const [];
    return data
        .split(';')
        .where((stroke) => stroke.trim().isNotEmpty)
        .map(
          (stroke) => stroke.split(' ').where((p) => p.contains(',')).map((p) {
            final parts = p.split(',');
            return Offset(
              double.tryParse(parts[0]) ?? 0,
              double.tryParse(parts[1]) ?? 0,
            );
          }).toList(),
        )
        .where((stroke) => stroke.isNotEmpty)
        .toList();
  }

  /// True se há ao menos um traço com pontos (assinatura não vazia).
  static bool hasInk(String? data) => decode(data).isNotEmpty;
}
