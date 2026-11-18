// B-O6R-04b (item 31 do portão, `Ω6R-QUA-002`) — o estoque do app não fica mais em memória no servidor.
//
// S1 a S5 são do plano (§4.1) e S6 é da Emenda 1 (§3.4). Os casos sobem o app HTTP real em memória pelo arnês do gate
// (`tests/helpers/san3-18-gate.ts`) ou chamam o sync direto, com o razão em memória.
// - S1: a rota de disponibilidade fabricada não existe mais.
// - S2: tipo sem dono é recusado por ação, sem efeito.
// - S3: o módulo não guarda estado: a lista do que pode existir no nível do módulo é FECHADA (Emenda 1.1, V-01).
// - S4: a porta do lote tem uma chave só.
// - S5: o bootstrap não diz mais "parcial" no estoque.
// - S6: o conjunto de tipos que o app envia é o que o servidor aceita (`P-MOBILE-SYNC-ESTOQUE-TIPOS`).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { after, before } from "node:test";
import ts from "typescript";

import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";
import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

const MODULO = "src/modules/mobile/mobile-inventory-sync.ts";
const APP_CONTRATOS = "mobile/flutter_app/lib/core/network/api_contracts.dart";
const APP_REPLAY = "mobile/flutter_app/lib/core/sync/inventory_sync_replay_service.dart";
const AGORA = "2026-11-15T12:00:00.000Z";

let gate: ArnesDoGate;

before(async () => {
  gate = await abrirArnesDoGate();
});

after(async () => {
  await gate.fechar();
});

const ator = (permissions: readonly string[], roles: readonly string[] = ["manager"]): AuthenticatedActor => ({
  tenantId: randomUUID(),
  userId: randomUUID(),
  roles: [...roles] as AuthenticatedActor["roles"],
  permissions: [...permissions] as AuthenticatedActor["permissions"],
  explicitPermissions: true,
});

function dependencias() {
  const inventory = new InventoryService(new InMemoryInventoryRepository(), {
    resolveActorOperatorProfile: async () => undefined,
  });
  const workOrders = new WorkOrderService(new InMemoryWorkOrderRepository());
  return { inventory, workOrders, workOrdersModuleEnabled: async () => true };
}

async function sync(actor: AuthenticatedActor, actions: readonly Record<string, unknown>[], deps = dependencias()) {
  const { syncMobileInventoryActions } = await import("../src/modules/mobile/mobile-inventory-sync.js");
  return syncMobileInventoryActions(actor, { client_batch_id: randomUUID(), actions }, deps);
}

async function jwtAtor(modules: readonly string[], roles: readonly string[]) {
  const org = gate.criarOrganizacao(modules);
  const user = gate.criarUsuario(org.id, roles);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles });
  return { org, user, token };
}

const acao = (type: string, payload: Record<string, unknown> = {}) => ({
  client_action_id: randomUUID(),
  type,
  local_created_at: AGORA,
  payload,
});

test("S1 — GET /api/v1/mobile/inventory/availability não existe mais: 404, mesmo para quem tem todas as chaves de estoque", async () => {
  const admin = await jwtAtor(["inventory", "work_orders"], ["tenant_admin"]);
  const resposta = await gate.chamar("GET", "/api/v1/mobile/inventory/availability", { token: admin.token });
  assert.equal(resposta.status, 404, JSON.stringify(resposta.body));
  assert.equal(JSON.stringify(resposta.body ?? {}).includes("inv-item-"), false, "a resposta traz item fabricado");
});

test("S2 — tipo sem dono é recusado por ação (unsupported_action_type), e o razão não ganha movimento", async () => {
  const deps = dependencias();
  const leitor = ator(["inventory.read"]);
  const antes = (await deps.inventory.listMovements(leitor, { limit: 100, offset: 0 })).items.length;
  const tipos = [
    "inventory.reserve",
    "inventory.consume",
    "inventory.shortage_report",
    "inventory_entry.create",
    "inventory_exit.create",
    "inventory.qualquer",
  ];
  const saida = await sync(
    { ...ator(["work_orders:update", "inventory.manage", "inventory.read"]), tenantId: leitor.tenantId },
    tipos.map((tipo) => acao(tipo, { item_id: "inv-item-tow-cable", quantity: 1, reason: "falta" })),
    deps,
  );
  assert.equal(saida.summary.received, 6);
  assert.equal(saida.summary.accepted, 0, JSON.stringify(saida.accepted));
  assert.equal(saida.summary.rejected, 6, JSON.stringify(saida));
  assert.deepEqual(saida.rejected.map((r) => r.type), tipos);
  for (const r of saida.rejected) assert.equal(r.error?.reason, "unsupported_action_type", `${r.type}: ${JSON.stringify(r)}`);
  assert.equal(saida.conflicts.length, 0);
  assert.equal(saida.already_applied.length, 0);
  const depois = (await deps.inventory.listMovements(leitor, { limit: 100, offset: 0 })).items.length;
  assert.equal(depois, antes, "o razão ganhou movimento");
});

