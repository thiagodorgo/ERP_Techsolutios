import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ts from "typescript";

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

// A3 da revisão do PR 411, com o ENUNCIADO NOVO do B-ASS-10b (plano v2 §8.3(a); Emenda 1, A3-r2) — a trava enuncia a
// PROPRIEDADE, não uma lista de nomes. *Escrita* é derivada do código: toda declaração de topo de QUALQUER arquivo de
// `modules/platform/cloud-billing/**` que monta requisição não GET — `method` diferente do literal "GET" (método não
// literal conta como escrita) OU (A3-r2 (a)) chamada a `apiRequest`/`apiData`/`apiFormDataRequest`/`fetch` cujo `init` não
// é um objeto literal com `method: "GET"` (isso cobre o repasse genérico) — e, por fecho, toda declaração do módulo que
// referencia uma escrita: hooks, componentes e páginas entram, qualquer que seja o nome. Fora do módulo, o verificador
// de tipos do TypeScript resolve cada identificador (atravessa import renomeado, reexportação, propriedade de namespace e
// chave literal) e acusa: (i) referência a escrita; (ii) acesso ao módulo inteiro que exporta escrita — `import * as`,
// `export *`, `import()` —, porque o namespace carrega a escrita sob qualquer nome; (iii) `import()` com módulo não
// resolvível. A ÚNICA porta (A3-r2 (b)): `App.tsx` pode referenciar SÓ o componente de página montado na rota
// (`PlatformCloudBillingPage`, de `pages/PlatformCloudBillingPage.tsx`), e o `import()` preguiçoso dessa página.
const MODULE = "modules/platform/cloud-billing/";
const inModule = (file: string) => file.startsWith(MODULE);
const DOOR_FILE = "App.tsx";
const DOOR_TARGET = "modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx";
const DOOR_EXPORT = "PlatformCloudBillingPage";
const REQUEST_FUNCTIONS = new Set(["apiRequest", "apiData", "apiFormDataRequest", "fetch"]);

// Opções do `frontend/tsconfig.json`; sem tipos ambientes de `@types/*` (não participam da resolução de símbolos do
// `src` e só custariam tempo).
const COMPILER_OPTIONS: ts.CompilerOptions = {
  ...ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(FRONTEND, "tsconfig.json"), ts.sys.readFile).config, ts.sys, FRONTEND).options,
  types: [],
};

type WriteSurface = { readonly writes: readonly string[]; readonly violations: readonly string[] };

function containsNode(root: ts.Node, predicate: (node: ts.Node) => boolean): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (predicate(node)) found = true;
    else ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

function isReadMethod(initializer: ts.Expression): boolean {
  return ts.isStringLiteralLike(initializer) && initializer.text.toUpperCase() === "GET";
}

/** A3-r2 (a): o `init` só é de leitura se for um objeto LITERAL, sem espalhamento, com `method: "GET"`. */
function isLiteralGetInit(init: ts.Expression | undefined): boolean {
  if (!init || !ts.isObjectLiteralExpression(init)) return false;
  if (init.properties.some((property) => ts.isSpreadAssignment(property))) return false;
  return init.properties.some((property) => ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === "method" && isReadMethod(property.initializer));
}

