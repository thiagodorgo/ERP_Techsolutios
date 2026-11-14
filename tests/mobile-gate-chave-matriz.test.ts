import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { abrirArnesDoGate, TODOS_OS_MODULOS, type ArnesDoGate, type Resposta } from "./helpers/san3-18-gate.js";

// B-MOBILE-GATE-CHAVE (item 66 do portão) — T2: a régua de cada gate do app é medida NO SERVIDOR, papel a papel.
//
// O que este arquivo enuncia (plano v1 §4.2; Emenda 1 R1.3–R1.5 e R2.1; abertura RA1.4 e RA1.5; revisão REV66-01/-05):
//   - o app real (`createApp`) sobre o núcleo em memória, com JWT de verdade (o arnês do B-SAN3-18). Cabeçalho
//     `x-role` NÃO serve: o gate de módulo só decide quando há ator do JWT (`module-gate.middleware.ts`, "sem
//     `request.actor`: segue"), e sem ele os casos de módulo da R2.1 não teriam como dar 403 `module_not_enabled`;
//   - para cada um dos 9 papéis canônicos: o bootstrap (`permissions` e `modules`) e o veredito de cada rota que a
//     tela usa — G1 `GET /mobile/checklists/available`, G2 `GET /mobile/inventory/availability`, G3 uma ação
//     `inventory.reserve` no `POST /mobile/sync/inventory-actions`, G4 `POST /approvals/:id/approve` e G1b um
//     `checklist.item_answer` no `POST /mobile/sync/checklist-actions`;
//   - G1, G2 e G4: libera = status ≠ 403; todo 403 traz `reason` ∈ {permission_required, module_not_enabled}, e
//     qualquer outro 403 FALHA (R1.5);
//   - G1b e G3: decididos pelo RESULTADO DA AÇÃO, nunca só pelo status (R1.3, RA1.4). Libera ⇔ 200 e a ação em
//     `accepted`/`already_applied`; bloqueia ⇔ 403 com o motivo acima OU 200 com a ação em `rejected` e
//     `reason == "permission_required"`. Qualquer outro desfecho FALHA na hora e a fixture não é gravada;
//   - os 7 casos de módulo (R2.1): G1, G1b, G2 e G3 numa organização sem o módulo; G4 com só `approvals`, só
//     `work_orders` e nenhum dos dois;
//   - a matriz é comparada com `mobile/flutter_app/test/fixtures/mobile_gate_matrix.json`, que é GERADA aqui
//     (`UPDATE_MOBILE_GATE_FIXTURE=1`) e nunca escrita à mão. O app lê a mesma fixture (T1 e T3);
//   - os casos explícitos (R1.4, RA1.5) leem a MESMA matriz que vai para a fixture e nunca recalculam a decisão
//     (REV66-01), para que trocar a decisão por `status !== 403` (M15, M17) fique vermelho.
// O teste nunca confere o texto `message` de erro, só `status` e `reason` (abertura §2, A1).

const ESTE_ARQUIVO = fileURLToPath(import.meta.url);
const FIXTURE = path.resolve(path.dirname(ESTE_ARQUIVO), "../mobile/flutter_app/test/fixtures/mobile_gate_matrix.json");

const PAPEIS = [
  "platform_admin",
  "tenant_admin",
  "manager",
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "auditor",
  "support",
] as const;
type Papel = (typeof PAPEIS)[number];
type Gate = "G1" | "G1b" | "G2" | "G3" | "G4";
const GATES: readonly Gate[] = ["G1", "G1b", "G2", "G3", "G4"];
const MOTIVOS_DE_BLOQUEIO = new Set(["permission_required", "module_not_enabled"]);

// O payload do G3 é literal (REV66-05): sem `tenant_id` no corpo nem no payload. A linha
// `tests/mobile-backend-contracts.test.ts:1611-1622` foi só o molde.
const PAYLOAD_G3 = { item_id: "inv-item-tow-cable", warehouse_id: "mobile-warehouse-main", quantity: 1 } as const;

type Bootstrap = {
  readonly tenant: { readonly id: string; readonly name: string };
  readonly user: { readonly id: string; readonly email: string };
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly modules: readonly { readonly key: string; readonly enabled: boolean }[];
  readonly feature_flags: Record<string, unknown>;
};

type Bruto = { readonly status: number; readonly reason: string; readonly balde: string; readonly motivoDaAcao: string };

