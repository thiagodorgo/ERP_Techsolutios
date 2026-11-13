import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptFinancialTitlesResponse,
  formatCompactBRL,
  formatDueDate,
  getTitleStatusLabel,
  parseAmountInput,
} from "../src/modules/finance/titles/financial-titles.adapter";
import type { FinancialTitleStatus } from "../src/modules/finance/titles/financial-titles.types";

const ALL_STATUSES: readonly FinancialTitleStatus[] = ["open", "scheduled", "partially_paid", "paid", "in_dispute", "cancelled"];

// =============================== A. Adapter — leitura defensiva + overdue passthrough ===============================

test("[A1] adapta o envelope { data: { items, pagination } } (snake/camel) e descarta linha sem campo essencial", () => {
  const data = adaptFinancialTitlesResponse({
    data: {
      items: [
        { id: "t1", direction: "receivable", party_type: "customer", party_name: "Indústria Alfa", amount: 24800, due_date: "2026-06-18T00:00:00.000Z", status: "open", competencia: "2026-06", overdue: false, active: true },
        { id: "t2", direction: "payable", partyType: "supplier", partyName: "Fornecedor Delta", amount: 8400, dueDate: "2026-06-20T00:00:00.000Z", status: "scheduled", competencia: "2026-06", overdue: false, active: true },
        { id: "x", direction: "receivable", party_type: "customer", party_name: "Sem status" }, // sem status/due_date → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].partyName, "Indústria Alfa");
  assert.equal(data.items[1].direction, "payable");
  assert.equal(data.pagination.total, 2);
});

test("[A2] overdue vem PRONTO do backend — o front NÃO recalcula (flag mandado, não a data)", () => {
  const data = adaptFinancialTitlesResponse([
    // overdue=true com vencimento FUTURO: se o front recalculasse, seria false. Prova o passthrough.
    { id: "a", direction: "receivable", party_type: "customer", party_name: "A", amount: 10, due_date: "2999-01-01T00:00:00.000Z", status: "open", competencia: "2026-06", overdue: true, active: true },
    // overdue=false com vencimento PASSADO: passthrough do false.
    { id: "b", direction: "receivable", party_type: "customer", party_name: "B", amount: 10, due_date: "2000-01-01T00:00:00.000Z", status: "open", competencia: "2000-01", overdue: false, active: true },
  ]);
  assert.equal(data.items.find((t) => t.id === "a")?.overdue, true);
  assert.equal(data.items.find((t) => t.id === "b")?.overdue, false);
});

// =============================== B. Humanização — sem enum cru ===============================

test("[B1] status humanizado em PT-BR (nunca o enum cru)", () => {
  const labels = ALL_STATUSES.map((s) => getTitleStatusLabel(s));
  assert.deepEqual(labels, ["Em aberto", "Agendado", "Parcial", "Pago", "Em contestação", "Cancelado"]);
  for (const s of ALL_STATUSES) assert.doesNotMatch(getTitleStatusLabel(s), /_|receivable|payable|open|paid|dispute/);
});

test("[B2] due_date ISO vira dd/mm", () => {
  assert.equal(formatDueDate("2026-06-18T00:00:00.000Z"), "18/06");
});

test("[B3] formatCompactBRL bate com o padrão do PNG (derivado da soma real)", () => {
  assert.equal(formatCompactBRL(184000), "R$ 184k");
  assert.equal(formatCompactBRL(11500), "R$ 11,5k");
  assert.equal(formatCompactBRL(8200), "R$ 8,2k");
  assert.equal(formatCompactBRL(1_250_000), "R$ 1,3M");
  assert.equal(formatCompactBRL(0), "R$ 0");
});

test("[pós-análise] parseAmountInput aceita vírgula decimal pt-BR", () => {
  assert.equal(parseAmountInput("150,50"), 150.5); // vírgula decimal → ponto
  assert.equal(parseAmountInput("1234.56"), 1234.56); // ponto decimal direto
  assert.equal(parseAmountInput("42"), 42);
});
