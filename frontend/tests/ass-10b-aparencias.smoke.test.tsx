import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { elements, installMiniDom, propsOf, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-ASS-10b (T5) · R-UI-1 reenunciada (plano v2 §8.1, T-UI-1; Emenda 1, A8-r2) e o padrão de blocos clicáveis (T-UI-2).
// (a) A, B e C recebem o MESMO `CloudBillingView` e não importam adapter, service nem hook; (b) com valores de dinheiro
// ÚNICOS no fixture, o texto de cada bloco (`data-alvo`) é o literal formatado do campo que a tabela do §6.3 aponta;
// (c) todo "R$" exibido pertence aos valores do modelo — o texto de escala dos eixos (`data-escala`, gerado SÓ pelos
// componentes da biblioteca) fica de fora; (d) o mesmo `alvo` dá a mesma lista de linhas nas aparências.
// As aparências presentes no ramo são descobertas pelos arquivos `views/CloudBillingView?.tsx` (a F4 traz a A; o Dev-B
// acrescenta B e C nas F5 e F6, com a tabela (b) de cada uma).

process.env.VITE_USE_MOCKS = "false";
const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};
after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { fixtureModel, fixtureData, fixtureSeries, fixtureGroupDetails, decimalsOf, CURRENT_MONTH, TODAY } = await import("./helpers/cloud-billing.fixture");
const { formatBRL, formatBRLCompact, formatPct } = await import("../src/modules/platform/cloud-billing/cloud-billing.money");
const state = await import("../src/modules/platform/cloud-billing/cloud-billing.state");
const { NO_WRITE_ACCESS } = await import("../src/modules/platform/cloud-billing/cloud-billing.access");

type ViewProps = import("../src/modules/platform/cloud-billing/views/cloudBilling.shared").CloudBillingViewProps;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = path.join(HERE, "../src/modules/platform/cloud-billing/views");
const LETTERS = ["A", "B", "C"].filter((letter) => existsSync(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`)));
const VIEWS: Record<string, (props: ViewProps) => unknown> = {};
for (const letter of LETTERS) {
  const module = (await import(`../src/modules/platform/cloud-billing/views/CloudBillingView${letter}`)) as Record<string, (props: ViewProps) => unknown>;
  VIEWS[letter] = module[`CloudBillingView${letter}`]!;
}

const plain = (value: string) => value.replace(/\s/g, " ");
const noop = () => undefined;
const FULL_ACCESS = { importCosts: true, readImports: true, runAllocation: true, manageBilling: true };

function props(model: import("../src/modules/platform/cloud-billing/cloud-billing.state").CloudBillingView, over: Partial<ViewProps> = {}): ViewProps {
  return { model, access: FULL_ACCESS, onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth: noop, onAction: noop, onRetrySeries: noop, ...over };
}

async function mount(element: unknown): Promise<{ readonly container: MiniDomElement; readonly unmount: () => Promise<void> }> {
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(element as never);
  });
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

/** O texto visível, sem o que está dentro de `[data-escala]` (o texto de escala dos eixos). */
function visibleTextWithoutScale(node: MiniDomNode): string {
  if (node.nodeType === 3) return (node as unknown as { data: string }).data;
  if (node.nodeType === 1 && (node as MiniDomElement).hasAttribute("data-escala")) return " ";
  return node.childNodes.map(visibleTextWithoutScale).join(" ");
}

test("T-UI-1 (a) as aparências recebem o mesmo modelo e não importam adapter, service nem hook", () => {
  assert.ok(LETTERS.includes("A"), "a aparência A existe");
  for (const file of readdirSync(VIEWS_DIR).filter((name) => /\.tsx?$/.test(name))) {
    const source = readFileSync(path.join(VIEWS_DIR, file), "utf8");
    assert.doesNotMatch(source, /from "\.\.\/cloud-billing\.(adapter|service)"|from "\.\.\/useCloudBilling(Actions)?"/, `${file} importa camada de dados`);
  }
  for (const letter of LETTERS) {
    const source = readFileSync(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`), "utf8");
    assert.match(source, new RegExp(`export function CloudBillingView${letter}\\(props: CloudBillingViewProps\\)`), `${letter} recebe CloudBillingViewProps (o modelo único)`);
    assert.match(source, new RegExp(`data-aparencia="${letter}"`));
  }
});

