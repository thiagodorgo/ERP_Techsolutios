import assert from "node:assert/strict";
import test from "node:test";

test("commissions adapter: extrato agregado (summary) normaliza envelope, snake_case e total geral explícito", async () => {
  const { adaptCommissionSummaryResponse } = await import("../src/modules/finance/commissions/commissions.adapter");

  const data = adaptCommissionSummaryResponse({
    data: {
      items: [
        { payeeId: "u1", total: 150.5, count: 3 },
        { payee_id: "u2", total: 49.5, count: 1 }, // snake_case aceito
        { total: 10, count: 9 }, // sem payeeId → descartada
      ],
      total: 200,
      from: "2026-06-01",
      to: "2026-06-30",
    },
  });

  assert.equal(data.source, "api");
  assert.equal(data.summary.items.length, 2); // linha sem payeeId é descartada
  assert.equal(data.summary.items[0].payeeId, "u1");
  assert.equal(data.summary.items[1].payeeId, "u2");
  assert.equal(data.summary.items[0].count, 3);
  // Total geral: usa o valor explícito do backend quando presente.
  assert.equal(data.summary.total, 200);
  assert.equal(data.summary.from, "2026-06-01");
  assert.equal(data.summary.to, "2026-06-30");
});

test("commissions adapter: total geral é derivado da soma quando ausente no payload", async () => {
  const { adaptCommissionSummaryResponse } = await import("../src/modules/finance/commissions/commissions.adapter");

  const data = adaptCommissionSummaryResponse({
    data: {
      items: [
        { payeeId: "u1", total: 150.5, count: 3 },
        { payeeId: "u2", total: 49.5, count: 1 },
      ],
    },
  });

  assert.equal(data.summary.total, 200); // 150.5 + 49.5
  assert.equal(data.summary.items.length, 2);
});

test("commissions adapter: my-summary (extrato próprio) tem o mesmo shape, uma linha", async () => {
  const { adaptCommissionSummaryResponse } = await import("../src/modules/finance/commissions/commissions.adapter");

  const data = adaptCommissionSummaryResponse({
    data: { items: [{ payeeId: "me", total: 75, count: 2 }], total: 75, from: "2026-06-01", to: "2026-06-30" },
  });

  assert.equal(data.summary.items.length, 1);
  assert.equal(data.summary.items[0].payeeId, "me");
  assert.equal(data.summary.items[0].count, 2);
  assert.equal(data.summary.total, 75);
});

