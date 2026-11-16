// B-APP-SESSAO-RENOVA (item 68 do portão) — os tipos da renovação da sessão.

/// A renovação recebeu uma resposta que o app não conseguiu ler, ou o
/// aparelho falhou ao guardar a sessão. É falha LOCAL: a sessão não expira
/// por isso; só a recusa do servidor expira (D3).
final class SessionRenewalLocalError implements Exception {
  const SessionRenewalLocalError();

  @override
  String toString() => 'SessionRenewalLocalError';
}
