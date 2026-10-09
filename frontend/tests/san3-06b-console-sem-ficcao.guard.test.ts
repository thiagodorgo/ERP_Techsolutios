import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { PlatformOverviewView } from "../src/modules/platform/pages/PlatformOverviewPage";
import { PlatformTenantsView } from "../src/modules/platform/pages/PlatformTenantsPage";
import {
  customerOverviewMetrics,
  PLATFORM_SYSTEM_ORG_SLUG,
  type PlatformOverviewData,
} from "../src/modules/platform/platform-overview.types";

const FRONTEND = fileURLToPath(new URL("../", import.meta.url));
const REPO = path.dirname(FRONTEND);
const SCRIPTS = path.join(REPO, "scripts");

function run(script: string, args: string[] = []): string {
  return execFileSync(process.execPath, [path.join(SCRIPTS, script), REPO, ...args], {
    encoding: "utf8",
    timeout: 120_000,
  });
}

function platformData(): PlatformOverviewData {
  return {
    activeOrgs: 2,
    totalOrgs: 3,
    totalUsers: 18,
    orgs: [
      { id: "sys", name: "Plataforma", slug: "platform", status: "active", moduleCount: 0, userCount: 3, createdAt: "2026-09-01T00:00:00Z" },
      { id: "a", name: "Cliente Ativo", slug: "ativo", status: "active", moduleCount: 2, userCount: 10, createdAt: "2026-09-02T00:00:00Z" },
      { id: "b", name: "Cliente Suspenso", slug: "suspenso", status: "suspended", moduleCount: 1, userCount: 5, createdAt: "2026-09-03T00:00:00Z" },
    ],
    source: "api",
    forbidden: false,
    stale: false,
  };
}

function allFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? allFiles(target) : [target];
  });
}

const WRITE_FUNCTIONS = [
  "importCloudCostsFromApi",
  "runCloudAllocationFromApi",
  "calculateCloudChargesFromApi",
  "createCloudChargeRuleFromApi",
  "updateCloudChargeRuleFromApi",
] as const;

function forbiddenWriteReferences(sourceRoot: string): string[] {
  const allowed = new Set([
    "modules/platform/cloud-billing/cloud-billing.adapter.ts",
    "modules/platform/cloud-billing/cloud-billing.service.ts",
  ]);
  return allFiles(sourceRoot)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => {
      const relative = path.relative(sourceRoot, file).replace(/\\/g, "/");
      if (allowed.has(relative)) return false;
      const source = readFileSync(file, "utf8");
      return WRITE_FUNCTIONS.some((name) => source.includes(name));
    })
    .map((file) => path.relative(sourceRoot, file).replace(/\\/g, "/"));
}

test("T33 censo de fabricação retorna zero no head", () => {
  const output = run("san3-06b-literais-de-plataforma.mjs");
  assert.match(output, /sítios = 0/);
});

test("T34 censo detecta quatro classes de fabricação em cópia temporária", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "san3-06b-literals-"));
  const copy = path.join(temporary, "platform");
  cpSync(path.join(FRONTEND, "src/modules/platform"), copy, { recursive: true });
  const page = path.join(copy, "pages/PlatformOverviewPage.tsx");
  const mutation = `\nconst FAKE_ROWS = [{ name: "Org Inventada", mrr: "R$ 9,9k" }];\nconst useMocks = readFrontendEnv("VITE_USE_MOCKS", "true") !== "false";\nexport function MutationProbe() { return <><Toggle on /><span>42</span>{FAKE_ROWS.map((row) => <span>{row.name}</span>)}</>; }\n`;
  writeFileSync(page, readFileSync(page, "utf8") + mutation);
  const output = run("san3-06b-literais-de-plataforma.mjs", [copy]);
  for (const className of ["ARRAY-LITERAL", "CONTROLE-BOOL", "JSX-NUMERO", "MOCK-DEFAULT"]) assert.match(output, new RegExp(className));
});

test("T35 censo de testes rejeita asserção de literal em cópia", () => {
  const clean = run("san3-06b-testes-com-literal.mjs");
  assert.match(clean, /com asserção de literal \(match\/equal\) = 0/);
  const temporary = mkdtempSync(path.join(tmpdir(), "san3-06b-tests-"));
  writeFileSync(path.join(temporary, "mutation.test.tsx"), 'test("mutation", () => { void PlatformOverviewPage; assert.match(html, /R\\$ 1/); });\n');
  const mutated = run("san3-06b-testes-com-literal.mjs", [temporary]);
  assert.match(mutated, /com asserção de literal \(match\/equal\) = 1/);
});

