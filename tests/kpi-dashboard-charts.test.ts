import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// D-KPI-INDEX-PAINEL — o painel `Kpis/index.html` é o artefato PRINCIPAL de acompanhamento (decisão do
// dono, 2026-08-04): não basta atualizar os JSON, o painel tem de MOSTRAR o estado. E D-007: ele nunca
// inventa dado — ausência é seção escondida ou buraco na série, jamais zero.
//
// A 1ª versão deste guard era TEATRO: a junta (`critico-adversarial`) substituiu as 3 séries por retas
// sintéticas e todos os testes passaram verdes, porque só checavam "tem <svg>". Desde então o guard amarra
// a CURVA ao JSON, e a regra é: toda asserção aqui tem de FALHAR se alguém trocar o dado por invenção.
//
// Reescrito em 2026-08-17 para o painel repaginado (o dono pediu a página do zero, para mostrar a
// investidores). Os seis invariantes do guard anterior estão preservados; os testes foram de 6 para 15.
// Cada um dos nove novos nasceu de um defeito real desta rodada, não de zelo abstrato:
//   - mutação do histórico tem de mover a curva (a 1ª versão deste guard passou com séries sintéticas);
//   - a cópia congelada do file:// tem de ser idêntica ao JSON (dois lugares com o mesmo número divergem);
//   - `fetch` que REJEITA — o file:// de verdade; testar só "fetch ausente" é testar o que nenhum
//     navegador produz;
//   - falha só do histórico (metade viva, metade ausente) tem de ser dita na tela;
//   - quebra de medida declarada tem de ser desenhada como quebra;
//   - semana sem MEDIÇÃO não vira zero entregas (este guard já afirmou o contrário — ver o teste);
//   - número declarado estimativa na fonte tem de chegar à tela dizendo que é estimativa;
//   - com zero críticos abertos, a página não pode anunciar destravamento de produção;
//   - histórico vazio ou ilegível não derruba a página.
// Esta lista já esteve errada: dizia "três novos", nomeava um invariante que não existe e outro que
// já existia. Um cabeçalho que descreve a si mesmo errado é a classe que este arquivo persegue.

const KPIS_DIR = fileURLToPath(new URL("../Kpis/", import.meta.url));
const APP_JS = readFileSync(`${KPIS_DIR}app.js`, "utf8");
const INDEX_HTML = readFileSync(`${KPIS_DIR}index.html`, "utf8");
const STYLES_CSS = readFileSync(`${KPIS_DIR}styles.css`, "utf8");
const HISTORY = JSON.parse(readFileSync(`${KPIS_DIR}kpis-history.json`, "utf8")) as ReadonlyArray<Record<string, unknown>>;
const LATEST = JSON.parse(readFileSync(`${KPIS_DIR}kpis-latest.json`, "utf8")) as Record<string, unknown>;

const CHART_IDS = ["chart-tests", "chart-blocks", "chart-velocity"] as const;
const CHARTS_SECTION = "charts-section";

type FakeEl = { id: string; hidden: boolean; innerHTML: string; textContent: string };
type Track = { key: string; label: string; points: ReadonlyArray<number | null>; measured: number; last: number | null };
type ChartSeries = {
  rows: ReadonlyArray<Record<string, unknown>>;
  dates: readonly string[];
  tracks: readonly Track[];
  blocks: ReadonlyArray<number | null>;
  // `count` é null na semana sem medição, e a forma carrega as três marcas que o gráfico desenha.
  // Este tipo já declarou `count: number` sem `medido`/`spansGap` — o próprio arquivo que policia
  // "artefato afirma o que a execução não produz" afirmando uma forma que a execução não produzia.
  weeks: ReadonlyArray<{
    start: string;
    label: string;
    count: number | null;
    medido: boolean;
    spansGap: boolean;
    parcial: boolean;
    diasMedidos: number;
  }>;
};
type Sandbox = Record<string, unknown> & {
  buildChartSeries?: (h: unknown) => ChartSeries;
  FROZEN?: Record<string, unknown>;
};