/** S3 — a lista FECHADA do que pode existir no nível do módulo (Emenda 1.1, V-01). */
function violacoesDeEstadoNoModulo(fonte: string): string[] {
  const arquivo = ts.createSourceFile(MODULO, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const importadosDoLogger = new Set<string>();
  for (const st of arquivo.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    if (!/(^|\/)infra\/logging\/logger(\.js)?$/.test(st.moduleSpecifier.text)) continue;
    const nomes = st.importClause?.namedBindings;
    if (nomes && ts.isNamedImports(nomes)) {
      for (const el of nomes.elements) if ((el.propertyName ?? el.name).text === "createLogger") importadosDoLogger.add(el.name.text);
    }
  }
  const literal = (e: ts.Expression): boolean =>
    ts.isStringLiteral(e) || ts.isNumericLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)
    || e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword
    || (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand));
  const listaDeLiterais = (e: ts.Expression): boolean => ts.isArrayLiteralExpression(e) && e.elements.every(literal);
  const imutavel = (e: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(e)) return imutavel(e.expression);
    if (literal(e) || listaDeLiterais(e)) return true;
    if (ts.isAsExpression(e) && ts.isTypeReferenceNode(e.type) && e.type.typeName.getText(arquivo) === "const") {
      return literal(e.expression) || listaDeLiterais(e.expression);
    }
    return false;
  };
  const chamadaDoLogger = (e: ts.Expression): boolean =>
    ts.isCallExpression(e) && ts.isIdentifier(e.expression) && importadosDoLogger.has(e.expression.text)
    && e.arguments.length === 0 && e.typeArguments === undefined;

  const violacoes: string[] = [];
  let chamadasDoLogger = 0;
  for (const st of arquivo.statements) {
    const linha = arquivo.getLineAndCharacterOfPosition(st.getStart(arquivo)).line + 1;
    if (ts.isImportDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isFunctionDeclaration(st)) continue;
    if (ts.isVariableStatement(st)) {
      if ((st.declarationList.flags & ts.NodeFlags.Const) === 0) {
        violacoes.push(`l.${linha}: let/var no nível do módulo`);
        continue;
      }
      for (const d of st.declarationList.declarations) {
        const nome = d.name.getText(arquivo);
        if (!d.initializer) violacoes.push(`l.${linha}: const ${nome} sem inicializador`);
        else if (chamadaDoLogger(d.initializer)) chamadasDoLogger += 1;
        else if (!imutavel(d.initializer)) violacoes.push(`l.${linha}: const ${nome} = ${d.initializer.getText(arquivo)}`);
      }
      continue;
    }
    violacoes.push(`l.${linha}: declaração fora da lista fechada (${ts.SyntaxKind[st.kind]})`);
  }
  if (chamadasDoLogger > 1) violacoes.push(`createLogger() chamado ${chamadasDoLogger} vezes (o permitido é 1)`);
  return violacoes;
}

test("S3 — o módulo não guarda estado entre chamadas: só const imutável e um createLogger() no nível do módulo; sem o reset de teste", async () => {
  const violacoes = violacoesDeEstadoNoModulo(readFileSync(MODULO, "utf8"));
  assert.deepEqual(violacoes, [], `estado no nível do módulo:\n${violacoes.join("\n")}`);
  const modulo = await import("../src/modules/mobile/mobile-inventory-sync.js");
  assert.equal("resetMobileInventoryRuntimeForTests" in modulo, false, "o reset de teste ainda é exportado");
});

test("S3 · controle — a guarda acusa as formas de estado (Map, Set, let, var, chamada que não é o createLogger)", () => {
  const base = 'import { createLogger } from "../../infra/logging/logger.js";\nconst logger = createLogger();\nconst MAX = 50;\n';
  assert.deepEqual(violacoesDeEstadoNoModulo(base), []);
  for (const forma of [
    "const m = new Map<string, unknown>();",
    "const s = new Set<string>();",
    "let n = 0;",
    "var v = 1;",
    "function criarCache() { return {}; }\nconst cache = criarCache();",
    'const outro = createLogger("x");',
    "const segundo = createLogger();",
    "const obj = { a: 1 };",
    "export class C {}",
    "contador();",
  ]) {
    assert.notDeepEqual(violacoesDeEstadoNoModulo(base + forma + "\n"), [], `a guarda não acusou: ${forma}`);
  }
});

