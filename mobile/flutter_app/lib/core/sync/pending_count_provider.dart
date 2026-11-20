// B-APP-ORG (70), Emenda 1 §A3.4 — as pendências da tela de troca.
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_notifier.dart';
import 'sync_providers.dart';
import 'sync_user_scope.dart';

/// Quantas ações ainda não saíram da fila na organização ATUAL, só da pessoa
/// da sessão. A fila guarda o `user_id` da pessoa naquela organização, e a
/// mesma pessoa tem um `user_id` diferente em cada organização: o app só
/// conhece o da organização atual. Por isso as outras organizações não têm
/// contagem. Sem sessão autenticada, 0.
final pendingCountForActiveSessionProvider = FutureProvider<int>((ref) async {
  final key = ref.watch(sessionKeyProvider);
  final session = ref.read(authStateProvider).asData?.value.session;
  if (key == null || session == null) return 0;
  final userId = ref.watch(currentSyncUserIdProvider);
  final queue = ref.watch(syncQueueRepositoryProvider);
  final pending = await queue.pendingForTenant(session.user.tenantId);
  return partitionByUser(pending, userId).mine.length;
});
