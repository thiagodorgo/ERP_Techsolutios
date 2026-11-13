import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

// B-SAN3-18 (R-A7 do plano v2) — a porta "ligar módulo para esta organização" do console da plataforma gravava numa
// lista EM MEMÓRIA (platform-tenants.repository.ts), que nem o gate nem o menu leem, e respondia 200 "habilitado".
// Agora ela recusa, honesta: 409 `module_change_requires_subscription`, e nada muda — nem a lista do console nem
// `tenants.modules`. Módulos mudam só pela assinatura ou pelo script de provisionamento. A tela do console
// (`PlatformTenantModulesPage.tsx`) não trata o 409: pendência `P-SAN3-18-TELA-MODULOS-DA-ORG-ENGANA` (R2-03(a)).
// Vermelho-controle no head-base (`da12fec6`): 200 com a lista "habilitada".

let gate: ArnesDoGate;
let tokenPlataforma = "";

before(async () => {
  gate = await abrirArnesDoGate();
  tokenPlataforma = await gate.token({ tenantId: "platform", userId: "usr_platform_18", email: "platform-18@example.com", roles: ["platform_admin"] });
});

after(async () => {
  await gate.fechar();
});

const ORG_DO_CONSOLE = "pten-industrial-01";

test("A7 — PATCH /platform/tenants/:id/modules → 409 module_change_requires_subscription, e a lista do console não muda", async () => {
  const antes = await gate.chamar("GET", `/api/v1/platform/tenants/${ORG_DO_CONSOLE}/modules`, { token: tokenPlataforma });
  assert.equal(antes.status, 200, JSON.stringify(antes.body));
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${ORG_DO_CONSOLE}/modules`, {
    token: tokenPlataforma,
    body: { enabledModules: ["patios", "telemetry", "finance"] },
  });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.reason, "module_change_requires_subscription");
  const depois = await gate.chamar("GET", `/api/v1/platform/tenants/${ORG_DO_CONSOLE}/modules`, { token: tokenPlataforma });
  assert.deepEqual(depois.body, antes.body, "a lista do console não muda");
});

test("A7 — a recusa não toca `tenants.modules` de organização nenhuma", async () => {
  const org = gate.criarOrganizacao(["work_orders"]);
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${org.id}/modules`, { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
  assert.notEqual(r.status, 200);
  assert.deepEqual(gate.core.getTenantForActor(org.id, org.id).modules, ["work_orders"]);
});

test("A7 — organização desconhecida do console segue 404", async () => {
  const r = await gate.chamar("PATCH", "/api/v1/platform/tenants/pten-nao-existe/modules", { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
  assert.equal(r.status, 404);
});
