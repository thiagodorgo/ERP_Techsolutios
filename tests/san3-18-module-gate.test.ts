import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test, { after, before } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

// B-SAN3-18 (item 16 do portão; plano v2 + Emenda 1) — o servidor RECUSA a área não contratada.
//
// O que este arquivo enuncia (plano §2.1 e §3):
//   P1        — com JWT, rota de módulo sem o módulo → 403 `module_not_enabled`; com o módulo → passa ao handler;
//   P1-caixa  — a classe não muda com maiúscula (inclusive no prefixo `/API/V1`), barra final nem HEAD (R-A1, R2-06);
//   P1-legado — com NODE_ENV=production, a credencial legada não chega a handler NENHUM do instantâneo (R-A3, R2-06);
//   P1-falha  — ator de plataforma → 403; organização inexistente → 403; falha de leitura → 503, nunca passagem (R-A9);
//   P1-alias  — `work-orders` vale `work_orders` na leitura (P4);
//   P1-tenant — a organização vem do JWT, nunca do `X-Tenant-Id`;
//   R2-01     — as rotas de dinheiro da Frota e da OS exigem o Financeiro.
// Vermelho-controle no head-base (`da12fec6`, sem o gate): `GET /yards` de uma organização só com OS → 200.

let gate: ArnesDoGate;

before(async () => {
  gate = await abrirArnesDoGate();
});

after(async () => {
  await gate.fechar();
});

async function atorCom(modules: readonly string[], roles: readonly string[] = ["tenant_admin"]) {
  const org = gate.criarOrganizacao(modules);
  const user = gate.criarUsuario(org.id, roles);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles });
  return { org, user, token };
}

test("P1 — organização só com OS: Pátios 403 module_not_enabled, OS 200; com Pátios, Pátios 200", async () => {
  const soOs = await atorCom(["work_orders"]);
  const yards = await gate.chamar("GET", "/api/v1/yards", { token: soOs.token });
  assert.equal(yards.status, 403);
  assert.equal(yards.reason, "module_not_enabled");
  assert.equal(JSON.stringify(yards.body).includes(soOs.org.id), false, "a recusa não ecoa o tenant_id (§2.8)");
  assert.equal(JSON.stringify(yards.body).includes("work_orders"), false, "a recusa não ecoa a lista de módulos (§2.8)");
  assert.equal((await gate.chamar("GET", "/api/v1/work-orders", { token: soOs.token })).status, 200);

  const comPatios = await atorCom(["work_orders", "patios"]);
  assert.equal((await gate.chamar("GET", "/api/v1/yards", { token: comPatios.token })).status, 200);
});

test("P1 — sem token o gate não decide: a resposta é a do roteador, nunca module_not_enabled", async () => {
  const semToken = await gate.chamar("GET", "/api/v1/yards");
  assert.notEqual(semToken.reason, "module_not_enabled");
  assert.notEqual(semToken.reason, "route_module_unclassified");
});

test("P1 — núcleo passa sem módulo nenhum (me, users, billing, dashboard, timeseries, bootstrap)", async () => {
  const nada = await atorCom([]);
  for (const caminho of ["/api/v1/me", "/api/v1/users", "/api/v1/billing/subscription", "/api/v1/dashboard/summary", "/api/v1/operations/work-orders-timeseries", "/api/v1/mobile/bootstrap", "/api/v1/roles"]) {
    const r = await gate.chamar("GET", caminho, { token: nada.token });
    assert.notEqual(r.reason, "module_not_enabled", `${caminho} é núcleo e não pode ser recusado por módulo`);
    assert.notEqual(r.reason, "route_module_unclassified", `${caminho} é núcleo`);
  }
});