type Matriz = {
  readonly _gerado_por: string;
  readonly papeis: Record<string, { readonly bootstrap: Bootstrap; readonly libera: Record<Gate, boolean> }>;
  readonly modulos: Record<string, { readonly gate: Gate; readonly papel: Papel; readonly bootstrap: Bootstrap; readonly libera: boolean }>;
};

type Medicao = {
  readonly matriz: Matriz;
  readonly brutos: Record<string, Record<Gate, Bruto>>;
};

let gate: ArnesDoGate;
let resetEstoque: () => void;
let medicao: Promise<Medicao> | undefined;

before(async () => {
  gate = await abrirArnesDoGate();
  ({ resetMobileInventoryRuntimeForTests: resetEstoque } = await import("../src/modules/mobile/mobile-inventory-sync.js"));
});

after(async () => {
  await gate.fechar();
});

function medir(): Promise<Medicao> {
  medicao ??= medirTudo();
  return medicao;
}

async function atorCom(modules: readonly string[], papel: string) {
  const org = gate.criarOrganizacao(modules);
  // O papel que decide é o do JWT (no núcleo em memória não há resolvedor persistente de RBAC). O cadastro do
  // usuário não aceita papel de plataforma pelos fluxos de organização (B-O6R-01), então o `platform_admin` nasce
  // com um papel atribuível no cadastro e leva `platform_admin` no token, que é o que a rota lê.
  const user = gate.criarUsuario(org.id, [papel === "platform_admin" ? "viewer" : papel]);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles: [papel] });
  return { org, user, token };
}

// O bootstrap vai para a fixture só com o que o app lê nos gates e no parse (`bootstrapSessionFromJson`):
// `roles`, `permissions` (ordenadas), `modules` (ordenados) e `feature_flags`. Identificador e e-mail, que mudam a
// cada execução, viram marcadores fixos; nenhuma permissão e nenhum módulo são escritos aqui.
function normalizarBootstrap(rotulo: string, r: Resposta): Bootstrap {
  assert.equal(r.status, 200, `bootstrap ${rotulo}: ${JSON.stringify(r.body)}`);
  const data = r.body.data;
  return {
    tenant: { id: `org-${rotulo}`, name: `Organização ${rotulo}` },
    user: { id: `user-${rotulo}`, email: `${rotulo}@exemplo.test` },
    roles: [...data.roles],
    permissions: [...data.permissions].sort(),
    modules: [...data.modules]
      .map((m: { key: string; enabled: boolean }) => ({ key: m.key, enabled: m.enabled }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    feature_flags: data.feature_flags,
  };
}

function bruto(r: Resposta, balde = "", motivoDaAcao = ""): Bruto {
  return { status: r.status, reason: r.reason, balde, motivoDaAcao };
}

// G1, G2 e G4 (R1.5): libera = status ≠ 403; um 403 fora dos dois motivos derruba a medição inteira.
function decidirPorStatus(rotulo: string, r: Resposta): boolean {
  if (r.status !== 403) return true;
  if (!MOTIVOS_DE_BLOQUEIO.has(r.reason)) {
    throw new Error(`${rotulo}: 403 com motivo inesperado "${r.reason}" (${JSON.stringify(r.body)})`);
  }
  return false;
}

// G1b e G3 (R1.3, RA1.4): pelo resultado da ação. Todo desfecho fora dos três previstos derruba a medição.
function decidirPorAcao(rotulo: string, r: Resposta, clientActionId: string): { libera: boolean; bruto: Bruto } {
  if (r.status === 403) {
    if (!MOTIVOS_DE_BLOQUEIO.has(r.reason)) {
      throw new Error(`${rotulo}: 403 com motivo inesperado "${r.reason}" (${JSON.stringify(r.body)})`);
    }
    return { libera: false, bruto: bruto(r) };
  }
  if (r.status !== 200) {
    throw new Error(`${rotulo}: desfecho inesperado HTTP ${r.status} (${JSON.stringify(r.body)})`);
  }
  const data = r.body?.data ?? {};
  for (const balde of ["accepted", "already_applied", "rejected", "conflicts"] as const) {
    const achada = (data[balde] ?? []).find((item: { client_action_id?: string }) => item.client_action_id === clientActionId);
    if (!achada) continue;
    const motivo = String(achada.error?.reason ?? "");
    if (balde === "accepted" || balde === "already_applied") return { libera: true, bruto: bruto(r, balde, motivo) };
    if (balde === "rejected" && motivo === "permission_required") return { libera: false, bruto: bruto(r, balde, motivo) };
    throw new Error(`${rotulo}: ação em "${balde}" com motivo "${motivo}" (${JSON.stringify(achada)})`);
  }
  throw new Error(`${rotulo}: a ação ${clientActionId} não voltou em balde nenhum (${JSON.stringify(r.body)})`);
}

async function chamarG1(token: string) {
  return gate.chamar("GET", "/api/v1/mobile/checklists/available", { token });
}

async function chamarG2(token: string) {
  return gate.chamar("GET", "/api/v1/mobile/inventory/availability", { token });
}

async function chamarG3(token: string, clientActionId: string) {
  // RA1.4: o estoque em memória volta ao semeado antes de cada papel; o recibo é por usuário e o
  // `client_action_id` é único por papel, então nada passa como `already_applied` emprestado.
  resetEstoque();
  return gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token,
    body: {
      client_batch_id: `g3-lote-${clientActionId}`,
      actions: [
        {
          client_action_id: clientActionId,
          type: "inventory.reserve",
          local_created_at: "2026-11-14T03:00:00.000Z",
          payload: { ...PAYLOAD_G3 },
        },
      ],
    },
  });
}

