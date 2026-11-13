import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/prestador/data/prestador_repository.dart';
import '../network/api_contracts.dart';
import 'sync_models.dart';
import 'sync_providers.dart';
import 'sync_queue_repository.dart';
import 'sync_stalled_resolver.dart';

typedef MaterialResolutionUpdater =
    Future<void> Function(
      String localId,
      SyncStatus status, {
      int? quantityDelta,
    });

/// C2 item 11 (N3): enfileira o `work_order_material.remove` de uma adição que pode ter baixado.
typedef MaterialAdditionCompensator =
    Future<void> Function(SyncAction addition);

class SyncResolutionSideEffects {
  SyncResolutionSideEffects(
    this._queue, {
    MaterialResolutionUpdater? materialUpdater,
    MaterialAdditionCompensator? materialCompensator,
  }) : _materialUpdater = materialUpdater,
       _materialCompensator = materialCompensator;

  final SyncQueueRepository _queue;
  final MaterialResolutionUpdater? _materialUpdater;
  final MaterialAdditionCompensator? _materialCompensator;

  Future<void> apply(SyncAction before, SyncAction after) async {
    await _cascadeExpenseReportUseServer(before, after);
    await _applyMaterialResolution(before, after);
  }

  Future<void> _cascadeExpenseReportUseServer(
    SyncAction before,
    SyncAction after,
  ) async {
    if (before.type != ExpenseSyncActionTypes.reportCreate) return;
    if (before.status != SyncStatus.conflict) return;
    if (after.status != SyncStatus.synced) return;

    final reportLocalId = _readString(before.payload['local_id']);
    if (reportLocalId == null) return;

    final actions = await _queue.actionsForTenant(after.tenantId);
    for (final action in actions) {
      if (action.clientActionId == after.clientActionId) continue;
      if (action.type != ExpenseSyncActionTypes.itemCreate &&
          action.type != ExpenseSyncActionTypes.reportSubmit) {
        continue;
      }
      if (_readString(action.payload['report_local_id']) != reportLocalId) {
        continue;
      }
      if (action.status == SyncStatus.synced) continue;

      await _queue.update(
        action.copyWith(
          status: SyncStatus.synced,
          processedAt: after.processedAt ?? DateTime.now().toUtc(),
          lastErrorCode: 'SUPERSEDED_BY_SERVER',
          lastSafeError: 'Substituído pela versão do gestor.',
        ),
      );
    }
  }

  Future<void> _applyMaterialResolution(
    SyncAction before,
    SyncAction after,
  ) async {
    if (!before.type.startsWith('work_order_material.')) return;
    final localId = _readString(before.payload['material_local_id']);
    if (localId == null) return;

    int? quantityDelta;
    final discarded =
        after.status == SyncStatus.synced &&
        after.lastErrorCode == syncDiscardedErrorCode;
    final useServer =
        before.status == SyncStatus.conflict &&
        after.status == SyncStatus.synced &&
        after.lastErrorCode == null;
    if (before.type == InventorySyncActionTypes.materialAdd &&
        (discarded || useServer)) {
      final quantity = before.payload['quantity'];
      if (quantity is num) quantityDelta = -quantity.toInt();
      // N3: "Descartar" e "Versão do gestor" de uma adição que pode ter baixado deixam o
      // `remove` na fila (no servidor: aplicada → estorno; nunca aplicada → inócuo).
      await _materialCompensator?.call(before);
    }

    await _materialUpdater?.call(
      localId,
      after.status,
      quantityDelta: quantityDelta,
    );
  }
}

final syncResolutionSideEffectsProvider = Provider<SyncResolutionSideEffects>(
  (ref) => SyncResolutionSideEffects(
    ref.watch(syncQueueRepositoryProvider),
    materialUpdater: (localId, status, {quantityDelta}) => ref
        .read(prestadorRepositoryProvider)
        .applyMaterialSyncStatus(localId, status, quantityDelta: quantityDelta),
    materialCompensator: (addition) => ref
        .read(prestadorRepositoryProvider)
        .compensateMaterialAddition(addition),
  ),
);

String? _readString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;
