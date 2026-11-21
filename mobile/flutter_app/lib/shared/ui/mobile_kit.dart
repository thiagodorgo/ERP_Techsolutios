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
///
/// Peças registradas por bloco (no fim do arquivo, cada uma com o seu
/// cabeçalho): `MobileSkeletonList`, o esqueleto de lista no carregando
/// (B-APP-ORG-2, A2; Emenda 1.8.3.7, Adendo 1).

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
    this.onTap,
    this.selected = false,
    this.icon,
    super.key,
  });

  final String value;
  final String label;
  final Color color;

  /// B-APP-APARENCIA (F1) — o bloco como botão (opção C da localização): com
  /// [onTap], é botão para o leitor de tela ([selected] diz se é o aberto),
  /// com foco visível e Enter/Espaço. Sem [onTap], [selected] e [icon], a peça
  /// desenha exatamente como antes.
  final VoidCallback? onTap;
  final bool selected;

  /// Com [icon], o bloco compacto: o ícone num círculo no tom [color], o valor
  /// curto em negrito e o rótulo embaixo (o `c-tile` da maquete).
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final icon = this.icon;
    final onTap = this.onTap;
    final tile = icon == null ? _valueTile() : _iconTile(icon);
    if (onTap == null) return tile;
    return _TappableBlock(
      selected: selected,
      onTap: onTap,
      radius: 14,
      child: tile,
    );
  }

  BoxDecoration get _decoration => BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(14),
    border: Border.all(
      color: selected ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
      width: selected ? 1.5 : 1,
    ),
  );

  Widget _iconTile(IconData icon) {
    return Container(
      constraints: const BoxConstraints(minHeight: 84),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      decoration: _decoration,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.12),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              height: 1.28,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _valueTile() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: _decoration,
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
  const MobileStickyBar({
    required this.children,
    this.supportingText,
    this.supportingTextColor,
    super.key,
  });

  final List<Widget> children;

  /// B-APP-APARENCIA (F2) — o texto de apoio, centrado acima das ações (a
  /// barra da opção B da execução do guincho). Sem ele, a barra desenha como
  /// antes.
  final String? supportingText;

  /// A cor do texto de apoio; o padrão é o cinza das frases do kit.
  final Color? supportingTextColor;

  @override
  Widget build(BuildContext context) {
    final row = Row(children: children);
    final text = supportingText;
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
      child: text == null
          ? row
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  text,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    height: 16 / 12,
                    color: supportingTextColor ?? _textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                row,
              ],
            ),
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

// ---------------------------------------------------------------------------
// B-APP-APARENCIA (F1) — peças das aparências B e C da localização
// (`localizacao-consentimento-3opcoes.reference.html`). Cada uma tem 1 linha
// em COMPONENT_LIBRARY.md.
// ---------------------------------------------------------------------------

/// O verde de texto sobre fundo claro (o `#047857` da maquete): o
/// [ErpMobileTheme.success] dá 3,8:1 em texto pequeno, abaixo de AA.
const _successInk = Color(0xFF047857);

/// O cinza das frases das peças novas (o `#475569` da maquete, 6,9:1 sobre o
/// branco).
const _textSecondary = Color(0xFF475569);

/// O toque, o foco visível e a semântica de botão dos blocos clicáveis do kit
/// ([MobileStatTile], [MobileStatusBlock] e [MobileStatusCard]). Enter e Espaço
/// ativam o `InkWell` pelos atalhos padrão do app.
class _TappableBlock extends StatelessWidget {
  const _TappableBlock({
    required this.selected,
    required this.onTap,
    required this.radius,
    required this.child,
  });

  final bool selected;
  final VoidCallback onTap;
  final double radius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(radius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(radius),
          focusColor: ErpMobileTheme.primary.withValues(alpha: 0.16),
          child: child,
        ),
      ),
    );
  }
}