function writeSurface(sourceRoot: string): WriteSurface {
  const files = allFiles(sourceRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const program = ts.createProgram(files, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();
  const relative = (fileName: string) => path.relative(sourceRoot, path.resolve(fileName)).replace(/\\/g, "/");
  const own = program.getSourceFiles().filter((source) => !relative(source.fileName).startsWith(".."));
  const resolve = (symbol: ts.Symbol | undefined) =>
    symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

  const isRequestCall = (node: ts.Node): node is ts.CallExpression => {
    if (!ts.isCallExpression(node)) return false;
    const callee = node.expression;
    const name = ts.isIdentifier(callee) ? (resolve(checker.getSymbolAtLocation(callee))?.name ?? callee.text) : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
    return name !== null && REQUEST_FUNCTIONS.has(name);
  };
  const buildsWriteRequest = (root: ts.Node): boolean =>
    containsNode(root, (node) =>
      (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "method" && !isReadMethod(node.initializer)) ||
      (ts.isShorthandPropertyAssignment(node) && node.name.text === "method") ||
      (isRequestCall(node) && !isLiteralGetInit(node.arguments[1])));

  const declarations: { readonly symbol: ts.Symbol | undefined; readonly node: ts.Node; readonly label: string }[] = [];
  for (const source of own.filter((file) => inModule(relative(file.fileName)))) {
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        declarations.push({ symbol: checker.getSymbolAtLocation(statement.name), node: statement, label: statement.name.text });
      }
      if (ts.isClassDeclaration(statement) && statement.name) {
        declarations.push({ symbol: checker.getSymbolAtLocation(statement.name), node: statement, label: statement.name.text });
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            declarations.push({ symbol: checker.getSymbolAtLocation(declaration.name), node: declaration.initializer, label: declaration.name.text });
          }
        }
      }
    }
  }
  const writes = new Set(declarations.filter((item) => buildsWriteRequest(item.node)).map((item) => item.symbol));
  for (let grew = true; grew; ) {
    grew = false;
    for (const item of declarations) {
      if (writes.has(item.symbol)) continue;
      if (containsNode(item.node, (node) => ts.isIdentifier(node) && writes.has(resolve(checker.getSymbolAtLocation(node))))) {
        writes.add(item.symbol);
        grew = true;
      }
    }
  }

  const moduleSymbol = (specifier: string, from: ts.SourceFile) => {
    const resolved = ts.resolveModuleName(specifier, from.fileName, COMPILER_OPTIONS, ts.sys).resolvedModule;
    const target = resolved ? program.getSourceFile(resolved.resolvedFileName) : undefined;
    return target ? checker.getSymbolAtLocation(target) : undefined;
  };
  const exportsWrite = (symbol: ts.Symbol | undefined) =>
    !!symbol && checker.getExportsOfModule(symbol).some((exported) => writes.has(resolve(exported)));
  // A3-r2 (b): a porta é só o componente de página montado na rota, declarado em `pages/PlatformCloudBillingPage.tsx`
  const isDoorComponent = (symbol: ts.Symbol | undefined) =>
    !!symbol && symbol.name === DOOR_EXPORT && !!symbol.declarations?.some((declaration) => relative(declaration.getSourceFile().fileName) === DOOR_TARGET);
  const resolvesToDoor = (specifier: string, from: ts.SourceFile) => {
    const resolved = ts.resolveModuleName(specifier, from.fileName, COMPILER_OPTIONS, ts.sys).resolvedModule;
    return !!resolved && relative(resolved.resolvedFileName) === DOOR_TARGET;
  };

  const violations: string[] = [];
  for (const source of own.filter((file) => !inModule(relative(file.fileName)))) {
    const isDoorFile = relative(source.fileName) === DOOR_FILE;
    const at = (node: ts.Node) => `${relative(source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
    const visit = (node: ts.Node): void => {
      const literalKey = ts.isStringLiteralLike(node) && ts.isElementAccessExpression(node.parent) && node.parent.argumentExpression === node;
      if (ts.isIdentifier(node) || literalKey) {
        const symbol = resolve(checker.getSymbolAtLocation(node));
        if (writes.has(symbol) && !(isDoorFile && isDoorComponent(symbol))) violations.push(`${at(node)} referencia escrita: ${node.text}`);
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings) && exportsWrite(moduleSymbol(node.moduleSpecifier.text, source))) {
        violations.push(`${at(node)} import * de módulo com escrita`);
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && (!node.exportClause || ts.isNamespaceExport(node.exportClause)) && exportsWrite(moduleSymbol(node.moduleSpecifier.text, source))) {
        violations.push(`${at(node)} export * de módulo com escrita`);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [specifier] = node.arguments;
        if (!specifier || !ts.isStringLiteralLike(specifier)) violations.push(`${at(node)} import() não resolvível`);
        else if (exportsWrite(moduleSymbol(specifier.text, source)) && !(isDoorFile && resolvesToDoor(specifier.text, source))) violations.push(`${at(node)} import() de módulo com escrita`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const writeLabels = declarations.filter((item) => writes.has(item.symbol)).map((item) => item.label);
  return { writes: writeLabels, violations };
}

function violatingFiles(surface: WriteSurface): string[] {
  return [...new Set(surface.violations.map((violation) => violation.split(":")[0]))].sort();
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

// ---- T44 com o enunciado novo (B-ASS-10b, plano v2 §8.3(a); Emenda 1, A3-r2). Casos K0 a K6 da referência executada
// pelo plano (`planos/plano-B-ASS-10b-T5-v2-ref-gerar-t44.mjs.txt`), os ataques da crítica r2 (CRIT-N1, CRIT-N2, CRIT-N3) e
// as classes de acesso que o T44 de antes já pegava (import renomeado, namespace, reexportação, `import()`, `export *`).
const ADAPTER = '"../cloud-billing/cloud-billing.adapter"';
function scenario(mutate: (platform: string, root: string) => void): WriteSurface {
  const temporary = mkdtempSync(path.join(tmpdir(), "ass10b-t44-"));
  try {
    const root = path.join(temporary, "src");
    cpSync(path.join(FRONTEND, "src"), root, { recursive: true });
    mutate(path.join(root, "modules/platform"), root);
    return writeSurface(root);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
// o desenho do bloco: um invólucro de escrita dentro do módulo, usado pela página do módulo
function withHook(platform: string): void {
  writeFileSync(path.join(platform, "cloud-billing/useCloudBillingActions.ts"), 'import { runCloudAllocationFromApi } from "./cloud-billing.adapter";\nexport function useCloudBillingActions() { return { rodar: () => runCloudAllocationFromApi({ start: "2026-10-01", end: "2026-10-31" }) }; }\n');
  appendFileSync(path.join(platform, "cloud-billing/pages/PlatformCloudBillingPage.tsx"), '\nimport { useCloudBillingActions as usarAcoes } from "../useCloudBillingActions";\nexport function PlatformCloudBillingPageComAcoes() { usarAcoes(); return <PlatformCloudBillingPage />; }\n');
}

test("T44 K0 head: nenhuma escrita alcançada de fora do módulo; o conjunto derivado tem as escritas e nenhuma leitura", () => {
  const head = writeSurface(path.join(FRONTEND, "src"));
  assert.deepEqual(head.violations, []);
  // Controle de vacuidade (piso, não fonte da trava): as escritas de hoje, a do dólar, as de grupo e o invólucro.
  for (const name of [
    "importCloudCostsFromApi", "runCloudAllocationFromApi", "importCloudCosts", "runCloudAllocation", "putFxRateFromApi", "putFxRate",
    "createEconomicGroupFromApi", "updateEconomicGroupFromApi", "deleteEconomicGroupFromApi", "putEconomicGroupMembersFromApi", "useCloudBillingActions",
  ]) {
    assert.ok(head.writes.includes(name), `escrita não derivada: ${name}`);
  }
  for (const name of [
    "getCloudBilling", "periodForMonth", "listCloudCostImportsFromApi", "getTenantOverviewFromApi", "getGlobalOverviewFromApi", "listFxRatesFromApi",
    "getEconomicGroupFromApi", "listCloudAllocationRunsFromApi", "latestAllocatedMonth", "getInitialBillingMonth", "useCloudBilling", "buildCloudBillingView",
  ]) {
    assert.equal(head.writes.includes(name), false, `leitura tomada por escrita: ${name}`);
  }
});

test("T44 K3 o desenho do bloco passa: invólucro e página dentro do módulo, e App.tsx monta a página pela porta", () => {
  const surface = scenario((platform) => withHook(platform));
  assert.deepEqual(surface.violations, []);
  assert.ok(surface.writes.includes("useCloudBillingActions"), "o invólucro tem de entrar no conjunto derivado");
  assert.ok(surface.writes.includes("PlatformCloudBillingPageComAcoes"), "a página que usa o invólucro é escrita por fecho");
});

test("T44 K1 (M-T44-b, o ataque da crítica r1): invólucro do módulo usado de fora é acusado", () => {
  const surface = scenario((platform) => {
    withHook(platform);
    appendFileSync(path.join(platform, "pages/PlatformTenantDetailPage.tsx"), '\nimport { useCloudBillingActions } from "../cloud-billing/useCloudBillingActions";\nexport const rodarDaqui = () => useCloudBillingActions().rodar();\n');
  });
  assert.deepEqual(violatingFiles(surface), ["modules/platform/pages/PlatformTenantDetailPage.tsx"]);
});

test("T44 K2 (M-T44-a): import direto do adapter, de fora, continua acusado", () => {
  const surface = scenario((platform) => {
    appendFileSync(path.join(platform, "pages/PlatformTenantsPage.tsx"), "\nimport { runCloudAllocationFromApi as r } from " + ADAPTER + ";\nexport const sonda = r;\n");
  });
  assert.deepEqual(violatingFiles(surface), ["modules/platform/pages/PlatformTenantsPage.tsx"]);
});

test("T44 K4 (M-T44-c): a porta é só de App.tsx; outro arquivo que monte a página com ações é acusado", () => {
  const surface = scenario((platform) => {
    withHook(platform);
    appendFileSync(path.join(platform, "pages/PlatformOverviewPage.tsx"), '\nimport { PlatformCloudBillingPageComAcoes } from "../cloud-billing/pages/PlatformCloudBillingPage";\nexport const embutida = PlatformCloudBillingPageComAcoes;\n');
  });
  assert.deepEqual(violatingFiles(surface), ["modules/platform/pages/PlatformOverviewPage.tsx"]);
});

test("T44 K5 (M-T44-d): escrita declarada em arquivo do módulo que não é adapter nem service, usada de fora, é acusada", () => {
  const surface = scenario((platform, root) => {
    writeFileSync(path.join(platform, "cloud-billing/janela-dolar.ts"), 'export async function salvarDolar(url: string) { return fetch(url, { method: "PUT", body: "{}" }); }\n');
    appendFileSync(path.join(root, "layouts/PlatformLayout.tsx"), '\nimport { salvarDolar } from "../modules/platform/cloud-billing/janela-dolar";\nexport const atalho = salvarDolar;\n');
  });
  assert.deepEqual(violatingFiles(surface), ["layouts/PlatformLayout.tsx"]);
});

test("T44 K6 controle negativo: leitura do módulo usada de fora não é acusada", () => {
  const surface = scenario((platform) => {
    withHook(platform);
    writeFileSync(path.join(platform, "somente-leitura.ts"), 'import { getCloudBilling, periodForMonth } from "./cloud-billing/cloud-billing.service";\nexport const leitura = () => getCloudBilling("2026-09");\nexport const periodo = () => periodForMonth("2026-09");\n');
  });
  assert.deepEqual(surface.violations, []);
});

test("T44 CRIT-N1 (A3-r2 (a)): repasse genérico do adapter (init vindo de parâmetro), usado de fora para um PUT, é acusado", () => {
  const surface = scenario((platform) => {
    appendFileSync(path.join(platform, "cloud-billing/cloud-billing.adapter.ts"), "\nexport function enviarPlataforma<T>(url: string, init?: Parameters<typeof apiRequest>[1]) { return apiRequest<T>(url, init); }\n");
    appendFileSync(path.join(platform, "pages/PlatformTenantDetailPage.tsx"), '\nimport { enviarPlataforma } from "../cloud-billing/cloud-billing.adapter";\nexport const gravaDolar = () => enviarPlataforma("/platform/billing/fx-rates/2026-10", { method: "PUT", body: JSON.stringify({ currencyFrom: "USD", rate: "541" }) });\n');
  });
  assert.ok(surface.writes.includes("enviarPlataforma"), "o repasse genérico é escrita");
  assert.deepEqual(violatingFiles(surface), ["modules/platform/pages/PlatformTenantDetailPage.tsx"]);
});

test("T44 CRIT-N2 (A3-r2 (b)): a porta de App.tsx vale só para a página montada na rota, não para outra declaração da página", () => {
  const surface = scenario((platform, root) => {
    withHook(platform);
    appendFileSync(path.join(platform, "cloud-billing/pages/PlatformCloudBillingPage.tsx"), '\nimport { runCloudAllocationFromApi as rodarJa } from "../cloud-billing.adapter";\nexport const rodarDireto = () => rodarJa({ start: "2026-10-01", end: "2026-10-31" });\n');
    appendFileSync(path.join(root, "App.tsx"), '\nimport { rodarDireto } from "./modules/platform/cloud-billing/pages/PlatformCloudBillingPage";\nexport const atalhoDoRoteador = () => rodarDireto();\n');
  });
  assert.deepEqual(violatingFiles(surface), ["App.tsx"]);
});

test("T44 CRIT-N3: escrita no módulo cujo init é montado fora da chamada (sem a chave literal method) é acusada", () => {
  const surface = scenario((platform, root) => {
    writeFileSync(path.join(platform, "cloud-billing/cloud-billing.http.ts"), 'import { apiRequest } from "../../../services/api/client";\nconst PUT_INIT = Object.fromEntries([["method", "PUT"]]) as RequestInit;\nexport function salvarTaxa(month: string, rate: string) { return apiRequest(`/platform/billing/fx-rates/${month}`, { ...PUT_INIT, body: JSON.stringify({ currencyFrom: "USD", rate }) }); }\n');
    appendFileSync(path.join(root, "layouts/PlatformLayout.tsx"), '\nimport { salvarTaxa } from "../modules/platform/cloud-billing/cloud-billing.http";\nexport const atalho = () => salvarTaxa("2026-10", "541");\n');
  });
  assert.deepEqual(violatingFiles(surface), ["layouts/PlatformLayout.tsx"]);
});

test("T44 as classes de acesso de antes continuam acusadas: import renomeado, namespace, reexportação, import() e export *", () => {
  const surface = scenario((platform) => {
    const prepend = (file: string, text: string) => writeFileSync(file, `${text}${readFileSync(file, "utf8")}`);
    // nome do adapter (a mutação original)
    prepend(path.join(platform, "pages/PlatformOverviewPage.tsx"), 'import { importCloudCostsFromApi } from "../cloud-billing/cloud-billing.adapter";\nvoid importCloudCostsFromApi;\n');
    // import renomeado do alias do serviço
    appendFileSync(path.join(platform, "pages/PlatformTenantsPage.tsx"), '\nimport { importCloudCosts as carregar } from "../cloud-billing/cloud-billing.service";\nexport const sonda = carregar;\n');
    // namespace do serviço
    appendFileSync(path.join(platform, "pages/PlatformHealthPage.tsx"), '\nimport * as cobranca from "../cloud-billing/cloud-billing.service";\nexport const sondaNamespace = cobranca;\n');
    // reexportação com outro nome e consumidor dela
    writeFileSync(path.join(platform, "reexporta.ts"), 'export { runCloudAllocation as salvarRegra } from "./cloud-billing/cloud-billing.service";\n');
    writeFileSync(path.join(platform, "consome.ts"), 'import { salvarRegra } from "./reexporta";\nexport const usa = salvarRegra;\n');
    // import dinâmico, por propriedade e por chave literal
    writeFileSync(path.join(platform, "dinamico.ts"), 'export const tardio = () => import("./cloud-billing/cloud-billing.service").then((m) => m.runCloudAllocation);\nexport const porChave = async () => (await import("./cloud-billing/cloud-billing.service"))["importCloudCosts"];\n');
    // reexportação do módulo inteiro
    writeFileSync(path.join(platform, "tudo.ts"), 'export * from "./cloud-billing/cloud-billing.service";\n');
    // controle negativo: consumidor só de leitura não é acusado
    writeFileSync(path.join(platform, "somente-leitura.ts"), 'import { getCloudBilling } from "./cloud-billing/cloud-billing.service";\nexport const leitura = () => getCloudBilling("2026-09");\n');
  });
  assert.deepEqual(violatingFiles(surface), [
    "modules/platform/consome.ts",
    "modules/platform/dinamico.ts",
    "modules/platform/pages/PlatformHealthPage.tsx",
    "modules/platform/pages/PlatformOverviewPage.tsx",
    "modules/platform/pages/PlatformTenantsPage.tsx",
    "modules/platform/reexporta.ts",
    "modules/platform/tudo.ts",
  ]);
});
