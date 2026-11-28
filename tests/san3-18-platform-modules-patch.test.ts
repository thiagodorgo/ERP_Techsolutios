import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

// A porta "ligar módulo para esta organização" do console da plataforma, em três tempos:
//   - antes do B-SAN3-18: gravava numa lista EM MEMÓRIA (platform-tenants.repository.ts) que nem o gate nem o menu
//     leem, e respondia 200 "habilitado";
//   - B-SAN3-18 (R-A7 do plano v2, 11/11): passou a recusar, honesta: 409 `module_change_requires_subscription`, e nada
//     mudava — porque o console de organizações ainda era de mentira (em memória);
//   - B-PLANOS-MODULOS (decisão do dono `D-PLANOS-MODULOS-PORTA-REAL`, P1 = A): o console grava no banco desde o #642, e
//     a porta passa a gravar de verdade para organização SEM assinatura em vigor, com trilha; COM assinatura segue 409,
//     porque quem manda nos módulos é o plano contratado.
// Este arquivo roda em memória: o console e o armazém do gate são armazéns diferentes (L3 do plano). A prova de que o
// gate e o menu enxergam é o D2 de `tests/planos-modulos-porta-db.test.ts`, com Postgres. A tela do console
// (`PlatformTenantModulesPage.tsx`) passa a ter de tratar 200 e 409: pendência `P-SAN3-18-TELA-MODULOS-DA-ORG-ENGANA`.
// Vermelho-controle no head-base do B-PLANOS-MODULOS (`8719cf045`): 409 para a organização do console, sem assinatura.

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

test("A7 — sem assinatura, PATCH /platform/tenants/:id/modules grava e o console mostra exatamente as áreas ligadas", async () => {
  const antes = await gate.chamar("GET", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, { token: tokenPlataforma });
  assert.equal(antes.status, 200, JSON.stringify(antes.body));
  assert.deepEqual(ligadas(antes.body.data), [], "a organização nova nasce sem área ligada");
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, {
    token: tokenPlataforma,
    body: { enabledModules: ["patios", "telemetry", "finance"] },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(ligadas(r.body.data), ["finance", "patios", "telemetry"], "a resposta é a lista relida, na ordem do catálogo");
  const depois = await gate.chamar("GET", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, { token: tokenPlataforma });
  assert.deepEqual(depois.body, r.body, "o console mostra o que a porta gravou");
  assert.deepEqual(
    (depois.body.data as Array<{ status: string }>).filter((modulo) => modulo.status === "blocked_by_plan"),
    [],
    "sem assinatura nada fica bloqueado pelo plano",
  );
});

test("A7 — a organização que só o armazém do gate conhece responde 404 e não muda; a escrita no console não a toca", async () => {
  const org = gate.criarOrganizacao(["work_orders"]);
  const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${org.id}/modules`, { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
  assert.equal(r.status, 404, JSON.stringify(r.body));
  assert.equal(r.reason, "platform_tenant_not_found");
  assert.deepEqual(gate.core.getTenantForActor(org.id, org.id).modules, ["work_orders"]);
  const console = await gate.chamar("PATCH", `/api/v1/platform/tenants/${orgDoConsoleId}/modules`, {
    token: tokenPlataforma,
    body: { enabledModules: ["patios"] },
  });
  assert.equal(console.status, 200, JSON.stringify(console.body));
  assert.deepEqual(ligadas(console.body.data), ["patios"]);
  assert.deepEqual(gate.core.getTenantForActor(org.id, org.id).modules, ["work_orders"]);
});

test("A7 — organização desconhecida do console segue 404", async () => {
  for (const id of ["pten-nao-existe", "11111111-1111-4111-8111-111111111111"]) {
    const r = await gate.chamar("PATCH", `/api/v1/platform/tenants/${id}/modules`, { token: tokenPlataforma, body: { enabledModules: ["patios"] } });
    assert.equal(r.status, 404);
    assert.equal(r.reason, "platform_tenant_not_found");
  }
});

function ligadas(modulos: unknown): string[] {
  return (modulos as Array<{ key: string; status: string }>).filter((modulo) => modulo.status === "enabled").map((modulo) => modulo.key);
}
