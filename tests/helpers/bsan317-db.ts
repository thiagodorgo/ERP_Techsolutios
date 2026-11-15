import type { PrismaClient } from "@prisma/client";

import { createPrismaClient } from "../../src/database/pg-connection.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-17 (abertura E2.9) — o cliente PRIVILEGIADO da suíte `-db` do bloco (semeia e limpa; nunca é o cliente do
// app, que roda sob o papel efêmero de `createEphemeralRole`).
//
// Por que mora aqui e não no arquivo de teste: a E2.9 manda o `-db` do bloco não escrever o construtor do adaptador,
// para não crescer a catraca G3 do B-DB-FUSO-UTC (#554), que conta essa construção fora de `tests/helpers/` e só desce.
// Desde o #554, a construção passa pela fábrica `createPrismaClient` (`src/database/pg-connection.ts`), que fixa o fuso
// da sessão em UTC, como o app.
// -----------------------------------------------------------------------------------------------
export async function createBsan317AdminClient(connectionString: string): Promise<PrismaClient> {
  return createPrismaClient(connectionString);
}
