import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";

// B-SAN3-25 (item 50 do portão) — a web fatura a OS. Testes do modelo PURO, do SSR do diálogo e da aba e da guarda
// [G-INVOICE] (plano v2 §4.2 e §4.3, Emenda 1 §E1.4). Cada caso importa o código novo DENTRO do teste: sem o modelo, o
// caso fica vermelho por importação, e os casos que só leem o disco (A3, A7) rodam mesmo assim (vermelho-controle da A0).
// As frases esperadas estão escritas aqui, literalmente, como no plano: o teste compara a tela com o texto do plano, e
// não com a própria lista do modelo.
// Roda com cwd `frontend` (R-FORMA, §2.6): `(cd frontend && node --test --import tsx tests/b-san3-25-faturar-os.smoke.test.tsx)`.

const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(FRONT, "src");
const WO = path.join(SRC, "modules/work-orders");

const loadModel = () => import("../src/modules/work-orders/work-order-invoice.model");
const loadDialog = () => import("../src/modules/work-orders/components/InvoiceWorkOrderDialog");
const loadTab = () => import("../src/modules/work-orders/components/tabs/FinancialTab");

const CTX = { tenantId: "org-1", token: "tok" };
const FINANCE = [
  "work_orders:read",
  "work_order_financials:read",
  "work_order_financials:create",
  "work_order_financials:update",
  "financial_titles:read",
  "financial_titles:create",
];

type ItemOver = Record<string, unknown>;
// O item JÁ adaptado pelo serviço (forma do front, `financials.types.ts`).
const item = (over: ItemOver = {}) => ({
  id: "it-1",
  workOrderId: "wo-1",
  tariffId: null,
  priceTableId: null,
  description: "Guincho leve",
  quantity: 1,
  unitAmount: 60,
  totalAmount: 60,
  currency: "BRL",
  source: "manual" as const,
  notes: null,
  invoiced: false,
  invoicedAt: null,
  titleId: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  ...over,
});
const invoicedItem = (over: ItemOver = {}) => item({ invoiced: true, invoicedAt: "2026-11-02T12:00:00.000Z", titleId: "t-1", ...over });

const FIRST = { items: [item({ id: "it-a", description: "Guincho leve", totalAmount: 60 }), item({ id: "it-b", description: "Pedágio", totalAmount: 40 })], totalAmount: 100, currency: "BRL" };
const DELTA = {
  items: [invoicedItem({ id: "it-a", description: "Guincho leve", totalAmount: 60 }), item({ id: "it-c", description: "Diária de pátio", totalAmount: 35 })],
  totalAmount: 95,
  currency: "BRL",
};

// ---------------------------------------------------------------- A1 · permissão e visibilidade

test("[A1] invoiceActionState: finance com 2 pendentes vê; sem financial_titles:create, com OS cancelada ou tudo faturado não vê; a permissão vem de INVOICE_PERMISSION", async () => {
  const { invoiceActionState, INVOICE_PERMISSION } = await loadModel();
  assert.equal(INVOICE_PERMISSION, "financial_titles:create", "a permissão que a rota compara (work-order-financial.routes.ts:28)");

  const visible = invoiceActionState(FIRST, FINANCE, "completed");
  assert.equal(visible.visible, true, "finance com 2 pendentes vê o botão");
  assert.equal(visible.pendingItems.length, 2, "os 2 pendentes vão para a confirmação");

  assert.equal(invoiceActionState(FIRST, [INVOICE_PERMISSION], "open").visible, true, "só a permissão de faturar basta");
  const semFaturar = FINANCE.filter((permission) => permission !== "financial_titles:create");
  assert.equal(invoiceActionState(FIRST, semFaturar, "completed").visible, false, "sem financial_titles:create não vê (o gerente)");
  assert.equal(invoiceActionState(FIRST, FINANCE, "cancelled").visible, false, "OS cancelada não fatura (service.ts:422)");
  assert.equal(invoiceActionState(FIRST, FINANCE, undefined).visible, true, "sem a situação da OS, quem decide é o servidor (Q1 = A)");

  const allInvoiced = { items: [invoicedItem({ id: "it-a" }), invoicedItem({ id: "it-b" })], totalAmount: 100, currency: "BRL" };
  assert.equal(invoiceActionState(allInvoiced, FINANCE, "completed").visible, false, "tudo faturado: botão some");
  assert.equal(invoiceActionState({ items: [], totalAmount: 0, currency: "BRL" }, FINANCE, "completed").visible, false, "sem item: botão some");
  assert.equal(invoiceActionState(DELTA, FINANCE, "completed").pendingItems.length, 1, "no complementar, só o pendente vai para a confirmação");
});

