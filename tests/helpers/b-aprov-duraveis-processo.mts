// B-APROVACOES-DURAVEIS (item 67; plano §4.1, T1) — um PROCESSO de verdade, para provar que a aprovação sobrevive ao
// reinício. Quem chama é tests/b-aprov-duraveis-restart-db.test.ts, com `CORE_SAAS_PERSISTENCE=prisma` e o
// `DATABASE_URL` do banco descartável no ambiente. Cada processo imprime UMA linha JSON e sai.
//
//   concluir <tenantId> <userId> <workOrderId>  — conclui a OS pelo serviço de OS e lista os pendentes da OS;
//   ler      <tenantId> <userId> <workOrderId> [<approvalId>]  — outro processo: lista os pendentes da OS e faz o `get`
//            do id que o 1º processo devolveu (ou, sem ele, do 1º pendente que este processo listar).
//
// Só ids opacos e contagens na saída (§2.8): nada de texto de motivo, e-mail ou segredo.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const importar = (relativo: string) => import(pathToFileURL(path.join(SRC, relativo)).href);

const [modo, tenantId, userId, workOrderId, approvalIdDoOutro] = process.argv.slice(2);
if (!modo || !tenantId || !userId || !workOrderId) {
  console.log(JSON.stringify({ erro: "uso: <concluir|ler> <tenantId> <userId> <workOrderId>" }));
  process.exit(2);
}

const [{ resolvePermissionsForRoles }, workOrders, approvals, { prisma }] = await Promise.all([
  importar("modules/core-saas/permissions/catalog.ts"),
  importar("modules/work-orders/work-order.service.ts"),
  importar("modules/work-orders/approval.service.ts"),
  importar("database/prisma.ts"),
]);

const ator = {
  tenantId,
  userId,
  roles: ["manager"],
  permissions: resolvePermissionsForRoles(["manager"]),
  explicitPermissions: true,
};

let saida: Record<string, unknown>;
try {
  if (modo === "concluir") {
    const servicoDeOs = await workOrders.createDefaultWorkOrderService();
    const os = await servicoDeOs.changeStatus(ator, workOrderId, { status: "completed" });
    const pendentes = await (await approvals.createDefaultApprovalService()).listPending(ator, { work_order_id: workOrderId });
    saida = { processo: "concluir", pid: process.pid, status: os.status, pendentes: pendentes.length, id: pendentes[0]?.id ?? null };
  } else {
    const servico = await approvals.createDefaultApprovalService();
    const pendentes = await servico.listPending(ator, { work_order_id: workOrderId });
    const alvo = approvalIdDoOutro || pendentes[0]?.id;
    let get = "sem id para ler";
    let entidade: string | null = null;
    if (alvo) {
      try {
        const lida = await servico.get(ator, alvo);
        get = `200 ${lida.status}`;
        entidade = lida.entityId === workOrderId ? "a OS" : "outra";
      } catch (error) {
        const e = error as { statusCode?: number; reason?: string };
        get = `${e.statusCode ?? "?"} ${e.reason ?? "?"}`;
      }
    }
    saida = { processo: "ler", pid: process.pid, pendentes: pendentes.length, id: pendentes[0]?.id ?? null, get, entidade };
  }
} catch (error) {
  const e = error as { statusCode?: number; reason?: string; message?: string };
  saida = { processo: modo, erro: `${e.statusCode ?? "?"} ${e.reason ?? "?"}`, mensagem: String(e.message ?? "").slice(0, 200) };
} finally {
  await prisma.$disconnect().catch(() => undefined);
}

console.log(JSON.stringify(saida));
process.exit(0);
