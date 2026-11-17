// B-APP-SESSAO-RENOVA (D11) — a fila mínima do "Sair" sem servidor.
//
// Só o token do "Sair" entra aqui (o token descartado de uma renovação, não:
// o servidor o cobre, D12). Um item só sai com resposta DEFINITIVA do servidor:
// `revoked` (2xx; o S1 garante que 200 quer dizer "não renova mais") ou
// `discard` (400, com relato). Sem teto: a fila cresce no máximo um item por
// "Sair" sem servidor. Toda leitura e escrita da fila passa por uma trava; a ida
// à rede fica fora dela.
import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import 'auth_notifier.dart';
import 'auth_repository.dart';
import 'auth_token_storage.dart';

final pendingRevocationsProvider = Provider<PendingRevocations>((ref) {
  return PendingRevocations(
    repository: ref.watch(authRepositoryProvider),
    storage: ref.watch(authTokenStorageProvider),
    report: (errorType) {
      try {
        ref.read(authFailureReporterProvider)(errorType);
      } catch (_) {
        // O relato nunca derruba a fila.
      }
    },
  );
});

class PendingRevocations {
  PendingRevocations({
    required AuthRepository repository,
    required AuthTokenStorage storage,
    required void Function(String errorType) report,
  }) : _repository = repository,
       _storage = storage,
       _report = report;

  final AuthRepository _repository;
  final AuthTokenStorage _storage;
  final void Function(String errorType) _report;
  final _lock = _SerialLock();

  /// Os itens cuja gravação falhou: ficam na memória até o app fechar.
  final _memory = <PendingRevocation>[];

  /// Tenta revogar agora; sem resposta definitiva, o token entra na fila.
  Future<void> revokeOrQueue(String token) async {
    final outcome = await _repository.revokeRefreshToken(token);
    // dart format off
    if (outcome == RevocationOutcome.retry) await _enqueue(token); // sem resposta definitiva: fica na fila
    // dart format on
    if (outcome == RevocationOutcome.discard) _report('RevocationDiscarded');
  }

  /// Tenta cada item da fila; tira só o item respondido, da fila de agora.
  Future<void> drain() async {
    final snapshot = await _lock.run(_readAll);
    for (final entry in snapshot) {
      final outcome = await _repository.revokeRefreshToken(entry.token);
      // dart format off
      if (outcome == RevocationOutcome.retry) continue; // só sai da fila com resposta definitiva
      // dart format on
      if (outcome == RevocationOutcome.discard) _report('RevocationDiscarded');
      // dart format off
      await _lock.run(() => _removeFromCurrent(entry)); // tira só este item, da fila de agora
      // dart format on
    }
  }

  /// A fila de agora (a gravada e a da memória).
  Future<List<PendingRevocation>> pending() => _lock.run(_readAll);

  Future<void> _enqueue(String token) async {
    final entry = PendingRevocation(id: const Uuid().v4(), token: token);
    // dart format off
    await _lock.run(() => _append(entry)); // toda escrita da fila passa pela trava
    // dart format on
  }

  Future<void> _append(PendingRevocation entry) async {
    try {
      final current = await _storage.loadPendingRevocations();
      await _storage.savePendingRevocations([...current, entry]);
    } catch (error) {
      _report(error.runtimeType.toString());
      // dart format off
      _memory.add(entry); // o armazenamento falhou: a fila fica na memória até fechar o app
      // dart format on
    }
  }

  Future<List<PendingRevocation>> _readAll() async => [
    ...await _readStored(),
    ..._memory,
  ];

  Future<List<PendingRevocation>> _readStored() async {
    try {
      return await _storage.loadPendingRevocations();
    } catch (error) {
      _report(error.runtimeType.toString());
      return const [];
    }
  }

  Future<void> _removeFromCurrent(PendingRevocation entry) async {
    if (_memory.remove(entry)) return;
    final current = await _readStored();
    await _writeList(current.where((e) => e != entry).toList());
  }

  Future<void> _writeList(List<PendingRevocation> entries) async {
    try {
      await _storage.savePendingRevocations(entries);
    } catch (error) {
      _report(error.runtimeType.toString());
    }
  }
}

/// Uma trava em fila: cada ação começa quando a anterior termina.
class _SerialLock {
  Future<void> _tail = Future<void>.value();

  Future<T> run<T>(Future<T> Function() action) {
    final result = _tail.then((_) => action());
    _tail = result.then<void>((_) {}, onError: (Object _) {});
    return result;
  }
}
