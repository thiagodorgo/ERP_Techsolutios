import 'package:flutter/material.dart';

import '../theme/erp_mobile_theme.dart';

/// Biblioteca de componentes fiéis ao protótipo (screen-refs/mobile).
///
/// Reproduz — pixel a pixel — os padrões do ERP Mobile: header navy da Home,
/// header branco com voltar nas telas internas, pílulas de status/prioridade,
/// cartões de OS com faixa lateral, tiles de resumo/atalho, barra inferior de
/// navegação (Início/OS/Mapa/Finanças/Perfil) e barra fixa de ações.
///
/// Widgets usam tokens explícitos (não dependem do ColorScheme) para garantir
/// fidelidade — mesma abordagem dos estilos inline no web.

// ---------------------------------------------------------------------------
// Pílula de status / prioridade / chip informativo
// ---------------------------------------------------------------------------

enum PillTone { info, scheduled, done, danger, purple, neutral, warning }

class MobilePill extends StatelessWidget {
  const MobilePill({
    required this.label,
    this.tone = PillTone.neutral,
    super.key,
  });

  final String label;
  final PillTone tone;

  static (Color bg, Color fg) colorsFor(PillTone tone) => switch (tone) {
    PillTone.info => (const Color(0xFFEFF6FF), ErpMobileTheme.info),
    PillTone.scheduled ||
    PillTone.warning => (const Color(0xFFFFFBEB), ErpMobileTheme.warning),
    PillTone.done => (const Color(0xFFECFDF5), ErpMobileTheme.success),
    PillTone.danger => (const Color(0xFFFEF2F2), ErpMobileTheme.danger),
    PillTone.purple => (const Color(0xFFF5F3FF), ErpMobileTheme.purple),
    PillTone.neutral => (const Color(0xFFF1F5F9), const Color(0xFF475569)),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = colorsFor(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
          height: 1.2,
        ),
      ),
    );
  }
}

/// Mapeia o "tone" textual usado pelo domínio (success/warning/danger/info/…)
/// para a [PillTone] visual do protótipo.
PillTone pillToneFromStatus(String status) => switch (status) {
  'success' => PillTone.done,
  'warning' => PillTone.scheduled,
  'danger' => PillTone.danger,
  'info' => PillTone.info,
  'purple' => PillTone.purple,
  _ => PillTone.neutral,
};

// ---------------------------------------------------------------------------
// Rótulo de seção (RESUMO DE HOJE, ATALHOS OPCIONAIS, MINHAS OS…)
// ---------------------------------------------------------------------------

class MobileSectionLabel extends StatelessWidget {
  const MobileSectionLabel(this.text, {this.padding, super.key});

  final String text;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
          color: ErpMobileTheme.inkFaint,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header navy da Home (saudação + ações)
// ---------------------------------------------------------------------------

class MobileNavyHeader extends StatelessWidget {
  const MobileNavyHeader({
    required this.greeting,
    required this.subtitle,
    this.actions = const <Widget>[],
    super.key,
  });

  final String greeting;
  final String subtitle;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, topPad + 16, 16, 22),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [ErpMobileTheme.navy, ErpMobileTheme.navy2],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF9FB4CC),
                  ),
                ),
              ],
            ),
          ),
          ...actions,
        ],
      ),
    );
  }
}