/** Executa o app.js num contexto isolado com DOM mínimo. Devolve os elementos e o próprio sandbox. */
async function runDashboard(options: {
  withFetch: boolean;
  serve?: Record<string, unknown>;
  /** `fetch` existe e REJEITA — é o que o navegador faz em file://, e o que o guard não exercitava. */
  rejeita?: boolean;
  /** Serve o latest e derruba só o histórico: metade viva, metade ausente. */
  soLatest?: boolean;
}): Promise<{ els: Map<string, FakeEl>; sandbox: Sandbox }> {
  const els = new Map<string, FakeEl>();
  const make = (id: string): FakeEl => ({ id, hidden: true, innerHTML: "", textContent: "" });
  const document = {
    getElementById(id: string) {
      if (!els.has(id)) els.set(id, make(id));
      return els.get(id);
    },
    createElement: () => ({ innerHTML: "", textContent: "", className: "", click() {}, appendChild() {}, setAttribute() {} }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    documentElement: { setAttribute() {}, classList: { add() {}, remove() {} } },
  };

  const fetchStub = async (path: string) => {
    // O navegador em file:// não remove o fetch: ele o mantém e REJEITA a requisição. Testar só
    // "fetch ausente" deixava passar qualquer mutação que quebrasse o caminho de rejeição.
    if (options.rejeita) throw new TypeError("Failed to fetch");
    if (options.soLatest && path.includes("history")) throw new TypeError("Failed to fetch");
    if (options.serve) {
      const key = path.includes("history") ? "history" : "latest";
      return { ok: true, json: async () => options.serve![key] };
    }
    const body = readFileSync(path.replace("./", KPIS_DIR), "utf8");
    return { ok: true, json: async () => JSON.parse(body) };
  };

  const sandbox: Sandbox = { document, console, setTimeout, clearTimeout, Math, JSON, Intl, Date, Array, Object, String, Number, isNaN, TypeError, Promise };
  if (options.withFetch || options.rejeita || options.soLatest) sandbox.fetch = fetchStub;

  vm.runInContext(APP_JS, vm.createContext(sandbox), { filename: "Kpis/app.js" });
  await new Promise((resolve) => setTimeout(resolve, 250)); // a hidratação é assíncrona
  return { els, sandbox };
}

/** Reimplementação INDEPENDENTE da leitura de métrica — se o app.js mudar a regra, os dois divergem. */
function expectedMetric(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).split("/")[0].replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

const expectedTrack = (row: Record<string, unknown>, key: string): number | null => {
  if (key === "frontend_smoke_tests") {
    return expectedMetric(row.frontend_smoke_tests != null ? row.frontend_smoke_tests : row.frontend_smoke);
  }
  return expectedMetric(row[key]);
};

const svgOf = (els: Map<string, FakeEl>) => CHART_IDS.map((id) => els.get(id)?.innerHTML ?? "").join("\n");

test("painel: o index.html declara os contêineres dos gráficos e a seção nasce escondida", () => {
  for (const id of CHART_IDS) {
    assert.ok(INDEX_HTML.includes(`id="${id}"`), `index.html precisa do contêiner #${id}`);
  }
  const secao = new RegExp(`id="${CHARTS_SECTION}"[^>]*\\bhidden\\b`);
  assert.match(INDEX_HTML, secao, "a seção de gráficos precisa nascer escondida (só aparece com dado real).");
});

test("painel: `hidden` realmente esconde — o CSS de autor não pode vencer o [hidden] do user agent", () => {
  // Bug real deste painel: `.section-grid--tight{display:block}` vencia o `[hidden]` do navegador e a
  // seção aparecia VAZIA. A blindagem explícita é obrigatória porque qualquer `display` numa classe que
  // também recebe `hidden` reabre o buraco.
  assert.match(
    STYLES_CSS.replace(/\s+/g, " "),
    /\[hidden\][^{]*\{[^}]*display:\s*none\s*!important/i,
    "styles.css precisa de `[hidden]{display:none !important}` — sem isso uma regra de layout reabre a seção vazia.",
  );
});

test("painel: a SÉRIE desenhada é a do kpis-history.json, ponto a ponto (não série fabricada)", async () => {
  const { sandbox } = await runDashboard({ withFetch: true });
  const build = sandbox.buildChartSeries;
  assert.equal(typeof build, "function", "app.js precisa expor `buildChartSeries` pura para o painel ser auditável.");

  const series = build!(HISTORY);
  const rows = HISTORY.filter((r) => r && r.snapshot_date);

  assert.equal(series.dates.length, rows.length, "a série tem de ter um ponto por registro do histórico");
  assert.deepEqual([...series.dates], rows.map((r) => String(r.snapshot_date)), "as datas divergiram do histórico");
  assert.equal(series.tracks.length, 3, "as três trilhas (backend, web, campo) têm de existir");

  for (const track of series.tracks) {
    const esperado = rows.map((r) => expectedTrack(r, track.key));
    assert.equal(track.points.length, rows.length, `${track.key}: o array de pontos mudou de comprimento — o alinhamento com as datas quebra`);
    assert.deepEqual([...track.points], esperado, `${track.key}: a série desenhada não é a do JSON`);
    assert.equal(track.measured, esperado.filter((v) => v !== null).length, `${track.key}: contagem de medições divergente`);
    assert.equal(track.last, [...esperado].reverse().find((v) => v !== null) ?? null, `${track.key}: o último valor não é o último MEDIDO`);
  }

  assert.deepEqual([...series.blocks], rows.map((r) => expectedMetric(r.blocks_completed)), "a série de blocos não é a do JSON");
});

test("painel: mutar o histórico move a curva — a série não é constante disfarçada", async () => {
  // O ataque que derrubou a 1ª versão deste guard foi trocar a série por uma reta e continuar verde.
  // Este teste prova a direção contrária: mexer no dado TEM de mexer no resultado.
  const { sandbox } = await runDashboard({ withFetch: true });
  const build = sandbox.buildChartSeries!;

  const original = build(HISTORY);
  const alvo = HISTORY.findIndex((r) => r && r.backend_tests != null);
  assert.ok(alvo >= 0, "o histórico precisa de ao menos um registro com backend_tests para este teste valer");

  const mutado = HISTORY.map((r, i) => (i === alvo ? { ...r, backend_tests: "1/1" } : r));
  const depois = build(mutado);

  const antesPt = original.tracks.find((t) => t.key === "backend_tests")!.points[alvo];
  const depoisPt = depois.tracks.find((t) => t.key === "backend_tests")!.points[alvo];
  assert.notEqual(depoisPt, antesPt, "mutar o JSON não mudou a série — ela não vem do JSON");
  assert.equal(depoisPt, 1, "a série não acompanhou o valor mutado");
});

test("painel: lacuna de medição não vira zero nem pico", async () => {
  const { sandbox } = await runDashboard({ withFetch: true });
  const series = sandbox.buildChartSeries!(HISTORY);
  const rows = HISTORY.filter((r) => r && r.snapshot_date);

  // Existem registros sem métrica alguma no histórico real (os primeiros, e um bloco documental no meio).
  const semMetrica = rows
    .map((r, i) => ({ i, vazio: ["backend_tests", "frontend_smoke_tests", "flutter_tests"].every((k) => expectedTrack(r, k) === null) }))
    .filter((x) => x.vazio)
    .map((x) => x.i);
  assert.ok(semMetrica.length > 0, "o histórico real tem registros sem métrica; se isso mudou, revise este guard");

  for (const i of semMetrica) {
    for (const track of series.tracks) {
      assert.equal(track.points[i], null, `${track.key}[${i}]: lacuna virou valor — foi assim que nasceu a barra fabricada de +969`);
    }
  }

  // E o buraco não pode ser desenhado: a contagem de vértices bate com as medições, não com as datas.
  const { els } = await runDashboard({ withFetch: true });
  const svg = svgOf(els);
  const vertices = [...svg.matchAll(/<polyline points="([^"]+)"/g)].map((m) => m[1].trim().split(/\s+/).length);
  for (const track of series.tracks) {
    assert.ok(
      vertices.every((n) => n <= rows.length),
      "alguma polilinha tem mais vértices do que registros no histórico — há ponto inventado",
    );
    assert.ok(track.measured <= rows.length, `${track.key}: medições não podem exceder registros`);
  }
});

test("painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado", async () => {
  // Este teste já afirmou o contrário, e estava errado: dizia que a semana vazia era "zero
  // VERDADEIRO". A série contava REGISTROS de KPI publicados, não entregas — e desenhava zero na
  // semana de 06/07/2026, em que 45 entregas foram mergeadas (as rodadas daquele período adiaram a
  // publicação de KPI para um snapshot único). O comentário do código jurava um fato que a execução
  // não produzia — a mesma classe de defeito que este arquivo existe para matar.
  //
  // A série agora deriva do acumulado `blocks_completed`, que é medição real, e semana sem medição
  // devolve `null`.
  const { sandbox } = await runDashboard({ withFetch: true });
  const series = sandbox.buildChartSeries!(HISTORY);

  const medidos = series.blocks.filter((v): v is number => v !== null);
  assert.ok(medidos.length >= 2, "o histórico precisa de ao menos duas medições de blocos");

  const soma = series.weeks.reduce((acc, w) => acc + (w.count ?? 0), 0);
  assert.equal(
    soma,
    medidos[medidos.length - 1] - medidos[0],
    "a soma das semanas tem de fechar com a diferença do acumulado — sobra ou falta é entrega inventada ou perdida",
  );

  const semMedicao = series.weeks.filter((w) => !w.medido);
  assert.ok(semMedicao.length > 0, "o histórico real tem semanas sem medição; se não tem mais, revise este guard");
  for (const w of semMedicao) {
    assert.equal(w.count, null, `${w.start}: semana sem medição virou número — ausência de medida não é ausência de entrega`);
  }

  for (const w of series.weeks) {
    assert.ok(w.count === null || (Number.isInteger(w.count) && w.count >= 0), `${w.start}: contagem semanal inválida`);
  }

  // E o desenho: nenhuma barra nem rótulo numérico onde não houve medição.
  const { els } = await runDashboard({ withFetch: true });
  const svg = els.get("chart-velocity")?.innerHTML ?? "";
  const barras = [...svg.matchAll(/class="bar /g)].length;
  assert.equal(
    barras,
    series.weeks.filter((w) => w.count !== null && w.count > 0).length,
    "o número de barras não bate com as semanas medidas com entrega",
  );
  assert.ok(svg.includes("week-gap"), "a semana sem medição precisa aparecer como lacuna, não sumir em silêncio");
  assert.match(svg, /sem medi[çc]ão/i, "o leitor precisa saber que a lacuna é falta de medida, não zero entregas");
});

test("painel: os gráficos são SVG inline, sem recurso externo, e aparecem com dado real", async () => {
  const { els } = await runDashboard({ withFetch: true });
  const secao = els.get(CHARTS_SECTION);
  assert.ok(secao && secao.hidden === false, "com dado real a seção de gráficos tem de aparecer");

  const svg = svgOf(els);
  assert.ok(svg.includes("<svg"), "os gráficos têm de ser SVG inline");
  assert.ok(/<polyline|<rect|<circle/.test(svg), "SVG sem geometria desenhada não é gráfico");

  // Zero dependência (PD-004): nada carregado de fora, em nenhum dos três arquivos.
  const externo = /https?:\/\/|\/\/cdn|<img\s|@import|url\(\s*['"]?https?:/i;
  for (const [nome, conteudo] of [["app.js", APP_JS], ["index.html", INDEX_HTML], ["styles.css", STYLES_CSS], ["svg gerado", svg]] as const) {
    const linhas = conteudo.split("\n").filter((l) => externo.test(l) && !/^\s*(\/\/|\*|<!--)/.test(l));
    assert.deepEqual(linhas, [], `${nome}: referência a recurso externo — o painel tem de ser autocontido:\n${linhas.join("\n")}`);
  }
});

test("painel: sem servidor o painel NÃO inventa gráfico, e diz que a cópia é congelada (D-007)", async () => {
  const { els, sandbox } = await runDashboard({ withFetch: false });

  const secao = els.get(CHARTS_SECTION);
  assert.ok(!secao || secao.hidden !== false, "sem histórico não pode haver seção de gráficos visível");
  assert.equal(svgOf(els).includes("<svg"), false, "sem dado real o painel desenhou gráfico — é exatamente o que D-007 proíbe");

  // O fallback tem de se ANUNCIAR. Um congelado que se disfarça de vivo é a mentira que este painel
  // existe para não contar.
  const textos = [...els.values()].map((e) => `${e.textContent} ${e.innerHTML}`).join(" ");
  assert.match(textos, /congelad/i, "o modo de fallback precisa estar rotulado na tela como cópia congelada");
  assert.ok(sandbox.FROZEN, "app.js precisa da cópia congelada embutida para o modo file://");
});

test("painel: com fetch que REJEITA (o file:// de verdade) o painel cai no congelado e não desenha", async () => {
  // O caso real do navegador: `fetch` existe e a requisição a arquivo local é rejeitada. O guard
  // antigo só testava `fetch` ausente, que nenhum navegador produz — uma mutação que quebrasse o
  // caminho de rejeição passava verde.
  const { els, sandbox } = await runDashboard({ withFetch: false, rejeita: true });

  assert.ok(sandbox.FROZEN, "sem leitura dos JSON, o painel precisa do congelado");
  const secao = els.get(CHARTS_SECTION);
  assert.ok(!secao || secao.hidden !== false, "fetch rejeitado não pode revelar a seção de gráficos");
  assert.equal(svgOf(els).includes("<svg"), false, "fetch rejeitado e mesmo assim desenhou gráfico");

  const textos = [...els.values()].map((e) => `${e.textContent} ${e.innerHTML}`).join(" ");
  assert.match(textos, /congelad/i, "o fallback por rejeição precisa se anunciar igual ao por ausência");
});

test("painel: se só o histórico falhar, os cartões vivos aparecem e os gráficos dizem por que não", async () => {
  // Meia leitura é o caso mais traiçoeiro: cartão vivo em cima, gráfico vazio embaixo, e nenhuma
  // palavra explicando — o leitor conclui que não há série, quando na verdade não houve leitura.
  const { els } = await runDashboard({ withFetch: false, soLatest: true });

  const secao = els.get(CHARTS_SECTION);
  assert.ok(!secao || secao.hidden !== false, "sem histórico não pode haver gráfico");
  assert.equal(svgOf(els).includes("<polyline"), false, "desenhou série sem ter lido o histórico");

  const nota = els.get("charts-offline-note");
  assert.ok(nota && nota.hidden === false, "a falha só do histórico tem de ser dita na tela");
  assert.match(`${nota!.textContent} ${nota!.innerHTML}`, /hist[óo]rico/i, "a nota precisa dizer o que faltou");
});

test("painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)", async () => {
  // Uma cópia embutida é um segundo lugar onde o mesmo número mora, e dois lugares divergem. Este teste
  // é o par do `scripts/kpi-freeze.mjs`: editar o JSON e esquecer de reinjetar falha aqui, antes do merge,
  // em vez de o painel mostrar número velho por file://.
  const { sandbox } = await runDashboard({ withFetch: false });
  assert.ok(sandbox.FROZEN, "app.js precisa da cópia congelada embutida");

  // Round-trip pelo realm do teste: o objeto nasce dentro do `vm`, então herda o Object.prototype DE LÁ
  // e um deepStrictEqual direto reprova objetos idênticos por protótipo. Comparar o JSON serializado
  // também dá uma falha legível — o diff de objeto despejaria o histórico inteiro no terminal.
  const congelado = JSON.parse(JSON.stringify(sandbox.FROZEN)) as Record<string, unknown>;

  const divergentes = [...new Set([...Object.keys(congelado), ...Object.keys(LATEST)])].filter(
    (k) => JSON.stringify(congelado[k]) !== JSON.stringify(LATEST[k]),
  );
  assert.deepEqual(
    divergentes,
    [],
    `a cópia congelada do app.js divergiu do kpis-latest.json nas chaves [${divergentes.join(", ")}] — rode \`node scripts/kpi-freeze.mjs\` e faça commit dos dois juntos.`,
  );
});

test("painel: quebra de medida declarada existe no histórico e é DESENHADA como quebra", async () => {
  // Duas vezes na história deste projeto a métrica mudou o que mede (13/07: o backend passou a contar
  // a suíte inteira, 15→766; o console web saiu de um valor congelado, 44→378). Ligar os dois lados
  // com uma linha contínua afirmaria um crescimento de 51× num dia, que não aconteceu. A quebra é
  // declarada como DADO — inferi-la pelo tamanho do salto puniria crescimento real.
  const breaks = (LATEST.series_breaks as { itens?: ReadonlyArray<{ serie: string; data: string; de: number; para: number; motivo: string }> } | undefined)?.itens ?? [];
  assert.ok(breaks.length > 0, "kpis-latest.json precisa declarar as quebras de medida em series_breaks");

  const { els, sandbox } = await runDashboard({ withFetch: true });
  const series = sandbox.buildChartSeries!(HISTORY);

  for (const b of breaks) {
    const track = series.tracks.find((t) => t.key === b.serie);
    assert.ok(track, `series_breaks cita a série "${b.serie}", que não existe no gráfico`);

    // A quebra é localizada pela TRANSIÇÃO, não pela data: várias entregas dividem o mesmo dia, e
    // uma declaração por data cairia na linha errada (foi assim que este teste pegou o primeiro erro).
    let anterior: number | null = null;
    let i = -1;
    for (let k = 0; k < track!.points.length; k++) {
      const v = track!.points[k];
      if (v === null) continue;
      if (anterior === b.de && v === b.para) { i = k; break; }
      anterior = v;
    }
    assert.ok(i >= 0, `${b.serie}: a transição declarada ${b.de}→${b.para} não existe na série do histórico`);
    assert.equal(series.dates[i], b.data, `${b.serie}: a transição ${b.de}→${b.para} cai em ${series.dates[i]}, não na data declarada ${b.data}`);
    assert.ok(b.motivo && b.motivo.length > 20, `${b.serie}@${b.data}: quebra sem motivo escrito — a quebra sem explicação vira mistério`);
  }

  // E o desenho tem de refletir isso: régua de quebra presente, e a série partida em mais de um traço.
  const svg = els.get("chart-tests")?.innerHTML ?? "";
  assert.ok(svg.includes("break-rule"), "a quebra foi declarada e o gráfico não a desenhou");
  const traços = [...svg.matchAll(/<polyline /g)].length;
  const seriesMedidas = series.tracks.filter((t) => t.measured > 1).length;
  assert.ok(
    traços > seriesMedidas,
    `a série não foi partida: ${traços} traços para ${seriesMedidas} trilhas medidas — a linha ainda cruza a quebra`,
  );
  assert.match(svg, /quebra|mudan[çc]a de medida/i, "o leitor precisa da explicação da quebra junto ao gráfico");
});

test("painel: número declarado ESTIMATIVA na fonte chega à tela dizendo que é estimativa", async () => {
  // Regressão real, pega por revisão adversarial: o painel anterior mostrava "Percentual estimado,
  // sujeito a revisão humana" como texto visível. A reconstrução tirou a ressalva da tela E promoveu
  // o número a manchete de 44px com barra de progresso — dando a um palpite a mesma gramática visual
  // de "2 de 15 achados críticos corrigidos", que é contagem real. Este guard fecha a classe: se a
  // fonte declara o número estimado, a palavra tem de sobreviver até o HTML.
  const metrics = (LATEST.metrics ?? {}) as Record<string, { note?: string; caveat?: string }>;
  const estimadas = Object.keys(metrics).filter((k) => /estimad/i.test(String(metrics[k]?.note ?? "")));
  assert.ok(estimadas.length > 0, "o kpis-latest.json real tem métricas declaradas estimadas; se não tem mais, revise este guard");

  const { els } = await runDashboard({ withFetch: true });
  const superficie = [...els.values()].map((e) => `${e.textContent} ${e.innerHTML}`).join(" ");

  for (const k of estimadas) {
    const caveat = String(metrics[k].caveat ?? "");
    assert.match(
      caveat,
      /estimad/i,
      `metrics.${k}: a fonte diz que é estimativa no campo \`note\`, que o painel NÃO renderiza — a ressalva precisa estar no \`caveat\`.`,
    );
    // POR MÉTRICA, e não uma busca global: a versão anterior deste guard fazia um único
    // `match(superficie, /estimad/i)` que o 88% satisfazia sozinho, enquanto o 99% chegava à tela
    // sem ressalva alguma no mesmo cartão. O guard passava verde e a mensagem de falha dizia que o
    // `caveat` "chega à tela" — afirmando um resultado que a execução não produzia, dentro do teste
    // escrito para matar exatamente essa classe.
    assert.ok(
      superficie.includes(caveat),
      `metrics.${k}: a fonte declara o número estimado e a ressalva NÃO chegou ao HTML renderizado.`,
    );
  }
});

test("painel: com zero achados críticos abertos, a página NÃO anuncia destravamento de produção", async () => {
  // Liberar produção é decisão de junta. Um painel que promete o destravamento ao ver um contador
  // zerar antecipa uma decisão que não é dele — e frases escritas à mão ("até os críticos fecharem")
  // sobrevivem ao próprio fim e passam a mentir.
  const pr = { ...(LATEST.production_readiness as Record<string, unknown>), p0_fechados: 15, p0_abertos: 0 };
  const itens = ((LATEST.findings as { itens?: ReadonlyArray<Record<string, unknown>> }).itens ?? []).map((i) =>
    i.severidade === "P0" ? { ...i, status: "fechado" } : i,
  );
  const mutado = { ...LATEST, production_readiness: pr, findings: { ...(LATEST.findings as object), itens } };

  const { els } = await runDashboard({ withFetch: true, serve: { latest: mutado, history: HISTORY } });
  const superficie = [...els.values()].map((e) => `${e.textContent} ${e.innerHTML}`).join(" ");

  assert.doesNotMatch(
    superficie,
    /at[ée] os (\d+ )?achados cr[íi]ticos (em aberto )?fecharem/i,
    "com zero críticos abertos, a página ainda promete uma condição já cumprida",
  );
  assert.doesNotMatch(superficie, /produção destrava quando/i, "o painel não pode anunciar destravamento — quem libera é a junta");
  assert.match(superficie, /junta/i, "com os críticos fechados, a página tem de dizer que a decisão é de junta");
});

test("painel: histórico vazio ou ilegível não derruba a página nem produz gráfico", async () => {
  for (const [nome, historico] of [["vazio", []], ["sem datas", [{ backend_tests: "10/10" }]], ["nulo", null]] as const) {
    const { els } = await runDashboard({ withFetch: true, serve: { latest: LATEST, history: historico } });
    const secao = els.get(CHARTS_SECTION);
    assert.ok(!secao || secao.hidden !== false, `histórico ${nome}: a seção de gráficos não pode aparecer`);
    assert.equal(svgOf(els).includes("<polyline"), false, `histórico ${nome}: desenhou série sem ter dado`);
  }
});

test("painel: o gráfico de rodadas conta entregas reais e DIZ o que ele recorta", async () => {
  // O CLAUDE.md §C3.0 lista quatro gráficos obrigatórios; este é o quarto, e ele carrega duas
  // ressalvas que precisam sobreviver a qualquer reescrita, porque sem elas o gráfico afirma mais
  // do que o dado sustenta:
  //   1. a rodada NÃO é um campo do dado — é lida do nome da versão, por convenção de nomenclatura;
  //   2. o gráfico corta em 19/07/2026, quando o registro virou contínuo. Antes disso uma rodada
  //      inteira cabia num snapshot (uma delas: 1 registro para 21 entregas), e comparar barras dos
  //      dois regimes mentiria.
  const { els, sandbox } = await runDashboard({ withFetch: true });
  const series = sandbox.buildChartSeries!(HISTORY) as unknown as {
    rounds: { itens: ReadonlyArray<{ label: string; value: number }>; fora: number; corte: string };
  };

  const r = series.rounds;
  assert.ok(r && r.itens.length > 0, "o gráfico de rodadas precisa de categorias");

  // A soma das barras + o que ficou fora do corte tem de dar o total do histórico. Barra que não
  // fecha com o total é entrega inventada ou perdida.
  const soma = r.itens.reduce((acc, x) => acc + x.value, 0);
  const rows = HISTORY.filter((x) => x && x.snapshot_date);
  assert.equal(soma + r.fora, rows.length, "soma das rodadas + recortados ≠ total de registros");
  assert.equal(
    r.fora,
    rows.filter((x) => String(x.snapshot_date) < r.corte).length,
    "a contagem de recortados não bate com o corte declarado",
  );

  const svg = els.get("chart-rounds")?.innerHTML ?? "";
  assert.ok(svg.includes("<svg"), "o gráfico de rodadas não foi desenhado");
  assert.match(svg, /nome da vers/i, "a tela precisa dizer que a rodada vem do nome da versão, não de um campo declarado");
  if (r.fora > 0) {
    assert.ok(svg.includes(String(r.fora)), "a tela precisa dizer quantas publicações ficaram fora do corte");
  }
});
