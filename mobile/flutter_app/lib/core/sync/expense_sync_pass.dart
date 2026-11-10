import 'expense_receipt_sync.dart';
import 'sync_replay_service.dart';

/// B-RDV-COMPROVANTE (conserto c1 do #525, §2(c)3, §12.6 e §13.1) — o passe de despesa: lote →
/// comprovantes → lote.
///
/// 1. O 1º lote não solta nada: o envio do relatório fica ADIADO enquanto um comprovante do mesmo
///    relatório o segura (`_receiptHoldsSubmit`), sem gastar tentativa. A falha propaga, como antes.
/// 2. O upload multipart dos comprovantes roda isolado, como antes: uma falha dele — inclusive a de
///    montar o serviço, por isso [receipts] é lido aqui dentro — não derruba o passe.
/// 3. O 2º lote sai quando o upload mudou alguma coisa (subiu, foi recusado, recebeu 503) ou quando
///    o próprio upload falhou (`r == null`). Ele só solta o comprovante tentado NESTE passe que
///    recebeu 503; com `r == null`, o conjunto é vazio e nada é solto (só saem os relatórios cujos
///    comprovantes já estão `synced` ou `conflict`). A falha do 2º lote também fica isolada.
Future<void> runExpenseSyncPass(
  String tenantId, {
  required SyncReplayService replay,
  required ExpenseReceiptSyncService Function() receipts,
}) async {
  await replay.replayTenant(tenantId);

  ExpenseReceiptSyncResult? r;
  try {
    r = await receipts().uploadTenant(tenantId);
  } catch (_) {
    // Só falha de infraestrutura chega aqui: o upload isola cada ação.
    r = null;
  }

  final busy = r == null
      ? const <String>{}
      : {for (final action in r.busy) action.clientActionId};
  if (r == null ||
      r.uploaded.isNotEmpty ||
      r.conflicts.isNotEmpty ||
      busy.isNotEmpty) {
    await _isolated(
      () => replay.replayTenantReleasing(tenantId, ReceiptRelease.busy(busy)),
    );
  }
}

Future<void> _isolated(Future<Object?> Function() run) async {
  try {
    await run();
  } catch (_) {
    // O 2º lote é melhor esforço: o envio adiado sai no próximo passe.
  }
}
