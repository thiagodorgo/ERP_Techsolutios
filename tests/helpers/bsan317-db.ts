import type { PrismaClient } from "@prisma/client";

// -----------------------------------------------------------------------------------------------
// B-SAN3-17 (abertura E2.9) — o cliente PRIVILEGIADO da suíte `-db` do bloco (semeia e limpa; nunca é o cliente do
// app, que roda sob o papel efêmero de `createEphemeralRole`).
//
// Por que mora aqui e não no arquivo de teste: a E2.9 manda o `-db` do bloco não escrever o construtor do adaptador,
// para não crescer a catraca do #554 (B-DB-FUSO-UTC), que conta essa construção só FORA de `tests/helpers/` e só
// desce. A construção de cliente fica num lugar só; quando o #554 entrar na `main`, esta função passa a chamar a
// fábrica dele (`createPrismaClient` de `src/database/pg-connection.ts`) e nada mais muda.
// -----------------------------------------------------------------------------------------------
export async function createBsan317AdminClient(connectionString: string): Promise<PrismaClient> {
  const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  return new Client({ adapter: new PrismaPg({ connectionString }) });
}