async function chamarG4(token: string) {
  return gate.chamar("POST", `/api/v1/approvals/${randomUUID()}/approve`, { token, body: {} });
}

// R1.3: run NOVA por papel, criada pelo administrador da organização (o técnico não cria run, D-CHK-DISPATCH-CREATE).
// "Payload válido" para quem só mexe no que é seu (`actorMutatesAssignedOnly`, B-O6R-07c-b1) exige que a run seja de
// uma OS ATRIBUÍDA ao ator. Medido no F0: a run solta do molde (`relatedEntityId: "local-work-order-1"`) volta
// `rejected` com `not_assigned_to_actor` para o técnico de campo, e a regra fail-closed derrubou a medição. Por isso a
// run nasce pelo caminho real do app (o mesmo do `tests/o6r07c-b-scope.test.ts`): o administrador cria a OS com o
// modelo de checklist e a DESPACHA ao usuário do papel; o despacho provisiona a vistoria. A regra de decisão (R1.3) e
// os casos explícitos (R1.4) não mudam. O despacho só aceita técnico de campo como alvo
// (`target_not_field_technician`): para o técnico, o alvo é o próprio usuário do papel; para os demais papéis, que
// mexem em toda a organização (`WORK_ORDER_MUTATION_SCOPE`), a OS vai a um técnico da mesma organização.
async function novaRun(tokenAdmin: string, alvoDoDespacho: string) {
  const criado = await gate.chamar("POST", "/api/v1/tenant/checklists", {
    token: tokenAdmin,
    body: {
      name: "Checklist do gate (B-MOBILE-GATE-CHAVE)",
      type: "technical_evidence",
      schema: { source: "mobile_gate_chave" },
      components: [
        {
          componentKey: "condition_note",
          type: "observation",
          label: "Condition note",
          required: true,
          config: {},
          validationRules: {},
          visibilityRules: {},
        },
      ],
    },
  });
  assert.equal(criado.status, 201, `modelo de checklist: ${JSON.stringify(criado.body)}`);
  const publicado = await gate.chamar("POST", `/api/v1/tenant/checklists/${criado.body.data.id}/publish`, {
    token: tokenAdmin,
    body: { expectedUpdatedAt: criado.body.data.updatedAt },
  });
  assert.equal(publicado.status, 200, `publicação: ${JSON.stringify(publicado.body)}`);
  const os = await gate.chamar("POST", "/api/v1/work-orders", {
    token: tokenAdmin,
    body: { title: "OS do gate (B-MOBILE-GATE-CHAVE)", checklistId: criado.body.data.id },
  });
  assert.equal(os.status, 201, `OS: ${JSON.stringify(os.body)}`);
  const despacho = await gate.chamar("POST", "/api/v1/operations/dispatches", {
    token: tokenAdmin,
    body: { workOrderId: os.body.data.id, operatorUserId: alvoDoDespacho },
  });
  assert.equal(despacho.status, 201, `despacho: ${JSON.stringify(despacho.body)}`);
  const runs = await gate.chamar("GET", `/api/v1/mobile/checklist-runs?workOrderId=${os.body.data.id}`, { token: tokenAdmin });
  assert.equal(runs.status, 200, `runs: ${JSON.stringify(runs.body)}`);
  assert.equal(runs.body.data.length, 1, "o despacho não provisionou a vistoria");
  return { runId: runs.body.data[0].id as string, componentId: publicado.body.data.components[0].id as string };
}

