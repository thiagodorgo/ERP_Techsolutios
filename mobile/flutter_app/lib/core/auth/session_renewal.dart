// B-APP-SESSAO-RENOVA (item 68 do portão) — os tipos da renovação da sessão.

/// A renovação recebeu uma resposta que o app não conseguiu ler, ou o
/// aparelho falhou ao guardar a sessão. É falha LOCAL: a sessão não expira
/// por isso; só a recusa do servidor expira (D3).
final class SessionRenewalLocalError implements Exception {
  const SessionRenewalLocalError();

  @override
  String toString() => 'SessionRenewalLocalError';
}

/// O desfecho de um pedido de renovação depois de um 401 (D3). O
/// interceptador decide o que fazer com o pedido que falhou por ele.
sealed class SessionRenewalOutcome {
  const SessionRenewalOutcome();
}

/// A sessão foi renovada (agora ou por outro pedido): repete com este token.
final class SessionRenewed extends SessionRenewalOutcome {
  const SessionRenewed(this.accessToken);

  final String accessToken;
}

/// O servidor recusou a renovação: a sessão expirou, e o app vai ao login.
final class SessionDead extends SessionRenewalOutcome {
  const SessionDead();
}

/// O pedido é de outra sessão (outra época) ou não há sessão autenticada:
/// nunca usa o token da sessão atual.
final class SessionSuperseded extends SessionRenewalOutcome {
  const SessionSuperseded();
}

/// O servidor não foi alcançado (rede, tempo esgotado, 5xx): a sessão fica, e
/// o pedido falha como "sem conexão".
final class SessionUnreachable extends SessionRenewalOutcome {
  const SessionUnreachable();
}

/// Falha local (armazenamento, resposta ilegível): a sessão fica, com relato.
final class SessionRenewalFailed extends SessionRenewalOutcome {
  const SessionRenewalFailed();
}
