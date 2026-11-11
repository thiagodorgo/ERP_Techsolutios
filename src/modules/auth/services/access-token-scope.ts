// B-USERS-ACESSO-SEG (conserto do PR #527, P-SESSAO-RESTRITA) — fonte única do escopo do access
// token. Os 3 assinadores do src/ (login, troca de organização e refresh) pedem o escopo aqui, com a
// marca `must_change_password` do par para o qual o token é assinado.
//
// Falha fechada (R1-A01): restringe sempre que o valor NÃO for estritamente `false`. Um valor
// perdido (campo esquecido num resultado, dublê sem a propriedade) vira sessão restrita, nunca
// inteira. A falta de LINHA de credencial no banco não é valor perdido: quem lê o banco a traduz
// em `false` antes de chamar (RQ-3).

export const PASSWORD_CHANGE_SCOPE = "password_change" as const;

export type AccessTokenScope = {
  readonly scope?: typeof PASSWORD_CHANGE_SCOPE;
  readonly roles: readonly string[];
  readonly restricted: boolean;
};

export function resolveAccessTokenScope(
  mustChangePassword: boolean,
  roles: readonly string[],
): AccessTokenScope {
  if (mustChangePassword !== false) {
    return { scope: PASSWORD_CHANGE_SCOPE, roles: [], restricted: true };
  }

  return { roles: [...roles], restricted: false };
}
