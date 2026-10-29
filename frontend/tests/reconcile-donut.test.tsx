import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReconcileDonut } from "../src/components/charts/ReconcileDonut";

test("ReconcileDonut separa categorias disjuntas sem duplicar as ressalvas no total", () => {
  const html = renderToStaticMarkup(<ReconcileDonut pending={5} reconciled={10} valueDivergence={2} dateDivergence={3} />);
  assert.match(html, /67% dos lançamentos conciliados/);
  assert.match(html, /Conciliados: 5 — filtrar o extrato/);
  assert.match(html, /Ressalva de valor: 2 — filtrar o extrato/);
  assert.match(html, /Ressalva de data: 3 — filtrar o extrato/);
  assert.match(html, /A conciliar: 5 — filtrar o extrato/);
});

test("ReconcileDonut mantém zero explícito como dado válido", () => {
  const html = renderToStaticMarkup(<ReconcileDonut pending={0} reconciled={0} valueDivergence={0} dateDivergence={0} />);
  assert.match(html, />0%<\/text>/);
  assert.equal((html.match(/<button/g) ?? []).length, 4);
  assert.doesNotMatch(html, /indisponível/);
});

test("ReconcileDonut falha fechado para ausência ou contagens inconsistentes", () => {
  const absent = renderToStaticMarkup(<ReconcileDonut pending={null} reconciled={4} valueDivergence={1} dateDivergence={0} />);
  const inconsistent = renderToStaticMarkup(<ReconcileDonut pending={2} reconciled={1} valueDivergence={1} dateDivergence={1} />);
  for (const html of [absent, inconsistent]) {
    assert.match(html, /Conciliação indisponível/);
    assert.doesNotMatch(html, /<svg/);
  }
});

test("ReconcileDonut publica rótulos, estado pressionado e callbacks dos quatro filtros", () => {
  const html = renderToStaticMarkup(<ReconcileDonut pending={3} reconciled={7} valueDivergence={1} dateDivergence={1} pressed="value" onFilter={() => undefined} />);
  assert.match(html, /role="group" aria-label="Filtrar por situação da conciliação"/);
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 4);
  assert.match(html, /aria-pressed="true" aria-label="Ressalva de valor:/);
  for (const label of ["Conciliados", "Ressalva de valor", "Ressalva de data", "A conciliar"]) assert.match(html, new RegExp(`aria-label="${label}:`));
  const source = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/components/charts/ReconcileDonut.tsx"), "utf8");
  assert.match(source, /onClick=\{\(\) => onFilter\?\.\(segment\.key\)\}/);
});

test("ReconcileDonut usa círculos acessíveis e não depende de biblioteca externa", () => {
  const html = renderToStaticMarkup(<ReconcileDonut pending={2} reconciled={8} valueDivergence={1} dateDivergence={1} />);
  assert.match(html, /<svg[^>]*role="img"/);
  assert.ok((html.match(/<circle/g) ?? []).length >= 4);
  assert.doesNotMatch(html, /canvas/);
});
