import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { normalizeCredentialEmail } from "../../auth/repositories/local-auth-credential.repository.js";

// Chave derivada do e-mail (SHA-256 do e-mail normalizado, sem segredo): a tabela cruza patios e
// nao pode virar uma lista de e-mails. Nunca o e-mail em claro (K7).
export function creationEmailKey(email: string): string {
  return createHash("sha256").update(normalizeCredentialEmail(email), "utf8").digest("hex");
}

export type CreationLogInput = {
  readonly tenantId: string;
  readonly email: string;
  readonly actorUserId?: string;
};

// Primeira gravacao da transacao da criacao: a linha 'em_curso'. O indice unico parcial
// (email_key WHERE state='em_curso') e o que segura a outra criacao do mesmo e-mail ate esta
// transacao terminar. Devolve o numero da linha (seq).
export async function openCreationLog(
  tx: Prisma.TransactionClient,
  input: CreationLogInput,
): Promise<bigint> {
  const created = await tx.userCreationLog.create({
    data: {
      tenant_id: input.tenantId,
      email_key: creationEmailKey(input.email),
      actor_user_id: input.actorUserId ?? null,
      state: "em_curso",
    },
    select: { seq: true },
  });

  return created.seq;
}

// A criacao venceu: a linha 'em_curso' vira 'confirmado' com o usuario criado, na MESMA transacao.
export async function confirmCreation(
  tx: Prisma.TransactionClient,
  input: CreationLogInput,
  creationSeq: bigint,
  userId: string,
): Promise<void> {
  await tx.userCreationLog.updateMany({
    where: { seq: creationSeq, tenant_id: input.tenantId, state: "em_curso" },
    data: { state: "confirmado", user_id: userId },
  });
}

// A concessao nao confirmou a linha 'em_curso' que abriu: falha fechada (C2-04, J-625). Sem a linha
// 'concessao' com a origem, a guarda da SC derrubaria um acesso valido; por isso a transacao inteira cai.
export class CreationLogNotConfirmedError extends Error {
  constructor() {
    super("a concessao nao confirmou a linha do registro de criacoes");
    this.name = "CreationLogNotConfirmedError";
  }
}

// A concessao venceu: confirma a linha que segurou o e-mail e guarda a origem somente no
// registro interno. A resposta e a auditoria publica nunca revelam o patio de origem.
export async function confirmAccessGrant(
  tx: Prisma.TransactionClient,
  input: CreationLogInput,
  creationSeq: bigint,
  userId: string,
  originTenantId: string,
): Promise<void> {
  const confirmed = await tx.userCreationLog.updateMany({
    where: { seq: creationSeq, tenant_id: input.tenantId, state: "em_curso" },
    data: { state: "concessao", user_id: userId, origin_tenant_id: originTenantId },
  });
  if (confirmed.count !== 1) throw new CreationLogNotConfirmedError();
}

// O registro do perdedor, em transacao curta propria: numero maior que o do vencedor. Nunca guarda
// o patio vencedor (K5).
export async function insertCancelledCreation(
  tx: Prisma.TransactionClient,
  input: CreationLogInput,
  reason: string,
): Promise<void> {
  await tx.userCreationLog.create({
    data: {
      tenant_id: input.tenantId,
      email_key: creationEmailKey(input.email),
      actor_user_id: input.actorUserId ?? null,
      state: "cancelado",
      reason,
    },
  });
}
