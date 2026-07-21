import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { PayableToggle, PayableToggleView } from "../src/modules/finance/payable-source/components/PayableToggle";
import { adaptPayableTitle } from "../src/modules/finance/payable-source/payable-source.service";
import type { PayableTitleView } from "../src/modules/finance/payable-source/payable-source.types";

// Ω4C PR-02 — PayableToggle ("Contas a Pagar por origem"): comportamento do AutEM (checkbox no cadastro +
// badge "lançado" + Lançar/Retirar na edição) no visual do ERP. Cobre modo create (checkbox), modo edit
// (badge DERIVADO do backend — title!=null, D-007; gating canLaunch/canRemove), estados §7
// (loading/acesso não permitido/dados desatualizados) e §3 PT-BR.

const LAUNCHED: PayableTitleView = {
  id: "ft-1",
  status: "open",
  amount: 312.9,
  currency: "BRL",
  dueDate: "2026-07-21T00:00:00.000Z",
  active: true,
};

type ViewProps = Parameters<typeof PayableToggleView>[0];

function renderView(overrides: Partial<ViewProps> = {}): string {
  const base: ViewProps = {
    title: null,
    loading: false,
    forbidden: false,
    source: "api",
    canLaunch: true,
    canRemove: true,
    busy: false,
    feedback: null,
    formOpen: false,
    partyName: "",
    amount: "",
    dueDate: "",
    formError: null,
    onOpenForm: () => {},
    onCancelForm: () => {},
    onPartyNameChange: () => {},
    onAmountChange: () => {},
    onDueDateChange: () => {},
    onLaunch: () => {},
    onRemove: () => {},
  };
  return renderToString(<PayableToggleView {...base} {...overrides} />);
}

// ── Modo CREATE ──────────────────────────────────────────────────────────────
test("modo create: renderiza o checkbox 'Gerar lançamento em contas a pagar'", () => {
  const html = renderToString(<PayableToggle mode="create" checked={false} onChange={() => {}} />);
  assert.match(html, /Gerar lançamento em contas a pagar/);
  assert.match(html, /type="checkbox"/);
});

test("modo create: o checkbox é controlado — reflete `checked` (binding de onChange)", () => {
  const marcado = renderToString(<PayableToggle mode="create" checked onChange={() => {}} />);
  assert.match(marcado, /checked=""/);
  const desmarcado = renderToString(<PayableToggle mode="create" checked={false} onChange={() => {}} />);
  assert.doesNotMatch(desmarcado, /checked=""/);
});

// ── Modo EDIT: badge derivado + ações gated ─────────────────────────────────
test("modo edit: title != null → badge 'Lançado em contas a pagar' verde (derivado do backend, D-007)", () => {
  const html = renderView({ title: LAUNCHED });
  assert.match(html, /Lançado em contas a pagar/);
  assert.match(html, /ui-tone-success/); // selo verde = sucesso
  // Detalhe derivado do próprio título (valor/vencimento/situação humanizada) — nunca enum cru.
  assert.match(html, /R\$/);
  assert.match(html, /Em aberto/);
  assert.doesNotMatch(html, />open</); // status cru não aparece como texto
});

test("modo edit: botão 'Retirar' gated por canRemove", () => {
  const comRetirar = renderView({ title: LAUNCHED, canRemove: true });
  assert.match(comRetirar, /Retirar/);

  const semRetirar = renderView({ title: LAUNCHED, canRemove: false });
  assert.doesNotMatch(semRetirar, /Retirar/);
});

test("modo edit: não lançado → botão 'Lançar em contas a pagar' gated por canLaunch", () => {
  const comLancar = renderView({ title: null, canLaunch: true });
  assert.match(comLancar, /Lançar em contas a pagar/);

  const semLancar = renderView({ title: null, canLaunch: false });
  assert.doesNotMatch(semLancar, /Lançar em contas a pagar/);
});

test("modo edit: mini-form aberto pede Fornecedor, Valor e Vencimento", () => {
  const html = renderView({ title: null, formOpen: true });
  assert.match(html, /Fornecedor/);
  assert.match(html, /Valor/);
  assert.match(html, /Vencimento/);
  assert.match(html, /Gerar lançamento/);
});

// ── Estados §7 ───────────────────────────────────────────────────────────────
test("estado §7 loading: skeleton (aria-busy) enquanto carrega e sem título", () => {
  const html = renderView({ loading: true, title: null });
  assert.match(html, /aria-busy="true"/);
});

test("estado §7 acesso não permitido: forbidden mostra 'Acesso não permitido' e esconde as ações", () => {
  const html = renderView({ forbidden: true, canLaunch: true });
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /Lançar em contas a pagar/);
});

test("estado §7 dados desatualizados: source=fallback mostra alerta honesto", () => {
  const html = renderView({ source: "fallback" });
  assert.match(html, /desatualizados/);
});

// ── §3 PT-BR (sem termo técnico) ────────────────────────────────────────────
test("§3 PT-BR: cópia de negócio ('Lançado'/'Lançar'/'Retirar'); sem 'Tenant'/'payable' cru na UI", () => {
  const lancado = renderView({ title: LAUNCHED });
  assert.match(lancado, /Lançado em contas a pagar/);
  assert.match(lancado, /Retirar/);
  assert.doesNotMatch(lancado, /Tenant/i);
  assert.doesNotMatch(lancado, /tenant_id/i);
  assert.doesNotMatch(lancado, /payable/i); // direction cru nunca vira texto

  const naoLancado = renderView({ title: null, canLaunch: true });
  assert.match(naoLancado, /Lançar em contas a pagar/);
});

// ── Adapter: badge DERIVADO do backend, nunca fabricado (D-007) + §2.8 ───────
test("adapter: sem id → null (D-007, badge só existe com título real do backend)", () => {
  assert.equal(adaptPayableTitle(null), null);
  assert.equal(adaptPayableTitle({}), null);
  assert.equal(adaptPayableTitle({ amount: 100 }), null); // sem id
});

test("adapter: TitleDTO real → PayableTitleView; §2.8 não projeta tenant_id nem campos fora da allow-list", () => {
  const view = adaptPayableTitle({
    id: "ft-9",
    direction: "payable",
    status: "scheduled",
    amount: 480,
    currency: "BRL",
    dueDate: "2026-08-01T00:00:00.000Z",
    sourceType: "fuel_log",
    sourceId: "fl-1",
    active: true,
    tenant_id: "ten-secret",
  });
  assert.ok(view);
  assert.equal(view.id, "ft-9");
  assert.equal(view.status, "scheduled");
  assert.equal(view.amount, 480);
  assert.equal(view.active, true);
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /tenant_id|ten-secret|sourceType|direction/i);
});
