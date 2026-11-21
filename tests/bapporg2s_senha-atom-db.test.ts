import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { cleanupIdentityFixture, createOrgWithUser } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S, fatia S2p — GP-ATOM da Emenda 1.8.3.11 (Revisão 2, K310b-03), em Postgres de verdade, sem
// dublê e sem DDL. O espelho `changePasswordAcrossPairs` do runtime REAL recebe 2 pares: o 1º existe e o 2º
// tem um usuário que não existe no pátio dele. O `update` do 2º lança P2025 e a transação única volta; o hash
// do 1º par, lido pela conexão de administração, NÃO mudou.
// Esta suíte roda o runtime no `DATABASE_URL` dos testes `-db` (superusuário), de propósito: é a forma em que a
// MD3 (gravar com `prisma` em vez de `tx`) fica vermelha aqui. A forma com o papel sem bypass é o GP6.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-APP-ORG-2S S2p · GP-ATOM exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  const admin = createPrismaClient(connectionString);
  const tenantIds: string[] = [];

  after(async () => {
    try {
      await cleanupIdentityFixture(admin, tenantIds);
    } finally {
      const { prisma } = await import("../src/database/prisma.js");

      await prisma.$disconnect();
      await admin.$disconnect();
    }
  });

  test("GP-ATOM — o 2º par falha (P2025) e a transação única desfaz o 1º: o hash dele não muda", async () => {
    const suffix = `atom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `s2p-${suffix}@example.com`;
    const x = await createOrgWithUser(admin, { name: `S2P ATOM X ${suffix}`, slug: `s2p-atom-x-${suffix}`, email, password: "SenhaAtom!123" });
    const y = await createOrgWithUser(admin, { name: `S2P ATOM Y ${suffix}`, slug: `s2p-atom-y-${suffix}`, email, password: "SenhaAtom!123" });

    tenantIds.push(x.tenantId, y.tenantId);

    const { prisma } = await import("../src/database/prisma.js");
    const [{ rolsuper }] = await prisma.$queryRaw<Array<{ rolsuper: boolean }>>`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;

    assert.equal(rolsuper, true, "esta forma roda o runtime no superusuário dos testes -db");

    const before = await admin.localAuthCredential.findFirst({ where: { tenant_id: x.tenantId, user_id: x.userId }, select: { password_hash: true } });
    const { getLocalAuthLoginService } = await import("../src/modules/auth/auth-runtime.js");
    const { hashPassword } = await import("../src/modules/auth/index.js");
    const runtime = await getLocalAuthLoginService();
    const fresh = await hashPassword("SenhaNovaAtom!987");

    await assert.rejects(
      runtime.changePasswordAcrossPairs(
        [
          { tenantId: x.tenantId, userId: x.userId },
          { tenantId: y.tenantId, userId: randomUUID() },
        ],
        { password_hash: fresh.password_hash, password_algorithm: fresh.password_algorithm },
      ),
      (error: unknown) => (error as { code?: string }).code === "P2025",
      "GP-ATOM: o update do 2º par lança P2025",
    );

    const afterRow = await admin.localAuthCredential.findFirst({ where: { tenant_id: x.tenantId, user_id: x.userId }, select: { password_hash: true } });

    assert.ok(before);
    assert.equal(afterRow?.password_hash, before.password_hash, "GP-ATOM: o hash do 1º par NÃO mudou");
  });
}
