// B-SEC-LOG-SANITIZA (H8e a H8g, Emenda 1 §E7) — a LEITURA do texto de erro já gravado nos custos de nuvem.
//
// Uma linha gravada por uma versão antiga leva o texto cru do driver em `errorMessage` (caminho, `prisma.` e host). Não há
// migração: o DTO de cada rota limpa o texto na saída (`publicStoredError`). Persistência em memória e o arnês de
// `tests/aws-cur-cost-routes.test.ts` (`createApp(new MemoryCoreSaasAdapter(core))` e os cabeçalhos da plataforma).
//
// A cobrança de nuvem não está montada no produto desde o #498 (Emenda 1 §E9): o H8e monta o router EXPORTADO num app
// Express do próprio teste. Rateio e AWS CUR vão pelo app do produto.
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";

const { default: express } = await import("express");
const { createApp } = await import("../src/app.js");
const { CoreSaasRegistry } = await import("../src/modules/core-saas/services/core-saas.service.js");
const { MemoryCoreSaasAdapter } = await import("../src/modules/core-saas/services/memory-core-saas.adapter.js");
const { InMemoryCoreSaasStore } = await import("../src/modules/core-saas/store/core-saas.store.js");
const { getMemoryCloudChargeRepositoryForTests, resetCloudChargeRuntimeForTests } = await import(
  "../src/modules/cloud-charges/cloud-charge.service.js"
);
const { createCloudChargesPlatformRouter } = await import("../src/modules/cloud-charges/cloud-charge.routes.js");
const { getMemoryCloudCostAllocationRepositoryForTests, resetCloudCostAllocationRuntimeForTests } = await import(
  "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
);
const { getMemoryCloudCostRepositoryForTests, resetCloudCostRuntimeForTests } = await import(
  "../src/modules/cloud-costs/aws-cur.service.js"
);

/** O texto que uma versão antiga gravou (P1001 do modelo, com caminho e host). */
const TEXTO_GRAVADO_ANTIGO =
  "\nInvalid `prisma.tenantCloudCharge.createMany()` invocation in\n/srv/app/src/modules/cloud-charges/cloud-charge-prisma.repository.ts:131:9\n\nCan't reach database server at hstdb-sentinela:5439";
const MENSAGEM_FIXA = "Execution failed. See server logs.";

const CABECALHOS_DA_PLATAFORMA = { "x-user-id": "usr_platform", "x-role": "super_admin" };
const PERIODO = { periodStart: new Date("2026-06-01T00:00:00.000Z"), periodEnd: new Date("2026-06-30T23:59:59.000Z") };

type Leitura = { readonly status: number; readonly data: Record<string, unknown> | undefined };

async function comServidor(app: ReturnType<typeof express>, acao: (base: string) => Promise<void>): Promise<void> {
  const servidor = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    await acao(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}`);
  } finally {
    servidor.closeAllConnections();
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
  }
}

async function ler(url: string): Promise<Leitura> {
  const resposta = await fetch(url, { headers: CABECALHOS_DA_PLATAFORMA });
  const corpo = (await resposta.json()) as { data?: Record<string, unknown> };
  return { status: resposta.status, data: corpo.data };
}

function conferirLeitura(rotulo: string, falha: Leitura, semErro: Leitura) {
  assert.equal(falha.status, 200, rotulo);
  assert.equal(falha.data?.errorMessage, MENSAGEM_FIXA, `${rotulo}: ${JSON.stringify(falha.data?.errorMessage)}`);
  const texto = JSON.stringify(falha.data);
  for (const proibido of ["hstdb-sentinela", "/srv/app", "prisma."]) {
    assert.equal(texto.includes(proibido), false, `${rotulo}: ${proibido} na resposta`);
  }
  assert.equal(semErro.status, 200, rotulo);
  assert.equal(semErro.data !== undefined && "errorMessage" in semErro.data, false, `${rotulo}: errorMessage apareceu sem erro`);
}

function appDoProduto() {
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  return createApp(new MemoryCoreSaasAdapter(core));
}

test("H8e cobrança: a run falha gravada no formato antigo sai com a mensagem fixa pelo router exportado; sem erro, campo ausente", async () => {
  resetCloudChargeRuntimeForTests();
  try {
    const repositorio = getMemoryCloudChargeRepositoryForTests();
    const origem = "00000000-0000-4000-8000-000000000001";
    const semErro = await repositorio.createCalculationRun({ ...PERIODO, sourceAllocationRunId: origem });
    const falha = await repositorio.createCalculationRun({ ...PERIODO, sourceAllocationRunId: origem });
    await repositorio.updateCalculationRun(falha.id, { status: "failed", errorMessage: TEXTO_GRAVADO_ANTIGO });
    const app = express();
    app.use("/", createCloudChargesPlatformRouter());
    await comServidor(app, async (base) => {
      conferirLeitura(
        "cobrança",
        await ler(`${base}/cloud-charges/calculation-runs/${falha.id}`),
        await ler(`${base}/cloud-charges/calculation-runs/${semErro.id}`),
      );
    });
  } finally {
    resetCloudChargeRuntimeForTests();
  }
});

test("H8f rateio: a run falha gravada no formato antigo sai com a mensagem fixa pelo app do produto; sem erro, campo ausente", async () => {
  resetCloudCostAllocationRuntimeForTests();
  try {
    const repositorio = getMemoryCloudCostAllocationRepositoryForTests();
    const falha = await repositorio.createRun(PERIODO);
    await repositorio.updateRun(falha.id, { status: "failed", errorMessage: TEXTO_GRAVADO_ANTIGO });
    const semErro = await repositorio.createRun(PERIODO);
    await comServidor(appDoProduto(), async (base) => {
      conferirLeitura(
        "rateio",
        await ler(`${base}/api/v1/platform/cloud-cost-allocations/runs/${falha.id}`),
        await ler(`${base}/api/v1/platform/cloud-cost-allocations/runs/${semErro.id}`),
      );
    });
  } finally {
    resetCloudCostAllocationRuntimeForTests();
  }
});

test("H8g AWS CUR: a importação falha gravada no formato antigo sai com a mensagem fixa pelo app do produto; sem erro, campo ausente", async () => {
  resetCloudCostRuntimeForTests();
  try {
    const repositorio = getMemoryCloudCostRepositoryForTests();
    const falha = await repositorio.createImport({ provider: "aws", sourceType: "manual_csv", status: "processing" });
    await repositorio.updateImport(falha.id, { status: "failed", errorMessage: TEXTO_GRAVADO_ANTIGO });
    const semErro = await repositorio.createImport({ provider: "aws", sourceType: "manual_csv", status: "processing" });
    await comServidor(appDoProduto(), async (base) => {
      conferirLeitura(
        "AWS CUR",
        await ler(`${base}/api/v1/platform/cloud-costs/imports/${falha.id}`),
        await ler(`${base}/api/v1/platform/cloud-costs/imports/${semErro.id}`),
      );
    });
  } finally {
    resetCloudCostRuntimeForTests();
  }
});
