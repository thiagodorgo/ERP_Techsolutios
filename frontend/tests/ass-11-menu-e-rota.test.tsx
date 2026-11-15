import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { MVP_NAV_PATHS, NAV_BY_ROLE, buildSidebarNav, computeHiddenNavPaths, type RoleKind } from "../src/layouts/appSidebarNav";

// B-ASS-11 (Parte T do item 62, Emenda 1 §8.1 e Emenda 1.1 §5.1) — a tela "Minha assinatura" tem rota, item de menu e
// linha na matriz, e só para quem tem `billing:read`:
//   T-M1 a rota `/administrator/subscription` existe no App.tsx e o guard dela é EXATAMENTE `["billing:read"]`;
//   T-M2 em admin, gestor, financeiro e suporte o item é o ÚLTIMO de ADMINISTRAÇÃO; em dispatcher e inventory não existe
//        (o auditor usa o menu do gestor);
//   T-M3 com um menu do servidor sem o caminho (papel sem `billing:read`), o esconde-fino o oculta;
//   T-M4 `MVP_NAV_PATHS` tem o caminho;
//   T-M5 `docs/navigation-matrix.md` tem a linha da tela (o [06a·C9] de `sidebar-nav.test.tsx` confere que ela responde).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(HERE, "..");
const REPO_DIR = path.resolve(FRONTEND_DIR, "..");
const PATH = "/administrator/subscription";
const LABEL = "Minha assinatura";

test("T-M1 o App.tsx tem a rota /administrator/subscription, e o guard dela é exatamente [\"billing:read\"]", () => {
  const appText = readFileSync(path.join(FRONTEND_DIR, "src/App.tsx"), "utf8");
  const routes = [...appText.matchAll(/path="\/administrator\/subscription"([\s\S]{0,400}?)<PermissionGuard permissions=\{\[([^\]]*)\]\}/g)];
  assert.equal(routes.length, 1, `rotas ${PATH} com guard no App.tsx: ${routes.length}`);
  const [route] = routes;
  assert.equal(route[1].includes("<Route"), false, "o guard achado é o da própria rota, não o da seguinte");
  const permissions = [...route[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(permissions, ["billing:read"]);
  assert.match(route[1] + appText.slice(route.index! + route[0].length, route.index! + route[0].length + 80), /MySubscriptionPage/);
});

const WITH_ITEM: readonly RoleKind[] = ["admin", "gestor", "finance", "support"];
const WITHOUT_ITEM: readonly RoleKind[] = ["dispatcher", "inventory"];

test("T-M2 admin, gestor, financeiro e suporte têm \"Minha assinatura\" como ÚLTIMO item de ADMINISTRAÇÃO; dispatcher e inventory não têm", () => {
  for (const kind of WITH_ITEM) {
    const admin = NAV_BY_ROLE[kind].filter((group) => group.label === "ADMINISTRAÇÃO");
    assert.equal(admin.length, 1, `${kind}: grupos ADMINISTRAÇÃO`);
    const items = admin[0].items;
    assert.equal(items[items.length - 1]?.label, LABEL, `${kind}: último item de ADMINISTRAÇÃO = ${items[items.length - 1]?.label}`);
    assert.equal(items[items.length - 1]?.path, PATH);
    assert.equal(items.filter((item) => item.path === PATH).length, 1, `${kind}: o item aparece uma vez só`);
  }
  for (const kind of WITHOUT_ITEM) {
    const paths = NAV_BY_ROLE[kind].flatMap((group) => group.items.map((item) => item.path));
    assert.equal(paths.includes(PATH), false, `${kind} não pode ter o item`);
  }
  assert.deepEqual(Object.keys(NAV_BY_ROLE).sort(), ["admin", "dispatcher", "finance", "gestor", "inventory", "support"], "nenhum perfil de menu novo ficou de fora");
});

test("T-M3 com o menu do servidor sem o caminho (papel sem billing:read), o esconde-fino oculta o item", () => {
  const governed = [PATH, "/users"];
  const withoutBilling = computeHiddenNavPaths([{ path: "/users" }, { path: "/notifications" }], governed);
  assert.equal(withoutBilling.has(PATH), true, "sem o caminho no menu do servidor, o item some");
  const nav = buildSidebarNav(["Financeiro"], withoutBilling);
  assert.equal(nav.flatMap((group) => group.items).some((item) => item.path === PATH), false);
  const withBilling = computeHiddenNavPaths([{ path: PATH, status: "backend-ready" }, { path: "/users" }], governed);
  assert.equal(withBilling.has(PATH), false, "com o caminho no menu do servidor, o item fica");
  const visible = buildSidebarNav(["Financeiro"], withBilling);
  assert.equal(visible.flatMap((group) => group.items).filter((item) => item.path === PATH).length, 1);
});

test("T-M4 MVP_NAV_PATHS tem /administrator/subscription", () => {
  assert.equal(MVP_NAV_PATHS.has(PATH), true);
});

test("T-M5 docs/navigation-matrix.md tem a linha da tela, com billing:read", () => {
  const matrix = readFileSync(path.join(REPO_DIR, "docs/navigation-matrix.md"), "utf8");
  const lines = matrix.split(/\r?\n/).filter((line) => line.startsWith("|") && line.includes(`\`${PATH}\``));
  assert.equal(lines.length, 1, `linhas da matriz com ${PATH}: ${lines.length}`);
  assert.match(lines[0], /`billing:read`/);
  assert.match(lines[0], new RegExp(`^\\| ${LABEL} `));
});