// ---------------------------------------------------------------- A2 · valor do título no 1º faturamento

test("[A2] originalAmount: no 1º faturamento é o totalAmount do servidor; com item faturado é null; o SSR do diálogo mostra 'Valor do título' só no 1º", async () => {
  const { invoiceActionState, formatMoney } = await loadModel();
  const { InvoiceWorkOrderDialog } = await loadDialog();

  const first = invoiceActionState(FIRST, FINANCE, "completed");
  assert.equal(first.originalAmount, 100, "1º faturamento: o total do servidor, sem soma no front");
  const delta = invoiceActionState(DELTA, FINANCE, "completed");
  assert.equal(delta.originalAmount, null, "complementar: a tela não mostra total antes (P-SAN3-25-PREVIA-DO-COMPLEMENTAR)");

  const render = (state: { pendingItems: readonly unknown[]; originalAmount: number | null }, os: { code?: string; title?: string } = { code: "OS-77", title: "Reboque" }) =>
    renderToString(
      <InvoiceWorkOrderDialog
        context={CTX}
        workOrderId="wo-1"
        workOrderCode={os.code}
        workOrderTitle={os.title}
        pendingItems={state.pendingItems as never}
        originalAmount={state.originalAmount}
        currency="BRL"
        onInvoiced={() => undefined}
        onFailed={() => undefined}
        onClose={() => undefined}
      />,
    );
  const firstHtml = render(first);
  assert.match(firstHtml, /Faturar ordem de serviço/, "título do diálogo");
  assert.match(firstHtml, /Faturar cria um título a receber para o cliente desta OS\. Os itens faturados não podem mais ser editados nem excluídos\./, "aviso fixo");
  assert.match(firstHtml, /Valor do título/, "1º faturamento mostra o valor do título");
  assert.ok(firstHtml.includes(formatMoney(100, "BRL")), "o valor mostrado é o total do servidor");
  assert.match(firstHtml, /Vencimento/, "campo de vencimento");
  assert.match(firstHtml, /em 30 dias \(padrão\)/, "ajuda do vencimento vazio");
  assert.match(firstHtml, /Guincho leve/, "itens pendentes listados");
  assert.match(firstHtml, /Pedágio/, "itens pendentes listados");

  const deltaHtml = render(delta);
  assert.doesNotMatch(deltaHtml, /Valor do título/, "complementar não mostra total");
  assert.match(deltaHtml, /O valor do título é a soma destes itens, calculada pelo servidor no faturamento\./, "frase do complementar");
  assert.match(deltaHtml, /Diária de pátio/, "o pendente do complementar");
  assert.doesNotMatch(deltaHtml, /Guincho leve/, "o item já faturado não volta na confirmação");

  // Emenda 2 (E2.2): o subtítulo "<código> · <título da OS>", com os valores da OS; sem título, só o código.
  assert.ok(firstHtml.includes(">OS-77 · Reboque<"), "subtítulo com o código e o título da OS");
  const noTitle = render(first, { code: "OS-77", title: "" });
  assert.ok(noTitle.includes(">OS-77<"), "sem título, o subtítulo é só o código");
  assert.ok(!noTitle.includes("OS-77 ·"), "sem título, nada de separador pendurado");
});

// ---------------------------------------------------------------- A3 · a tela não soma dinheiro

const A3_FILES = [
  "work-order-invoice.model.ts",
  "components/InvoiceWorkOrderDialog.tsx",
  "financials.service.ts",
  "financials.types.ts",
  "components/tabs/FinancialTab.tsx",
  "pages/WorkOrderDetailPage.tsx",
];
const A3_ALTERED = ["financials.service.ts", "financials.types.ts", "components/tabs/FinancialTab.tsx", "pages/WorkOrderDetailPage.tsx"];

