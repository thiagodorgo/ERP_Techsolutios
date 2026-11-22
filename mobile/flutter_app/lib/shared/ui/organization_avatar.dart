// B-APP-ORG-2 (A2; Emenda 1.8 §3.3 e §5.2): o avatar de iniciais da
// organização sai de `features/auth/tenant_selector_screen.dart` para cá, sem
// mudança, porque o Entrar e a lista de chamados o usam.
import 'package:flutter/material.dart';

const _avatarColors = <(Color, Color)>[
  (Color(0xFFEFF6FF), Color(0xFF2563EB)),
  (Color(0xFFECFDF5), Color(0xFF059669)),
  (Color(0xFFFFFBEB), Color(0xFFD97706)),
  (Color(0xFFF5F3FF), Color(0xFF7C3AED)),
];

/// O avatar de iniciais da organização (o da Seleção de organização desde
/// antes do B-APP-ORG; usado no passo de escolha do Entrar e nos blocos de
/// "Outros pátios" da lista de chamados).
class OrganizationAvatar extends StatelessWidget {
  const OrganizationAvatar({
    required this.name,
    required this.index,
    this.size = 28,
    super.key,
  });

  final String name;
  final int index;
  final double size;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    final first = parts.isNotEmpty && parts[0].isNotEmpty ? parts[0][0] : 'O';
    final second = parts.length > 1 && parts[1].isNotEmpty ? parts[1][0] : '';
    return (first + second).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _avatarColors[index % _avatarColors.length];
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(size * 0.3),
        ),
        alignment: Alignment.center,
        child: Text(
          _initials,
          style: TextStyle(
            color: fg,
            fontWeight: FontWeight.w800,
            fontSize: size > 32 ? 13 : 11,
          ),
        ),
      ),
    );
  }
}
