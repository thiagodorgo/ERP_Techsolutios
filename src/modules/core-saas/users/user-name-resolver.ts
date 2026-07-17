import type { ICoreSaasService } from "../services/core-saas-service.interface.js";

// Ω3F-5b (veto §11.2 da cognicao J-Ω3F-5B) — a UI NUNCA pode imprimir o UUID do usuário como se fosse o
// nome ("autor", "enviado por"). Este resolver traduz userId → NOME legível, tenant-scoped, no backend;
// o DTO passa a emitir `authorName`/`uploadedByName` e o front exibe o nome (o UUID nunca é renderizado).
// Falha/inexistente → null (o front cai num rótulo neutro, jamais no identificador cru).
export type UserNameResolver = (tenantId: string, userId: string) => Promise<string | null>;

/** Resolver real, composto na raiz (app.ts) a partir do ICoreSaasService já injetado no createApp. */
export function createUserNameResolver(service: ICoreSaasService): UserNameResolver {
  return async (tenantId, userId) => {
    try {
      const user = await service.getUserForTenant(userId, tenantId);
      return user?.name ?? null;
    } catch {
      return null;
    }
  };
}

/**
 * Resolve um LOTE de ids para um mapa id→nome. Deduplica antes de consultar (evita N+1 quando vários
 * comentários/anexos são do mesmo autor). Ids irresolvíveis simplesmente não entram no mapa.
 */
export async function resolveUserNames(
  resolver: UserNameResolver | undefined,
  tenantId: string,
  userIds: readonly (string | null | undefined)[],
): Promise<ReadonlyMap<string, string>> {
  const names = new Map<string, string>();
  if (!resolver) return names;

  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  await Promise.all(
    unique.map(async (id) => {
      const name = await resolver(tenantId, id);
      if (name) names.set(id, name);
    }),
  );

  return names;
}
