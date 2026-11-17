import 'package:flutter/material.dart';

import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import '../../domain/work_order_models.dart';
import 'checkin_chegada_shared.dart';
import 'detalhe_os_shared.dart';

/// B-GUI-FID1 — o check-in na opção C, "Painel da chegada"
/// (`checkin-app-3opcoes.reference.html`, `telaC`; o mesmo padrão da opção C
/// da execução do guincho): o local e a janela lado a lado, e a lista do que é
/// preciso para a fase, com o botão dentro dela.
///
/// A maquete tem a distância no cartão da esquerda; o app não mede distância
/// (F2), e o cartão mostra o local e o GPS.
class CheckinChegadaViewC extends StatelessWidget {
  const CheckinChegadaViewC({required this.props, super.key});

  final CheckinChegadaViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final (title, subtitle) = checkinTitulo(p);
    final (situacao, tom) = checkinSituacao(p);
    final janela = detalheOsJanela(p.wo.scheduledAt, p.slaDueAt);
    final (tituloReq, itens) = _requisitos(p);
    return ErpScaffold(
      key: const Key('aparencia-checkin-C'),
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: title,
            subtitle: subtitle,
            onBack: p.onBack,
            trailing: MobilePill(label: situacao.toUpperCase(), tone: tom),
          ),
          CheckinPassos(props: p),
          if (p.offline) const CheckinSemConexao(),
          Expanded(
            child: ListView(
              key: const Key('checkin-lista'),
              padding: const EdgeInsets.all(12),
              children: [
                CheckinAvisos(props: p),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _Meio(
                          key: const Key('checkin-c-local'),
                          titulo: p.isTow ? 'Coleta' : 'Local',
                          atual: p.fase != CheckinFase.local,
                          valor: p.fase == CheckinFase.local
                              ? 'No local'
                              : null,
                          texto: checkinChegadaTexto(p) ?? p.wo.serviceAddress,
                          rodape: p.fase == CheckinFase.local
                              ? null
                              : CheckinSeloGps(gpsOk: p.gpsOk),
                        ),
                      ),
                      if (janela != null) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: _Meio(
                            key: const Key('checkin-c-janela'),
                            titulo: 'Janela',
                            valor: detalheOsHora(p.wo.scheduledAt!),
                            texto: janela,
                            pill: MobilePill(
                              label: detalheOsPrioridade(
                                p.wo.priority,
                              ).replaceFirst('Prioridade ', ''),
                              tone: detalheOsPrioridadeTom(p.wo.priority),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  key: const Key('checkin-c-requisitos'),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: ErpMobileTheme.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        tituloReq,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: ErpMobileTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 10),
                      MobileRequirementList(items: itens),
                      const SizedBox(height: 14),
                      CheckinBotaoPrincipal(props: p),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                CheckinOsCard(props: p, compacto: true),
                if (p.phone != null) CheckinContatoCard(props: p),
                if (p.onUnableToStart != null)
                  CheckinNaoFoiPossivel(onTap: p.onUnableToStart!),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static (String, List<MobileRequirement>) _requisitos(
    CheckinChegadaViewProps p,
  ) {
    final sinal = p.offline
        ? const MobileRequirement(
            MobileRequirementState.queued,
            'Sem sinal: fica salvo no aparelho e vai quando o sinal voltar.',
          )
        : const MobileRequirement(
            MobileRequirementState.met,
            'Com sinal: vai para o servidor na hora.',
          );
    switch (p.fase) {
      case CheckinFase.inicio:
        return (
          p.isTow ? 'Para sair para a coleta' : 'Para sair para o local',
          [
            MobileRequirement(
              MobileRequirementState.info,
              '${p.localLabel}: ${p.wo.serviceAddress}',
              icon: Icons.location_on_outlined,
            ),
            sinal,
          ],
        );
      case CheckinFase.local:
        return (
          p.pendingSync ? 'Chegada salva no aparelho' : 'Chegada registrada',
          [
            MobileRequirement(
              MobileRequirementState.met,
              checkinChegadaTexto(p) ?? 'Chegada registrada',
            ),
            p.pendingSync
                ? const MobileRequirement(
                    MobileRequirementState.queued,
                    'Na fila: o servidor confere a placa quando o sinal voltar.',
                  )
                : const MobileRequirement(
                    MobileRequirementState.met,
                    'Enviada ao servidor.',
                  ),
            const MobileRequirement(
              MobileRequirementState.info,
              'Próximo: o atendimento e a vistoria.',
              icon: Icons.play_arrow_outlined,
            ),
          ],
        );
      case CheckinFase.rota:
        final gps = switch (p.gpsOk) {
          true => const MobileRequirement(
            MobileRequirementState.met,
            'GPS ligado',
          ),
          false => const MobileRequirement(
            MobileRequirementState.pending,
            'GPS desligado: ligue o GPS para confirmar a chegada.',
            icon: Icons.gps_off_outlined,
          ),
          null => const MobileRequirement(
            MobileRequirementState.info,
            'Verificando o GPS',
          ),
        };
        final placa = switch (p.wo.checkinMode) {
          CheckinMode.exempt => const MobileRequirement(
            MobileRequirementState.info,
            'Serviço sem placa: confirme que você chegou.',
          ),
          CheckinMode.referenceMissing => const MobileRequirement(
            MobileRequirementState.unmet,
            'Sem placa cadastrada: peça à base para cadastrar a placa ou '
            'registrar a chegada.',
          ),
          _ => const MobileRequirement(
            MobileRequirementState.pending,
            'Os 2 últimos dígitos da placa',
          ),
        };
        return (
          'Para confirmar a chegada',
          [
            gps,
            MobileRequirement(
              MobileRequirementState.info,
              p.isTow
                  ? 'Estar no local da coleta. Você confirma: o app não avisa a chegada sozinho.'
                  : 'Estar no local. Você confirma: o app não avisa a chegada sozinho.',
              icon: Icons.location_on_outlined,
            ),
            placa,
            sinal,
          ],
        );
    }
  }
}

/// Um cartão de meia largura (o local e a janela).
class _Meio extends StatelessWidget {
  const _Meio({
    required this.titulo,
    required this.texto,
    this.valor,
    this.pill,
    this.rodape,
    this.atual = false,
    super.key,
  });

  final String titulo;
  final String? valor;
  final String texto;
  final Widget? pill;
  final Widget? rodape;
  final bool atual;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(
        color: atual ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
        width: atual ? 1.5 : 1,
      ),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                titulo.toUpperCase(),
                style: const TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ),
            ?pill,
          ],
        ),
        if (valor != null) ...[
          const SizedBox(height: 6),
          Text(
            valor!,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
        ],
        const SizedBox(height: 6),
        Text(
          texto,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 12.5,
            color: ErpMobileTheme.inkMuted,
          ),
        ),
        if (rodape != null) ...[const SizedBox(height: 8), rodape!],
      ],
    ),
  );
}