test("S4 — a porta do lote: só inventory.manage → 403 permission_required; com work_orders:update → 200", async () => {
  await assert.rejects(
    sync(ator(["inventory.read", "inventory.manage"], ["inventory"]), [acao("inventory.reserve", { item_id: "x", quantity: 1 })]),
    (erro: unknown) => {
      const e = erro as { statusCode?: number; reason?: string };
      return e.statusCode === 403 && e.reason === "permission_required";
    },
  );
  const ok = await sync(ator(["work_orders:update"]), [acao("inventory.reserve", { item_id: "x", quantity: 1 })]);
  assert.equal(ok.summary.received, 1);

  const estoquista = await jwtAtor(["inventory", "work_orders"], ["inventory"]);
  const http = await gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token: estoquista.token,
    body: { actions: [acao("inventory.consume", { item_id: "x", quantity: 1 })] },
  });
  assert.equal(http.status, 403, JSON.stringify(http.body));
  assert.equal(http.reason, "permission_required");

  const tecnico = await jwtAtor(["inventory", "work_orders"], ["field_technician"]);
  const httpOk = await gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token: tecnico.token,
    body: { actions: [acao("inventory.consume", { item_id: "x", quantity: 1 })] },
  });
  assert.equal(httpOk.status, 200, JSON.stringify(httpOk.body));
});

test("S5 — o bootstrap: estoque implementado, sem in_memory_contract nem availability_and_sync_partial, e o catálogo aponta o estoque real", async () => {
  const admin = await jwtAtor(["inventory", "work_orders"], ["tenant_admin"]);
  const resposta = await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token: admin.token });
  assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
  const data = resposta.body.data;
  assert.equal(data.feature_flags.inventory_sync.status, "implemented");
  assert.equal(data.feature_flags.inventory_mobile.status, "implemented");
  const texto = JSON.stringify(data);
  assert.equal(texto.includes("in_memory_contract"), false);
  assert.equal(texto.includes("availability_and_sync_partial"), false);
  assert.equal(data.mobile_policy.sync.implemented_domains.includes("inventory"), true);
  assert.equal(data.mobile_policy.sync.partial_domains.includes("inventory"), false);
  const chaves = data.catalogs.endpoints.items.map((item: { key: string }) => item.key);
  assert.equal(chaves.includes("inventory_availability"), false);
  assert.equal(chaves.includes("technician_stock"), true);
});

/** S6 — lê do app os tipos que ele conhece e os que o replay de estoque envia. */
function tiposDoApp(): { readonly conhecidos: Map<string, string>; readonly enviados: Set<string> } {
  const contratos = readFileSync(APP_CONTRATOS, "utf8");
  const classe = /class InventorySyncActionTypes \{([\s\S]*?)\n\}/.exec(contratos);
  assert.ok(classe, "classe InventorySyncActionTypes não encontrada no app");
  const conhecidos = new Map<string, string>();
  for (const m of classe[1].matchAll(/static const (\w+) = '([^']+)';/g)) conhecidos.set(m[1], m[2]);
  assert.ok(conhecidos.size >= 2, "nenhum tipo lido do app");

  const replay = readFileSync(APP_REPLAY, "utf8");
  const filtro = /for \(final action in pending\) \{\s*if \(([\s\S]*?)\) \{\s*continue;/.exec(replay);
  assert.ok(filtro, "o filtro de tipos do replay de estoque não foi encontrado");
  const nomes = [...filtro[1].matchAll(/action\.type != InventorySyncActionTypes\.(\w+)/g)].map((m) => m[1]);
  assert.ok(nomes.length >= 1, "o filtro do replay não cita tipo");
  const enviados = new Set(nomes.map((nome) => {
    const valor = conhecidos.get(nome);
    assert.ok(valor, `o replay cita InventorySyncActionTypes.${nome}, que o app não declara`);
    return valor;
  }));
  return { conhecidos, enviados };
}

test("S6 — contrato de tipos entre o app e o servidor: o que o app envia o servidor conhece; o que o app só conhece é recusado", async () => {
  const { conhecidos, enviados } = tiposDoApp();
  const todos = [...new Set(conhecidos.values())];
  const saida = await sync(ator(["work_orders:update"]), todos.map((tipo) => acao(tipo)));
  const porTipo = new Map<string, string | undefined>();
  for (const r of [...saida.accepted, ...saida.rejected, ...saida.conflicts, ...saida.already_applied]) {
    porTipo.set(String(r.type), r.error?.reason);
  }
  assert.equal(porTipo.size, todos.length, JSON.stringify(saida));
  for (const tipo of todos) {
    const motivo = porTipo.get(tipo);
    if (enviados.has(tipo)) assert.notEqual(motivo, "unsupported_action_type", `(a) o app envia ${tipo} e o servidor não conhece`);
    else assert.equal(motivo, "unsupported_action_type", `(b) o app só conhece ${tipo}, e o servidor não recusou (${motivo})`);
  }
  assert.deepEqual([...enviados].sort(), ["work_order_material.add", "work_order_material.remove"], "(c) o conjunto enviado");
});