/** Comentários fora, na forma da F8 de `finance-no-money-reduce.guard.test.ts`. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
const REDUCE_TOKEN = /\.\s*reduce\s*(?:<[^<>()]*>\s*)?\(/g;
const MONEY_PLUS_EQUALS = /([\w$.\]?]*(?:amount|total)[\w$]*)\s*\+=/gi;

test("[A3] sem soma de dinheiro na tela: nos arquivos novos e alterados de work-orders/, 0 `.reduce(` e 0 `+=` sobre identificador com amount/total", (t) => {
  const scanned = A3_FILES.filter((rel) => existsSync(path.join(WO, rel)));
  t.diagnostic(`[A3] varridos=${scanned.length}/${A3_FILES.length}: ${scanned.join(", ")}`);
  for (const rel of A3_ALTERED) assert.ok(scanned.includes(rel), `arquivo alterado presente na varredura: ${rel}`);
  const hits: string[] = [];
  for (const rel of scanned) {
    const code = stripComments(readFileSync(path.join(WO, rel), "utf8").replace(/\r\n/g, "\n"));
    for (const match of code.matchAll(REDUCE_TOKEN)) hits.push(`${rel}: .reduce( em ${match.index}`);
    for (const match of code.matchAll(MONEY_PLUS_EQUALS)) hits.push(`${rel}: ${match[1]} +=`);
  }
  assert.deepEqual(hits, [], "a tela não soma dinheiro: todo valor exibido vem do servidor");
});

// ---------------------------------------------------------------- A4 · um envio por vez (modelo)

test("[A4] createInvoiceSubmitter: dois submit() sem aguardar → invoice chamado 1 vez; o 2º devolve ignored; depois do fim a trava solta", async () => {
  const { createInvoiceSubmitter } = await loadModel();
  const bodies: unknown[] = [];
  let release: (() => void) | null = null;
  const RESULT = {
    title: { id: "t-1", amount: 100, currency: "BRL", status: "open" as const, dueDate: "2026-12-13T00:00:00.000Z", parentTitleId: null, overdue: false },
    invoicedTotal: 100,
    currency: "BRL",
    invoicedItemCount: 2,
  };
  const submit = createInvoiceSubmitter({
    invoice: (body) => {
      bodies.push(body);
      return new Promise((resolve) => {
        release = () => resolve(RESULT);
      });
    },
  });
  const first = submit();
  const second = submit("2026-12-31");
  // Conta ANTES de aguardar: sem a trava, o 2º envio chama invoice na hora e fica preso (o teste reprova aqui, sem travar).
  assert.equal(bodies.length, 1, "invoice chamado 1 vez");
  assert.deepEqual(await second, { kind: "ignored" }, "o 2º envio em voo é ignorado");
  assert.ok(release, "o 1º envio está preso");
  release!();
  const done = await first;
  assert.equal(done.kind, "invoiced", "o 1º termina com o resultado do servidor");
  const third = submit("2026-12-31");
  release!();
  await third;
  assert.equal(bodies.length, 2, "depois do fim, um novo clique envia de novo");
  assert.deepEqual(bodies, [{}, { due_date: "2026-12-31" }], "corpo vazio sem data; due_date com data (Q2 = A)");
});

// ---------------------------------------------------------------- A5 · a lista fechada de desfechos

// §3.3 do v2 (14 linhas) + §E1.4 da Emenda 1 (4 linhas): frase, relê, repete, fica aberto.
const EXPECTED_OUTCOMES: Readonly<Record<string, { message: string; reload: boolean; retry: boolean; keepOpen: boolean }>> = {
  "409 already_invoiced": { message: "Esta OS já foi faturada e não há item novo para faturar.", reload: true, retry: false, keepOpen: false },
  "422 nothing_to_invoice": { message: "Não há item a faturar nesta OS.", reload: true, retry: false, keepOpen: false },
  "422 work_order_cancelled": { message: "Esta OS está cancelada e não pode ser faturada.", reload: true, retry: false, keepOpen: false },
  "422 period_closed": { message: "O mês atual está fechado no Financeiro. O faturamento volta depois da reabertura do período.", reload: false, retry: false, keepOpen: false },
  "409 invoice_items_changed": { message: "Os itens mudaram enquanto você faturava, e nada foi faturado. Confira a lista e tente de novo.", reload: true, retry: false, keepOpen: false },
  "503 invoice_transient_conflict": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "503 tenant_modules_unavailable": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "400 invalid_due_date": { message: "Informe uma data de vencimento válida.", reload: false, retry: false, keepOpen: true },
  "400 invalid_currency": { message: "Esta OS tem itens em moeda diferente do real, e o faturamento só aceita real.", reload: false, retry: false, keepOpen: false },
  "422 amount_overflow": { message: "O valor desta OS passa do limite aceito para um título.", reload: false, retry: false, keepOpen: false },
  "404 work_order_not_found": { message: "Esta OS não foi encontrada. Ela pode ter sido removida.", reload: false, retry: false, keepOpen: false },
  "403 permission_required": { message: "Seu perfil não permite faturar.", reload: false, retry: false, keepOpen: false },
  "403 role_required": { message: "Seu perfil não permite faturar.", reload: false, retry: false, keepOpen: false },
  "403 module_not_enabled": { message: "O Financeiro não está habilitado nesta organização.", reload: false, retry: false, keepOpen: false },
  "401 session_inactive": { message: "Sua sessão terminou, e nada foi faturado. Entre de novo para faturar.", reload: false, retry: false, keepOpen: false },
  "503 session_check_unavailable": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "403 password_change_required": { message: "Troque a sua senha antes de faturar. Nada foi faturado.", reload: false, retry: false, keepOpen: false },
  "400 invalid_json": { message: "O pedido de faturamento chegou com defeito, e nada foi faturado. Recarregue a página e tente de novo.", reload: false, retry: false, keepOpen: false },
};
const GENERIC = { message: "Não foi possível confirmar o faturamento. Confira a lista abaixo antes de tentar de novo.", reload: true, retry: false, keepOpen: false };

test("[A5] invoiceOutcome: cada uma das 18 linhas da lista fechada dá a frase, o relê, o repete e o fica-aberto do plano; fora da lista, a genérica com releitura", async () => {
  const { invoiceOutcome, INVOICE_UI_REASONS, INVOICE_REASONS_OUT_OF_SCOPE, INVOICE_GENERIC_OUTCOME } = await loadModel();
  const { ApiError } = await import("../src/services/api/client");

  assert.deepEqual(Object.keys(INVOICE_UI_REASONS).sort(), Object.keys(EXPECTED_OUTCOMES).sort(), "a lista fechada tem exatamente os 18 pares do plano");
  for (const [key, expected] of Object.entries(EXPECTED_OUTCOMES)) {
    const [status, reason] = key.split(" ");
    assert.deepEqual(invoiceOutcome({ status: Number(status), reason }), expected, `desfecho de ${key}`);
    // Pela forma do erro real do cliente (`client.ts:10-20`), sem instanceof.
    assert.deepEqual(invoiceOutcome(new ApiError(Number(status), "x", "CODE", reason)), expected, `desfecho de ${key} via ApiError`);
  }

  assert.deepEqual(INVOICE_GENERIC_OUTCOME, GENERIC, "a frase genérica não afirma que nada foi faturado, e relê");
  assert.deepEqual(invoiceOutcome(new TypeError("fetch failed")), GENERIC, "rede");
  assert.deepEqual(invoiceOutcome({ status: 500 }), GENERIC, "5xx sem motivo");
  assert.deepEqual(invoiceOutcome({ status: 401 }), GENERIC, "401 sem motivo (INVALID_TOKEN)");
  assert.deepEqual(invoiceOutcome({ status: 409, reason: "x_motivo_novo" }), GENERIC, "par fora da lista");
  assert.deepEqual(invoiceOutcome({ status: 403, reason: "tenant_not_found" }), GENERIC, "403 do gate fora da lista não vira 'perfil'");
  assert.deepEqual(invoiceOutcome({ status: 422, reason: "already_invoiced" }), GENERIC, "a chave é (status, motivo): o motivo com outro status não casa");
  assert.deepEqual(invoiceOutcome({ status: 409, reason: "constructor" }), GENERIC, "chave herdada do protótipo não casa");
  assert.deepEqual(invoiceOutcome(null), GENERIC, "erro sem forma");

  const outKeys = Object.keys(INVOICE_REASONS_OUT_OF_SCOPE);
  assert.ok(outKeys.length > 0, "há pares fora do escopo, cada um com o porquê");
  for (const key of outKeys) {
    assert.match(key, /^\d{3} [a-z_]+$/, `chave (status, motivo): ${key}`);
    assert.ok(!(key in EXPECTED_OUTCOMES), `fora do escopo não está na lista da tela: ${key}`);
    assert.ok(String(INVOICE_REASONS_OUT_OF_SCOPE[key]).trim().length > 10, `porquê escrito: ${key}`);
    const [status, reason] = key.split(" ");
    assert.deepEqual(invoiceOutcome({ status: Number(status), reason }), GENERIC, `fora do escopo recebe a genérica: ${key}`);
  }
});

// ---------------------------------------------------------------- A7 · [G-INVOICE]

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
const relFront = (file: string) => path.relative(FRONT, file).replaceAll("\\", "/");
// A rota de faturamento da OS: um literal que TERMINA em `/invoice` (aspas, crase ou `?` logo depois). O `/finance/invoices`
// do `App.tsx:654` termina em `invoices` e não casa.
const INVOICE_ROUTE = /\/invoice(?=["'`?])/g;
const INVOICE_CALL = /\binvoiceWorkOrder\s*\(/g;
const INVOICE_DEFINITION = /function\s+invoiceWorkOrder\s*\(/g;

function invoiceSites() {
  const routes: string[] = [];
  const calls: string[] = [];
  for (const file of sources(SRC)) {
    const code = stripComments(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    const rel = relFront(file);
    for (const _ of code.matchAll(INVOICE_ROUTE)) routes.push(rel);
    const definitions = [...code.matchAll(INVOICE_DEFINITION)].length;
    const total = [...code.matchAll(INVOICE_CALL)].length;
    for (let i = 0; i < total - definitions; i += 1) calls.push(rel);
  }
  return { routes, calls };
}

test("[A7] [G-INVOICE] exclusividade: em frontend/src a rota de faturamento da OS só é montada em financials.service.ts, e invoiceWorkOrder( só é chamada em InvoiceWorkOrderDialog.tsx", (t) => {
  const { routes, calls } = invoiceSites();
  t.diagnostic(`[A7] montagens=${routes.length} (${[...new Set(routes)].join(", ")}) · chamadas=${calls.length} (${[...new Set(calls)].join(", ")})`);
  assert.deepEqual([...new Set(routes)].filter((file) => file !== "src/modules/work-orders/financials.service.ts"), [], "rota de faturamento montada fora do serviço");
  assert.deepEqual([...new Set(calls)].filter((file) => file !== "src/modules/work-orders/components/InvoiceWorkOrderDialog.tsx"), [], "faturamento chamado fora do diálogo");
});

test("[A7] [G-INVOICE] denominadores: a varredura enxerga a montagem no serviço e a chamada no diálogo (> 0)", () => {
  const { routes, calls } = invoiceSites();
  assert.ok(routes.length > 0, `montagens vistas: ${routes.length}`);
  assert.ok(calls.length > 0, `chamadas vistas: ${calls.length}`);
});

// ---------------------------------------------------------------- A8 · chip e gate de editar/excluir

test("[A8] SSR da aba com lista hidratada: item faturado → chip 'Faturado' e sem 'Editar item'/'Excluir item' na linha; pendente com :update → os dois botões", async () => {
  const { FinancialTab } = await loadTab();
  const list = {
    items: [invoicedItem({ id: "it-a", description: "Guincho leve faturado" }), item({ id: "it-b", description: "Pedágio pendente", totalAmount: 40 })],
    totalAmount: 100,
    currency: "BRL",
  };
  const html = renderToString(<FinancialTab workOrderId="wo-1" workOrderStatus="completed" context={CTX} permissions={FINANCE} initialData={list} />);
  const rowsHtml = html.split("<tr").slice(1);
  const invoicedRow = rowsHtml.find((row) => row.includes("Guincho leve faturado"));
  const pendingRow = rowsHtml.find((row) => row.includes("Pedágio pendente"));
  assert.ok(invoicedRow, "linha do item faturado renderizada");
  assert.ok(pendingRow, "linha do item pendente renderizada");
  assert.match(invoicedRow!, />Faturado</, "chip Faturado no item faturado");
  assert.doesNotMatch(invoicedRow!, /aria-label="Editar item"/, "item faturado sem editar");
  assert.doesNotMatch(invoicedRow!, /aria-label="Excluir item"/, "item faturado sem excluir");
  assert.doesNotMatch(pendingRow!, />Faturado</, "pendente sem chip");
  assert.match(pendingRow!, /aria-label="Editar item"/, "pendente com editar");
  assert.match(pendingRow!, /aria-label="Excluir item"/, "pendente com excluir");
  assert.match(html, /Faturar OS/, "há pendente e permissão: o botão aparece");
});

// J-559 (C3-A4) — o chip "Faturado" tem o tom do "Pago" do Financeiro pelo `getTitleStatusTone`, sem o par de cores escrito à
// mão na aba (o corpo `cognicao-visual`: "nunca hex solto em componente").
test("[A8b] chip 'Faturado' no tom do Financeiro: a aba não escreve à mão o par de cores do 'Pago', e o SSR do chip traz o fundo e a cor de getTitleStatusTone('paid')", async () => {
  const { getTitleStatusTone } = await import("../src/modules/finance/titles/financial-titles.adapter");
  const tone = getTitleStatusTone("paid");
  assert.match(tone.bg, /^#[0-9A-Fa-f]{6}$/, "o tom do 'Pago' tem fundo");
  assert.match(tone.color, /^#[0-9A-Fa-f]{6}$/, "o tom do 'Pago' tem cor");
  const tabSource = stripComments(readFileSync(path.join(WO, "components/tabs/FinancialTab.tsx"), "utf8").replace(/\r\n/g, "\n")).toLowerCase();
  for (const hex of [tone.bg, tone.color]) assert.ok(!tabSource.includes(hex.toLowerCase()), `cor do 'Pago' escrita à mão na aba: ${hex}`);

  const { FinancialTab } = await loadTab();
  const list = { items: [invoicedItem({ id: "it-a", description: "Guincho leve faturado" })], totalAmount: 60, currency: "BRL" };
  const html = renderToString(<FinancialTab workOrderId="wo-1" workOrderStatus="completed" context={CTX} permissions={FINANCE} initialData={list} />);
  const chip = /<span style="([^"]*)">Faturado<\/span>/.exec(html);
  assert.ok(chip, "o chip Faturado renderizado");
  const style = chip![1].toLowerCase();
  assert.ok(style.includes(`background:${tone.bg.toLowerCase()}`), `fundo do chip = o do 'Pago': ${style}`);
  assert.ok(style.includes(`color:${tone.color.toLowerCase()}`), `cor do chip = a do 'Pago': ${style}`);
});

// ---------------------------------------------------------------- A10 · aviso de valor defasado

test("[A10] invoiceResultNotice: valor ou quantidade diferentes do mostrado → frase de divergência; iguais → sem frase; complementar compara só a quantidade", async () => {
  const { invoiceResultNotice, formatMoney } = await loadModel();
  const DIVERGENCE = "O valor faturado ficou diferente do mostrado na confirmação, porque os itens mudaram antes do faturamento. Confira a lista abaixo.";
  const result = (invoicedTotal: number, invoicedItemCount: number, parentTitleId: string | null = null) => ({ invoicedTotal, currency: "BRL", invoicedItemCount, parentTitleId });

  const up = invoiceResultNotice({ amount: 100, count: 2 }, result(130, 3));
  assert.equal(up.divergence, DIVERGENCE, "(100, 2) × (130, 3) diverge");
  assert.ok(up.message.includes(formatMoney(130, "BRL")), "o aviso traz o valor que o servidor faturou");
  assert.match(up.message, /^Título a receber criado: .+, 3 itens faturados\.$/, "texto do aviso");

  assert.equal(invoiceResultNotice({ amount: 100, count: 2 }, result(70, 1)).divergence, DIVERGENCE, "(100, 2) × (70, 1) diverge");
  assert.equal(invoiceResultNotice({ amount: 100, count: 2 }, result(100, 3)).divergence, DIVERGENCE, "só a quantidade difere");
  assert.equal(invoiceResultNotice({ amount: 100, count: 2 }, result(130, 2)).divergence, DIVERGENCE, "só o valor difere");

  const delta = invoiceResultNotice({ amount: null, count: 1 }, result(35, 2, "t-1"));
  assert.equal(delta.divergence, DIVERGENCE, "(null, 1) × (35, 2) no complementar diverge");
  assert.match(delta.message, /\(complementar\)/, "complementar marcado");

  const same = invoiceResultNotice({ amount: 100, count: 2 }, result(100, 2));
  assert.equal(same.divergence, null, "controle negativo: iguais, sem frase");
  assert.doesNotMatch(same.message, /complementar/, "original não leva (complementar)");
  assert.equal(invoiceResultNotice({ amount: null, count: 1 }, result(35, 1, "t-1")).divergence, null, "complementar com a mesma quantidade: sem frase");
  assert.match(invoiceResultNotice({ amount: null, count: 1 }, result(35, 1, "t-1")).message, /1 item faturado \(complementar\)\.$/, "singular");
});
