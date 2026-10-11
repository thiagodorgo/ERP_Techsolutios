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

// A3 da revisão do PR 411 — a trava da C-2 enuncia a PROPRIEDADE, não uma lista de nomes. "Função de escrita" é
// derivada do código: toda declaração de topo de `cloud-billing.{adapter,service}.ts` que monta requisição com `method`
// diferente do literal "GET" (método não literal conta como escrita) e, por fecho, toda declaração desses dois arquivos
// que referencia uma delas — os aliases e wrappers do serviço entram qualquer que seja o nome. Fora desses dois
// arquivos, o verificador de tipos do TypeScript resolve cada identificador (atravessa import renomeado, reexportação,
// propriedade de namespace e chave literal) e acusa: (i) referência a função de escrita; (ii) acesso ao módulo inteiro
// que exporta escrita — `import * as`, `export *`, `import()` —, porque o namespace carrega a escrita sob qualquer
// nome; (iii) `import()` com módulo não resolvível.
const WRITE_HOME = new Set([
  "modules/platform/cloud-billing/cloud-billing.adapter.ts",
  "modules/platform/cloud-billing/cloud-billing.service.ts",
]);

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

function buildsWriteRequest(root: ts.Node): boolean {
  return containsNode(root, (node) =>
    (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "method" && !isReadMethod(node.initializer)) ||
    (ts.isShorthandPropertyAssignment(node) && node.name.text === "method"));
}

function writeSurface(sourceRoot: string): WriteSurface {
  const files = allFiles(sourceRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const program = ts.createProgram(files, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();
  const relative = (fileName: string) => path.relative(sourceRoot, path.resolve(fileName)).replace(/\\/g, "/");
  const own = program.getSourceFiles().filter((source) => !relative(source.fileName).startsWith(".."));
  const resolve = (symbol: ts.Symbol | undefined) =>
    symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

  const declarations: { readonly symbol: ts.Symbol | undefined; readonly node: ts.Node; readonly label: string }[] = [];
  for (const source of own.filter((file) => WRITE_HOME.has(relative(file.fileName)))) {
    for (const statement of source.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
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

  const violations: string[] = [];
  for (const source of own.filter((file) => !WRITE_HOME.has(relative(file.fileName)))) {
    const at = (node: ts.Node) => `${relative(source.fileName)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
    const visit = (node: ts.Node): void => {
      const literalKey = ts.isStringLiteralLike(node) && ts.isElementAccessExpression(node.parent) && node.parent.argumentExpression === node;
      if ((ts.isIdentifier(node) || literalKey) && writes.has(resolve(checker.getSymbolAtLocation(node)))) {
        violations.push(`${at(node)} referencia escrita: ${node.text}`);
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
        else if (exportsWrite(moduleSymbol(specifier.text, source))) violations.push(`${at(node)} import() de módulo com escrita`);
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

test("T44 escrita monetária fica isolada do restante do frontend, qualquer que seja o nome, e mutação é detectada", () => {
  const sourceRoot = path.join(FRONTEND, "src");
  const head = writeSurface(sourceRoot);
  assert.deepEqual(head.violations, []);
  // Controle de vacuidade (piso, não fonte da trava): o conjunto DERIVADO contém as 5 escritas do adapter e os 5
  // nomes do serviço, e não contém leitura.
  for (const name of ["importCloudCostsFromApi", "runCloudAllocationFromApi", "calculateCloudChargesFromApi", "createCloudChargeRuleFromApi", "updateCloudChargeRuleFromApi", "importCloudCosts", "runCloudAllocation", "calculateCloudCharges", "createCloudChargeRule", "updateCloudChargeRule"]) {
    assert.ok(head.writes.includes(name), `escrita não derivada: ${name}`);
  }
  for (const name of ["getCloudBilling", "getCloudCostSummary", "periodForMonth", "getCloudChargeSummaryFromApi", "listCloudChargeRules"]) {
    assert.equal(head.writes.includes(name), false, `leitura tomada por escrita: ${name}`);
  }

  const temporary = mkdtempSync(path.join(tmpdir(), "san3-06b-write-"));
  try {
    const root = path.join(temporary, "src");
    cpSync(sourceRoot, root, { recursive: true });
    const platform = path.join(root, "modules/platform");
    const prepend = (file: string, text: string) => writeFileSync(file, `${text}${readFileSync(file, "utf8")}`);
    // nome do adapter (a mutação original)
    prepend(path.join(platform, "pages/PlatformOverviewPage.tsx"), 'import { calculateCloudChargesFromApi } from "../cloud-billing/cloud-billing.adapter";\nvoid calculateCloudChargesFromApi;\n');
    // R1 do revisor: a página importa e expõe o alias de escrita do serviço
    appendFileSync(path.join(platform, "cloud-billing/pages/PlatformCloudBillingPage.tsx"), '\nimport { runCloudAllocation } from "../cloud-billing.service";\nexport const executarRateio = runCloudAllocation;\n');
    // import renomeado
    appendFileSync(path.join(platform, "pages/PlatformTenantsPage.tsx"), '\nimport { importCloudCosts as carregar } from "../cloud-billing/cloud-billing.service";\nexport const sonda = carregar;\n');
    // namespace do serviço
    appendFileSync(path.join(platform, "pages/PlatformHealthPage.tsx"), '\nimport * as cobranca from "../cloud-billing/cloud-billing.service";\nexport const sondaNamespace = cobranca;\n');
    // reexportação com outro nome e consumidor dela
    writeFileSync(path.join(platform, "reexporta.ts"), 'export { updateCloudChargeRule as salvarRegra } from "./cloud-billing/cloud-billing.service";\n');
    writeFileSync(path.join(platform, "consome.ts"), 'import { salvarRegra } from "./reexporta";\nexport const usa = salvarRegra;\n');
    // import dinâmico, por propriedade e por chave literal
    writeFileSync(path.join(platform, "dinamico.ts"), 'export const tardio = () => import("./cloud-billing/cloud-billing.service").then((m) => m.createCloudChargeRule);\nexport const porChave = async () => (await import("./cloud-billing/cloud-billing.service"))["calculateCloudCharges"];\n');
    // reexportação do módulo inteiro
    writeFileSync(path.join(platform, "tudo.ts"), 'export * from "./cloud-billing/cloud-billing.service";\n');
    // controle negativo: consumidor só de leitura não é acusado
    writeFileSync(path.join(platform, "somente-leitura.ts"), 'import { getCloudBilling, periodForMonth } from "./cloud-billing/cloud-billing.service";\nexport const leitura = () => getCloudBilling(periodForMonth("2026-09"));\n');

    const mutated = writeSurface(root);
    assert.deepEqual(violatingFiles(mutated), [
      "modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx",
      "modules/platform/consome.ts",
      "modules/platform/dinamico.ts",
      "modules/platform/pages/PlatformHealthPage.tsx",
      "modules/platform/pages/PlatformOverviewPage.tsx",
      "modules/platform/pages/PlatformTenantsPage.tsx",
      "modules/platform/reexporta.ts",
      "modules/platform/tudo.ts",
    ]);
    assert.ok(mutated.violations.some((violation) => /PlatformCloudBillingPage\.tsx:\d+ referencia escrita: runCloudAllocation$/.test(violation)));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
