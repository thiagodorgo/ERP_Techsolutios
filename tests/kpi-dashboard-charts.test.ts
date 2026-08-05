import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// D-KPI-INDEX-PAINEL — o painel `Kpis/index.html` é o artefato PRINCIPAL de acompanhamento
// (decisão do dono, 2026-08-04): não basta atualizar os JSON, o painel tem de MOSTRAR o estado.
//
// A 1ª versão deste guard era TEATRO: a junta (`critico-adversarial`, achado ALTA-4) substituiu as
// 3 séries por retas sintéticas e os 4 testes passaram verdes — porque só checavam "tem <svg>" e
// "a legenda contém os 3 números do último snapshot". Agora o guard amarra a CURVA ao JSON:
//   1. `buildChartSeries` (função pura exposta pelo app.js) é comparada, ponto a ponto, com o que
//      ESTE teste calcula independentemente do `kpis-history.json`;
//   2. os vértices desenhados nas <polyline> são contados contra as medições reais;
//   3. lacuna de medição não pode virar 0 nem pico fabricado (foi assim que nasceu a barra de +969);
//   4. sem `fetch` a seção continua escondida — e o CSS precisa provar que `hidden` esconde de fato
//      (achado ALTA-1: `.section-grid--tight{display:block}` vencia o `[hidden]` do user agent).

const KPIS_DIR = fileURLToPath(new URL("../Kpis/", import.meta.url));
const APP_JS = readFileSync(`${KPIS_DIR}app.js`, "utf8");
const INDEX_HTML = readFileSync(`${KPIS_DIR}index.html`, "utf8");
const STYLES_CSS = readFileSync(`${KPIS_DIR}styles.css`, "utf8");
const HISTORY = JSON.parse(readFileSync(`${KPIS_DIR}kpis-history.json`, "utf8")) as ReadonlyArray<Record<string, unknown>>;

const CHART_IDS = ["chart-tests", "chart-blocks", "chart-rounds", "chart-velocity"] as const;

type FakeEl = { id: string; hidden: boolean; innerHTML: string; textContent: string };
type Sandbox = Record<string, unknown> & { buildChartSeries?: (h: unknown) => ChartSeries };
type ChartSeries = {
  rows: ReadonlyArray<Record<string, unknown>>;
  dates: readonly string[];
  tracks: ReadonlyArray<{ key: string; points: ReadonlyArray<number | null>; first: number; last: number; measured: number }>;
  blocks: ReadonlyArray<number | null>;
  rounds: ReadonlyArray<{ label: string; value: number }>;
  velocity: ReadonlyArray<{ label: string; value: number }>;
  velocityWindow: ReadonlyArray<{ label: string; value: number }>;
};

/** Executa o app.js num contexto isolado com DOM mínimo. Devolve os elementos e o próprio sandbox. */
async function runDashboard(options: { withFetch: boolean }): Promise<{ els: Map<string, FakeEl>; sandbox: Sandbox }> {
  const els = new Map<string, FakeEl>();
  const document = {
    getElementById(id: string) {
      if (!els.has(id)) els.set(id, { id, hidden: true, innerHTML: "", textContent: "" });
      return els.get(id);
    },
    createElement: () => ({ innerHTML: "", textContent: "", click() {}, appendChild() {} }),
    querySelectorAll: () => [],
  };

  const fetchStub = async (path: string) => {
    const body = readFileSync(path.replace("./", KPIS_DIR), "utf8");
    return { ok: true, json: async () => JSON.parse(body) };
  };

  const sandbox: Sandbox = { document, console, setTimeout, Math, JSON, Intl, Date };
  if (options.withFetch) sandbox.fetch = fetchStub;

  vm.runInContext(APP_JS, vm.createContext(sandbox), { filename: "Kpis/app.js" });
  await new Promise((resolve) => setTimeout(resolve, 200)); // a hidratação é assíncrona
  return { els, sandbox };
}