async function chamarG1b(token: string, alvo: { runId: string; componentId: string }, clientActionId: string) {
  return gate.chamar("POST", "/api/v1/mobile/sync/checklist-actions", {
    token,
    body: {
      client_batch_id: `g1b-lote-${clientActionId}`,
      actions: [
        {
          client_action_id: clientActionId,
          type: "checklist.item_answer",
          local_created_at: "2026-11-14T03:00:00.000Z",
          payload: { run_id: alvo.runId, component_id: alvo.componentId, value: "Resposta do gate." },
        },
      ],
    },
  });
}

async function medirTudo(): Promise<Medicao> {
  const papeis: Matriz["papeis"] = {};
  const brutos: Medicao["brutos"] = {};

  for (const papel of PAPEIS) {
    const ator = await atorCom(TODOS_OS_MODULOS, papel);
    const admin = gate.criarUsuario(ator.org.id, ["tenant_admin"]);
    const alvoDoDespacho = papel === "field_technician" ? ator.user.id : gate.criarUsuario(ator.org.id, ["field_technician"]).id;
    const tokenAdmin = await gate.token({ tenantId: ator.org.id, userId: admin.id, email: admin.email, roles: ["tenant_admin"] });

    const bootstrap = normalizarBootstrap(papel, await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token: ator.token }));

    const r1 = await chamarG1(ator.token);
    const r2 = await chamarG2(ator.token);
    const idG3 = `g3-${papel}-${randomUUID()}`;
    const g3 = decidirPorAcao(`${papel}/G3`, await chamarG3(ator.token, idG3), idG3);
    const r4 = await chamarG4(ator.token);
    const idG1b = `g1b-${papel}-${randomUUID()}`;
    const g1b = decidirPorAcao(`${papel}/G1b`, await chamarG1b(ator.token, await novaRun(tokenAdmin, alvoDoDespacho), idG1b), idG1b);

    papeis[papel] = {
      bootstrap,
      libera: {
        G1: decidirPorStatus(`${papel}/G1`, r1),
        G1b: g1b.libera,
        G2: decidirPorStatus(`${papel}/G2`, r2),
        G3: g3.libera,
        G4: decidirPorStatus(`${papel}/G4`, r4),
      },
    };
    brutos[papel] = { G1: bruto(r1), G1b: g1b.bruto, G2: bruto(r2), G3: g3.bruto, G4: bruto(r4) };
  }

  // R2.1 — os casos de módulo, sempre com o administrador da organização (tem toda chave; só o módulo decide).
  const semModulo = (modulo: string) => TODOS_OS_MODULOS.filter((m) => m !== modulo);
  const casos: Array<{ nome: string; gate: Gate; modulos: readonly string[] }> = [
    { nome: "G1_sem_modulo", gate: "G1", modulos: semModulo("tenant_checklist") },
    { nome: "G1b_sem_modulo", gate: "G1b", modulos: semModulo("tenant_checklist") },
    { nome: "G2_sem_modulo", gate: "G2", modulos: semModulo("inventory") },
    { nome: "G3_sem_modulo", gate: "G3", modulos: semModulo("inventory") },
    { nome: "G4_so_approvals", gate: "G4", modulos: ["approvals"] },
    { nome: "G4_so_work_orders", gate: "G4", modulos: ["work_orders"] },
    { nome: "G4_nenhum", gate: "G4", modulos: semModulo("approvals").filter((m) => m !== "work_orders") },
  ];
  const modulos: Matriz["modulos"] = {};
  for (const caso of casos) {
    const ator = await atorCom(caso.modulos, "tenant_admin");
    const bootstrap = normalizarBootstrap(caso.nome, await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token: ator.token }));
    let libera: boolean;
    let registro: Bruto;
    if (caso.gate === "G1") {
      const r = await chamarG1(ator.token);
      libera = decidirPorStatus(caso.nome, r);
      registro = bruto(r);
    } else if (caso.gate === "G2") {
      const r = await chamarG2(ator.token);
      libera = decidirPorStatus(caso.nome, r);
      registro = bruto(r);
    } else if (caso.gate === "G4") {
      const r = await chamarG4(ator.token);
      libera = decidirPorStatus(caso.nome, r);
      registro = bruto(r);
    } else if (caso.gate === "G3") {
      const id = `${caso.nome}-${randomUUID()}`;
      const d = decidirPorAcao(caso.nome, await chamarG3(ator.token, id), id);
      libera = d.libera;
      registro = d.bruto;
    } else {
      // Sem o módulo a run não nasce (a rota da run também é do módulo); a ação vai com alvo inexistente, e o gate
      // de módulo responde antes do corpo. Um 200 aqui cairia em "outro desfecho" e derrubaria a medição.
      const id = `${caso.nome}-${randomUUID()}`;
      const d = decidirPorAcao(caso.nome, await chamarG1b(ator.token, { runId: randomUUID(), componentId: randomUUID() }, id), id);
      libera = d.libera;
      registro = d.bruto;
    }
    modulos[caso.nome] = { gate: caso.gate, papel: "tenant_admin", bootstrap, libera };
    brutos[caso.nome] = { [caso.gate]: registro } as Record<Gate, Bruto>;
  }

  return {
    matriz: {
      _gerado_por:
        "tests/mobile-gate-chave-matriz.test.ts com UPDATE_MOBILE_GATE_FIXTURE=1 (B-MOBILE-GATE-CHAVE). Gerada pelo servidor; nunca editar à mão.",
      papeis,
      modulos,
    },
    brutos,
  };
}