/// A apresentação centrada (opção B, antes da decisão): o ícone num quadrado
/// azul-claro, o título e a frase.
class MobileIntroHeader extends StatelessWidget {
  const MobileIntroHeader({
    required this.icon,
    required this.title,
    required this.message,
    super.key,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final (bg, _) = MobilePill.colorsFor(PillTone.info);
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, size: 28, color: ErpMobileTheme.primary),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
              height: 1.25,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                height: 19 / 13.5,
                color: _textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// O bloco curto de situação (opção B): o rótulo em caixa alta e o valor com
/// a bolinha do tom. Com [onTap], é botão (como o [MobileStatTile]).
class MobileStatusBlock extends StatelessWidget {
  const MobileStatusBlock({
    required this.label,
    required this.value,
    this.tone = PillTone.neutral,
    this.onTap,
    this.selected = false,
    this.showDot = true,
    this.valueFontSize = 13,
    super.key,
  });

  final String label;
  final String value;

  /// Sem a bolinha do tom (o "Sua decisão" da opção B, como a maquete).
  final bool showDot;

  /// O tamanho do valor (13 px; menos quando a palavra mais longa não cabe:
  /// [mobileStatusBlockFontSize]).
  final double valueFontSize;

  /// [PillTone.done] verde, [PillTone.warning] âmbar, [PillTone.danger]
  /// vermelho; o resto, neutro.
  final PillTone tone;
  final VoidCallback? onTap;
  final bool selected;

  (Color, Color) get _dotAndText => switch (tone) {
    PillTone.done => (ErpMobileTheme.success, _successInk),
    PillTone.warning ||
    PillTone.scheduled => (ErpMobileTheme.warning, ErpMobileTheme.warningInk),
    PillTone.danger => (ErpMobileTheme.danger, ErpMobileTheme.dangerInk),
    _ => (ErpMobileTheme.inkFaint, _textSecondary),
  };

  @override
  Widget build(BuildContext context) {
    final (dot, text) = _dotAndText;
    final block = Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              height: 1.4,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              if (showDot) ...[
                Container(
                  key: const Key('mobile-status-block-dot'),
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
                ),
                const SizedBox(width: 5),
              ],
              Flexible(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: valueFontSize,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0,
                    height: 17 / valueFontSize,
                    color: text,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
    final onTap = this.onTap;
    if (onTap == null) return block;
    return _TappableBlock(
      selected: selected,
      onTap: onTap,
      radius: 12,
      child: block,
    );
  }
}

/// O tamanho do valor de um [MobileStatusBlock] com [blockWidth] de largura:
/// 13 px, ou menos (até 10,5 px) quando a palavra mais longa não cabe. Assim a
/// palavra nunca quebra no meio (CV-1 da conferência visual do #583:
/// "Consentimento" em 3 colunas a 360 px). Quem monta a fileira de blocos mede
/// a largura (`LayoutBuilder` por fora do `IntrinsicHeight`).
double mobileStatusBlockFontSize(
  BuildContext context,
  String value, {
  required double blockWidth,
  bool showDot = true,
}) {
  const size = 13.0;
  // o recuo interno (10 + 10), a borda (1 + 1), a bolinha (7 + 5) e 2 px de
  // folga para o arredondamento do texto
  final maxWidth = blockWidth - 24 - (showDot ? 12 : 0);
  if (!maxWidth.isFinite || maxWidth <= 0) return size;
  const style = TextStyle(
    fontSize: size,
    fontWeight: FontWeight.w800,
    letterSpacing: 0,
  );
  var widest = 0.0;
  for (final word in value.split(' ')) {
    final painter = TextPainter(
      text: TextSpan(
        text: word,
        style: DefaultTextStyle.of(context).style.merge(style),
      ),
      maxLines: 1,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    if (painter.width > widest) widest = painter.width;
    painter.dispose();
  }
  if (widest <= maxWidth) return size;
  return (size * maxWidth / widest).clamp(10.5, size);
}

/// O cartão de situação (opção B, depois da decisão): verde, com o ícone num
/// círculo, quando [success]; senão, o cartão neutro (nunca verde).
class MobileStatusCard extends StatelessWidget {
  const MobileStatusCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.success = false,
    this.onTap,
    super.key,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool success;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (successBg, _) = MobilePill.colorsFor(PillTone.done);
    final card = Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: success ? successBg : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: success ? const Color(0xFFA7F3D0) : ErpMobileTheme.cardBorder,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: success
                  ? ErpMobileTheme.success
                  : ErpMobileTheme.cardBorder,
            ),
            child: Icon(
              icon,
              size: 22,
              color: success ? Colors.white : _textSecondary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    height: 20 / 15,
                    color: success
                        ? const Color(0xFF065F46)
                        : ErpMobileTheme.ink,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 17 / 12.5,
                    color: success ? _successInk : _textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
    final onTap = this.onTap;
    if (onTap == null) return card;
    return _TappableBlock(
      selected: false,
      onTap: onTap,
      radius: 14,
      child: card,
    );
  }
}

/// O botão de contorno no vermelho do tema (o "Revogar consentimento" das
/// opções B e C), com alvo de 48 px.
class MobileDangerOutlineButton extends StatelessWidget {
  const MobileDangerOutlineButton({
    required this.label,
    required this.onPressed,
    this.icon,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget? icon;

  @override
  Widget build(BuildContext context) {
    final style = OutlinedButton.styleFrom(
      foregroundColor: ErpMobileTheme.dangerInk,
      minimumSize: const Size.fromHeight(48),
      side: const BorderSide(color: Color(0xFFFECACA)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: Theme.of(
        context,
      ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
    );
    final icon = this.icon;
    if (icon == null) {
      return OutlinedButton(
        onPressed: onPressed,
        style: style,
        child: Text(label),
      );
    }
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: style,
      icon: icon,
      label: Text(label),
    );
  }
}

/// A faixa de aviso clara da opção B da localização (o `b-faixa` da maquete):
/// fundo e borda claros do tom, texto escuro do tom e ícone. [PillTone.done]
/// verde, [PillTone.warning] âmbar, [PillTone.danger] vermelho; o resto, azul.
class MobileNoticeBanner extends StatelessWidget {
  const MobileNoticeBanner({
    required this.icon,
    required this.message,
    this.tone = PillTone.neutral,
    super.key,
  });

  final IconData icon;
  final String message;
  final PillTone tone;

  (Color, Color, Color) get _palette => switch (tone) {
    PillTone.done => (
      MobilePill.colorsFor(PillTone.done).$1,
      const Color(0xFFA7F3D0),
      const Color(0xFF065F46),
    ),
    PillTone.warning || PillTone.scheduled => (
      MobilePill.colorsFor(PillTone.warning).$1,
      const Color(0xFFFDE68A),
      ErpMobileTheme.warningInk,
    ),
    PillTone.danger => (
      MobilePill.colorsFor(PillTone.danger).$1,
      const Color(0xFFFECACA),
      ErpMobileTheme.dangerInk,
    ),
    _ => (
      MobilePill.colorsFor(PillTone.info).$1,
      const Color(0xFFBFDBFE),
      const Color(0xFF1E3A8A),
    ),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, border, ink) = _palette;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Icon(icon, size: 16, color: ink),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: 12.5, height: 17 / 12.5, color: ink),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// B-APP-APARENCIA (F2) — peças das aparências B e C da execução do guincho
// (`execucao-guincho-3opcoes.reference.html`). Cada uma tem 1 linha em
// COMPONENT_LIBRARY.md.
// ---------------------------------------------------------------------------

/// O estado de um nó da [MobilePhaseTimeline] (e de uma fase da opção C).
enum MobilePhaseState {
  /// A fase terminou: marca verde com o visto.
  done,

  /// A fase é a de agora: marca azul.
  active,

  /// A fase ainda não começou: marca cinza.
  todo,

  /// A fase está travada (a conclusão espera outra): marca âmbar.
  locked,
}

extension MobilePhaseStateLabel on MobilePhaseState {
  /// O estado dito pelo leitor de tela.
  String get spoken => switch (this) {
    MobilePhaseState.done => 'concluída',
    MobilePhaseState.active => 'atual',
    MobilePhaseState.todo || MobilePhaseState.locked => 'pendente',
  };
}

/// Um nó da [MobilePhaseTimeline]: a marca, o título com as pílulas, a linha
/// de apoio, o progresso opcional e uma peça embaixo (a ação curta ou a linha
/// de comparação).
class MobilePhaseNode {
  const MobilePhaseNode({
    required this.title,
    required this.state,
    required this.marker,
    this.pills = const <Widget>[],
    this.meta,
    this.progress,
    this.progressLabel,
    this.footer,
    this.key,
  });

  final String title;
  final MobilePhaseState state;
  final IconData marker;
  final List<Widget> pills;
  final String? meta;

  /// De 0 a 1: a barra de progresso embaixo da linha de apoio.
  final double? progress;

  /// O nome da barra de progresso para o leitor de tela.
  final String? progressLabel;
  final Widget? footer;
  final Key? key;
}

/// A linha do tempo das fases (opção B da execução do guincho): um título em
/// caixa alta e os nós ligados por um fio, verde até onde já foi feito.
class MobilePhaseTimeline extends StatelessWidget {
  const MobilePhaseTimeline({
    required this.title,
    required this.nodes,
    this.titleTrailing,
    super.key,
  });

  final String title;
  final List<MobilePhaseNode> nodes;
  final Widget? titleTrailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: ErpMobileTheme.inkMuted,
                  ),
                ),
              ),
              ?titleTrailing,
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < nodes.length; i++)
            _PhaseNodeView(node: nodes[i], last: i == nodes.length - 1),
        ],
      ),
    );
  }
}

