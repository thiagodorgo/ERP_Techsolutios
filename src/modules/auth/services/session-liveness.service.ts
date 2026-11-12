import { env } from "../../../config/env.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — P-SESSAO-VIVA: todo access token aceito por qualquer rota pertence a uma sessão que,
// no instante da requisição, está viva (existe para o mesmo par organização e usuário, não foi revogada, não
// venceu) e cujo usuário está ativo naquela organização. Quem chama é o portão (`attachAuthenticatedActor`), UMA
// vez por requisição (memo no portão), e o tique do stream do mapa ao vivo.
//
// O veredito:
//   - "skipped"  — modo memória (dev e teste): não há sessão para conferir (as sessões só existem no Prisma) e
//                  produção não sobe nesse modo (boot do `env.ts`). É a PRIMEIRA instrução, antes do formato dos
//                  ids, porque os testes em memória assinam com ids que não são UUID (A10);
//   - "inactive" — id fora do formato UUID (sem consultar), sessão revogada, vencida, alheia ou ausente, ou
//                  usuário que não está ativo na organização;
//   - "alive"    — a linha existe.
// Falha da consulta (banco fora, tempo esgotado) LANÇA: o portão responde 503 e nunca 401, porque 401 desloga.
//
// O banco entra por `import()` DENTRO de `check` (A10): `src/database/prisma.ts` lança no import sem
// `DATABASE_URL`, e o modo memória não pode abrir Prisma. O mesmo padrão do RBAC persistente.
// -----------------------------------------------------------------------------------------------

export type SessionLivenessVerdict = "alive" | "inactive" | "skipped";

export type SessionLivenessInput = {
  readonly userId: string;
  readonly tenantId: string;
  // Ausente só no token emitido antes do deploy deste bloco (ou assinado direto por teste): a via sem `sid`
  // confere o status do usuário e não a sessão (residual de deploy declarado; P-SID-OBRIGATORIO).
  readonly sessionId?: string;
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Orçamento (Emenda 1, A3): `maxWait` igual ao padrão do Prisma (o portão não é o primeiro a desistir com o pool
// disputado); `timeout` acima de trava + instrução, para o PostgreSQL cancelar primeiro (cancelamento limpo);
// `lockTimeoutMs` e `statementTimeoutMs` são os padrões de `withTenantRlsBudget`, por extenso.
const SESSION_LIVENESS_BUDGET = { maxWait: 2_000, timeout: 3_000, lockTimeoutMs: 1_000, statementTimeoutMs: 1_500 } as const;

async function check(input: SessionLivenessInput): Promise<SessionLivenessVerdict> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return "skipped";
  }

  const { userId, tenantId, sessionId } = input;

  if (!UUID_PATTERN.test(userId) || !UUID_PATTERN.test(tenantId)) {
    return "inactive";
  }

  if (sessionId !== undefined && !UUID_PATTERN.test(sessionId)) {
    return "inactive";
  }

  const [{ prisma }, { withTenantRlsBudget }] = await Promise.all([
    import("../../../database/prisma.js"),
    import("../../../database/rls.js"),
  ]);

  return withTenantRlsBudget(prisma, tenantId, SESSION_LIVENESS_BUDGET, async (tx): Promise<SessionLivenessVerdict> => {
    if (sessionId !== undefined) {
      // A sessão DO TOKEN (`s.id`), do MESMO par, viva, e o usuário ativo. Uma linha por condição: cada uma é
      // âncora de mutação. O filtro por organização é redundante com a RLS (o GUC é o mesmo valor): defesa em
      // profundidade, e casa com o `@@unique([tenant_id, id])` de `auth_sessions`.
      const rows = await tx.$queryRaw<Array<{ alive: number }>>`
        SELECT 1 AS alive
        FROM auth_sessions s
        JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${tenantId}::uuid
          AND s.id = ${sessionId}::uuid
          AND s.user_id = ${userId}::uuid
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.status = 'active'
        LIMIT 1
      `;

      return rows.length > 0 ? "alive" : "inactive";
    }

    // Via sem `sid` (transitória, P-SID-OBRIGATORIO): cobre o desativado, não a sessão encerrada.
    const user = await tx.user.findFirst({
      where: { id: userId, tenant_id: tenantId, status: "active" },
      select: { id: true },
    });

    return user ? "alive" : "inactive";
  });
}

// Objeto exportado (não a função solta): o portão e o stream chamam `sessionLiveness.check(...)`, e o teste troca
// a conferência com `mock.method` sem opção nova no portão. O `src/` nunca a troca (T17 (f)).
export const sessionLiveness = { check };