test("P1-caixa (R-A1, R2-06) — maiúscula, prefixo /API/V1, barra final e HEAD têm a classe da forma canônica", async () => {
  const ator = await atorCom(["work_orders", "notifications"]);
  const os = randomUUID();
  const casos: Array<[string, string]> = [
    ["GET", `/api/v1/Work-Orders/${os}/Financial-Items`],
    ["POST", "/api/v1/Notifications/Fleet-Alerts/run"],
    ["GET", "/api/v1/Yards"],
    ["GET", "/api/v1/yards/"],
    ["GET", "/API/V1/YARDS"],
    ["GET", "/API/V1/YARDS/"],
  ];
  for (const [metodo, caminho] of casos) {
    const r = await gate.chamar(metodo, caminho, { token: ator.token });
    assert.equal(r.status, 403, `${metodo} ${caminho}`);
    assert.equal(r.reason, "module_not_enabled", `${metodo} ${caminho}`);
  }
  const head = await gate.chamar("HEAD", "/api/v1/yards", { token: ator.token });
  assert.equal(head.status, 403, "HEAD /api/v1/yards");

  const comFinanceiro = await atorCom(["work_orders", "notifications", "finance"]);
  const positivo = await gate.chamar("GET", `/api/v1/Work-Orders/${os}/Financial-Items`, { token: comFinanceiro.token });
  assert.notEqual(positivo.status, 403, "com o Financeiro a variante em maiúsculas chega ao handler");
  assert.equal(positivo.reason, "work_order_not_found");
});

test("P1-falha (A9) (i) — ator de plataforma numa rota de organização → 403 platform_actor_on_tenant_route", async () => {
  const token = await gate.token({ tenantId: "platform", userId: randomUUID(), roles: ["platform_admin"] });
  const r = await gate.chamar("GET", "/api/v1/yards", { token });
  assert.equal(r.status, 403);
  assert.equal(r.reason, "platform_actor_on_tenant_route");
});

test("P1-falha (A9) (ii) — JWT de organização inexistente → 403 tenant_not_found", async () => {
  const token = await gate.token({ tenantId: randomUUID(), userId: randomUUID(), roles: ["tenant_admin"] });
  const r = await gate.chamar("GET", "/api/v1/yards", { token });
  assert.equal(r.status, 403);
  assert.equal(r.reason, "tenant_not_found");
});

test("P1-falha (A9) (iii) — a leitura dos módulos falha → 503 tenant_modules_unavailable, nunca passagem", async () => {
  const quebrado = await abrirArnesDoGate({
    envolverServico: (servico) =>
      new Proxy(servico, {
        get(alvo, chave) {
          if (chave === "getTenantForActor") {
            return async () => {
              throw new Error("db down");
            };
          }
          const valor = Reflect.get(alvo, chave);
          return typeof valor === "function" ? valor.bind(alvo) : valor;
        },
      }),
  });
  try {
    const org = quebrado.criarOrganizacao(["patios"]);
    const user = quebrado.criarUsuario(org.id, ["tenant_admin"]);
    const token = await quebrado.token({ tenantId: org.id, userId: user.id, email: user.email, roles: ["tenant_admin"] });
    const r = await quebrado.chamar("GET", "/api/v1/yards", { token });
    assert.equal(r.status, 503);
    assert.equal(r.reason, "tenant_modules_unavailable");
  } finally {
    await quebrado.fechar();
  }
});

test("P1-alias — a organização com o apelido `work-orders` usa as rotas de OS", async () => {
  const ator = await atorCom(["work-orders"]);
  assert.equal((await gate.chamar("GET", "/api/v1/work-orders", { token: ator.token })).status, 200);
});

test("P1-tenant — JWT da organização A (sem Pátios) + X-Tenant-Id de B (com Pátios) → 403: vale o ator", async () => {
  const a = await atorCom(["work_orders"]);
  const b = await atorCom(["patios"]);
  const r = await gate.chamar("GET", "/api/v1/yards", { token: a.token, headers: { "x-tenant-id": b.org.id } });
  assert.equal(r.status, 403);
  assert.equal(r.reason, "module_not_enabled");
});

test("R9 — com JWT, prefixo desconhecido → 403 route_module_unclassified (fail-closed)", async () => {
  const ator = await atorCom(["work_orders"]);
  const r = await gate.chamar("GET", "/api/v1/zz-nao-existe", { token: ator.token });
  assert.equal(r.status, 403);
  assert.equal(r.reason, "route_module_unclassified");
});

const PAGAR = { party_type: "supplier", party_name: "Posto Central", amount: 320.5, due_date: "2026-12-10", issue_date: "2026-11-10" };