test("commissions adapter: detalhamento por origem — sourceType/sourceId parseados, payeeId/calculatedAt tolerantes", async () => {
  const { adaptCommissionCalculationsResponse } = await import("../src/modules/finance/commissions/commissions.adapter");

  const data = adaptCommissionCalculationsResponse({
    data: {
      items: [
        { id: "c1", payeeId: "u1", amount: 50.25, status: "paid", sourceType: "work_order", sourceId: "wo-1", createdAt: "2026-06-10T12:00:00.000Z" },
        { id: "c2", amount: 10, status: "pending", source_type: "checklist_run", source_id: "chk-9", calculatedAt: "2026-06-11T12:00:00.000Z" }, // snake_case, sem payeeId
        { id: "c3", amount: 7, status: "paid" }, // sem origem alguma
        { amount: 5, status: "paid" }, // sem id → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 3 },
    },
  });

  assert.equal(data.items.length, 3); // linha sem id descartada
  // Origem OS.
  assert.equal(data.items[0].sourceType, "work_order");
  assert.equal(data.items[0].sourceId, "wo-1");
  assert.equal(data.items[0].payeeId, "u1");
  assert.equal(data.items[0].amount, 50.25);
  // Origem não-OS (snake_case); payeeId ausente → null; data cai para calculatedAt.
  assert.equal(data.items[1].sourceType, "checklist_run");
  assert.equal(data.items[1].sourceId, "chk-9");
  assert.equal(data.items[1].payeeId, null);
  assert.equal(data.items[1].createdAt, "2026-06-11T12:00:00.000Z");
  // Sem origem conhecida → sourceType/sourceId nulos.
  assert.equal(data.items[2].sourceType, null);
  assert.equal(data.items[2].sourceId, null);
  assert.equal(data.pagination.total, 3);
});

test("commissions adapter: origem só vira OS navegável quando sourceType=work_order (rótulo PT-BR nos demais)", async () => {
  const { adaptCommissionCalculationsResponse, getCommissionSourceLabel, isWorkOrderSource } = await import(
    "../src/modules/finance/commissions/commissions.adapter"
  );

  // Rótulos de origem: conhecidos mapeados; desconhecido humanizado; vazio → traço.
  assert.equal(getCommissionSourceLabel("work_order"), "Ordem de serviço");
  assert.equal(getCommissionSourceLabel("checklist_run"), "Checklist");
  assert.equal(getCommissionSourceLabel("payout_batch"), "Payout batch"); // desconhecido → humanizado
  assert.equal(getCommissionSourceLabel(null), "—");

  // Só work_order é destino navegável (link para /work-orders/:sourceId).
  assert.equal(isWorkOrderSource("work_order"), true);
  assert.equal(isWorkOrderSource("checklist_run"), false);
  assert.equal(isWorkOrderSource(null), false);

  // A regra de link derivada dos dados: work_order + id → alvo /work-orders/<id>; demais → sem link.
  const data = adaptCommissionCalculationsResponse({
    data: {
      items: [
        { id: "c1", amount: 40, status: "paid", sourceType: "work_order", sourceId: "wo-77" },
        { id: "c2", amount: 12, status: "paid", sourceType: "checklist_run", sourceId: "chk-3" },
      ],
    },
  });

  const os = data.items[0];
  const other = data.items[1];
  const osLink = isWorkOrderSource(os.sourceType) && os.sourceId ? `/work-orders/${os.sourceId}` : null;
  const otherLink = isWorkOrderSource(other.sourceType) && other.sourceId ? `/work-orders/${other.sourceId}` : null;
  assert.equal(osLink, "/work-orders/wo-77"); // OS → link navegável
  assert.equal(otherLink, null); // não-OS → sem link, só rótulo
  assert.equal(getCommissionSourceLabel(other.sourceType), "Checklist");
});

test("commissions adapter: work_order_id legado (sem sourceType) promove origem OS navegável", async () => {
  const { adaptCommissionCalculationsResponse, isWorkOrderSource } = await import("../src/modules/finance/commissions/commissions.adapter");

  const data = adaptCommissionCalculationsResponse({
    data: { items: [{ id: "c1", amount: 30, status: "paid", work_order_id: "wo-legacy" }] },
  });

  const calc = data.items[0];
  assert.equal(calc.workOrderId, "wo-legacy");
  // Fallback de compatibilidade: promove a origem OS para preservar o link navegável.
  assert.equal(calc.sourceType, "work_order");
  assert.equal(calc.sourceId, "wo-legacy");
  assert.equal(isWorkOrderSource(calc.sourceType), true);
});

test("commissions adapter: situação → rótulo PT-BR + tom (conhecidos mapeados, desconhecidos humanizados)", async () => {
  const { getCommissionStatusLabel, getCommissionStatusTone } = await import("../src/modules/finance/commissions/commissions.adapter");

  assert.equal(getCommissionStatusLabel("pending"), "Pendente");
  assert.equal(getCommissionStatusLabel("approved"), "Aprovada");
  assert.equal(getCommissionStatusLabel("paid"), "Paga");
  assert.equal(getCommissionStatusLabel("cancelled"), "Cancelada");
  assert.equal(getCommissionStatusLabel("reversed"), "Estornada");

  assert.equal(getCommissionStatusTone("pending"), "warning");
  assert.equal(getCommissionStatusTone("paid"), "success");
  assert.equal(getCommissionStatusTone("reversed"), "danger");
  assert.equal(getCommissionStatusTone("cancelled"), "audit");

  // Enum aberto: token desconhecido é humanizado (nunca cru) e cai em tom neutro.
  assert.equal(getCommissionStatusLabel("pending_review"), "Pending review");
  assert.equal(getCommissionStatusTone("pending_review"), "default");
  // Vazio → traço.
  assert.equal(getCommissionStatusLabel(""), "—");
  assert.equal(getCommissionStatusLabel(null), "—");
});

test("commissions adapter: BRL / contagem / período com fallback '—'", async () => {
  const { formatBRL, formatCommissionCount, formatPeriodLabel } = await import("../src/modules/finance/commissions/commissions.adapter");

  assert.match(formatBRL(1234.5), /R\$/);
  assert.equal(formatBRL(null), "—");
  assert.equal(formatBRL(undefined), "—");

  assert.equal(formatCommissionCount(7), "7");
  assert.equal(formatCommissionCount(null), "0");

  assert.match(formatPeriodLabel("2026-06-01", "2026-06-30"), /01\/06\/2026 – 30\/06\/2026/);
  assert.match(formatPeriodLabel("2026-06-01", ""), /A partir de/);
  assert.match(formatPeriodLabel("", "2026-06-30"), /Até/);
  assert.equal(formatPeriodLabel("", ""), "Todo o período");
});

test("commissions adapter: D-007 lista vazia/fallback preservados e query de período (from/to/payee_id/limit)", async () => {
  const { adaptCommissionSummaryResponse, adaptCommissionCalculationsResponse, buildCommissionsQuery } = await import(
    "../src/modules/finance/commissions/commissions.adapter"
  );

  // Fallback vazio preserva fonte/motivo sem fabricar linhas.
  const fallback = adaptCommissionSummaryResponse({ data: { items: [], total: 0 } }, "fallback", "sem dados");
  assert.equal(fallback.summary.items.length, 0);
  assert.equal(fallback.summary.total, 0);
  assert.equal(fallback.source, "fallback");
  assert.equal(fallback.fallbackReason, "sem dados");

  // Payload nulo/bare degrada para vazio sem lançar.
  const bare = adaptCommissionSummaryResponse(null);
  assert.equal(bare.summary.items.length, 0);
  assert.equal(bare.summary.total, 0);

  const bareCalc = adaptCommissionCalculationsResponse(null);
  assert.equal(bareCalc.items.length, 0);
  assert.equal(bareCalc.pagination.total, 0);

  // Query de período/operador/paginação.
  assert.equal(
    buildCommissionsQuery({ from: "2026-06-01", to: "2026-06-30", payeeId: "usr-1", limit: 200 }),
    "?from=2026-06-01&to=2026-06-30&payee_id=usr-1&limit=200",
  );
  assert.equal(buildCommissionsQuery({ from: "2026-06-01" }), "?from=2026-06-01");
  assert.equal(buildCommissionsQuery({}), ""); // sem filtros → sem query string
});

test("commissions adapter: escopo escolhe o endpoint — own → /calculations/mine (SEM payee_id), all → /calculations?payee_id", async () => {
  const { buildCalculationsPath } = await import("../src/modules/finance/commissions/commissions.adapter");

  // Escopo próprio (operador, read_own): endpoint /mine e NUNCA payee_id (servidor fixa o autor).
  const own = buildCalculationsPath("own", { from: "2026-06-01", to: "2026-06-30", limit: 200 });
  assert.match(own, /^\/commissions\/calculations\/mine\?/);
  assert.doesNotMatch(own, /payee_id/);
  assert.match(own, /from=2026-06-01/);
  assert.match(own, /to=2026-06-30/);

  // Mesmo se um payee_id vazar nos filtros, o escopo own o descarta (defesa contra 403 cruzado).
  const ownWithPayee = buildCalculationsPath("own", { payeeId: "usr-1", from: "2026-06-01" });
  assert.match(ownWithPayee, /^\/commissions\/calculations\/mine/);
  assert.doesNotMatch(ownWithPayee, /payee_id/);

  // Escopo total (finance/admin, read): rota geral filtrando pelo operador da linha.
  const all = buildCalculationsPath("all", { payeeId: "usr-1", from: "2026-06-01", to: "2026-06-30" });
  assert.match(all, /^\/commissions\/calculations\?/);
  assert.match(all, /payee_id=usr-1/);
  assert.doesNotMatch(all, /\/mine/);
});

test("commissions adapter: descritor de origem — OS vira link, não-OS só rótulo (sem id cru), sem tipo → none", async () => {
  const { describeCommissionOrigin } = await import("../src/modules/finance/commissions/commissions.adapter");

  // OS (work_order) com id → link navegável para /work-orders/:id.
  const os = describeCommissionOrigin("work_order", "wo-77");
  assert.equal(os.kind, "link");
  assert.equal(os.kind === "link" ? os.href : null, "/work-orders/wo-77");
  assert.equal(os.kind === "link" ? os.label : null, "Ordem de serviço");

  // Origem não-OS → apenas o rótulo PT-BR; NÃO há href e o rótulo não carrega o id.
  const other = describeCommissionOrigin("checklist_run", "chk-3");
  assert.equal(other.kind, "label");
  assert.equal("href" in other, false); // sem link morto
  assert.equal(other.kind === "label" ? other.label : null, "Checklist");
  assert.doesNotMatch(other.kind === "label" ? other.label : "", /chk-3/); // nenhum fragmento de id

  // OS sem id → não vira link morto; degrada para rótulo.
  const osNoId = describeCommissionOrigin("work_order", null);
  assert.equal(osNoId.kind, "label");
  assert.equal(osNoId.kind === "label" ? osNoId.label : null, "Ordem de serviço");

  // Sem tipo de origem conhecido → none ("—").
  assert.equal(describeCommissionOrigin(null, "x").kind, "none");
  assert.equal(describeCommissionOrigin("", null).kind, "none");
});
