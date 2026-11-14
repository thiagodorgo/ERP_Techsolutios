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

/// B-SAN3-15b (`D-PADRAO-BLOCOS-CLICAVEIS`; contrato único das Emendas 5.2 §2.1 e 5.3 §1 a §4, compartilhado com o
/// B-SAN3-17) — a linha de uma altura que abre o detalhe logo abaixo.
///
/// - A linha tem a altura [rowHeight] (o alvo de toque do app, 48) e nenhum botão dentro: toque, Enter e Espaço chamam
///   [onToggle]. "Um detalhe aberto por vez" é da tela: a peça não guarda estado.
/// - [title] fica num `Text` só dele; [meta] em outro, de uma linha. A linha corta pelo fim: o título leva a largura
///   natural dele e o meta fica com o que sobra; se o título sozinho passa do espaço, ele corta com reticências e o
///   meta some. Sem vão enquanto houver texto cortado, e sem estouro em tela nenhuma a partir de 320.
/// - A `key` passada à peça identifica a peça INTEIRA (a linha e o detalhe aberto); para fechar pela tela, toca-se no
///   título.
/// - A seta e o fundo da linha aberta são da peça: a seta gira e fica azul; o fundo aberto é o azul claro da pílula
///   de informação da biblioteca (`MobilePill`, `PillTone.info`), porque o tema não tem token com esse valor.
/// - (J-564 C3-03) Também são da peça, porque as duas maquetes os têm iguais: a linha inteira (título e meta) em peso
///   normal e na cor do texto forte (`.ln`), e o detalhe aberto com fundo e borda de cima e de baixo (`.det`). O tema
///   não tem #F8FAFF nem #DBEAFE: o fundo é a cor do tema mais próxima de #F8FAFF (`surfaceBright`) e a borda, a mais
///   próxima de #DBEAFE (`primaryContainer`). O recuo interno do detalhe continua de quem cria a peça.
/// - [trailing] é pílula ou marca, nunca botão.
class MobileExpandableRow extends StatelessWidget {
  const MobileExpandableRow({
    required this.title,
    required this.expanded,
    required this.onToggle,
    required this.detail,
    this.meta,
    this.leading,
    this.trailing,
    super.key,
  }) : assert(
         trailing is! ButtonStyleButton && trailing is! IconButton,
         'trailing não pode ser botão',
       );

  static const double rowHeight = 48;

  final String title;
  final bool expanded;
  final VoidCallback onToggle;
  final Widget detail;
  final String? meta;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final openFill = MobilePill.colorsFor(PillTone.info).$1;
    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: expanded,
          child: Material(
            color: expanded ? openFill : Colors.transparent,
            child: InkWell(
              onTap: onToggle,
              child: SizedBox(
                height: rowHeight,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 6, 0),
                  child: Row(
                    children: [
                      if (leading != null) ...[
                        leading!,
                        const SizedBox(width: 10),
                      ],
                      Expanded(
                        child: _RowTexts(title: title, meta: meta),
                      ),
                      if (trailing != null) ...[
                        const SizedBox(width: 10),
                        trailing!,
                      ],
                      const SizedBox(width: 4),
                      AnimatedRotation(
                        turns: expanded ? 0.25 : 0,
                        duration: const Duration(milliseconds: 150),
                        child: Icon(
                          Icons.chevron_right,
                          size: 20,
                          color: expanded
                              ? ErpMobileTheme.primary
                              : ErpMobileTheme.inkFaint,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        if (expanded)
          DecoratedBox(
            decoration: BoxDecoration(
              color: scheme.surfaceBright,
              border: Border.symmetric(
                horizontal: BorderSide(color: scheme.primaryContainer),
              ),
            ),
            child: detail,
          ),
      ],
    );
  }
}

/// O título e o meta da [MobileExpandableRow]: o meta fica limitado a "largura do texto − largura natural do título"
/// (no mínimo 0), medida com um `TextPainter` no MESMO estilo do título (Emenda 5.3 §1.2, a forma recomendada).
class _RowTexts extends StatelessWidget {
  const _RowTexts({required this.title, this.meta});

  final String title;
  final String? meta;

  double _naturalTitleWidth(BuildContext context, TextStyle? style) {
    final painter = TextPainter(
      text: TextSpan(
        text: title,
        style: DefaultTextStyle.of(context).style.merge(style),
      ),
      maxLines: 1,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      locale: Localizations.maybeLocaleOf(context),
    )..layout();
    final width = painter.width.ceilToDouble();
    painter.dispose();
    return width;
  }

  @override
  Widget build(BuildContext context) {
    // J-564 C3-03 — a linha inteira num estilo só: peso normal, na cor do texto forte (`.ln`, 14 px, #0F172A).
    final titleStyle = Theme.of(context).textTheme.bodyMedium?.copyWith(
      color: ErpMobileTheme.ink,
      fontWeight: FontWeight.w400,
    );
    final metaStyle = titleStyle;
    final meta = this.meta;
    return LayoutBuilder(
      builder: (context, constraints) {
        final metaMax = meta == null
            ? 0.0
            : (constraints.maxWidth - _naturalTitleWidth(context, titleStyle))
                  .clamp(0.0, constraints.maxWidth);
        return Row(
          children: [
            Flexible(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: titleStyle,
              ),
            ),
            if (meta != null)
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: metaMax),
                child: Text(
                  meta,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: metaStyle,
                ),
              ),
          ],
        );
      },
    );
  }
}
