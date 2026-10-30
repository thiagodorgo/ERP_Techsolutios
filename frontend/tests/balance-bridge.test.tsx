import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BalanceBridge } from "../src/components/charts/BalanceBridge";

const money = (value: number) => `R$ ${value.toFixed(2)}`;

test("BalanceBridge passa o saldo literal do servidor, mesmo quando difere da fórmula ilustrativa", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={100} inflow={50} outflow={20} balance={999} valueFormat={money} />);
  assert.match(html, /Saldo atual: R\$ 999\.00/);
  assert.match(html, /saldo atual R\$ 999\.00/);
  assert.doesNotMatch(html, /Saldo atual: R\$ 130\.00/);
});

test("BalanceBridge preserva Entradas e Saídas em suas direções, inclusive com valores negativos", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={0} inflow={-25} outflow={40} balance={-65} valueFormat={money} />);
  assert.match(html, /Entradas: R\$ -25\.00 — ver só as entradas/);
  assert.match(html, /Saídas: R\$ 40\.00 — ver só as saídas/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("BalanceBridge aceita zeros explícitos sem tratá-los como ausência", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={0} inflow={0} outflow={0} balance={0} valueFormat={money} />);
  assert.match(html, /Abertura: R\$ 0\.00/);
  assert.match(html, /Saldo atual: R\$ 0\.00/);
  assert.doesNotMatch(html, /indisponível/);
});

test("BalanceBridge falha fechado quando qualquer campo do servidor está ausente", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={100} inflow={null} outflow={20} balance={80} valueFormat={money} />);
  assert.match(html, /Saldo da conta indisponível/);
  assert.doesNotMatch(html, /<svg/);
});

test("BalanceBridge expõe grupo, dois filtros focáveis, aria-pressed e fiação de clique/teclado", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={100} inflow={50} outflow={20} balance={130} pressedDirection="in" onDirection={() => undefined} valueFormat={money} />);
  assert.match(html, /role="group" aria-label="De onde vem o saldo da conta"/);
  assert.equal((html.match(/role="button"/g) ?? []).length, 2);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 2);
  assert.match(html, /aria-pressed="true" aria-label="Entradas:/);
  const source = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/components/charts/BalanceBridge.tsx"), "utf8");
  assert.match(source, /onClick=\{\(\) => activate\(column\.direction!\)\}/);
  assert.match(source, /event\.key === "Enter" \|\| event\.key === " "/);
});

test("BalanceBridge usa o formato curto só no rótulo; o texto acessível mantém o valor inteiro", () => {
  const html = renderToStaticMarkup(<BalanceBridge openingBalance={100} inflow={50} outflow={20} balance={999} valueFormat={money} labelFormat={(value) => `curto ${value}`} />);
  assert.match(html, />curto 999</);
  assert.match(html, /Saldo atual: R\$ 999\.00/);
  assert.match(html, /saldo atual R\$ 999\.00/);
});
