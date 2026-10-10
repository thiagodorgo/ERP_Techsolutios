#!/usr/bin/env node
// B-SAN3-06b — inventário AST de rotas, menu, registro e fonte das telas da plataforma.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const repo = path.resolve(process.argv[2] ?? ".");
const sourceRoot = path.resolve(process.argv[3] ?? repo);
const ts = (() => {
  for (const packageJson of ["frontend/package.json", "package.json"]) {
    try {
      return createRequire(path.join(repo, packageJson))("typescript");
    } catch {}
  }
  throw new Error("typescript não resolvido em frontend/ nem na raiz");
})();
const sf = (relativePath) =>
  ts.createSourceFile(
    relativePath,
    readFileSync(path.join(sourceRoot, relativePath), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const text = (node, source) => node.getText(source).replace(/^["'`]|["'`]$/g, "");

const app = sf("frontend/src/App.tsx");
const appText = app.getFullText();
const componentFiles = new Map();
for (const match of appText.matchAll(
  /const\s+(Platform[A-Za-z]+Page)\s*=\s*lazy\(\(\)\s*=>\s*\n?\s*import\("([^"]+)"\)/g,
)) {
  componentFiles.set(match[1], `frontend/src/${match[2].replace(/^\.\//, "")}.tsx`);
}

const routes = [];
function attribute(element, name) {
  return element.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText(app) === name,
  );
}
function visitApp(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const element = ts.isJsxElement(node) ? node.openingElement : node;
    if (element.tagName.getText(app) === "Route") {
      const routePath = attribute(element, "path");
      const routeElement = attribute(element, "element");
      if (routePath && routeElement && text(routePath.initializer, app).startsWith("/platform")) {
        const inner = routeElement.initializer.getText(app);
        const permissions = [...inner.matchAll(/"(platform:[a-z-]+:[a-z_]+)"/g)].map(
          (match) => match[1],
        );
        const component = (inner.match(/<(Platform[A-Za-z]+Page)/) ?? [])[1] ?? "?";
        routes.push({
          path: text(routePath.initializer, app),
          guard: permissions,
          component,
          line: app.getLineAndCharacterOfPosition(node.getStart(app)).line + 1,
        });
      }
    }
  }
  ts.forEachChild(node, visitApp);
}
visitApp(app);

const layout = sf("frontend/src/layouts/PlatformLayout.tsx");
const menu = new Map();
function visitLayout(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(layout) === "PLATFORM_NAV" &&
    node.initializer
  ) {
    for (const group of node.initializer.elements) {
      const groupLabel = group.properties.find(
        (property) => property.name.getText(layout) === "label",
      ).initializer;
      const items = group.properties.find(
        (property) => property.name.getText(layout) === "items",
      ).initializer;
      for (const item of items.elements) {
        const values = Object.fromEntries(
          item.properties.map((property) => [
            property.name.getText(layout),
            text(property.initializer, layout),
          ]),
        );
        menu.set(values.path, {
          group: text(groupLabel, layout),
          label: values.label,
          line: layout.getLineAndCharacterOfPosition(item.getStart(layout)).line + 1,
        });
      }
    }
  }
  ts.forEachChild(node, visitLayout);
}
visitLayout(layout);

const navigation = sf("frontend/src/navigation/platformNavigation.ts");
const registry = new Map();
function visitNavigation(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(navigation) === "platformNavigation" &&
    node.initializer
  ) {
    for (const item of node.initializer.elements) {
      const values = {};
      for (const property of item.properties) {
        const key = property.name.getText(navigation);
        values[key] = ts.isArrayLiteralExpression(property.initializer)
          ? property.initializer.elements.map((element) => text(element, navigation))
          : text(property.initializer, navigation);
      }
      registry.set(values.path, {
        label: values.label,
        status: values.status ?? "(sem status)",
        permissions: values.requiredPermissions,
        line: navigation.getLineAndCharacterOfPosition(item.getStart(navigation)).line + 1,
      });
    }
  }
  ts.forEachChild(node, visitNavigation);
}
visitNavigation(navigation);

function classify(component) {
  const relativePath = componentFiles.get(component);
  if (!relativePath) return "SEM-FONTE";
  const source = sf(relativePath);
  let linked = false;
  let honestStop = false;
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = text(statement.moduleSpecifier, source);
      if (/^\.{1,2}\/(?:.*\.service|use[A-Z].*)$/.test(specifier)) linked = true;
    }
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.declarationList.declarations.some(
        (declaration) => declaration.name.getText(source) === "PLATFORM_HONEST_STOP",
      )
    ) {
      honestStop = true;
    }
  }
  if (honestStop) return "PARADA-HONESTA";
  if (linked) return "LIGADA";
  return "SEM-FONTE";
}

const allPaths = new Set([...routes.map((route) => route.path), ...menu.keys(), ...registry.keys()]);
const classifications = routes.map((route) => classify(route.component));
console.log(
  `# rotas /platform em App.tsx = ${routes.length} · itens PLATFORM_NAV = ${menu.size} · itens platformNavigation = ${registry.size} · LIGADA = ${classifications.filter((value) => value === "LIGADA").length} · PARADA-HONESTA = ${classifications.filter((value) => value === "PARADA-HONESTA").length} · SEM-FONTE = ${classifications.filter((value) => value === "SEM-FONTE").length}`,
);
console.log(
  "path | componente (App.tsx:l) | classificação | guard do App | menu REAL (grupo/label, PlatformLayout:l) | registro (label/status/perms, platformNavigation:l)",
);
for (const routePath of [...allPaths].sort()) {
  const route = routes.find((candidate) => candidate.path === routePath);
  const menuItem = menu.get(routePath);
  const registered = registry.get(routePath);
  console.log(
    [
      routePath,
      route ? `${route.component} (App.tsx:${route.line})` : "SEM ROTA",
      route ? classify(route.component) : "SEM-FONTE",
      route ? route.guard.join(",") : "—",
      menuItem
        ? `${menuItem.group}/${menuItem.label} (PlatformLayout.tsx:${menuItem.line})`
        : "FORA DO MENU",
      registered
        ? `${registered.label}/${registered.status}/${registered.permissions.join(",")} (platformNavigation.ts:${registered.line})`
        : "FORA DO REGISTRO",
    ].join(" | "),
  );
}