test("T36 inventário classifica todas as rotas e mantém só quatro ligadas no menu", () => {
  const output = run("san3-06b-telas-de-plataforma.mjs");
  assert.match(output, /rotas \/platform em App\.tsx = 10/);
  assert.match(output, /itens PLATFORM_NAV = 4/);
  assert.match(output, /LIGADA = 6/);
  assert.match(output, /PARADA-HONESTA = 4/);
  assert.match(output, /SEM-FONTE = 0/);
  for (const route of ["overview", "tenants", "cloud-billing", "health"]) assert.match(output, new RegExp(`/platform/${route}[^\\n]+LIGADA`));
});

test("T37 inventário fica vermelho com parada no menu ou tela sem fonte", () => {
  const first = mkdtempSync(path.join(tmpdir(), "san3-06b-menu-"));
  cpSync(path.join(FRONTEND, "src"), path.join(first, "frontend/src"), { recursive: true });
  const layout = path.join(first, "frontend/src/layouts/PlatformLayout.tsx");
  writeFileSync(layout, readFileSync(layout, "utf8").replace("items: [", 'items: [\n      { label: "Auditoria Global", path: "/platform/audit", icon: Activity },'));
  const menuMutation = run("san3-06b-telas-de-plataforma.mjs", [first]);
  assert.match(menuMutation, /itens PLATFORM_NAV = 5/);
  assert.match(menuMutation, /\/platform\/audit[^\n]+PARADA-HONESTA[^\n]+PRINCIPAL\/Auditoria Global/);

  const second = mkdtempSync(path.join(tmpdir(), "san3-06b-source-"));
  cpSync(path.join(FRONTEND, "src"), path.join(second, "frontend/src"), { recursive: true });
  const tenants = path.join(second, "frontend/src/modules/platform/pages/PlatformTenantsPage.tsx");
  writeFileSync(tenants, readFileSync(tenants, "utf8").replace(/import \{ usePlatformOverview \} from "\.\.\/usePlatformOverview";\r?\n/, ""));
  const sourceMutation = run("san3-06b-telas-de-plataforma.mjs", [second]);
  assert.match(sourceMutation, /SEM-FONTE = 1/);
  assert.match(sourceMutation, /\/platform\/tenants[^\n]+SEM-FONTE/);
});

test("T41 organização de sistema aparece selada e não entra nos indicadores de clientes", () => {
  const current = platformData();
  const metrics = customerOverviewMetrics(current);
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(PlatformTenantsView, { data: current })));
  assert.equal(metrics.activeOrgs, 1);
  assert.equal(metrics.totalOrgs, 2);
  assert.equal(metrics.totalUsers, 15);
  assert.match(html, /Organização de sistema/);
  const text = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Todas \(2\)/);
  assert.match(text, / 1 Organizações ativas /);
  assert.match(text, / 1 Organizações suspensas /);
  assert.match(text, / 15 Usuários totais /);
  assert.match(html, /Sistema/);
});

test("T42 Visão Geral aplica a mesma exclusão da organização de sistema", () => {
  const current = platformData();
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(PlatformOverviewView, { data: current })));
  assert.match(html, /de 2 organizações/);
  assert.match(html, />15</);
  assert.doesNotMatch(html, /de 3 organizações/);
});

test("T43 slug do frontend permanece amarrado ao bootstrap e a mutação diverge", () => {
  const bootstrap = readFileSync(path.join(REPO, "scripts/bootstrap-platform-admin.ts"), "utf8");
  const extract = (source: string) => source.match(/PLATFORM_TENANT_SLUG\s*=\s*"([^"]+)"/)?.[1];
  assert.equal(extract(bootstrap), PLATFORM_SYSTEM_ORG_SLUG);
  const temporary = mkdtempSync(path.join(tmpdir(), "san3-06b-bootstrap-"));
  const mutatedPath = path.join(temporary, "bootstrap-platform-admin.ts");
  writeFileSync(mutatedPath, bootstrap.replace('PLATFORM_TENANT_SLUG = "platform"', 'PLATFORM_TENANT_SLUG = "mutada"'));
  assert.notEqual(extract(readFileSync(mutatedPath, "utf8")), PLATFORM_SYSTEM_ORG_SLUG);
});

test("T44 escrita monetária fica isolada do restante do frontend e mutação é detectada", () => {
  const sourceRoot = path.join(FRONTEND, "src");
  assert.deepEqual(forbiddenWriteReferences(sourceRoot), []);
  const temporary = mkdtempSync(path.join(tmpdir(), "san3-06b-write-"));
  cpSync(sourceRoot, path.join(temporary, "src"), { recursive: true });
  const page = path.join(temporary, "src/modules/platform/pages/PlatformOverviewPage.tsx");
  writeFileSync(page, `import { calculateCloudChargesFromApi } from "../cloud-billing/cloud-billing.adapter";\n${readFileSync(page, "utf8")}`);
  assert.deepEqual(forbiddenWriteReferences(path.join(temporary, "src")), ["modules/platform/pages/PlatformOverviewPage.tsx"]);
});
