import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { PLATFORM_HONEST_STOP as APIS_STOP, PlatformApisPage } from "../src/modules/platform/pages/PlatformApisPage";
import { PLATFORM_HONEST_STOP as AUDIT_STOP, PlatformAuditPage } from "../src/modules/platform/pages/PlatformAuditPage";
import { PLATFORM_HONEST_STOP as PLANS_STOP, PlatformPlansModulesPage } from "../src/modules/platform/pages/PlatformPlansModulesPage";
import { PLATFORM_HONEST_STOP as SETTINGS_STOP, PlatformSettingsPage } from "../src/modules/platform/pages/PlatformSettingsPage";

test("T21 Auditoria explica a parada com as duas trilhas", () => {
  const html = renderToString(<PlatformAuditPage />);
  assert.match(html, /Trilha global ainda sem fonte/);
  assert.match(html, /auditoria por organização/);
});

test("T22 Auditoria não preserva eventos, indicadores ou botões fabricados", () => {
  const html = renderToString(<PlatformAuditPage />);
  assert.doesNotMatch(html, /Field Operations LATAM|1\.284|Backup global|Exportar|Filtrar/);
});

test("T23 APIs e Credenciais explica que não há fonte administrativa", () => {
  const html = renderToString(<PlatformApisPage />);
  assert.match(html, /Gestão de credenciais ainda indisponível/);
  assert.match(html, /fonte administrativa/);
});

test("T24 APIs e Credenciais não oferece credencial ou rotação fictícia", () => {
  const html = renderToString(<PlatformApisPage />);
  assert.doesNotMatch(html, /Rotacionar|0x9f2a|Nova credencial/);
});

test("T25 Planos e Módulos explica a ausência de catálogo persistido", () => {
  const html = renderToString(<PlatformPlansModulesPage />);
  assert.match(html, /Catálogo comercial ainda sem fonte/);
  assert.match(html, /contrato persistido/);
});

test("T26 Planos e Módulos não anuncia preço ou oferta sem backend", () => {
  const html = renderToString(<PlatformPlansModulesPage />);
  assert.doesNotMatch(html, /R\$ 490|Mais vendido|Novo plano/);
});

test("T27 Configurações explica que nenhuma opção persistida existe", () => {
  const html = renderToString(<PlatformSettingsPage />);
  assert.match(html, /Configurações globais ainda sem fonte/);
  assert.doesNotMatch(html, /365 dias|MFA obrigatório|Salvar alterações|<input/);
});

test("T28 as quatro páginas declaram a parada honesta", () => {
  assert.equal(AUDIT_STOP, true);
  assert.equal(APIS_STOP, true);
  assert.equal(PLANS_STOP, true);
  assert.equal(SETTINGS_STOP, true);
});