/// As cores da marca de uma fase: fundo, ícone e, na travada, a borda.
(Color, Color, Color?) _phaseMarkerColors(MobilePhaseState state) =>
    switch (state) {
      MobilePhaseState.done => (ErpMobileTheme.success, Colors.white, null),
      MobilePhaseState.active => (ErpMobileTheme.primary, Colors.white, null),
      MobilePhaseState.todo => (
        ErpMobileTheme.cardBorder,
        ErpMobileTheme.inkMuted,
        null,
      ),
      MobilePhaseState.locked => (
        const Color(0xFFFFFBEB),
        ErpMobileTheme.warning,
        const Color(0xFFFCD34D),
      ),
    };

class _PhaseNodeView extends StatelessWidget {
  const _PhaseNodeView({required this.node, required this.last});

  final MobilePhaseNode node;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = _phaseMarkerColors(node.state);
    final todo = node.state == MobilePhaseState.todo;
    final progress = node.progress;
    return IntrinsicHeight(
      key: node.key,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 26,
            child: Column(
              children: [
                ExcludeSemantics(
                  child: Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: bg,
                      shape: BoxShape.circle,
                      border: border == null
                          ? null
                          : Border.all(color: border, width: 1.5),
                    ),
                    child: Icon(node.marker, size: 15, color: fg),
                  ),
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.only(top: 4, bottom: 2),
                      decoration: BoxDecoration(
                        color: node.state == MobilePhaseState.done
                            ? const Color(0xFFA7F3D0)
                            : ErpMobileTheme.cardBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 4 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 26),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            node.title,
                            semanticsLabel:
                                '${node.title}, ${node.state.spoken}',
                            style: TextStyle(
                              fontSize: 15,
                              height: 1.25,
                              fontWeight: FontWeight.w700,
                              color: todo
                                  ? ErpMobileTheme.inkMuted
                                  : ErpMobileTheme.ink,
                            ),
                          ),
                        ),
                        for (final pill in node.pills) ...[
                          const SizedBox(width: 6),
                          pill,
                        ],
                      ],
                    ),
                  ),
                  if (node.meta != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      node.meta!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 17 / 12.5,
                        color: _textSecondary,
                      ),
                    ),
                  ],
                  if (progress != null) ...[
                    const SizedBox(height: 8),
                    Semantics(
                      label: node.progressLabel,
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 4,
                        borderRadius: BorderRadius.circular(2),
                        backgroundColor: ErpMobileTheme.cardBorder,
                        color: ErpMobileTheme.primary,
                      ),
                    ),
                  ],
                  if (node.footer != null) ...[
                    const SizedBox(height: 4),
                    node.footer!,
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// O cartão de uma fase em meia largura (opção C da execução do guincho): o
/// nome em caixa alta e a pílula; o número grande ("12/12"), o progresso, a
/// linha de apoio e a ação curta; ou, sem número, uma frase.
class MobilePhaseCard extends StatelessWidget {
  const MobilePhaseCard({
    required this.label,
    required this.statusLabel,
    required this.statusTone,
    this.current = false,
    this.value,
    this.valueSuffix,
    this.progress,
    this.meta,
    this.metaEmphasis,
    this.message,
    this.actionLabel,
    this.actionSemanticLabel,
    this.actionIcon,
    this.onAction,
    this.width,
    super.key,
  });

  final String label;
  final String statusLabel;
  final PillTone statusTone;

  /// A largura do cartão, quando quem o põe na tela a conhece (a opção C a
  /// mede por fora do `IntrinsicHeight`, que não aceita `LayoutBuilder`
  /// dentro): com ela, a pílula que não cabe nem a 75 % desce para a linha de
  /// baixo. Sem ela, a pílula só encolhe.
  final double? width;

  /// A fase de agora: borda azul.
  final bool current;

  /// O número grande ("7/12") e o que ele conta ("obrigatórios").
  final String? value;
  final String? valueSuffix;

  /// De 0 a 1; completo fica verde.
  final double? progress;
  final String? meta;

  /// Um trecho em destaque depois da linha de apoio ("na fila").
  final String? metaEmphasis;

  /// A frase no lugar do número (a entrega que o servidor não confirmou).
  final String? message;

  /// O texto curto do botão ("Ver", "Abrir", "Continuar") e o nome inteiro
  /// para o leitor de tela ("Ver vistoria de coleta").
  final String? actionLabel;
  final String? actionSemanticLabel;
  final IconData? actionIcon;

  /// Nulo desabilita a ação.
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final done = (progress ?? 0) >= 1;
    final action = actionLabel;
    return Container(
      padding: EdgeInsets.all(current ? 11.5 : 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: current ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
          width: current ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // O nome e a pílula na mesma linha (CV2-2 da conferência da F2). No
          // aperto, a pílula encolhe até 75 %; abaixo disso, desce inteira para
          // a linha de baixo. Nunca quebra no meio da palavra.
          _PhaseCardHeader(
            label: label,
            statusLabel: statusLabel,
            statusTone: statusTone,
            maxWidth: width == null
                ? null
                : width! - 2 * (current ? 11.5 : 12) - 2 * (current ? 1.5 : 1),
          ),
          const SizedBox(height: 6),
          if (message != null)
            Text(
              message!,
              style: const TextStyle(
                fontSize: 12.5,
                height: 17 / 12.5,
                color: _textSecondary,
              ),
            )
          else ...[
            if (value != null)
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: value,
                      style: const TextStyle(
                        fontSize: 24,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                        color: ErpMobileTheme.ink,
                      ),
                    ),
                    if (valueSuffix != null)
                      TextSpan(
                        text: ' $valueSuffix',
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: _textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            if (progress != null) ...[
              const SizedBox(height: 6),
              Semantics(
                label: label,
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                  backgroundColor: ErpMobileTheme.cardBorder,
                  color: done ? ErpMobileTheme.success : ErpMobileTheme.primary,
                ),
              ),
            ],
            if (meta != null) ...[
              const SizedBox(height: 6),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(text: meta),
                    if (metaEmphasis != null)
                      TextSpan(
                        text: ' · $metaEmphasis',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: ErpMobileTheme.warningInk,
                        ),
                      ),
                  ],
                ),
                style: const TextStyle(
                  fontSize: 12,
                  height: 16 / 12,
                  color: _textSecondary,
                ),
              ),
            ],
          ],
          if (action != null) ...[
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              icon: Icon(actionIcon ?? Icons.checklist_outlined, size: 18),
              label: Text(
                action,
                semanticsLabel: actionSemanticLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// O estado de um item da [MobileRequirementList].
enum MobileRequirementState {
  /// Atendido: visto verde.
  met,

  /// Ainda falta: círculo âmbar.
  pending,

  /// Não atendido: o x vermelho.
  unmet,

  /// Só informa (não é exigido): cinza.
  info,

  /// Na fila do aparelho: o sincronizar âmbar.
  queued,
}

/// Um item da [MobileRequirementList]: o estado, o texto e, se quiser, outro
/// ícone (o de "informa" muda com a situação).
class MobileRequirement {
  const MobileRequirement(this.state, this.text, {this.icon});

  final MobileRequirementState state;
  final String text;
  final IconData? icon;
}

/// A lista do que é preciso (opção C da execução do guincho, "Para concluir a
/// OS"; a troca de senha B reaproveita): um ícone por estado e o texto, com o
/// estado dito ao leitor de tela.
class MobileRequirementList extends StatelessWidget {
  const MobileRequirementList({required this.items, super.key});

  final List<MobileRequirement> items;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < items.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          _RequirementRow(item: items[i]),
        ],
      ],
    );
  }
}