/** Reimplementação INDEPENDENTE da leitura de métrica — se o app.js mudar a regra, os dois divergem. */
function expectedMetric(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).split("/")[0].replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function expectedSmoke(row: Record<string, unknown>): number | null {
  return expectedMetric(row.frontend_smoke_tests != null ? row.frontend_smoke_tests : row.frontend_smoke);
}

test("painel: o index.html declara os contêineres dos gráficos e o aviso honesto de file://", () => {
  for (const id of CHART_IDS) {
    assert.ok(INDEX_HTML.includes(`id="${id}"`), `index.html sem o contêiner #${id} — o gráfico não teria onde renderizar.`);
  }
  assert.ok(/id="charts-section"[^>]*hidden/.test(INDEX_HTML), "a seção de gráficos precisa nascer escondida (só aparece com dado real).");
  assert.ok(INDEX_HTML.includes('id="charts-offline-note"'), "sem o aviso, file:// vira buraco mudo em vez de degradação honesta.");
  // F7 — os números de manchete abrem o painel, não ficam atrás do changelog.
  const cardsAt = INDEX_HTML.indexOf('id="kpi-cards"');
  const changelogAt = INDEX_HTML.indexOf('aria-label="Entregas por PR"');
  assert.ok(cardsAt > 0 && cardsAt < changelogAt, "os cards de KPI precisam vir ANTES do changelog por PR.");
});

test("painel: `hidden` realmente esconde — o CSS de autor não pode vencer o [hidden] do user agent", () => {
  // ALTA-1: `.section-grid--tight { display: block }` é origem AUTOR e vence `[hidden]{display:none}`
  // do UA por origem (não por especificidade). Sem a regra abaixo o painel mostra 4 caixas vazias.
  assert.match(
    STYLES_CSS,
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/,
    "styles.css precisa de `[hidden] { display: none !important }` — senão o atributo hidden é decorativo.",
  );
});

test("painel: a SÉRIE desenhada é a do kpis-history.json, ponto a ponto (não série fabricada)", async () => {
  const { sandbox } = await runDashboard({ withFetch: true });
  assert.equal(typeof sandbox.buildChartSeries, "function", "app.js precisa expor buildChartSeries para o guard poder auditar a série.");

  const series = sandbox.buildChartSeries!(HISTORY);
  const rows = HISTORY.filter((h) => h && h.snapshot_date);

  assert.deepEqual([...series.dates], rows.map((h) => h.snapshot_date), "as datas do gráfico têm de ser as do history, na ordem.");

  const expectedByKey: Record<string, Array<number | null>> = {
    backend_tests: rows.map((h) => expectedMetric(h.backend_tests)),
    frontend_smoke_tests: rows.map((h) => expectedSmoke(h)),
    flutter_tests: rows.map((h) => expectedMetric(h.flutter_tests)),
  };

  for (const track of series.tracks) {
    const expected = expectedByKey[track.key];
    assert.ok(expected, `trilha inesperada no painel: ${track.key}`);
    assert.deepEqual([...track.points], expected, `a série de ${track.key} não reproduz o kpis-history.json.`);
  }
  assert.equal(series.tracks.length, 3, "as três trilhas (backend, smoke, Flutter) precisam estar no painel.");

  assert.deepEqual([...series.blocks], rows.map((h) => expectedMetric(h.blocks_completed)), "a série de blocos não reproduz o history.");
});

