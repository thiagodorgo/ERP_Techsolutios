import type { Prisma } from "@prisma/client";

import { setTenantRlsContext } from "../../../database/rls.js";

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

  await setTenantRlsContext(tx, normalizedSeedTenantId);
  const identityRows = await tx.$queryRaw<Array<{ identity_id: string }>>`
    SELECT identity_id
    FROM auth_identity_links
    WHERE tenant_id = ${normalizedSeedTenantId}::uuid AND user_id = ${normalizedSeedUserId}::uuid
    LIMIT 1
  `;
  const identityId = identityRows[0]?.identity_id ?? null;

  if (!identityId) {
    return [{ tenantId: normalizedSeedTenantId, userId: normalizedSeedUserId }];
  }

  const tenants = await tx.tenant.findMany({
    select: { id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  const pairs: PasswordFamilyPair[] = [];

  for (const tenant of tenants) {
    await setTenantRlsContext(tx, tenant.id);
    const links = await tx.$queryRaw<Array<{ tenantId: string; userId: string }>>`
      SELECT tenant_id::text AS "tenantId", user_id::text AS "userId"
      FROM auth_identity_links
      WHERE tenant_id = ${tenant.id}::uuid AND identity_id = ${identityId}::uuid
      LIMIT 1
    `;
    const link = links[0];

    if (!link) {
      continue;
    }

    const user = await tx.user.findFirst({
      where: { id: link.userId, tenant_id: link.tenantId },
      select: { status: true },
    });

    if (!user) {
      continue;
    }

    if (options.onlyActiveUsers && user.status !== "active") {
      continue;
    }

    pairs.push({ tenantId: link.tenantId, userId: link.userId });
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

