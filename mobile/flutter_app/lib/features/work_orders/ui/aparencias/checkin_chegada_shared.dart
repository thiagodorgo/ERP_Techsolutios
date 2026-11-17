import 'package:flutter/material.dart';

import '../../../../core/network/connectivity_repository.dart';
import '../../../../core/sync/sync_models.dart';
import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_components.dart';
import '../../../../shared/ui/mobile_kit.dart';
import '../../domain/work_order_models.dart';
import 'detalhe_os_shared.dart';

/// B-GUI-FID1 — o check-in e a chegada, a 1ª etapa da execução
/// (`checkin-chegada.png`; `checkin-app-3opcoes.reference.html`), nas 3
/// aparências da execução do guincho. A tela (`work_order_execute_screen.dart`)
/// decide; as vistas só desenham.
///
/// A regra é a de hoje (a F0 grava as ações): "Iniciar rota" muda a situação
/// para Em rota; "Cheguei ao local" abre o diálogo da placa
/// (`checkin_confirm_dialog.dart`), e o servidor confere; "Iniciar
/// atendimento" muda para Em atendimento.
///
/// Fora da tela, por não existir (F2): a distância e o tempo, o tipo do
/// veículo, o mapa de ruas. "Ir para a coleta" chega com o B-GUI-15 (não nasce
/// botão morto); a faixa da A guarda o lugar dele.

/// A fase da chegada.
enum CheckinFase {
  /// Agendada ou despachada: "Iniciar rota".
  inicio,

  /// Em rota: "Cheguei ao local".
  rota,

  /// No local: "Iniciar atendimento".
  local,
}

/// A fase da OS, ou nulo quando a OS já passou da chegada.
CheckinFase? checkinFaseDe(WorkOrderStatus s) => switch (s) {
  WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => CheckinFase.inicio,
  WorkOrderStatus.enRoute => CheckinFase.rota,
  WorkOrderStatus.arrived => CheckinFase.local,
  _ => null,
};

/// Tudo o que as aparências do check-in desenham.
class CheckinChegadaViewProps {
  const CheckinChegadaViewProps({
    required this.wo,
    required this.fase,
    required this.onBack,
    required this.stepper,
    required this.onPrimary,
    this.vehicle,
    this.slaDueAt,
    this.gpsOk,
    this.offline = false,
    this.pendingSync = false,
    this.conflictPanel,
    this.safeError,
    this.busy = false,
    this.onUnableToStart,
  });

  final WorkOrder wo;
  final CheckinFase fase;
  final VoidCallback onBack;

  /// Os passos da execução (6 no guincho, 4 no prestador), prontos.
  final Widget stepper;

  /// O botão da fase: "Iniciar rota", "Cheguei ao local" ou "Iniciar
  /// atendimento". Nulo: travado (ocupado).
  final VoidCallback? onPrimary;

  /// Chegam com o B-GUI-D1; hoje nulos, e o que depende deles some.
  final DetalheOsVeiculo? vehicle;
  final DateTime? slaDueAt;

  /// O GPS do aparelho: ligado, desligado, ou nulo (verificando).
  final bool? gpsOk;

  final bool offline;
  final bool pendingSync;

  /// O cartão "Chegada não confirmada" (a recusa do servidor), ou o conflito.
  final Widget? conflictPanel;
  final String? safeError;
  final bool busy;

  /// "Não foi possível iniciar" (em rota).
  final VoidCallback? onUnableToStart;

  bool get isTow => wo.serviceType == WorkOrderServiceType.tow;

  String? get phone {
    final p = wo.customerPhone?.trim();
    return p == null || p.isEmpty ? null : p;
  }

  /// "Local da coleta" no guincho; "Local do atendimento" no resto.
  String get localLabel => isTow ? 'Local da coleta' : 'Local do atendimento';
}

