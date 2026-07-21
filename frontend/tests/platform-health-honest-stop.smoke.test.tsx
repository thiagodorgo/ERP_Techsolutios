import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

// PR-SCALE-5b — a tela "Saúde do Sistema" da plataforma é telemetria de infra que exige observabilidade
// (Onda 5-6). Por CLAUDE.md §2.8 / D-007 ela NÃO pode fabricar métrica nem status de serviço. Este teste
// prova o estado honesto e a AUSÊNCIA dos números/serviços fabricados que existiam antes (128 ms, 99,98%,
// "Redis Degradado", etc.). A página é estática (sem providers/fetch), então renderToString direto basta.

async function renderHealth(): Promise<string> {
  const { PlatformHealthPage } = await import("../src/modules/platform/pages/PlatformHealthPage");
  return renderToString(<PlatformHealthPage />);
}

test("saúde da plataforma: mostra parada honesta e NÃO fabrica telemetria", async () => {
  const html = await renderHealth();

  // estado honesto presente
  assert.match(html, /Monitoramento em preparação/);
  assert.match(html, /observabilidade/);
  assert.match(html, /Saúde do Sistema/);

  // AUSÊNCIA da telemetria fabricada antiga
  assert.doesNotMatch(html, /128 ms/);
  assert.doesNotMatch(html, /99,98%/);
  assert.doesNotMatch(html, /Degradado/); // status de serviço fabricado
  assert.doesNotMatch(html, /API Gateway|PostgreSQL|Redis/); // serviços com status inventado
  assert.doesNotMatch(html, /Último backup/);
});

test("saúde da plataforma: sem termo técnico em inglês na UI (§3)", async () => {
  const html = await renderHealth();
  // o título usa "Saúde do Sistema", não "Health"
  assert.doesNotMatch(html, /Health do Sistema/);
});
