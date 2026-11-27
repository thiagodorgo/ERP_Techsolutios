import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

// B-SAN3-18 (R-A7 do plano v2) → B-PLANOS-MODULOS (decisão do dono `D-PLANOS-MODULOS-PORTA-REAL`, P1 opção A).
// A história inteira desta porta, em três atos:
//   1. antes do B-SAN3-18: gravava numa lista EM MEMÓRIA (platform-tenants.repository.ts) que nem o gate nem o menu
//      leem, e respondia 200 "habilitado" — mentia. Vermelho-controle daquela época (`da12fec6`): 200 com a lista.
//   2. B-SAN3-18 (11/11): passou a recusar SEMPRE, honesta — 409 `module_change_requires_subscription`, sem mudar
//      nada. Módulos só pela assinatura ou pelo script de provisionamento.
//   3. ESTE BLOCO: a recusa vale SÓ para organização COM assinatura em vigor. Para organização SEM assinatura a
//      porta grava DE VERDADE (`tenants.modules`, a coluna que o gate e o menu leem) e deixa trilha dupla.
// A prova completa está em `tests/planos-modulos-porta.test.ts` (T1 a T12, memória) e
// `tests/planos-modulos-porta-db.test.ts` (D1 a D10, Postgres sob papel NOSUPERUSER NOBYPASSRLS). Aqui ficam as
// três regressões do arnês do gate, REESCRITAS e não apagadas (§8.4 do plano).
// A tela do console (`PlatformTenantModulesPage.tsx`) agora tem de tratar 200 E 409: pendência
// `P-SAN3-18-TELA-MODULOS-DA-ORG-ENGANA` (R2-03(a)).

let gate: ArnesDoGate;
let tokenPlataforma = "";
let orgDoConsoleId = "";

before(async () => {
  gate = await abrirArnesDoGate();
  tokenPlataforma = await gate.token({ tenantId: "platform", userId: "usr_platform_18", email: "platform-18@example.com", roles: ["platform_admin"] });
  const created = await gate.chamar("POST", "/api/v1/platform/tenants", {
    token: tokenPlataforma,
    body: { name: "Organização Console A7", group: { name: "Grupo Console A7" } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  orgDoConsoleId = String(created.body.data.organization.id);
});

after(async () => {
  await gate.fechar();
});

function ligadas(resposta: { readonly body: any }): string[] {
  return ((resposta.body?.data ?? []) as Array<{ readonly key: string; readonly status: string }>)
    .filter((modulo) => modulo.status === "enabled")
    .map((modulo) => modulo.key);
}

test("A7 — organização sem assinatura: PATCH /platform/tenants/:id/modules → 200, e o console mostra as áreas ligadas", async () => {
  const antes = await gate.chamar("GET", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, { token: tokenPlataforma });
  assert.equal(antes.status, 200, JSON.stringify(antes.body));
  assert.deepEqual(ligadas(antes), [], "a organização nasce sem nenhuma área ligada");
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, {
    token: tokenPlataforma,
    body: { enabledModules: ["patios", "telemetry", "finance"] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const depois = await gate.chamar("GET", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, { token: tokenPlataforma });
  assert.equal(depois.status, 200, JSON.stringify(depois.body));
  // A lista é gravada e devolvida na ordem do CATÁLOGO, não na ordem do corpo: finance < patios < telemetry.
  assert.deepEqual(ligadas(depois), ["finance", "patios", "telemetry"]);
  assert.notDeepEqual(depois.body, antes.body, "a lista do console muda de verdade");
});

test("A7 — organização do armazém do gate, que o console não conhece, segue 404 e continua intocada", async () => {
  const org = gate.criarOrganizacao(["work_orders"]);
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${org.id}/modules`, { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
  assert.equal(r.status, 404, JSON.stringify(r.body));
  assert.equal(r.reason, "platform_tenant_not_found");
  assert.deepEqual(gate.core.getTenantForActor(org.id, org.id).modules, ["work_orders"]);
});

test("A7 — organização desconhecida do console segue 404", async () => {
  for (const id of ["pten-nao-existe", "11111111-1111-4111-8111-111111111111"]) {
    const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${id}/modules`, { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
    assert.equal(r.status, 404);
    assert.equal(r.reason, "platform_tenant_not_found");
  }
});
