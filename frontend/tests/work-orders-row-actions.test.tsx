import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

// Shim não-destrutivo (o service importa client.ts → auth.storage → localStorage).
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;

import {
  advanceLabel,
  canAdvanceRow,
  canRevokeDispatch,
  isActiveDispatch,
  isWorkOrderDelayed,
  nextForwardStatus,
} from "../src/modules/work-orders/work-orders-row.logic";
import { WorkOrderDelayBadge } from "../src/modules/work-orders/components/WorkOrderDelayBadge";
import { WorkOrderRowActions, WorkOrderRowMenu } from "../src/modules/work-orders/components/WorkOrderRowActions";
import { RevokeDispatchPrompt } from "../src/modules/work-orders/components/RevokeDispatchPrompt";
import type { WorkOrderStatus } from "../src/modules/work-orders/work-orders.types";
import type { DispatchStatus } from "../src/modules/operations/dispatches/dispatches.types";

// Ω3F-9 — ações de linha da lista de OS (dar andamento forward-only · revogar envio · badge de atraso).
// Fecha a Fase 1. Gates LIGADOS ao JSX (lição Ω3F-6). SSR via renderToString. Sem termo técnico na UI (§3).

const ALL_STATUSES: readonly WorkOrderStatus[] = [
  "open", "assigned", "accepted", "on_route", "on_site", "in_progress", "paused", "completed", "cancelled", "rejected",
];
const STATUS = (perm: string[]) => perm; // legibilidade

// =============================== A. Predicados puros ===============================

test("[A1] nextForwardStatus: mapa forward-only completo", () => {
  assert.equal(nextForwardStatus("assigned"), "accepted");
  assert.equal(nextForwardStatus("accepted"), "on_route");
  assert.equal(nextForwardStatus("on_route"), "on_site");
  assert.equal(nextForwardStatus("on_site"), "in_progress");
  assert.equal(nextForwardStatus("paused"), "in_progress");
});

test("[A2] nextForwardStatus: null para open, in_progress e terminais (nunca cancelar/concluir de 1 clique)", () => {
  for (const s of ["open", "in_progress", "completed", "cancelled", "rejected"] as WorkOrderStatus[]) {
    assert.equal(nextForwardStatus(s), null, `${s} não deve ter avanço de 1 clique`);
  }
});

test("[A3] advanceLabel: PT-BR do próximo estado, nunca o valor técnico", () => {
  assert.equal(advanceLabel("on_route"), "Dar andamento → No local");
  assert.equal(advanceLabel("assigned"), "Dar andamento → Aceita");
  assert.equal(advanceLabel("in_progress"), null);
  assert.doesNotMatch(String(advanceLabel("on_route")), /on_site|on_route/);
});

test("[A4] canAdvanceRow: exige work_orders:status E próximo válido", () => {
  assert.equal(canAdvanceRow(["work_orders:status"], "assigned"), true);
  assert.equal(canAdvanceRow([], "assigned"), false); // sem permissão
  assert.equal(canAdvanceRow(["work_orders:status"], "open"), false); // sem próximo
  assert.equal(canAdvanceRow(["work_orders:status"], "in_progress"), false);
  assert.equal(canAdvanceRow(["work_orders:status"], "completed"), false);
});

test("[A5] canRevokeDispatch: exige field_dispatch:cancel E status com envio possível", () => {
  for (const s of ["assigned", "accepted", "on_route", "on_site", "in_progress", "paused"] as WorkOrderStatus[]) {
    assert.equal(canRevokeDispatch(["field_dispatch:cancel"], s), true, `${s} deve permitir revogar`);
  }
  assert.equal(canRevokeDispatch([], "assigned"), false); // sem permissão
  for (const s of ["open", "completed", "cancelled", "rejected"] as WorkOrderStatus[]) {
    assert.equal(canRevokeDispatch(["field_dispatch:cancel"], s), false, `${s} não revoga`);
  }
});

test("[A6] isActiveDispatch: só completed/cancelled/failed são terminais (espelha o backend)", () => {
  for (const s of ["draft", "assigned", "accepted", "on_route", "arrived", "in_service", "reassigned"] as DispatchStatus[]) {
    assert.equal(isActiveDispatch(s), true, `${s} é ativo`);
  }
  for (const s of ["completed", "cancelled", "failed"] as DispatchStatus[]) {
    assert.equal(isActiveDispatch(s), false, `${s} é terminal`);
  }
});

// =============================== B. Badge de atraso ===============================

const PAST = "2020-01-01T09:00:00.000Z";
const NOW = new Date("2020-01-01T12:00:00.000Z").getTime(); // 3h depois
const NOW_2DAYS = new Date("2020-01-03T12:00:00.000Z").getTime(); // >24h depois
const FUTURE = "2999-01-01T09:00:00.000Z";