test("R2-01 (Emenda 1) — sem o Financeiro, a Frota não lança nem lê conta a pagar, e a OS não fatura", async () => {
  const semFinanceiro = await atorCom(["vehicles", "master_data", "work_orders"]);
  const veiculo = await gate.chamar("POST", "/api/v1/vehicles", { token: semFinanceiro.token, body: { plate: "GTE0001", model: "Guincho" } });
  assert.equal(veiculo.status, 201, `cadastro da viatura: ${JSON.stringify(veiculo.body)}`);
  const abastecimento = await gate.chamar("POST", "/api/v1/fuel-logs", {
    token: semFinanceiro.token,
    body: { vehicle_id: veiculo.body.data.id, liters: 40, total_value: 320.5, odometer: 1000 },
  });
  assert.equal(abastecimento.status, 201, `abastecimento: ${JSON.stringify(abastecimento.body)}`);
  const id = abastecimento.body.data.id;
  for (const [metodo, caminho] of [
    ["POST", `/api/v1/fuel-logs/${id}/payable`],
    ["GET", `/api/v1/fuel-logs/${id}/payable`],
    ["DELETE", `/api/v1/fuel-logs/${id}/payable`],
    ["POST", `/api/v1/work-orders/${randomUUID()}/invoice`],
  ] as const) {
    const r = await gate.chamar(metodo, caminho, { token: semFinanceiro.token, body: PAGAR });
    assert.equal(r.status, 403, `${metodo} ${caminho}`);
    assert.equal(r.reason, "module_not_enabled", `${metodo} ${caminho}`);
  }

  const comFinanceiro = await atorCom(["vehicles", "master_data", "work_orders", "finance"]);
  const v2 = await gate.chamar("POST", "/api/v1/vehicles", { token: comFinanceiro.token, body: { plate: "GTE0002", model: "Guincho" } });
  const f2 = await gate.chamar("POST", "/api/v1/fuel-logs", {
    token: comFinanceiro.token,
    body: { vehicle_id: v2.body.data.id, liters: 40, total_value: 320.5, odometer: 1000 },
  });
  const pagar = await gate.chamar("POST", `/api/v1/fuel-logs/${f2.body.data.id}/payable`, { token: comFinanceiro.token, body: PAGAR });
  assert.equal(pagar.status, 201, `com o Financeiro o lançamento a pagar é criado: ${JSON.stringify(pagar.body)}`);
});

test("P1-legado (R-A3, R2-06) — NODE_ENV=production: a credencial legada não chega a handler nenhum do instantâneo", async () => {
  const instantaneo: Record<string, string> = JSON.parse(fs.readFileSync(new URL("./fixtures/san3-18-route-modules.json", import.meta.url), "utf8"));
  const org = gate.criarOrganizacao([]);
  const user = gate.criarUsuario(org.id, ["tenant_admin"]);
  const legado = { "x-tenant-id": org.id, "x-user-id": user.id, "x-role": "tenant_admin" };
  // Rotas anônimas por desenho (NÚCLEO): respondem a quem não tem credencial nenhuma, e por isso também ao legado.
  const ANONIMAS = new Set([
    "GET /api/v1/health",
    "GET /api/v1/health/ready",
    "GET /api/v1/health/worker",
    "POST /api/v1/auth/login",
    "POST /api/v1/auth/refresh",
    "POST /api/v1/auth/logout",
    "POST /api/v1/webhooks/billing/:provider",
  ]);
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const alcancadas: string[] = [];
  let medidas = 0;
  try {
    for (const rota of Object.keys(instantaneo)) {
      const [metodo, padrao] = rota.split(" ");
      const r = await gate.chamar(metodo, padrao.replace(/:[A-Za-z0-9_]+/g, () => randomUUID()), { headers: legado });
      medidas += 1;
      const recusado = r.status === 401 || (r.status === 403 && /legacy_headers_disabled$/.test(r.reason));
      if (!recusado && !ANONIMAS.has(rota)) alcancadas.push(`${rota} → ${r.status} ${r.reason}`);
    }
  } finally {
    if (anterior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = anterior;
  }
  assert.equal(medidas, Object.keys(instantaneo).length);
  assert.ok(medidas >= 400, `rotas medidas: ${medidas}`);
  assert.deepEqual(alcancadas, [], "rota de organização alcançada com credencial legada em produção");
  for (const rota of ANONIMAS) assert.equal(instantaneo[rota], "NUCLEO", `${rota} é anônima e tem de ser NÚCLEO`);
});
