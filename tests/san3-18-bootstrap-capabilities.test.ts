import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { after, before } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

// B-SAN3-18 (P7 do plano v2, R-A5) — capacidade ligada no bootstrap móvel ⇒ o gate deixa passar os endpoints dela.
// Um 403 no sync não apaga a fila do app, mas prende a ação (R4 do plano); por isso o que o bootstrap liga tem de
// passar. A matriz é LITERAL (tests/fixtures/san3-18-formas/capacidades.json) e cobre TODA capacidade de
// `buildFeatureFlags` (lida do texto de mobile.routes.ts): capacidade nova sem linha na matriz deixa este teste vermelho.
// Também aqui a P3(a) do dono: a LEITURA dos cadastros que a OS usa fica liberada; criar e editar exige a área.
// Vermelho-controle no head-base (`da12fec6`): sem gate, tudo passa (o teste é de regressão do gate novo).

const MATRIZ: Record<string, { liga: string[][]; endpoints: string[] }> = JSON.parse(
  fs.readFileSync(new URL("./fixtures/san3-18-formas/capacidades.json", import.meta.url), "utf8"),
).capacidades;

let gate: ArnesDoGate;

before(async () => {
  gate = await abrirArnesDoGate();
});

after(async () => {
  await gate.fechar();
});

test("P7 — a matriz cobre toda capacidade do bootstrap (mobile.routes.ts, buildFeatureFlags)", () => {
  const texto = fs.readFileSync(new URL("../src/modules/mobile/mobile.routes.ts", import.meta.url), "utf8");
  const corpo = texto.slice(texto.indexOf("function buildFeatureFlags"), texto.indexOf("function buildMobilePolicy"));
  const capacidades = [...corpo.matchAll(/^ {4}([a-z_]+): \{$/gm)].map((m) => m[1]).filter((c) => c !== "mobile_bootstrap_expanded");
  assert.ok(capacidades.length >= 10, `capacidades lidas: ${capacidades.length}`);
  assert.deepEqual([...capacidades].sort(), Object.keys(MATRIZ).sort());
});

for (const [capacidade, { liga, endpoints }] of Object.entries(MATRIZ)) {
  for (const combinacao of liga) {
    test(`P7 — ${capacidade} com só [${combinacao.join(",")}]: o bootstrap liga e os endpoints passam no gate`, async () => {
      const org = gate.criarOrganizacao(combinacao);
      const roles = ["tenant_admin", "field_technician"];
      const user = gate.criarUsuario(org.id, roles);
      const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles });
      const bootstrap = await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token });
      assert.equal(bootstrap.status, 200, JSON.stringify(bootstrap.body));
      const flags = bootstrap.body?.data?.feature_flags ?? bootstrap.body?.feature_flags;
      assert.equal(flags?.[capacidade]?.enabled, true, `${capacidade} ligada no bootstrap com [${combinacao.join(",")}]`);
      for (const endpoint of endpoints) {
        const [metodo, padrao] = endpoint.split(" ");
        const r = await gate.chamar(metodo, padrao.replace(/:[A-Za-z0-9_]+/g, () => randomUUID()), { token, body: { actions: [] } });
        assert.notEqual(r.reason, "module_not_enabled", `${endpoint} recusado com ${capacidade} ligada`);
        assert.notEqual(r.reason, "route_module_unclassified", `${endpoint} sem classe`);
      }
    });
  }
}

test("P7 — sem o módulo, a capacidade fica desligada no bootstrap E o gate recusa (as duas pontas concordam)", async () => {
  const org = gate.criarOrganizacao([]);
  const user = gate.criarUsuario(org.id, ["tenant_admin"]);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles: ["tenant_admin"] });
  const bootstrap = await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token });
  const flags = bootstrap.body?.data?.feature_flags ?? bootstrap.body?.feature_flags;
  for (const [capacidade, { endpoints }] of Object.entries(MATRIZ)) {
    assert.equal(flags?.[capacidade]?.enabled, false, `${capacidade} desligada sem módulo`);
    const [metodo, padrao] = endpoints[0].split(" ");
    const r = await gate.chamar(metodo, padrao.replace(/:[A-Za-z0-9_]+/g, () => randomUUID()), { token, body: {} });
    assert.equal(r.reason, "module_not_enabled", `${endpoints[0]} sem módulo`);
  }
});

test("P3(a) do dono — com só OS, a leitura dos cadastros passa e a escrita exige a área", async () => {
  const org = gate.criarOrganizacao(["work_orders"]);
  const user = gate.criarUsuario(org.id, ["tenant_admin"]);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles: ["tenant_admin"] });
  for (const recurso of ["customers", "suppliers", "branches", "vehicles", "teams", "service-catalog", "price-tables", "tariffs", "tags", "pois", "operator-profiles"]) {
    const leitura = await gate.chamar("GET", `/api/v1/${recurso}`, { token });
    assert.equal(leitura.status, 200, `GET /${recurso}: ${JSON.stringify(leitura.body)}`);
    const escrita = await gate.chamar("POST", `/api/v1/${recurso}`, { token, body: {} });
    assert.equal(escrita.status, 403, `POST /${recurso}`);
    assert.equal(escrita.reason, "module_not_enabled", `POST /${recurso}`);
  }
});

test("R2-02 (Emenda 1) — com só OS, as aprovações da OS passam (classe {approvals, work_orders})", async () => {
  const org = gate.criarOrganizacao(["work_orders"]);
  const user = gate.criarUsuario(org.id, ["tenant_admin"]);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles: ["tenant_admin"] });
  const r = await gate.chamar("GET", `/api/v1/approvals/pending?work_order_id=${randomUUID()}`, { token });
  assert.notEqual(r.reason, "module_not_enabled");
  assert.equal(r.status, 200);
});