test("[B1] isWorkOrderDelayed: vencida + status ativo ⇒ atrasada (warn)", () => {
  const r = isWorkOrderDelayed(PAST, "assigned", NOW);
  assert.equal(r.delayed, true);
  assert.equal(r.severity, "warn");
});

test("[B2] isWorkOrderDelayed: vencida há mais de 24h ⇒ critical", () => {
  assert.equal(isWorkOrderDelayed(PAST, "assigned", NOW_2DAYS).severity, "critical");
});

test("[B3] isWorkOrderDelayed: agenda futura ⇒ não atrasada", () => {
  assert.equal(isWorkOrderDelayed(FUTURE, "assigned", NOW).delayed, false);
});

test("[B4] isWorkOrderDelayed: sem agenda ⇒ não atrasada", () => {
  assert.equal(isWorkOrderDelayed(null, "assigned", NOW).delayed, false);
  assert.equal(isWorkOrderDelayed(undefined, "assigned", NOW).delayed, false);
});

test("[B5] isWorkOrderDelayed: vencida mas finalizada ⇒ NÃO atrasada (badge some)", () => {
  for (const s of ["completed", "cancelled", "rejected"] as WorkOrderStatus[]) {
    assert.equal(isWorkOrderDelayed(PAST, s, NOW).delayed, false, `${s} não mostra atraso`);
  }
});

test("[B6] WorkOrderDelayBadge: renderiza 'Atrasada' (âmbar/vermelho); some quando não atrasada", () => {
  const warn = renderToString(<WorkOrderDelayBadge scheduledFor={PAST} status="assigned" now={NOW} />);
  assert.match(warn, /Atrasada/);
  assert.match(warn, /#D97706/); // âmbar (warn)
  assert.doesNotMatch(warn, /restantes/); // nunca "Xh restantes" (sem campo de prazo real)

  const crit = renderToString(<WorkOrderDelayBadge scheduledFor={PAST} status="assigned" now={NOW_2DAYS} />);
  assert.match(crit, /#DC2626/); // vermelho (critical)

  const none = renderToString(<WorkOrderDelayBadge scheduledFor={FUTURE} status="assigned" now={NOW} />);
  assert.equal(none, "");
});

// =============================== C. Ações LIGADAS ao JSX ===============================

function renderActions(status: WorkOrderStatus, permissions: string[]) {
  return renderToString(
    <WorkOrderRowActions status={status} permissions={permissions} onOpen={() => {}} onAdvance={() => {}} onRevoke={() => {}} />,
  );
}

test("[C1] com work_orders:status e status avançável ⇒ botão de andamento com rótulo PT-BR do próximo", () => {
  const html = renderActions("on_route", STATUS(["work_orders:status"]));
  assert.match(html, /Dar andamento → No local/); // aria-label
  assert.match(html, /Abrir/);
});

test("[C2] sem work_orders:status ⇒ botão de andamento AUSENTE (não só disabled)", () => {
  const html = renderActions("on_route", STATUS([]));
  assert.doesNotMatch(html, /Dar andamento/);
  assert.match(html, /Abrir/); // Abrir sempre presente
});

test("[C3] open/in_progress ⇒ sem andamento mesmo com permissão (só 'Abrir')", () => {
  for (const s of ["open", "in_progress"] as WorkOrderStatus[]) {
    const html = renderActions(s, STATUS(["work_orders:status"]));
    assert.doesNotMatch(html, /Dar andamento/, `${s} não avança de 1 clique`);
  }
});

test("[C4] com field_dispatch:cancel e status revogável ⇒ gatilho ⋮ 'Mais ações' presente", () => {
  const html = renderActions("assigned", STATUS(["field_dispatch:cancel"]));
  assert.match(html, /Mais ações/);
});

test("[C5] sem field_dispatch:cancel ⇒ gatilho ⋮ AUSENTE (gate ligado ao JSX)", () => {
  const html = renderActions("assigned", STATUS(["work_orders:status"]));
  assert.doesNotMatch(html, /Mais ações/);
});

test("[C6] gates independentes: só andamento / só revogar / ambos / nenhum", () => {
  const onlyAdvance = renderActions("on_route", ["work_orders:status"]);
  assert.match(onlyAdvance, /Dar andamento/);
  assert.doesNotMatch(onlyAdvance, /Mais ações/);

  const onlyRevoke = renderActions("on_route", ["field_dispatch:cancel"]);
  assert.doesNotMatch(onlyRevoke, /Dar andamento/);
  assert.match(onlyRevoke, /Mais ações/);

  const both = renderActions("on_route", ["work_orders:status", "field_dispatch:cancel"]);
  assert.match(both, /Dar andamento/);
  assert.match(both, /Mais ações/);

  const none = renderActions("on_route", []);
  assert.doesNotMatch(none, /Dar andamento/);
  assert.doesNotMatch(none, /Mais ações/);
});

test("[C7] erro por-linha aparece inline sem depender de permissão", () => {
  const html = renderToString(
    <WorkOrderRowActions status="assigned" permissions={[]} error="Não foi possível dar andamento agora." onOpen={() => {}} onAdvance={() => {}} onRevoke={() => {}} />,
  );
  assert.match(html, /Não foi possível dar andamento agora\./);
});

// =============================== D. Menu e prompt de revogar ===============================

test("[D1] WorkOrderRowMenu: item 'Revogar envio' presente (componente puro, testado direto)", () => {
  const html = renderToString(<WorkOrderRowMenu onRevoke={() => {}} />);
  assert.match(html, /Revogar envio/);
});

test("[D2] RevokeDispatchPrompt: exige motivo (textarea + botões), sem termo técnico", () => {
  const html = renderToString(
    <RevokeDispatchPrompt workOrderCode="OS-000101" submitting={false} onConfirm={() => {}} onClose={() => {}} />,
  );
  assert.match(html, /<textarea/);
  assert.match(html, /Revogar envio/);
  assert.match(html, /Voltar/);
  assert.match(html, /Motivo/);
  // §3: fala "envio", nunca o termo técnico
  assert.doesNotMatch(html, /despacho|dispatch|cancelled/i);
});

test("[D3] RevokeDispatchPrompt: motivo vazio começa com botão desabilitado", () => {
  const html = renderToString(
    <RevokeDispatchPrompt workOrderCode="OS-1" submitting={false} onConfirm={() => {}} onClose={() => {}} />,
  );
  assert.match(html, /disabled/); // "Revogar envio" nasce disabled sem motivo
});

// =============================== E. §3 — sem termo técnico na UI ===============================

test("[E1] linha de ação não vaza permissão/status técnico cru", () => {
  const html = renderActions("on_route", ["work_orders:status", "field_dispatch:cancel"]);
  assert.doesNotMatch(html, /work_orders:status|field_dispatch|on_route|on_site\b/);
});

// =============================== F. Service — não engole erro + contrato ===============================

test("[F1] advanceWorkOrderStatus: envia PATCH /status com o próximo status", async () => {
  const { advanceWorkOrderStatus } = await import("../src/modules/work-orders/work-orders.service");
  const original = globalThis.fetch;
  let url = "";
  let method = "";
  let body: Record<string, unknown> = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    url = String(input);
    method = String(init?.method);
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { id: "wo-1" } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    await advanceWorkOrderStatus({}, "wo-1", "accepted");
    assert.match(url, /\/work-orders\/wo-1\/status$/);
    assert.equal(method, "PATCH");
    assert.equal(body.status, "accepted");
  } finally {
    globalThis.fetch = original;
  }
});

test("[F2] advanceWorkOrderStatus: PROPAGA o 409 (não engole — a linha precisa do erro)", async () => {
  const { advanceWorkOrderStatus } = await import("../src/modules/work-orders/work-orders.service");
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("conflict", { status: 409 })) as typeof fetch;
  try {
    await assert.rejects(() => advanceWorkOrderStatus({}, "wo-1", "accepted"));
  } finally {
    globalThis.fetch = original;
  }
});