class _RequirementRow extends StatelessWidget {
  const _RequirementRow({required this.item});

  final MobileRequirement item;

  @override
  Widget build(BuildContext context) {
    final (
      IconData icon,
      Color iconColor,
      Color ink,
      String spoken,
    ) = switch (item.state) {
      MobileRequirementState.met => (
        Icons.check_circle,
        ErpMobileTheme.success,
        ErpMobileTheme.ink,
        ' (feito)',
      ),
      MobileRequirementState.pending => (
        Icons.radio_button_unchecked,
        ErpMobileTheme.warning,
        ErpMobileTheme.warningInk,
        ' (falta)',
      ),
      MobileRequirementState.unmet => (
        Icons.cancel_outlined,
        ErpMobileTheme.danger,
        ErpMobileTheme.dangerInk,
        ' (não atendido)',
      ),
      MobileRequirementState.info => (
        Icons.info_outline,
        ErpMobileTheme.inkFaint,
        _textSecondary,
        '',
      ),
      MobileRequirementState.queued => (
        Icons.sync_outlined,
        ErpMobileTheme.warning,
        ErpMobileTheme.ink,
        '',
      ),
    };
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ExcludeSemantics(
          child: Icon(item.icon ?? icon, size: 20, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            item.text,
            semanticsLabel: '${item.text}$spoken',
            style: TextStyle(fontSize: 13.5, height: 19 / 13.5, color: ink),
          ),
        ),
      ],
    );
  }
}

