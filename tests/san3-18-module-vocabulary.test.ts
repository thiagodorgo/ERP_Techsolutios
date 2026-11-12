import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { NAVIGATION_REGISTRY } from "../src/modules/navigation/navigation.registry.js";
import type { NavigationItem } from "../src/modules/navigation/navigation.types.js";
import { ALL_MODULE_CLASSES, ROUTE_MODULE_KEYS } from "../src/modules/navigation/route-modules.js";
import { MODULE_KEY_ALIASES, normalizeModuleKeys } from "../src/modules/platform/platform-modules.service.js";
import { PLAN_MODULE_KEYS } from "../src/modules/subscription-billing/plans/plan-catalog.js";
import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";
import { PlansService } from "../src/modules/subscription-billing/plans/plans.service.js";

// B-SAN3-18 (P4 do plano v2) — UM vocabulário de módulos. O catálogo canônico (`platform-modules.service.ts`, de onde
// `PLAN_MODULE_KEYS` deriva) é a única fonte; registro de navegação, classe de rota, semente e bootstrap só usam
// chaves dele. O registro usa só a forma canônica; o apelido vale só na LEITURA da organização; o plano recusa apelido.
// R2-04 (Emenda 1): `ALL_MODULE_CLASSES` ⊆ `DEMO_TENANT_MODULES`, lido do TEXTO do prisma/seed.ts (array literal).
// Vermelho-controle no head-base (`da12fec6`): `work_orders`, `logistics`, `expense_management` e o apelido
// `work-orders` fora do catálogo.

const CATALOGO = new Set(PLAN_MODULE_KEYS);

function modulosDoRegistro(itens: readonly NavigationItem[]): string[] {
  return itens.flatMap((item) => [...(item.requiredModules ?? []), ...modulosDoRegistro(item.children ?? [])]);
}

function demoDoSeed(): string[] {
  const texto = fs.readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8");
  const bloco = texto.match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/);
  assert.ok(bloco, "DEMO_TENANT_MODULES precisa ser um array literal no prisma/seed.ts");
  return [...bloco[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function modulosDoBootstrap(): string[] {
  const texto = fs.readFileSync(new URL("../src/modules/mobile/mobile.routes.ts", import.meta.url), "utf8");
  return [...new Set([...texto.matchAll(/hasModule\(modules, "([^"]+)"\)/g)].map((m) => m[1]))];
}

test("P4 — registro, classe de rota, semente e bootstrap só usam chaves do catálogo", () => {
  const fontes: Record<string, string[]> = {
    registro: modulosDoRegistro(NAVIGATION_REGISTRY),
    "classe de rota": [...ROUTE_MODULE_KEYS],
    "DEMO_TENANT_MODULES (seed)": demoDoSeed(),
    bootstrap: modulosDoBootstrap(),
  };
  assert.ok(fontes.bootstrap.length >= 6, `chaves lidas do bootstrap: ${fontes.bootstrap.length}`);
  for (const [fonte, chaves] of Object.entries(fontes)) {
    assert.ok(chaves.length > 0, `${fonte} sem chave lida`);
    assert.deepEqual(chaves.filter((k) => !CATALOGO.has(k)), [], `${fonte} usa chave fora do catálogo`);
  }
  const instantaneo: Record<string, string> = JSON.parse(fs.readFileSync(new URL("./fixtures/san3-18-route-modules.json", import.meta.url), "utf8"));
  const doInstantaneo = [...new Set(Object.values(instantaneo).flatMap((c) => (c.startsWith("{") ? c.slice(1, -1).split(",") : [])))];
  assert.deepEqual(doInstantaneo.filter((k) => !CATALOGO.has(k)), [], "instantâneo usa chave fora do catálogo");
});

test("P4 — o registro não tem apelido; o apelido normaliza para a canônica na leitura", () => {
  const apelidos = Object.keys(MODULE_KEY_ALIASES);
  assert.deepEqual(modulosDoRegistro(NAVIGATION_REGISTRY).filter((k) => apelidos.includes(k)), []);
  for (const [apelido, canonica] of Object.entries(MODULE_KEY_ALIASES)) {
    assert.equal(CATALOGO.has(apelido), false, `apelido ${apelido} não pode ser chave do catálogo`);
    assert.equal(CATALOGO.has(canonica), true, `canônica ${canonica} tem de estar no catálogo`);
  }
  assert.deepEqual(normalizeModuleKeys([" work-orders ", "checklists", "finance", "finance", ""]), ["work_orders", "tenant_checklist", "finance"]);
});

test("P4 (R2-04) — ALL_MODULE_CLASSES ⊆ DEMO_TENANT_MODULES (a demo não perde área nenhuma com o gate)", () => {
  const demo = new Set(demoDoSeed());
  assert.ok(ALL_MODULE_CLASSES.includes("logistics"), "ALL_MODULE_CLASSES inclui as chaves só de menu (logistics)");
  assert.deepEqual(ALL_MODULE_CLASSES.filter((k) => !demo.has(k)), []);
});

test("P4 — o plano continua recusando apelido (422 module_unknown)", () => {
  const plans = new PlansService(new InMemoryPlansRepository(), () => new Date("2026-11-11T12:00:00-03:00"));
  for (const apelido of Object.keys(MODULE_KEY_ALIASES)) {
    assert.throws(() => plans.assertKnownModules([apelido]), (erro: unknown) => (erro as { reason?: string }).reason === "module_unknown");
  }
  assert.doesNotThrow(() => plans.assertKnownModules([...ALL_MODULE_CLASSES]));
});