/// O título e o subtítulo da fase ("Rota de coleta · OS-2891 · vá até o local
/// da coleta").
(String, String) checkinTitulo(CheckinChegadaViewProps p) {
  final code = p.wo.code;
  return switch (p.fase) {
    CheckinFase.inicio => ('Início', '$code · ${p.wo.customerName}'),
    CheckinFase.rota =>
      p.isTow
          ? ('Rota de coleta', '$code · vá até o local da coleta')
          : ('Rota', '$code · vá até o local do atendimento'),
    CheckinFase.local =>
      p.isTow
          ? ('Coleta', '$code · você chegou ao local da coleta')
          : ('No local', '$code · você chegou ao local'),
  };
}

/// O selo da situação no cabeçalho e no cartão da OS.
(String, PillTone) checkinSituacao(CheckinChegadaViewProps p) =>
    switch (p.fase) {
      CheckinFase.inicio => ('A iniciar', PillTone.neutral),
      CheckinFase.rota => ('Em rota', PillTone.warning),
      CheckinFase.local =>
        p.pendingSync
            ? ('No local · na fila', PillTone.warning)
            : ('No local', PillTone.done),
    };

/// O botão da fase: a chave (as mesmas de hoje), o texto e o ícone.
(Key, String, IconData) checkinBotao(CheckinFase fase) => switch (fase) {
  CheckinFase.inicio => (
    const Key('checkin-start-route'),
    'Iniciar rota',
    Icons.directions_outlined,
  ),
  CheckinFase.rota => (
    const Key('checkin-arrived'),
    'Cheguei ao local',
    Icons.location_on_outlined,
  ),
  CheckinFase.local => (
    const Key('checkin-start-service'),
    'Iniciar atendimento',
    Icons.play_arrow_outlined,
  ),
};

/// O botão principal, com o indicador quando ocupado.
class CheckinBotaoPrincipal extends StatelessWidget {
  const CheckinBotaoPrincipal({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) {
    final (key, label, icon) = checkinBotao(props.fase);
    return FilledButton.icon(
      key: key,
      onPressed: props.busy ? null : props.onPrimary,
      icon: props.busy
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(icon),
      label: Text(label),
    );
  }
}

/// A linha da chegada na fase "No local" ("Chegada registrada às 10:31").
String? checkinChegadaTexto(CheckinChegadaViewProps p) {
  final at = p.wo.arrivedAt;
  if (p.fase != CheckinFase.local) return null;
  final hora = at == null ? '' : ' às ${detalheOsHora(at)}';
  return p.pendingSync
      ? 'Chegada salva no aparelho$hora'
      : 'Chegada registrada$hora';
}

const kCheckinSemConexao =
    'Sem conexão. O que você fizer fica salvo no aparelho e é enviado quando '
    'o sinal voltar.';
const kCheckinChegadaNaFila =
    'Chegada salva no aparelho. Ela vai para o servidor quando o sinal '
    'voltar, e o servidor confere a placa de novo.';
const kCheckinPendente =
    'Alterações salvas no aparelho, aguardando envio ao servidor.';

/// A faixa "Sem conexão", logo abaixo dos passos.
class CheckinSemConexao extends StatelessWidget {
  const CheckinSemConexao({super.key});

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
    child: NetworkStatusBanner(
      key: ValueKey('checkin-sem-conexao'),
      status: NetworkStatus.offline,
      offlineMessage: kCheckinSemConexao,
    ),
  );
}

/// O cabeçalho dos passos (fundo branco, borda embaixo).
class CheckinPassos extends StatelessWidget {
  const CheckinPassos({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('checkin-passos'),
    padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(bottom: BorderSide(color: ErpMobileTheme.cardBorder)),
    ),
    child: props.stepper,
  );
}

