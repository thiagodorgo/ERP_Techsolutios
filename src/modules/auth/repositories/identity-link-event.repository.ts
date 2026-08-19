import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type IdentityLinkEventKind = "backfill" | "religacao" | "desvinculo";

export type AppendIdentityLinkEventInput = {
  readonly link_id: string;
  readonly from_identity_id: string | null;
  readonly to_identity_id: string;
  readonly event: IdentityLinkEventKind;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly actor_tenant_id?: string | null;
  readonly actor_user_id?: string | null;
};

// B-O6R-01 (§3.1 do plano) — trilha `auth_identity_link_events`: INSERT-only, SEM RETURNING.
// A tabela não tem política de SELECT (ilegível sob qualquer role sem BYPASSRLS) e o create()
// do Prisma sempre emite RETURNING — sob a role real ele falharia com 42501. createMany não
// emite RETURNING; o id nasce na aplicação. create()/upsert() aqui são proibidos (guard de
// padrão em tests/auth-invariant-guards.test.ts). Nenhum método de leitura existe de propósito:
// a aplicação não lê a trilha — quem decide por proveniência lê `auth_identity_links.attached_via`
// (terceira armadilha, opção A).
export class IdentityLinkEventRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async append(input: AppendIdentityLinkEventInput): Promise<void> {
    await this.client.authIdentityLinkEvent.createMany({
      data: [
        {
          id: randomUUID(),
          link_id: input.link_id,
          from_identity_id: input.from_identity_id,
          to_identity_id: input.to_identity_id,
          event: input.event,
          tenant_id: input.tenant_id,
          user_id: input.user_id,
          actor_tenant_id: input.actor_tenant_id ?? null,
          actor_user_id: input.actor_user_id ?? null,
        },
      ],
    });
  }
}