test("painel: lacuna de medição não vira zero nem pico — o ritmo só conta delta com os dois lados medidos", async () => {
  const { sandbox } = await runDashboard({ withFetch: true });
  const series = sandbox.buildChartSeries!(HISTORY);
  const rows = HISTORY.filter((h) => h && h.snapshot_date);

  const KEYS = ["backend_tests", "frontend_smoke_tests", "flutter_tests"] as const;
  const read = (row: Record<string, unknown>, key: string) => (key === "frontend_smoke_tests" ? expectedSmoke(row) : expectedMetric(row[key]));

  for (let i = 1; i < rows.length; i += 1) {
    const expected = KEYS.reduce((acc, key) => {
      const a = read(rows[i - 1], key);
      const b = read(rows[i], key);
      return acc + (a !== null && b !== null ? b - a : 0);
    }, 0);
    assert.equal(series.velocity[i - 1].value, expected, `delta errado em ${String(rows[i].snapshot_date)} (${String(rows[i].version)}).`);
  }

  // Alarme sobre a JANELA DESENHADA: um salto desta ordem numa única entrega não é entrega — é
  // re-baseline de medição (foi assim que nasceram o +969 por métrica ausente e o +751 de
  // 13/07, quando `backend_tests` deixou de contar só o core-saas e passou a contar a suíte
  // inteira). Se um desses entrar na janela, o painel passaria a desenhar um arranha-céu que
  // achata todas as barras reais — este teste falha de propósito para forçar a decisão de como
  // representá-lo (barra hachurada, nota, ou recorte), em vez de deixar o painel mentir sozinho.
  const desenhado = series.velocityWindow.map((v) => v.value);
  const maiorPico = Math.max(...desenhado);
  assert.ok(
    maiorPico < 200,
    `a janela desenhada do "Ritmo de entrega" traz um salto de ${maiorPico} testes numa entrega — ` +
      "isso é re-baseline de medição, não entrega. Represente-o explicitamente antes de deixar o painel desenhá-lo.",
  );
});

test("painel: os gráficos são SVG inline, sem recurso externo, e a seção aparece com dado real", async () => {
  const { els } = await runDashboard({ withFetch: true });

  for (const id of CHART_IDS) {
    const html = els.get(id)?.innerHTML ?? "";
    assert.match(html, /<svg /, `#${id} não é SVG inline (PD-004: gráfico = SVG inline, zero dependência).`);
    assert.doesNotMatch(html, /<script|onload=|https?:\/\//, `#${id} não pode carregar script/recurso externo.`);
  }

  // Os vértices desenhados batem com o número de medições reais de cada trilha.
  const testsHtml = els.get("chart-tests")?.innerHTML ?? "";
  const vertices = (testsHtml.match(/<polyline points="([^"]+)"/g) ?? []).reduce(
    (acc, tag) => acc + (tag.match(/\d+\.\d+,\d+\.\d+/g)?.length ?? 0),
    0,
  );
  const rows = HISTORY.filter((h) => h && h.snapshot_date);
  const measured =
    rows.filter((h) => expectedMetric(h.backend_tests) !== null).length +
    rows.filter((h) => expectedSmoke(h) !== null).length +
    rows.filter((h) => expectedMetric(h.flutter_tests) !== null).length;
  // Trechos de 1 ponto viram <circle>, então o total desenhado nunca EXCEDE as medições.
  assert.ok(vertices > 0 && vertices <= measured, `vértices desenhados (${vertices}) incoerentes com as medições reais (${measured}).`);

  // F11 — leitor de tela precisa dos números, não de um role="img" mudo.
  assert.match(testsHtml, /aria-describedby="sr-track-backend_tests"/, "o gráfico precisa apontar para a tabela sr-only.");
  assert.match(testsHtml, /<table id="sr-track-backend_tests" class="sr-only">/, "falta a tabela acessível com os valores.");

  assert.equal(els.get("charts-section")?.hidden, false, "com dado real a seção de gráficos precisa aparecer.");
  assert.equal(els.get("charts-offline-note")?.hidden, true, "com dado real o aviso de file:// tem de sumir.");
});

test("painel: sem servidor o painel NÃO inventa gráfico (D-007)", async () => {
  const { els } = await runDashboard({ withFetch: false });

  assert.notEqual(els.get("charts-section")?.hidden, false, "sem fetch (file://) a seção tem de continuar escondida.");
  assert.equal(els.get("chart-tests")?.innerHTML ?? "", "", "sem fonte de dados nenhum gráfico pode ser desenhado.");
});