test("T-UI-1 (b) A: o texto de cada bloco é o literal formatado do campo que o §6.3 aponta", async () => {
  const model = fixtureModel();
  const g = model.global!;
  const line = (id: string) => model.lines.find((item) => item.tenantId === id)!;
  // a tabela do §6.3 para a aparência A (indicadores, "Para onde vai o custo", "Maior custo", "O que pede atenção")
  const TABLE_A: Record<string, string[]> = {
    custo: [formatBRL(g.totalCost)],
    plat: [formatBRL(g.platformOwnCost)],
    nr: [formatBRL(g.unallocatedOther)],
    res: [formatBRL(g.roundingResidualCost), formatBRL(g.conversionResidualCost)],
    sub: [formatBRL(g.subscriptionTotal)],
    margem: [formatBRL(g.margin), formatPct(g.marginPct)],
    alerta: ["2"],
    semass: ["2"],
    orgs: [formatBRL(g.tenantsCost)],
    arr: [formatBRL(g.roundingResidualCost)],
    conv: [formatBRL(g.conversionResidualCost)],
    "org:t1": [formatBRL(line("t1").allocatedCost)],
    "org:t2": [formatBRL(line("t2").allocatedCost)],
    "org:t4": [formatBRL(line("t4").allocatedCost)],
    "alert:warning": ["1 organização com custo"],
    est: ["1 assinatura é estimativa"],
  };
  const { container, unmount } = await mount(React.createElement(VIEWS.A as never, props(model) as never));
  try {
    for (const [alvo, expected] of Object.entries(TABLE_A)) {
      const blocks = elements(container, (el) => el.getAttribute("data-alvo") === alvo);
      assert.ok(blocks.length > 0, `bloco ${alvo} ausente na A`);
      for (const block of blocks) for (const literal of expected) assert.ok(plain(text(block)).includes(plain(literal)), `bloco ${alvo}: falta ${plain(literal)} em "${plain(text(block))}"`);
    }
  } finally {
    await unmount();
  }
});

test("T-UI-1 (c) todo R$ exibido pertence aos valores do modelo; a escala dos eixos sai pela marca data-escala", async () => {
  assert.ok(LETTERS.includes("A"), "controle de vacuidade: a aparência A existe");
  const variants = [state.INITIAL_UI, { ...state.INITIAL_UI, aberta: "t:t2" }, { ...state.INITIAL_UI, modo: "group" as const, aberta: "g:g1" }, { ...state.INITIAL_UI, modo: "global" as const, aberta: "p:orgs" }];
  for (const letter of LETTERS) {
    for (const ui of variants) {
      const model = fixtureModel(ui);
      const allowed = new Set<string>();
      for (const decimal of decimalsOf(model)) {
        allowed.add(plain(formatBRL(decimal as never)));
        allowed.add(plain(formatBRLCompact(decimal as never)));
      }
      const { container, unmount } = await mount(React.createElement(VIEWS[letter] as never, props(model) as never));
      try {
        const scales = elements(container, (el) => el.hasAttribute("data-escala"));
        assert.ok(scales.length > 0, `${letter}: o eixo da biblioteca marca a escala (controle de vacuidade da exclusão)`);
        const shown = plain(visibleTextWithoutScale(container)).match(/-?R\$ [\d.]+(,\d+)?( mil| mi)?/g) ?? [];
        assert.ok(shown.length > 10, `${letter}: controle de vacuidade (R$ achados: ${shown.length})`);
        const strays = shown.filter((value) => !allowed.has(value));
        assert.deepEqual(strays, [], `${letter} ${JSON.stringify(ui)}: R$ que não vem do modelo`);
      } finally {
        await unmount();
      }
    }
  }
});

test("T-UI-1 (d) o mesmo alvo dá a mesma lista de linhas, na ordem do modelo, em todas as aparências", async () => {
  assert.ok(LETTERS.includes("A"), "controle de vacuidade: a aparência A existe");
  for (const alvo of [null, "alerta", "semass", "custo", "org:t2", "faixa:neg", "est"]) {
    const ui = alvo ? state.selectTarget(state.INITIAL_UI, alvo) : state.INITIAL_UI;
    const model = fixtureModel(ui);
    const expected = model.tenantRows.map((line) => `t:${line.tenantId}`);
    for (const letter of LETTERS) {
      const { container, unmount } = await mount(React.createElement(VIEWS[letter] as never, props(model) as never));
      try {
        const rows = elements(container, (el) => el.hasAttribute("data-row-key")).map((el) => el.getAttribute("data-row-key"));
        assert.deepEqual(rows, expected, `${letter} com alvo ${alvo}`);
      } finally {
        await unmount();
      }
    }
  }
});