function serializar(m: Matriz): string {
  return `${JSON.stringify(m, null, 2)}\n`;
}

test("T2 — a matriz papel × gate medida no servidor é a da fixture versionada", async () => {
  const { matriz } = await medir();
  const atual = serializar(matriz);

  if (process.env.UPDATE_MOBILE_GATE_FIXTURE === "1") {
    writeFileSync(FIXTURE, atual, "utf8");
  }

  assert.equal(existsSync(FIXTURE), true, `fixture ausente: ${FIXTURE} (gere com UPDATE_MOBILE_GATE_FIXTURE=1)`);
  const versionada = readFileSync(FIXTURE, "utf8").replace(/\r\n/g, "\n");
  assert.deepEqual(JSON.parse(versionada), JSON.parse(atual), "a fixture diverge do servidor; regenere com UPDATE_MOBILE_GATE_FIXTURE=1");
  assert.equal(Object.keys(matriz.papeis).length, 9);
  assert.equal(Object.keys(matriz.modulos).length, 7);
  for (const papel of PAPEIS) {
    assert.deepEqual(Object.keys(matriz.papeis[papel].libera).sort(), [...GATES].sort());
  }
});

test("T2 · R1.4 — G1b: o gestor passa no HTTP e é recusado na ação; o técnico de campo responde", async () => {
  const { matriz, brutos } = await medir();
  assert.equal(brutos.manager.G1b.status, 200);
  assert.equal(brutos.manager.G1b.balde, "rejected");
  assert.equal(brutos.manager.G1b.motivoDaAcao, "permission_required");
  assert.equal(matriz.papeis.manager.libera.G1b, false);
  assert.equal(brutos.field_technician.G1b.status, 200);
  assert.equal(brutos.field_technician.G1b.balde, "accepted");
  assert.equal(matriz.papeis.field_technician.libera.G1b, true);
});

test("T2 · RA1.5 — G3: gestor, operador e técnico passam na porta e são recusados na ação; o estoque reserva", async () => {
  const { matriz, brutos } = await medir();
  for (const papel of ["field_technician", "manager", "operator"] as const) {
    assert.equal(brutos[papel].G3.status, 200, `${papel}: HTTP`);
    assert.equal(brutos[papel].G3.balde, "rejected", `${papel}: balde`);
    assert.equal(brutos[papel].G3.motivoDaAcao, "permission_required", `${papel}: motivo`);
    assert.equal(matriz.papeis[papel].libera.G3, false, `${papel}: G3`);
  }
  assert.equal(brutos.inventory.G3.status, 200);
  assert.equal(brutos.inventory.G3.balde, "accepted");
  assert.equal(matriz.papeis.inventory.libera.G3, true);
});

test("T2 · R2.1 — módulo: qualquer um de approvals/work_orders libera o G4; sem o módulo, 403 module_not_enabled", async () => {
  const { matriz, brutos } = await medir();
  assert.equal(matriz.modulos.G4_so_approvals.libera, true);
  assert.equal(matriz.modulos.G4_so_work_orders.libera, true);
  for (const nome of ["G4_nenhum", "G1_sem_modulo", "G1b_sem_modulo", "G2_sem_modulo", "G3_sem_modulo"]) {
    const caso = matriz.modulos[nome];
    assert.equal(caso.libera, false, `${nome}: libera`);
    const r = brutos[nome][caso.gate];
    assert.equal(r.status, 403, `${nome}: status`);
    assert.equal(r.reason, "module_not_enabled", `${nome}: motivo`);
  }
});