/// As faixas do alto do corpo: o conflito ou a recusa, o erro, a fila.
class CheckinAvisos extends StatelessWidget {
  const CheckinAvisos({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final conflito = p.conflictPanel;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (conflito != null) ...[conflito, const SizedBox(height: 10)],
        if (p.safeError != null) ...[
          SyncStatusBanner(status: SyncStatus.failed, message: p.safeError!),
          const SizedBox(height: 10),
        ],
        if (p.pendingSync) ...[
          SyncStatusBanner(
            key: const ValueKey('checkin-pendente'),
            status: SyncStatus.pending,
            message: p.fase == CheckinFase.local
                ? kCheckinChegadaNaFila
                : kCheckinPendente,
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

/// O selo do GPS (o que o app mede: ligado ou desligado; nunca "ao vivo").
class CheckinSeloGps extends StatelessWidget {
  const CheckinSeloGps({required this.gpsOk, super.key});

  final bool? gpsOk;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (gpsOk) {
      true => ('GPS ligado', ErpMobileTheme.success),
      false => ('GPS desligado', ErpMobileTheme.inkMuted),
      null => ('Verificando o GPS', ErpMobileTheme.inkMuted),
    };
    return Container(
      key: const Key('checkin-gps'),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: ErpMobileTheme.ink.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// O cartão da OS: código, situação, serviço, cliente, o veículo (para
/// conferir antes da placa) e, sem [compacto], o endereço e a janela.
class CheckinOsCard extends StatelessWidget {
  const CheckinOsCard({required this.props, this.compacto = false, super.key});

  final CheckinChegadaViewProps props;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final wo = p.wo;
    final (situacao, tom) = checkinSituacao(p);
    final janela = detalheOsJanela(wo.scheduledAt, p.slaDueAt);
    final vehicle = p.vehicle;
    return Container(
      key: const Key('checkin-os'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  wo.code,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                    color: ErpMobileTheme.primary,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              MobilePill(label: situacao.toUpperCase(), tone: tom),
            ],
          ),
          if (!compacto) ...[
            const SizedBox(height: 8),
            MobilePill(label: detalheOsServico(wo), tone: PillTone.info),
          ],
          const SizedBox(height: 8),
          Text(
            wo.customerName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          Text(
            compacto ? detalheOsServico(wo) : 'Solicitante do atendimento',
            style: const TextStyle(
              fontSize: 13,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
          if (vehicle != null) ...[
            const Divider(height: 24, color: ErpMobileTheme.cardBorder),
            Row(
              children: [
                const Icon(
                  Icons.local_shipping_outlined,
                  color: ErpMobileTheme.ink,
                ),
                const SizedBox(width: 12),
                Expanded(child: DetalheOsVeiculoGrade(vehicle: vehicle)),
              ],
            ),
          ],
          if (!compacto) ...[
            const Divider(height: 24, color: ErpMobileTheme.cardBorder),
            _Linha(icon: Icons.location_on_outlined, text: wo.serviceAddress),
            if (janela != null) ...[
              const SizedBox(height: 6),
              _Linha(icon: Icons.schedule_outlined, text: janela),
            ],
          ],
        ],
      ),
    );
  }
}

class _Linha extends StatelessWidget {
  const _Linha({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 16, color: ErpMobileTheme.inkMuted),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          text,
          style: const TextStyle(fontSize: 13.5, color: ErpMobileTheme.ink),
        ),
      ),
    ],
  );
}

/// O cartão do contato: o cliente e o telefone (sem botão de ligar: o app
/// ainda não abre o discador).
class CheckinContatoCard extends StatelessWidget {
  const CheckinContatoCard({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) => Container(
    key: const Key('checkin-contato'),
    margin: const EdgeInsets.only(top: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: ErpMobileTheme.cardBorder),
    ),
    child: Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: MobilePill.colorsFor(PillTone.info).$1,
          child: const Icon(
            Icons.person_outline,
            color: ErpMobileTheme.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                props.wo.customerName,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: ErpMobileTheme.ink,
                ),
              ),
              Text(
                'Contato · ${props.phone}',
                style: const TextStyle(
                  fontSize: 13,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// "Não foi possível iniciar" (em rota), abaixo do contato.
class CheckinNaoFoiPossivel extends StatelessWidget {
  const CheckinNaoFoiPossivel({required this.onTap, super.key});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Center(
      child: TextButton.icon(
        key: const Key('checkin-block'),
        onPressed: onTap,
        style: TextButton.styleFrom(foregroundColor: ErpMobileTheme.danger),
        icon: const Icon(Icons.cancel_outlined),
        label: const Text('Não foi possível iniciar'),
      ),
    ),
  );
}