test("[F3] findActiveDispatch: devolve o despacho ATIVO; null quando só há terminais/vazio", async () => {
  const { findActiveDispatch } = await import("../src/modules/work-orders/active-dispatch.service");
  const original = globalThis.fetch;
  const reply = (items: unknown[]) =>
    (async () => new Response(JSON.stringify({ data: items }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

  try {
    globalThis.fetch = reply([{ id: "d1", workOrderId: "wo-1", operatorUserId: "u1", status: "assigned", priority: "high", createdAt: PAST }]);
    const active = await findActiveDispatch({}, "wo-1");
    assert.equal(active?.id, "d1");

    globalThis.fetch = reply([{ id: "d2", workOrderId: "wo-1", operatorUserId: "u1", status: "cancelled", priority: "high", createdAt: PAST }]);
    assert.equal(await findActiveDispatch({}, "wo-1"), null);

    globalThis.fetch = reply([]);
    assert.equal(await findActiveDispatch({}, "wo-1"), null);
  } finally {
    globalThis.fetch = original;
  }
});

// Sanidade: todos os status conhecidos passam pelos predicados sem lançar.
test("[G1] predicados são totais sobre WorkOrderStatus", () => {
  for (const s of ALL_STATUSES) {
    assert.doesNotThrow(() => canAdvanceRow(["work_orders:status"], s));
    assert.doesNotThrow(() => canRevokeDispatch(["field_dispatch:cancel"], s));
    assert.doesNotThrow(() => isWorkOrderDelayed(PAST, s, NOW));
  }
});