function Harness({ View }: { readonly View: (props: ViewProps) => unknown }) {
  const [ui, setUi] = React.useState(state.INITIAL_UI);
  const data = React.useMemo(() => fixtureData(), []);
  const model = state.buildCloudBillingView({ data, series: fixtureSeries(), groupDetails: fixtureGroupDetails(), ui, currentMonth: CURRENT_MONTH, today: TODAY });
  return React.createElement(View as never, {
    ...props(model),
    access: NO_WRITE_ACCESS,
    onTarget: (key: string) => setUi((current) => state.selectTarget(current, key, model.parcels)),
    onToggleRow: (rowId: string) => setUi((current) => state.toggleRow(current, rowId)),
    onClearTarget: () => setUi((current) => state.clearTarget(current)),
    onMode: (modo: "tenant" | "group" | "global") => setUi((current) => state.setListMode(current, modo)),
    onSearch: (value: string) => setUi((current) => state.setSearch(current, value)),
  } as never);
}

const rowKeys = (container: MiniDomElement) => elements(container, (el) => el.hasAttribute("data-row-key")).map((el) => el.getAttribute("data-row-key"));
const click = async (el: MiniDomElement) => act(async () => (propsOf(el).onClick as () => void)());

test("T-UI-2 indicador filtra e publica aria-pressed; a faixa sai com um clique; a linha abre o detalhe logo abaixo, um por vez", async () => {
  assert.ok(LETTERS.includes("A"), "controle de vacuidade: a aparência A existe");
  for (const letter of LETTERS) {
    const { container, unmount } = await mount(React.createElement(Harness, { View: VIEWS[letter]! }));
    try {
      assert.equal(rowKeys(container).length, 5, `${letter}: 5 organizações sem filtro`);
      const alerta = elements(container, (el) => el.localName === "button" && el.parentNode instanceof Object && (el.parentNode as MiniDomElement).getAttribute?.("data-alvo") === "alerta")[0]!;
      assert.ok(alerta, `${letter}: o indicador "em alerta" é botão`);
      await click(alerta);
      assert.equal(alerta.getAttribute("aria-pressed"), "true", `${letter}: aria-pressed no bloco que filtra`);
      assert.deepEqual(rowKeys(container), ["t:t1", "t:t2"], `${letter}: só as críticas e de atenção`);
      const chip = elements(container, (el) => el.getAttribute("aria-label") === "Tirar o filtro")[0]!;
      assert.match(text(chip.parentNode as MiniDomElement), /Em alerta/);
      await click(chip);
      assert.equal(rowKeys(container).length, 5, `${letter}: a faixa sai com um clique`);
      assert.equal(elements(container, (el) => el.getAttribute("aria-label") === "Tirar o filtro").length, 0);

      const row = (key: string) => elements(container, (el) => el.getAttribute("data-row-key") === key)[0]!;
      await click(row("t:t1"));
      assert.equal(row("t:t1").getAttribute("aria-expanded"), "true");
      const detail = elements(container, (el) => el.getAttribute("data-detalhe") === "t:t1")[0]!;
      assert.ok(detail, `${letter}: o detalhe abre`);
      // logo abaixo: o detalhe está na linha seguinte da tabela
      const next = (row("t:t1") as unknown as { nextSibling: MiniDomElement }).nextSibling;
      assert.ok(next && elements(next, (el) => el.getAttribute("data-detalhe") === "t:t1").length === 1, `${letter}: detalhe logo abaixo da linha`);
      await click(row("t:t2"));
      assert.equal(row("t:t1").getAttribute("aria-expanded"), "false", `${letter}: abrir outra fecha a primeira`);
      assert.equal(elements(container, (el) => el.hasAttribute("data-detalhe")).length, 1, `${letter}: um detalhe aberto por vez`);
    } finally {
      await unmount();
    }
  }
});