/// Botão de ícone circular do header navy (com badge opcional).
class MobileHeaderIconButton extends StatelessWidget {
  const MobileHeaderIconButton({
    required this.icon,
    required this.onPressed,
    this.badgeCount,
    this.tooltip,
    super.key,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final int? badgeCount;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final button = InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.10),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 19, color: Colors.white),
      ),
    );

    final withBadge = (badgeCount != null && badgeCount! > 0)
        ? Stack(
            clipBehavior: Clip.none,
            children: [
              button,
              Positioned(
                right: -2,
                top: -2,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$badgeCount',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          )
        : button;

    final padded = Padding(
      padding: const EdgeInsets.only(left: 8),
      child: withBadge,
    );
    return tooltip != null ? Tooltip(message: tooltip!, child: padded) : padded;
  }
}

// ---------------------------------------------------------------------------
// Header branco das telas internas (voltar + título + subtítulo + trailing)
// ---------------------------------------------------------------------------

class MobileScreenHeader extends StatelessWidget {
  const MobileScreenHeader({
    required this.title,
    this.subtitle,
    this.onBack,
    this.trailing,
    super.key,
  });

  final String title;
  final String? subtitle;
  final VoidCallback? onBack;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Container(
      color: Colors.white,
      padding: EdgeInsets.fromLTRB(12, topPad + 10, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (onBack != null)
            IconButton(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back, color: ErpMobileTheme.ink),
              tooltip: 'Voltar',
              splashRadius: 22,
            )
          else
            const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: ErpMobileTheme.ink,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: ErpMobileTheme.inkMuted,
                    ),
                  ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tile de resumo (valor colorido + rótulo)
// ---------------------------------------------------------------------------

class MobileStatTile extends StatelessWidget {
  const MobileStatTile({
    required this.value,
    required this.label,
    required this.color,
    super.key,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tile de atalho (ícone circular + rótulo)
// ---------------------------------------------------------------------------

class MobileActionTile extends StatelessWidget {
  const MobileActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ErpMobileTheme.cardBorder),
        ),
        child: Column(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 19, color: const Color(0xFF475569)),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: ErpMobileTheme.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cartão de OS (faixa lateral por prioridade + metadados + chips)
// ---------------------------------------------------------------------------

class MobileOsCard extends StatelessWidget {
  const MobileOsCard({
    required this.code,
    required this.title,
    required this.customerLine,
    required this.accentColor,
    this.priorityLabel,
    this.priorityTone = PillTone.neutral,
    this.statusLabel,
    this.statusTone = PillTone.scheduled,
    this.address,
    this.time,
    this.vehicleLabel,
    this.pendingChips = const <(String, PillTone)>[],
    this.onTap,
    super.key,
  });

  final String code;
  final String title;
  final String customerLine;
  final Color accentColor;
  final String? priorityLabel;
  final PillTone priorityTone;
  final String? statusLabel;
  final PillTone statusTone;
  final String? address;
  final String? time;
  final String? vehicleLabel;
  final List<(String, PillTone)> pendingChips;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 4, color: accentColor),
            Expanded(
              child: InkWell(
                onTap: onTap,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            code,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: ErpMobileTheme.inkFaint,
                            ),
                          ),
                          if (priorityLabel != null) ...[
                            const SizedBox(width: 8),
                            MobilePill(
                              label: priorityLabel!,
                              tone: priorityTone,
                            ),
                          ],
                          const Spacer(),
                          if (statusLabel != null)
                            MobilePill(label: statusLabel!, tone: statusTone),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                          color: ErpMobileTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        customerLine,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: ErpMobileTheme.inkMuted,
                        ),
                      ),
                      if (address != null) ...[
                        const SizedBox(height: 4),
                        _IconLine(icon: Icons.place_outlined, text: address!),
                      ],
                      Row(
                        children: [
                          if (time != null) ...[
                            const SizedBox(height: 4),
                            Expanded(
                              child: _IconLine(
                                icon: Icons.schedule_outlined,
                                text: time!,
                              ),
                            ),
                          ] else
                            const Spacer(),
                          if (vehicleLabel != null)
                            MobilePill(
                              label: vehicleLabel!,
                              tone: PillTone.info,
                            ),
                        ],
                      ),
                      if (pendingChips.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            for (final (label, tone) in pendingChips)
                              MobilePill(label: label, tone: tone),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IconLine extends StatelessWidget {
  const _IconLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: ErpMobileTheme.inkFaint),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Barra fixa inferior de ações (ex.: Mapa + Iniciar atendimento)
// ---------------------------------------------------------------------------

class MobileStickyBar extends StatelessWidget {
  const MobileStickyBar({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: ErpMobileTheme.cardBorder)),
      ),
      child: Row(children: children),
    );
  }
}

// ---------------------------------------------------------------------------
// Barra de navegação inferior (Início · OS · Mapa · Finanças · Perfil)
// ---------------------------------------------------------------------------

class MobileBottomNavItem {
  const MobileBottomNavItem({required this.icon, required this.label});
  final IconData icon;
  final String label;
}

class MobileBottomNav extends StatelessWidget {
  const MobileBottomNav({
    required this.currentIndex,
    required this.onTap,
    super.key,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const items = <MobileBottomNavItem>[
    MobileBottomNavItem(icon: Icons.home_outlined, label: 'Início'),
    MobileBottomNavItem(icon: Icons.assignment_outlined, label: 'OS'),
    MobileBottomNavItem(icon: Icons.place_outlined, label: 'Mapa'),
    MobileBottomNavItem(icon: Icons.attach_money_outlined, label: 'Finanças'),
    MobileBottomNavItem(icon: Icons.person_outline, label: 'Perfil'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: ErpMobileTheme.cardBorder)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom),
      child: SizedBox(
        height: 58,
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++)
              Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: _NavCell(item: items[i], active: i == currentIndex),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NavCell extends StatelessWidget {
  const _NavCell({required this.item, required this.active});

  final MobileBottomNavItem item;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? ErpMobileTheme.primary : ErpMobileTheme.inkFaint;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(item.icon, size: 22, color: color),
        const SizedBox(height: 3),
        Text(
          item.label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: active ? FontWeight.w700 : FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