/// A borda tracejada de cantos redondos (a linha "Comparar coleta × entrega"
/// da opção B do guincho, `m-row` da maquete): cada traço é desenhado à parte.
class MobileDashedBorder extends StatelessWidget {
  const MobileDashedBorder({
    required this.child,
    this.color = const Color(0xFFBFDBFE),
    this.radius = 10,
    this.dash = 4,
    this.gap = 3,
    this.strokeWidth = 1,
    super.key,
  });

  final Widget child;
  final Color color;
  final double radius;
  final double dash;
  final double gap;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      foregroundPainter: _DashedRRectPainter(
        color: color,
        radius: radius,
        dash: dash,
        gap: gap,
        strokeWidth: strokeWidth,
      ),
      child: child,
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  const _DashedRRectPainter({
    required this.color,
    required this.radius,
    required this.dash,
    required this.gap,
    required this.strokeWidth,
  });

  final Color color;
  final double radius;
  final double dash;
  final double gap;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    final half = strokeWidth / 2;
    final outline = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            half,
            half,
            size.width - strokeWidth,
            size.height - strokeWidth,
          ),
          Radius.circular(radius),
        ),
      );
    for (final metric in outline.computeMetrics()) {
      var start = 0.0;
      while (start < metric.length) {
        final end = start + dash;
        canvas.drawPath(metric.extractPath(start, end), paint);
        start = end + gap;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedRRectPainter old) =>
      old.color != color ||
      old.radius != radius ||
      old.dash != dash ||
      old.gap != gap ||
      old.strokeWidth != strokeWidth;
}

