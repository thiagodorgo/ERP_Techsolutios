import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type LoginCandidateRow = {
  readonly tenant_id: string;
  readonly user_id: string;
};

// B-O6R-01 (§6.3 do plano) — a ÚNICA entrada de consulta cross-tenant por e-mail do sistema
// (guard de padrão em tests/auth-invariant-guards.test.ts). Dois chamadores, UMA entrada
// (especialista 5): o call-site do login sem organização e a SONDA de prontidão (§3.8).
//
// Atravessa a função elevada `public.auth_login_candidates(text)` (SECURITY DEFINER — a única
// do repositório). O SQLSTATE de erro (42501 sem EXECUTE, 42883 função ausente) SOBREVIVE até o
// chamador: a conversão para 401 uniforme é responsabilidade da ROTA, nunca daqui — sem isso a
// sonda não conseguiria discriminar os estados inert_no_execute/absent.
export async function listLoginCandidatesViaFunction(
  client: PrismaExecutor,
  email: string,
): Promise<LoginCandidateRow[]> {
  return client.$queryRaw<LoginCandidateRow[]>`
    SELECT tenant_id, user_id FROM public.auth_login_candidates(${email})
  `;
}

// Extrai o SQLSTATE de um erro do Prisma em consulta raw. Forma MEDIDA no driver adapter pg
// (Prisma 7): PrismaClientKnownRequestError { code: "P2010", meta: { driverAdapterError:
// { cause: { code: "42501", … } } } } — o `code` de topo é o código do PRISMA (P2010), nunca o
// SQLSTATE; por isso a leitura desce até a causa do adapter e, em último caso, ao texto
// "Code: `NNNNN`" da mensagem. Devolve null quando não há SQLSTATE legível.
export function readSqlState(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly meta?: {
      readonly code?: unknown;
      readonly driverAdapterError?: { readonly cause?: { readonly code?: unknown } };
    };
    readonly cause?: unknown;
  };
  const adapterCode = candidate.meta?.driverAdapterError?.cause?.code;

  if (typeof adapterCode === "string" && /^[0-9A-Z]{5}$/.test(adapterCode)) {
    return adapterCode;
  }

  if (typeof candidate.meta?.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.meta.code) && !candidate.meta.code.startsWith("P")) {
    return candidate.meta.code;
  }

  if (
    typeof candidate.code === "string" &&
    /^[0-9A-Z]{5}$/.test(candidate.code) &&
    !candidate.code.startsWith("P")
  ) {
    return candidate.code;
  }

  if (typeof candidate.message === "string") {
    const match = /Code: `([0-9A-Z]{5})`/.exec(candidate.message);

    if (match && !match[1].startsWith("P")) {
      return match[1];
    }
  }

  if (candidate.cause) {
    return readSqlState(candidate.cause);
  }

  return null;
}
