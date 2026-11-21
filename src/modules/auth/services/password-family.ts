import type { Prisma } from "@prisma/client";

import { setIdentityRlsContext, setTenantRlsContext } from "../../../database/rls.js";
import { IdentityLinkRepository } from "../repositories/identity-link.repository.js";

export type PasswordFamilyPair = {
  readonly tenantId: string;
  readonly userId: string;
};

type ResolvePasswordFamilyOptions = {
  readonly onlyActiveUsers?: boolean;
};

export async function resolvePasswordFamilyPairs(
  tx: Prisma.TransactionClient,
  seedTenantId: string,
  seedUserId: string,
  options: ResolvePasswordFamilyOptions = {},
): Promise<readonly PasswordFamilyPair[]> {
  const normalizedSeedTenantId = seedTenantId.trim();
  const normalizedSeedUserId = seedUserId.trim();

  if (!normalizedSeedTenantId || !normalizedSeedUserId) {
    return [];
  }

  const actor = {
    userId: normalizedSeedUserId,
    tenantId: normalizedSeedTenantId,
    email: "",
    roles: [] as const,
    authType: "jwt" as const,
  };

  const identityId = await setIdentityRlsContext(tx, actor);

  if (!identityId) {
    return [{ tenantId: normalizedSeedTenantId, userId: normalizedSeedUserId }];
  }

  const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);
  const pairs: PasswordFamilyPair[] = [];

  for (const link of links) {
    await setTenantRlsContext(tx, link.tenant_id);
    const user = await tx.user.findFirst({
      where: { id: link.user_id, tenant_id: link.tenant_id },
      select: { status: true },
    });

    if (!user) {
      continue;
    }

    if (options.onlyActiveUsers && user.status !== "active") {
      continue;
    }

    pairs.push({ tenantId: link.tenant_id, userId: link.user_id });
  }

  if (pairs.length === 0) {
    return [{ tenantId: normalizedSeedTenantId, userId: normalizedSeedUserId }];
  }

  const dedup = new Map<string, PasswordFamilyPair>();

  for (const pair of pairs) {
    dedup.set(`${pair.tenantId}:${pair.userId}`, pair);
  }

  return [...dedup.values()];
}

export function uniqueTenantIdsFromPairs(
  pairs: readonly PasswordFamilyPair[],
): readonly string[] {
  return [...new Set(pairs.map((pair) => pair.tenantId))];
}

