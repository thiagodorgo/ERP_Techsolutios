// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG (S8, plano original passo 3) — o retrato de usuário que a auditoria do
// `user.updated` grava como antes/depois. LISTA PERMITIDA, montada campo a campo: nome, status e
// papéis (ordenados, para o diff não depender da ordem de gravação). Nunca e-mail, nunca campo novo
// que o registro venha a ganhar, nunca nada de credencial — o filtro por NOME de chave da auditoria
// (`audit-log.service.ts`) não protege valor sob chave inocente; quem protege aqui é não copiar.
// -----------------------------------------------------------------------------------------------

export type UserAuditSnapshot = {
  readonly name: string;
  readonly status: string;
  readonly roles: readonly string[];
};

export function toUserAuditSnapshot(user: {
  readonly name: string;
  readonly status: string;
  readonly roles: readonly string[];
}): UserAuditSnapshot {
  return {
    name: user.name,
    status: user.status,
    roles: [...user.roles].sort(),
  };
}
