import type { Prisma } from "@prisma/client";

export async function grantAuthLoginCandidatesExecuteToRole(
  tx: Prisma.TransactionClient,
  roleName: string,
): Promise<void> {
  await tx.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO "${roleName}"`);
}