// ---- B · Analítica (F5 do Dev-B) -------------------------------------------------------------------------------------
test("T-UI-1 (b) B: o texto de cada bloco é o literal formatado do campo que o §6.3 aponta", async () => {
  assert.ok(LETTERS.includes("B"), "a aparência B existe");
  const model = fixtureModel();
  const g = model.global!;
  // a tabela do §6.3 para a aparência B: os 4 indicadores grandes (com tendência), os 4 pequenos e "Para onde vai o custo"
  const TABLE_B: Record<string, string[]> = {
    sub: [formatBRL(g.subscriptionTotal)],
    custo: [formatBRL(g.totalCost)],
    margem: [formatBRL(g.margin), formatPct(g.marginPct)],
    alerta: ["2"],
    plat: [formatBRL(g.platformOwnCost)],
    nr: [formatBRL(g.unallocatedOther)],
    res: [formatBRL(g.roundingResidualCost)],
    semass: ["2"],
    orgs: [formatBRL(g.tenantsCost)],
    arr: [formatBRL(g.roundingResidualCost)],
    conv: [formatBRL(g.conversionResidualCost)],
  };
  const { container, unmount } = await mount(React.createElement(VIEWS.B as never, props(model) as never));
  try {
    for (const [alvo, expected] of Object.entries(TABLE_B)) {
      const blocks = elements(container, (el) => el.getAttribute("data-alvo") === alvo);
      assert.ok(blocks.length > 0, `bloco ${alvo} ausente na B`);
      for (const block of blocks) for (const literal of expected) assert.ok(plain(text(block)).includes(plain(literal)), `bloco ${alvo}: falta ${plain(literal)} em "${plain(text(block))}"`);
    }
    // dispersão: um ponto por organização com custo; o texto acessível traz os literais de assinatura e custo da linha
    for (const line of model.lines.filter((item) => item.allocatedCost !== null)) {
      const point = elements(container, (el) => el.getAttribute("data-alvo") === `org:${line.tenantId}` && el.getAttribute("role") === "button")[0];
      assert.ok(point, `ponto da organização ${line.tenantId}`);
      const aria = plain(point.getAttribute("aria-label") ?? "");
      assert.ok(aria.includes(plain(formatBRL(line.allocatedCost))), `ponto ${line.tenantId}: custo literal em "${aria}"`);
      assert.ok(aria.includes(plain(formatBRL(line.subscriptionAmount))), `ponto ${line.tenantId}: assinatura literal em "${aria}"`);
    }
    // os 6 meses em barras, cada mês um botão; o dólar do mês com a versão
    assert.equal(elements(container, (el) => el.hasAttribute("data-mes") && el.getAttribute("role") === "button").length, 6, "6 meses no gráfico de barras");
    assert.match(plain(text(container)), /Dólar de outubro: 5,412300 \(versão 2\)/);
  } finally {
    await unmount();
  }
});

test("T-UI-1 (b′) B: dispersão, situação, faixa e indicador pequeno filtram a lista (alvo do modelo)", async () => {
  assert.ok(LETTERS.includes("B"), "a aparência B existe");
  const targets: string[] = [];
  const model = fixtureModel(state.selectTarget(state.INITIAL_UI, "org:t1"));
  const { container, unmount } = await mount(React.createElement(VIEWS.B as never, props(model, { onTarget: (key: string) => targets.push(key) }) as never));
  try {
    const point = elements(container, (el) => el.getAttribute("data-alvo") === "org:t1" && el.getAttribute("role") === "button")[0]!;
    assert.equal(point.getAttribute("aria-pressed"), "true", "o ponto do alvo publica aria-pressed");
    await click(point);
    const legend = elements(container, (el) => el.localName === "button" && /^Crítico: 1/.test(el.getAttribute("aria-label") ?? ""))[0]!;
    assert.ok(legend, "a legenda da situação é botão");
    await click(legend);
    const band = elements(container, (el) => el.localName === "button" && /^Negativa: 1 organização/.test(el.getAttribute("aria-label") ?? ""))[0]!;
    assert.ok(band, "a coluna da faixa negativa é botão");
    await click(band);
    const mini = elements(container, (el) => el.localName === "button" && (el.parentNode as MiniDomElement).getAttribute?.("data-alvo") === "plat")[0]!;
    assert.ok(mini, "o indicador pequeno é botão");
    await click(mini);
    assert.deepEqual(targets, ["org:t1", "alert:critical", "faixa:neg", "plat"]);
  } finally {
    await unmount();
  }
});
