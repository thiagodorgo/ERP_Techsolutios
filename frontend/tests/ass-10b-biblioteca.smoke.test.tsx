import assert from "node:assert/strict";
import test, { after } from "node:test";

import { elements, installMiniDom, propsOf, type MiniDomElement } from "./helpers/mini-dom";

// B-ASS-10b (T5, F3) — T-LIB-1 do plano v2 (§8.1): os 2 componentes novos da biblioteca (`ScatterPlot`, `StepBridge`) e a
// prop `footer` do `KpiStatCard`. Prende por render e por handler executado (o DOM mínimo do repositório, sem dependência):
//   - `ScatterPlot`: um botão por ponto válido, foco por Tab, `aria-pressed`, Enter/Espaço/clique escolhem, ponto sem x na
//     faixa à esquerda, linhas-guia com rótulo, texto de escala marcado `data-escala` (Emenda 1, A8-r2) e "Sem dados para
//     comparar." quando nenhum ponto é desenhável;
//   - `StepBridge`: um botão por degrau, `aria-pressed`, teclado, o valor final é o LITERAL recebido (a soma interna é só
//     geometria) e qualquer valor ausente vira "Margem indisponível.";
//   - `KpiStatCard` sem `footer` rende byte a byte o que rendia na base `76a31641`; com `footer`, o rodapé entra no card.
process.env.VITE_USE_MOCKS = "false";

installMiniDom();

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
const { renderToStaticMarkup } = await import("react-dom/server");
const { Cloud } = await import("lucide-react");
const charts = await import("../src/components/charts");
const { ScatterPlot, StepBridge } = charts;
const { KpiStatCard } = await import("../src/components/patterns/KpiStatCard");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};

async function mount(node: unknown) {
  const container = document.createElement("div") as unknown as MiniDomElement;
  (document.body as unknown as MiniDomElement).appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(node as never);
  });
  return { container, unmount: () => act(async () => root.unmount()) };
}

const buttons = (root: MiniDomElement) => elements(root, (el) => el.getAttribute("role") === "button");
const key = (name: string) => ({ key: name, preventDefault() {}, stopPropagation() {} });
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;

// ---------------------------------------------------------------- ScatterPlot

const POINTS = [
  { key: "org-a", x: 900, y: 1200, tone: "danger" as const, ariaLabel: "Alfa: assinatura R$ 900,00, custo R$ 1.200,00, Crítico", label: "Alfa" },
  { key: "org-b", x: 1000, y: 850, tone: "warning" as const, ariaLabel: "Beta: assinatura R$ 1.000,00, custo R$ 850,00, Atenção" },
  { key: "org-c", x: 2000, y: 300, tone: "success" as const, ariaLabel: "Gama: assinatura R$ 2.000,00, custo R$ 300,00, Normal" },
  { key: "org-d", x: null, y: 120, tone: "neutral" as const, ariaLabel: "Delta: sem assinatura, custo R$ 120,00" },
];
const GUIDES = [
  { slope: 1, label: "custo = assinatura", tone: "danger" as const },
  { slope: 0.8, label: "custo = 80 %", tone: "warning" as const },
];

