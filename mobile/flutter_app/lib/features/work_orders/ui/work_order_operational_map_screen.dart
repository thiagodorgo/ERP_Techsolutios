import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/location/field_location_models.dart';
import '../../../core/location/field_location_service.dart';
import '../../../core/location/operational_map_projection.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

class WorkOrderOperationalMapScreen extends ConsumerWidget {
  const WorkOrderOperationalMapScreen({this.workOrderId, super.key});

  final String? workOrderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    if (session == null) {
      return const ErpScaffold(
        title: 'Mapa operacional',
        body: Center(child: CircularProgressIndicator.adaptive()),
      );
    }

    final canSend = const PermissionResolver().has(
      session.permissions,
      'field_location:send',
    );
    if (!canSend) {
      return ErpScaffold(
        title: 'Mapa operacional',
        body: const PermissionBlockedState(
          title: 'Acesso nao autorizado',
          message: 'field_location:send necessario para mapa operacional.',
        ),
      );
    }

    final repository = ref.watch(workOrderRepositoryProvider);
    return FutureBuilder<void>(
      future: repository.load(),
      builder: (context, snapshot) {
        final workOrder = workOrderId == null
            ? null
            : repository.findById(workOrderId!);
        return ErpScaffold(
          title: 'Mapa operacional',
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TenantContextBar(session: session),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.map_outlined),
                  title: const Text('Mapa operacional simples conectado a OS'),
                  subtitle: Text(
                    workOrder == null
                        ? 'Selecione uma OS para visualizar ponto de atendimento e ultimo fix do tecnico.'
                        : '${workOrder.code} - ${workOrder.customerName}',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              _OperationalMapPanel(workOrder: workOrder, session: session),
              const SizedBox(height: 8),
              if (workOrder != null)
                OperationalLocationCard(session: session, workOrder: workOrder)
              else
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.info_outline),
                    title: Text('OS nao selecionada'),
                    subtitle: Text(
                      'Abra o mapa a partir de uma OS para registrar localizacao operacional.',
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class OperationalLocationCard extends ConsumerStatefulWidget {
  const OperationalLocationCard({
    required this.session,
    required this.workOrder,
    super.key,
  });

  final BootstrapSession session;
  final WorkOrder workOrder;

  @override
  ConsumerState<OperationalLocationCard> createState() =>
      _OperationalLocationCardState();
}

class _OperationalLocationCardState
    extends ConsumerState<OperationalLocationCard> {
  bool _isSending = false;
  String? _safeMessage;
  int _reloadKey = 0;

  Future<void> _captureNow() async {
    setState(() {
      _isSending = true;
      _safeMessage = null;
    });
    final service = ref.read(fieldLocationSyncServiceProvider);
    try {
      final result = await service.captureForWorkOrder(
        tenantId: widget.session.activeTenant.tenantId,
        workOrder: widget.workOrder,
      );
      if (result.status == FieldLocationCaptureStatus.unavailable) {
        _safeMessage =
            result.safeMessage ??
            'Localizacao do dispositivo indisponivel nesta versao.';
      } else {
        await service.syncTenant(widget.session.activeTenant.tenantId);
        _safeMessage = 'Localizacao operacional enfileirada para sync.';
      }
    } catch (_) {
      _safeMessage = 'Nao foi possivel registrar a localizacao operacional.';
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
          _reloadKey++;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = ref.watch(fieldLocationStoreProvider);
    final canSend = const PermissionResolver().has(
      widget.session.permissions,
      'field_location:send',
    );
    return FutureBuilder<FieldLocationEvent?>(
      key: ValueKey(_reloadKey),
      future: store.latestForWorkOrder(
        tenantId: widget.session.activeTenant.tenantId,
        workOrderLocalId: widget.workOrder.localId,
      ),
      builder: (context, snapshot) {
        final latest = snapshot.data;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.my_location_outlined),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Localizacao operacional',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    OperationalStatusChip(
                      label: _labelFor(latest?.syncStatus),
                      status: _toneFor(latest?.syncStatus),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Provider abstrato preparado; adapter GPS nativo pendente.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                if (latest == null)
                  const Text('Nenhum fix operacional registrado nesta OS.')
                else ...[
                  Text('Ultimo fix: ${_fmtDate(latest.recordedAt)}'),
                  if (latest.accuracyMeters != null)
                    Text(
                      'Precisao: ${latest.accuracyMeters!.toStringAsFixed(1)} m',
                    ),
                  if (latest.syncedAt != null)
                    Text('Ultimo envio: ${_fmtDate(latest.syncedAt!)}'),
                  if (latest.lastSafeError != null)
                    Text('Ultima falha: ${latest.lastSafeError}'),
                ],
                if (_safeMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(_safeMessage!),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: !_isSending && canSend ? _captureNow : null,
                        icon: _isSending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator.adaptive(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.my_location_outlined),
                        label: const Text('Enviar localizacao agora'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () => context.push(
                        '/field-map?workOrderId=${widget.workOrder.localId}',
                      ),
                      icon: const Icon(Icons.map_outlined),
                      label: const Text('Abrir mapa'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _toneFor(SyncStatus? status) => switch (status) {
    SyncStatus.synced => 'success',
    SyncStatus.failed || SyncStatus.conflict => 'danger',
    SyncStatus.pending => 'warning',
    _ => 'info',
  };

  String _labelFor(SyncStatus? status) => switch (status) {
    SyncStatus.synced => 'Sincronizado',
    SyncStatus.pending => 'Pendente',
    SyncStatus.failed => 'Falhou',
    SyncStatus.conflict => 'Conflito',
    SyncStatus.syncing => 'Sincronizando',
    SyncStatus.local => 'Local',
    null => 'Sem fix',
  };
}

class _OperationalMapPanel extends ConsumerWidget {
  const _OperationalMapPanel({required this.workOrder, required this.session});

  final WorkOrder? workOrder;
  final BootstrapSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wo = workOrder;
    final store = ref.watch(fieldLocationStoreProvider);
    final future = wo == null
        ? Future<FieldLocationEvent?>.value()
        : store.latestForWorkOrder(
            tenantId: session.activeTenant.tenantId,
            workOrderLocalId: wo.localId,
          );

    return FutureBuilder<FieldLocationEvent?>(
      future: future,
      builder: (context, snapshot) {
        final latest = snapshot.data;
        final points = <OperationalMapPoint>[
          if (wo?.latitude != null && wo?.longitude != null)
            OperationalMapPoint(
              id: 'os',
              label: 'OS',
              latitude: wo!.latitude!,
              longitude: wo.longitude!,
            ),
          if (latest != null)
            OperationalMapPoint(
              id: 'tech',
              label: 'Tecnico',
              latitude: latest.latitude,
              longitude: latest.longitude,
            ),
        ];
        final projected = OperationalMapProjection.project(points);
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 1.5,
                  child: CustomPaint(
                    painter: _OperationalMapPainter(projected),
                    child: projected.isEmpty
                        ? const Center(
                            child: Text(
                              'Sem pontos para desenhar o mapa operacional.',
                              textAlign: TextAlign.center,
                            ),
                          )
                        : const SizedBox.expand(),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    const OperationalStatusChip(label: 'OS', status: 'info'),
                    const OperationalStatusChip(
                      label: 'Tecnico',
                      status: 'warning',
                    ),
                    if (wo?.latitude == null || wo?.longitude == null)
                      const OperationalStatusChip(
                        label: 'OS sem coordenada',
                        status: 'warning',
                      ),
                    if (latest == null)
                      const OperationalStatusChip(
                        label: 'Sem fix do tecnico',
                        status: 'info',
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _OperationalMapPainter extends CustomPainter {
  const _OperationalMapPainter(this.points);

  final List<ProjectedOperationalMapPoint> points;

  @override
  void paint(Canvas canvas, Size size) {
    final cs = Paint()
      ..color = const Color(0xFFE5E7EB)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final border = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final fill = Paint()
      ..color = const Color(0xFFF8FAFC)
      ..style = PaintingStyle.fill;

    final rect = Offset.zero & size;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(8)),
      fill,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(8)),
      border,
    );

    for (var i = 1; i < 4; i++) {
      final x = size.width * i / 4;
      final y = size.height * i / 4;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), cs);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), cs);
    }

    if (points.length == 2) {
      final a = _offset(points[0], size);
      final b = _offset(points[1], size);
      canvas.drawLine(
        a,
        b,
        Paint()
          ..color = const Color(0xFF64748B)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }

    for (final point in points) {
      final offset = _offset(point, size);
      final color = point.id == 'os'
          ? const Color(0xFF2563EB)
          : const Color(0xFFCA8A04);
      canvas.drawCircle(
        offset,
        point.id == 'os' ? 11 : 9,
        Paint()..color = color,
      );
      canvas.drawCircle(
        offset,
        point.id == 'os' ? 16 : 14,
        Paint()
          ..color = color.withValues(alpha: 0.16)
          ..style = PaintingStyle.fill,
      );
      _drawLabel(canvas, point.label, offset + const Offset(12, -18), color);
    }
  }

  Offset _offset(ProjectedOperationalMapPoint point, Size size) =>
      Offset(size.width * point.x, size.height * point.y);

  void _drawLabel(Canvas canvas, String label, Offset offset, Color color) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final safeOffset = Offset(math.max(4, offset.dx), math.max(4, offset.dy));
    textPainter.paint(canvas, safeOffset);
  }

  @override
  bool shouldRepaint(covariant _OperationalMapPainter oldDelegate) =>
      oldDelegate.points != points;
}

String _fmtDate(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/'
    '${dt.month.toString().padLeft(2, '0')} '
    '${dt.hour.toString().padLeft(2, '0')}:'
    '${dt.minute.toString().padLeft(2, '0')}';