/// O cabeçalho do [MobilePhaseCard]: o nome em caixa alta e a pílula.
class _PhaseCardHeader extends StatelessWidget {
  const _PhaseCardHeader({
    required this.label,
    required this.statusLabel,
    required this.statusTone,
    this.maxWidth,
  });

  final String label;
  final String statusLabel;
  final PillTone statusTone;
  final double? maxWidth;

  static const _labelStyle = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.6,
    color: ErpMobileTheme.inkMuted,
  );

  /// O menor tamanho da pílula antes de ela descer para a linha de baixo.
  static const minPillScale = 0.75;

  @override
  Widget build(BuildContext context) {
    final upper = label.toUpperCase();
    final pill = MobilePill(label: statusLabel, tone: statusTone);
    final text = Text(
      upper,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: _labelStyle,
    );
    final row = Row(
      children: [
        text,
        const SizedBox(width: 6),
        Expanded(
          child: Align(
            alignment: Alignment.centerRight,
            child: FittedBox(fit: BoxFit.scaleDown, child: pill),
          ),
        ),
      ],
    );
    final available = maxWidth;
    if (available == null) return row;
    final base = DefaultTextStyle.of(context).style;
    final scaler = MediaQuery.textScalerOf(context);
    double measure(String value, TextStyle style) {
      final painter = TextPainter(
        text: TextSpan(text: value, style: base.merge(style)),
        textDirection: TextDirection.ltr,
        textScaler: scaler,
        maxLines: 1,
      )..layout();
      final w = painter.width;
      painter.dispose();
      return w;
    }

    const gap = 6.0;
    // A pílula: o texto (11 px, w700) mais 9 + 9 de margem.
    final pillWidth =
        measure(
          statusLabel,
          const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        ) +
        18;
    final room = available - measure(upper, _labelStyle) - gap;
    if (pillWidth * minPillScale <= room) return row;
    return Wrap(
      spacing: gap,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [text, pill],
    );
  }
}

