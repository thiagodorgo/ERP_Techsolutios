import assert from "node:assert/strict";
import test from "node:test";

import { buildSidebarNav, computeHiddenNavPaths } from "../src/layouts/appSidebarNav";

// Ω-ACESSO — gating dinâmico do sidebar por provisionamento. computeHiddenNavPaths esconde os itens
// "planned" MAIS os paths governados pelo backend que não vieram no menu do tenant. buildSidebarNav
// aplica esse conjunto, então o Mapa some do menu do admin quando o módulo não está provisionado.

const GOVERNED = ["/operations/map", "/operations/dispatches", "/work-orders", "/dashboard"];

test("esconde item 'planned' do menu backend", () => {
  const hidden = computeHiddenNavPaths([{ path: "/work-orders", status: "planned" }], []);
  assert.equal(hidden.has("/work-orders"), true);
});

test("gating dinâmico: path governado ausente do menu → escondido", () => {
  // Menu do tenant NÃO tem /operations/map (módulo field_operations não provisionado).
  const menu = [{ path: "/dashboard", status: "implemented" }, { path: "/work-orders", status: "implemented" }];
  const hidden = computeHiddenNavPaths(menu, GOVERNED);
  assert.equal(hidden.has("/operations/map"), true);
  assert.equal(hidden.has("/operations/dispatches"), true);
  assert.equal(hidden.has("/work-orders"), false); // veio no menu → visível
});

test("path governado presente no menu → NÃO escondido", () => {
  const menu = GOVERNED.map((path) => ({ path, status: "implemented" }));
  const hidden = computeHiddenNavPaths(menu, GOVERNED);
  assert.equal(hidden.has("/operations/map"), false);
});

test("fallback (governedPaths vazio) não esconde nada por provisionamento", () => {
  const hidden = computeHiddenNavPaths([{ path: "/dashboard", status: "implemented" }], []);
  assert.equal(hidden.size, 0);
});

test("buildSidebarNav do admin remove o Mapa quando ele está no conjunto escondido", () => {
  const semMenu = [{ path: "/dashboard", status: "implemented" }];
  const hidden = computeHiddenNavPaths(semMenu, GOVERNED);
  const nav = buildSidebarNav(["Administrador"], hidden);
  const paths = nav.flatMap((group) => group.items.map((item) => item.path));
  assert.equal(paths.includes("/operations/map"), false);
});

test("buildSidebarNav do admin mantém o Mapa quando provisionado (não escondido)", () => {
  const comMenu = GOVERNED.map((path) => ({ path, status: "implemented" }));
  const hidden = computeHiddenNavPaths(comMenu, GOVERNED);
  const nav = buildSidebarNav(["Administrador"], hidden);
  const paths = nav.flatMap((group) => group.items.map((item) => item.path));
  assert.equal(paths.includes("/operations/map"), true);
});
