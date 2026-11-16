import "dotenv/config";

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

// B-APROVACOES-DURAVEIS (item 67 do portão; plano §4.1, T1; critério 1) — A APROVAÇÃO SOBREVIVE AO REINÍCIO.
//
// Dois processos filhos de VERDADE, com `CORE_SAAS_PERSISTENCE=prisma`: o 1º conclui uma OS pelo serviço de OS (que
// pede a validação na mesma unidade da conclusão); o 2º, que nunca viu a memória do 1º, lista 1 pendente da OS e faz o
// `get` do id que o 1º devolveu, com sucesso. Antes do bloco a fila vivia num `Map` do processo: o 2º via 0 pendentes e
// recebia 404 (R4 do plano).
//
// Organização descartável por caso; teardown escopado pelo id dela (o idioma de tests/b-o6r-09-dispatch-atomic-db.test.ts).
// Sem DATABASE_URL, o arquivo se declara pulado.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROCESSO = path.join(REPO_ROOT, "tests", "helpers", "b-aprov-duraveis-processo.mts");
const connection = process.env.DATABASE_URL;

if (!connection) {
  test("o B-APROVACOES-DURAVEIS (reinício) no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  process.env.LOG_LEVEL = "silent";

  const adminPromise = import("../src/database/pg-connection.js").then(({ createPrismaClient }) => createPrismaClient(connection));
  after(async () => {
    await (await adminPromise).$disconnect();
  });

  test("T1 · o pedido de validação nascido num processo é lido por outro processo: 1 pendente e get 200", async () => {
    const admin: any = await adminPromise;
    const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await admin.tenant.create({ data: { name: `B-APROV reinício ${sufixo}`, slug: `b-aprov-restart-${sufixo}` } });
    try {
      const usuario = (nome: string) =>
        admin.user.create({ data: { tenant_id: tenant.id, name: `${nome} ${sufixo}`, email: `b-aprov-restart-${nome}-${sufixo}@example.com` } });
      const [gestor, decisor] = [await usuario("gestor"), await usuario("decisor")];
      const os = await admin.workOrder.create({
        data: { tenant_id: tenant.id, code: `WO-BAPROV-${sufixo}`, title: "OS B-APROV reinício", customer_name: "Cliente B-APROV", status: "in_progress" },
      });

      const primeiro = rodarProcesso(["concluir", tenant.id, gestor.id, os.id]);
      assert.equal(primeiro.processo, "concluir", JSON.stringify(primeiro));
      assert.equal(primeiro.status, "completed", JSON.stringify(primeiro));
      assert.equal(primeiro.pendentes, 1, `o 1º processo não viu o pedido que ele mesmo gerou: ${JSON.stringify(primeiro)}`);
      assert.equal(typeof primeiro.id, "string");

      const segundo = rodarProcesso(["ler", tenant.id, decisor.id, os.id, String(primeiro.id)]);
      assert.notEqual(segundo.pid, primeiro.pid, "os dois lados rodaram no mesmo processo");
      assert.deepEqual(
        { pendentes: segundo.pendentes, id: segundo.id, get: segundo.get, entidade: segundo.entidade },
        { pendentes: 1, id: primeiro.id, get: "200 pending_approval", entidade: "a OS" },
        `o 2º processo não achou a aprovação do 1º: ${JSON.stringify(segundo)}`,
      );

      const [{ n }] = await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND status = 'pending_approval'",
        tenant.id,
        os.id,
      );
      assert.equal(n, 1, "a linha da aprovação no banco");
    } finally {
      await teardown(admin, tenant.id);
    }
  });
}

function rodarProcesso(args: readonly string[]): Record<string, unknown> {
  const resultado = spawnSync(process.execPath, ["--import", "tsx", PROCESSO, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 90_000,
    env: { ...process.env, CORE_SAAS_PERSISTENCE: "prisma", DATABASE_URL: connection, LOG_LEVEL: "silent" },
  });
  assert.equal(resultado.status, 0, `o processo filho falhou (${resultado.status}):\n${resultado.stderr.slice(-1500)}`);
  const linha = resultado.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? "";
  try {
    return JSON.parse(linha) as Record<string, unknown>;
  } catch {
    assert.fail(`o processo filho não imprimiu JSON: ${resultado.stdout.slice(-500)}\n${resultado.stderr.slice(-500)}`);
  }
}

// Teardown ESCOPADO à organização descartável: toda tabela com `tenant_id` uuid, pelo id que o caso semeou, com gatilhos
// de FK em modo réplica; depois, zero linha residual. A notificação da decisão grava o uso de nuvem DEPOIS de responder
// (`recordCloudUsageBestEffort`, sem espera): uma linha pode chegar depois da limpeza. Por isso a limpeza repete até a
// contagem dar zero em todas as tabelas (no máximo 20 voltas de 100 ms), e só então afirma.
async function teardown(client: any, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await client.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  const residuo = async (): Promise<string[]> => {
    const sobras: string[] = [];
    for (const { table_name } of tabelas) {
      const [{ n }]: Array<{ n: number }> = await client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
      if (n > 0) sobras.push(`${table_name}=${n}`);
    }
    return sobras;
  };
  let sobras: string[] = [];
  for (let volta = 0; volta < 20; volta += 1) {
    await client.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const { table_name } of tabelas) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
      }
      await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    sobras = await residuo();
    if (sobras.length === 0) break;
  }
  assert.deepEqual(sobras, [], `teardown deixou linha(s) da organização descartável: ${sobras.join(", ")}`);
}