// ---------------------------------------------------------------------------
// B-GUI-FID1 — os passos curtos da barra fixa do check-in (opção A,
// `checkin-chegada.png`; `checkin-app-3opcoes.reference.html`, `ck-short`).
// 1 linha em COMPONENT_LIBRARY.md.
// ---------------------------------------------------------------------------

/// Os passos curtos ("Iniciar · Em rota · Cheguei · Serviço · Concluir") acima
/// do botão da barra fixa: o feito com o visto verde, o de agora azul, o resto
/// cinza; o leitor de tela diz o estado de cada um. Só mostra: não é botão.
class MobileShortSteps extends StatelessWidget {
  const MobileShortSteps({
    required this.labels,
    required this.current,
    super.key,
  });

  final List<String> labels;

  /// O passo de agora (0 é o primeiro); os anteriores estão feitos.
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++)
          Expanded(
            child: Semantics(
              label:
                  '${labels[i]}, '
                  '${i < current
                      ? 'feito'
                      : i == current
                      ? 'atual'
                      : 'a fazer'}',
              excludeSemantics: true,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i < current
                          ? ErpMobileTheme.success
                          : i == current
                          ? ErpMobileTheme.primary
                          : Colors.white,
                      border: i > current
                          ? Border.all(color: ErpMobileTheme.cardBorder)
                          : null,
                    ),
                    child: i < current
                        ? const Icon(Icons.check, size: 13, color: Colors.white)
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: i == current
                                  ? Colors.white
                                  : ErpMobileTheme.inkMuted,
                            ),
                          ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    labels[i],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: i == current
                          ? FontWeight.w800
                          : FontWeight.w600,
                      color: i == current
                          ? ErpMobileTheme.primary
                          : _textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// B-APP-ORG-2 (A2; Emenda 1.8.3.7, Adendo 1) — esqueleto de lista
// ---------------------------------------------------------------------------

/// O esqueleto de uma lista que ainda está carregando: [rows] cartões brancos
/// de borda fina (o mesmo cartão do [MobileOsCard]), cada um com [rowHeight]
/// de altura e duas barras cinza no lugar do texto. Parado, sem animação. Para
/// quem usa leitor de tela, é um elemento só, com o rótulo [semanticsLabel].
class MobileSkeletonList extends StatelessWidget {
  const MobileSkeletonList({
    this.rows = 3,
    this.rowHeight = 64,
    this.semanticsLabel = 'Carregando',
    super.key,
  });

  final int rows;
  final double rowHeight;
  final String semanticsLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticsLabel,
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows; i++)
            Container(
              height: rowHeight,
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: ErpMobileTheme.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: ErpMobileTheme.cardBorder),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SkeletonBar(widthFactor: 0.55, height: 12),
                  SizedBox(height: 8),
                  _SkeletonBar(widthFactor: 0.35, height: 10),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SkeletonBar extends StatelessWidget {
  const _SkeletonBar({required this.widthFactor, required this.height});

  final double widthFactor;
  final double height;

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: widthFactor,
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: ErpMobileTheme.pageBg,
          borderRadius: BorderRadius.circular(99),
        ),
      ),
    );
  }
}