test("T-LIB-1 ScatterPlot: um botão focável por ponto, com o texto acessível do chamador e aria-pressed no escolhido", () => {
  const html = renderToStaticMarkup(h(ScatterPlot, { points: POINTS, guides: GUIDES, pressedKey: "org-b", ariaLabel: "Assinatura e custo de cada organização", onSelect: () => undefined }));
  assert.match(html, /role="group" aria-label="Assinatura e custo de cada organização"/);
  assert.equal(count(html, /role="button"/g), 4, "um botão por ponto desenhável");
  assert.equal(count(html, /tabindex="0"/g), 4, "cada ponto entra no Tab");
  assert.equal(count(html, /aria-pressed="true"/g), 1, "um ponto escolhido");
  assert.match(html, /aria-pressed="true" aria-label="Beta: assinatura R\$ 1\.000,00, custo R\$ 850,00, Atenção"/);
  for (const point of POINTS) assert.ok(html.includes(`aria-label="${point.ariaLabel}"`), `ponto ${point.key} com o texto do chamador`);
  for (const point of POINTS) assert.ok(html.includes(`data-alvo="${point.key}"`), `ponto ${point.key} marcado com data-alvo (F5)`);
  for (const tone of ["danger", "warning", "success", "neutral"]) assert.match(html, new RegExp(`ui-scatter__point--${tone}`), `cor do tom ${tone} vem do chamador`);
  assert.match(html, />Alfa</, "o rótulo curto opcional aparece ao lado do ponto");
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("T-LIB-1 ScatterPlot: Enter, Espaço e clique escolhem o ponto; outra tecla não", async () => {
  const chosen: string[] = [];
  const { container, unmount } = await mount(h(ScatterPlot, { points: POINTS, guides: GUIDES, ariaLabel: "dispersão", onSelect: (k: string) => chosen.push(k) }));
  const points = buttons(container);
  assert.equal(points.length, 4);
  await act(async () => {
    (propsOf(points[0]).onKeyDown as (event: unknown) => void)(key("Enter"));
    (propsOf(points[1]).onKeyDown as (event: unknown) => void)(key(" "));
    (propsOf(points[2]).onKeyDown as (event: unknown) => void)(key("a"));
    (propsOf(points[3]).onClick as () => void)();
  });
  assert.deepEqual(chosen, ["org-a", "org-b", "org-d"]);
  await unmount();
});

test("T-LIB-1 ScatterPlot: a escala do eixo é calculada no componente e marcada data-escala (A8-r2); as linhas-guia têm rótulo", () => {
  const html = renderToStaticMarkup(h(ScatterPlot, { points: POINTS, guides: GUIDES, ariaLabel: "dispersão", xLabel: "assinatura do mês →", yLabel: "↑ custo" }));
  const scale = html.match(/<text[^>]*data-escala="[xy]"[^>]*>[^<]*<\/text>/g) ?? [];
  assert.ok(scale.length >= 6, `marcas de escala nos dois eixos: ${scale.length}`);
  assert.ok(scale.every((item) => /R\$/.test(item)), "a escala é de dinheiro (com R$, como na maquete)");
  // Todo texto visível com R$ é escala marcada: o componente não escreve valor de negócio fora do que o chamador passa.
  const visible = html.match(/<text[^>]*>[^<]*R\$[^<]*<\/text>/g) ?? [];
  assert.deepEqual(visible.filter((item) => !/data-escala=/.test(item)), [], "R$ visível fora da escala");
  assert.match(html, />custo = assinatura</);
  assert.match(html, />custo = 80 %</);
  assert.match(html, />assinatura do mês →</);
  assert.match(html, />↑ custo</);
});

test("T-LIB-1 ScatterPlot: ponto sem x vai para a faixa da esquerda, com o rótulo dela", () => {
  const html = renderToStaticMarkup(h(ScatterPlot, { points: POINTS, ariaLabel: "dispersão", nullLaneLabel: "sem assinatura" }));
  assert.match(html, /ui-scatter__lane/);
  assert.match(html, />sem</);
  assert.match(html, />assinatura</);
  const onlyWithX = renderToStaticMarkup(h(ScatterPlot, { points: POINTS.slice(0, 3), ariaLabel: "dispersão" }));
  assert.doesNotMatch(onlyWithX, /ui-scatter__lane/, "sem ponto sem x, a faixa não é desenhada");
});

test("T-LIB-1 ScatterPlot: sem ponto desenhável → \"Sem dados para comparar.\" e nenhum SVG", () => {
  for (const points of [[], [{ key: "x", x: Number.NaN, y: 10, tone: "danger" as const, ariaLabel: "x" }], [{ key: "y", x: 10, y: Number.POSITIVE_INFINITY, tone: "danger" as const, ariaLabel: "y" }]]) {
    const html = renderToStaticMarkup(h(ScatterPlot, { points, ariaLabel: "dispersão" }));
    assert.match(html, /Sem dados para comparar\./);
    assert.doesNotMatch(html, /<svg/);
  }
});

// ---------------------------------------------------------------- StepBridge

const STEPS = [
  { key: "sub", label: "Assinaturas", value: 900, kind: "start" as const, displayValue: "R$ 900,00", tone: "accent" as const },
  { key: "custo", label: "Organizações", value: 700, kind: "minus" as const, displayValue: "R$ 700,00", tone: "danger" as const },
  { key: "plat", label: "Plataforma", value: 50, kind: "minus" as const, displayValue: "R$ 50,00", tone: "violet" as const },
  { key: "conv", label: "Conversão", value: -0.12, kind: "minus" as const, displayValue: "-R$ 0,12" },
  { key: "margem", label: "Margem", value: 1.23, kind: "end" as const, displayValue: "R$ 1,23", note: "0,1 %" },
];

test("T-LIB-1 StepBridge: um botão focável por degrau, aria-pressed no escolhido, texto acessível com o valor", () => {
  const html = renderToStaticMarkup(h(StepBridge, { steps: STEPS, pressedKey: "plat", ariaLabel: "Da assinatura à margem do mês", onSelect: () => undefined }));
  assert.match(html, /role="group" aria-label="Da assinatura à margem do mês"/);
  assert.equal(count(html, /role="button"/g), 5);
  assert.equal(count(html, /tabindex="0"/g), 5);
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.match(html, /aria-pressed="true" aria-label="Plataforma: menos R\$ 50,00"/);
  assert.match(html, /aria-label="Assinaturas: R\$ 900,00"/);
  assert.match(html, /aria-label="Margem: R\$ 1,23"/);
  assert.match(html, />−R\$ 700,00</, "degrau que tira mostra o sinal de menos");
  assert.match(html, />\+R\$ 0,12</, "degrau negativo que tira aparece como soma, sem o sinal duplicado");
  assert.match(html, />0,1 %</, "a nota opcional do degrau aparece");
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("T-LIB-1 StepBridge: o valor final é o literal recebido, mesmo incoerente com a soma dos degraus", () => {
  const html = renderToStaticMarkup(h(StepBridge, { steps: STEPS, ariaLabel: "ponte" }));
  // 900 − 700 − 50 − (−0,12) = 150,12: a geometria soma, o texto nunca.
  assert.match(html, />R\$ 1,23</);
  assert.doesNotMatch(html, /150,12|150\.12|R\$ 150/);
});

test("T-LIB-1 StepBridge: Enter, Espaço e clique escolhem o degrau", async () => {
  const chosen: string[] = [];
  const { container, unmount } = await mount(h(StepBridge, { steps: STEPS, ariaLabel: "ponte", onSelect: (k: string) => chosen.push(k) }));
  const steps = buttons(container);
  assert.equal(steps.length, 5);
  await act(async () => {
    (propsOf(steps[0]).onKeyDown as (event: unknown) => void)(key("Enter"));
    (propsOf(steps[1]).onKeyDown as (event: unknown) => void)(key(" "));
    (propsOf(steps[2]).onKeyDown as (event: unknown) => void)(key("Tab"));
    (propsOf(steps[4]).onClick as () => void)();
  });
  assert.deepEqual(chosen, ["sub", "custo", "margem"]);
  await unmount();
});

test("T-LIB-1 StepBridge: qualquer valor ausente → \"Margem indisponível.\" e nenhum SVG", () => {
  for (const index of [0, 2, 4]) {
    const steps = STEPS.map((step, i) => (i === index ? { ...step, value: null } : step));
    const html = renderToStaticMarkup(h(StepBridge, { steps, ariaLabel: "ponte" }));
    assert.match(html, /Margem indisponível\./, `degrau ${index} ausente`);
    assert.doesNotMatch(html, /<svg/);
  }
  assert.match(renderToStaticMarkup(h(StepBridge, { steps: [], ariaLabel: "ponte" })), /Margem indisponível\./);
});

// ---------------------------------------------------------------- KpiStatCard.footer

// Markup de `KpiStatCard` na base `76a31641` (antes da prop `footer`), capturado por `renderToStaticMarkup` com estas props.
const BASE_CLICKABLE =
  '<button type="button" class="pat-kpi pat-kpi--clickable" style="border-color:#FCA5A5" aria-label="Custo total do mês" aria-pressed="true"><div class="pat-kpi__head"><span class="pat-kpi__tile" style="background:#eff6ff;color:#2563eb" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg></span><span class="pat-kpi__tag" style="background:#EFF6FF;color:#2563EB">dólar v2</span></div><div class="pat-kpi__value">R$ 999,99</div><div class="pat-kpi__label">Custo total do mês</div><div class="pat-kpi__hint">dólar v2</div></button>';
const BASE_STATIC =
  '<div class="pat-kpi"><div class="pat-kpi__head"><span class="pat-kpi__tile" style="background:#eff6ff;color:#2563eb" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg></span></div><div class="pat-kpi__value">12</div><div class="pat-kpi__label">Sem assinatura própria</div></div>';

const clickableProps = { icon: Cloud, iconColor: "#2563eb", iconBg: "#eff6ff", value: "R$ 999,99", label: "Custo total do mês", hint: "dólar v2", tag: { label: "dólar v2", bg: "#EFF6FF", fg: "#2563EB" }, border: "#FCA5A5", onClick: () => undefined, pressed: true };
const staticProps = { icon: Cloud, iconColor: "#2563eb", iconBg: "#eff6ff", value: 12, label: "Sem assinatura própria" };

test("T-LIB-1 KpiStatCard sem footer rende igual à base (byte a byte), clicável e estático", () => {
  assert.equal(renderToStaticMarkup(h(KpiStatCard, clickableProps)), BASE_CLICKABLE);
  assert.equal(renderToStaticMarkup(h(KpiStatCard, staticProps)), BASE_STATIC);
});

test("T-LIB-1 KpiStatCard com footer: o rodapé entra no fim do card, depois da dica", () => {
  const footer = h("svg", { className: "kpi-spark-test", "aria-hidden": "true" });
  const html = renderToStaticMarkup(h(KpiStatCard, { ...clickableProps, footer }));
  assert.match(html, /<div class="pat-kpi__hint">dólar v2<\/div><div class="pat-kpi__footer"><svg class="kpi-spark-test" aria-hidden="true"><\/svg><\/div><\/button>$/);
  const plain = renderToStaticMarkup(h(KpiStatCard, { ...staticProps, footer }));
  assert.match(plain, /<div class="pat-kpi__label">Sem assinatura própria<\/div><div class="pat-kpi__footer">/);
});
