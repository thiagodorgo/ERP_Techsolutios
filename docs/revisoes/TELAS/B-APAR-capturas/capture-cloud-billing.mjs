// B-ASS-10b (T5, F11) — capturas da tela de custo e margem da plataforma (`/platform/cloud-billing`) no Edge headless
// (Playwright, canal msedge), contra um Vite PRÓPRIO em porta alta em modo real (`VITE_USE_MOCKS=false`), com TODA chamada
// `/api/v1/**` interceptada por `page.route` e respondida com as fixtures da tela (`tests/helpers/cloud-billing.fixture.ts`:
// payloads na forma do servidor do B-ASS-09, com os dados de exemplo da maquete). Rota sem fixture responde 599 (falha
// fechada, registrada no log) — nunca a demo, nunca a base viva. O relógio da página fica preso em 14/11/2026.
//
// Plano v2 §9.3: as 3 aparências nas 3 larguras (1280×720, 1366×768, 1440×900) com a medida `scrollWidth ≤ clientWidth`;
// o detalhe aberto; um filtro ativo; as 10 janelas; os estados do §6.5; o perfil "só consulta". PNG e log ficam FORA do
// repositório (a pasta de saída é argumento).
//
// Uso (a partir de `frontend/`, para o `tsx` resolver as fixtures TypeScript):
//   node --import tsx ../docs/revisoes/TELAS/B-APAR-capturas/capture-cloud-billing.mjs <base> <saída> [parte]
//   parte: tudo (padrão) | larguras | detalhe | janelas | estados | consulta
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve(process.cwd(), "../package.json"));
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://127.0.0.1:58412";
const OUT = process.argv[3];
const PART = process.argv[4] ?? "tudo";
if (!OUT) throw new Error("informe a pasta de saída");
mkdirSync(OUT, { recursive: true });

const fx = await import(pathToFileURL(resolve(process.cwd(), "tests/helpers/cloud-billing.fixture.ts")).href);
const { MONTH, COST_OK, NULL_ORIGINAL } = fx;
const AGORA = new Date("2026-11-14T15:00:00.000Z");

const FULL = [
  "platform:tenants:read",
  "platform:cloud-usage:read",
  "platform:cloud-costs:read",
  "platform:cloud-costs:import",
  "platform:cloud-cost-allocation:read",
  "platform:cloud-cost-allocation:run",
  "platform:billing:read",
  "platform:billing:manage",
];
// "só consulta": lê tudo, não escreve nada (sem importar, rodar, nem administrar a cobrança)
const READ_ONLY = ["platform:tenants:read", "platform:cloud-usage:read", "platform:cloud-costs:read", "platform:cloud-cost-allocation:read", "platform:billing:read"];

const log = [];
const note = (line) => {
  log.push(line);
  console.log(line);
};
const json = (status, body) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
const ok = (data) => json(200, { data });
const fail = (status, reason) => json(status, { error: { code: status === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR", reason, message: reason } });

const NULL_TOTALS = { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null };
const NULL_COSTS = { tenantsCost: null, platformOwnCost: null, unallocatedOther: null, unallocatedByReason: [], roundingResidualCost: null, conversionResidualCost: null, totalCost: null, margin: null, marginPct: null, alert: "cost_missing" };
const noCost = (status, extra = {}) => ({ ...COST_OK, status, runId: status === "no_run" ? null : "run-out", fxRate: null, fxRateVersion: null, ...extra });
const linesWithoutCost = () => fx.tenantLines().map((line) => ({ ...line, allocatedCost: null, allocatedCostOriginal: null, margin: null, marginPct: null, alert: "cost_missing" }));

/** O mês da tela por cenário: { tenant, group, global } na forma do servidor. */
function screenMonth(scenario) {
  if (scenario === "vazio") {
    const cost = noCost("no_run");
    return { tenant: fx.tenantPayload(MONTH, cost, [], NULL_TOTALS), group: { ...fx.groupPayload(MONTH, cost), lines: [], totals: NULL_TOTALS }, global: fx.globalPayload(MONTH, cost, fx.globalJson({ ...NULL_COSTS, subscriptionTotal: null, original: NULL_ORIGINAL })) };
  }
  if (scenario === "sem-rateio" || scenario === "sem-dolar") {
    const cost = scenario === "sem-rateio" ? noCost("no_run") : noCost("fx_missing", { currencyOriginal: "USD" });
    const original = scenario === "sem-rateio" ? NULL_ORIGINAL : undefined;
    return { tenant: fx.tenantPayload(MONTH, cost, linesWithoutCost(), { ...NULL_TOTALS, subscriptionAmount: "7770.00" }), group: fx.groupPayload(MONTH, cost), global: fx.globalPayload(MONTH, cost, fx.globalJson(original ? { ...NULL_COSTS, original } : NULL_COSTS)) };
  }
  if (scenario === "rateio-antigo") {
    const cost = { ...COST_OK, status: "legacy_unscoped", coverage: "legacy_unscoped" };
    return { tenant: fx.tenantPayload(MONTH, cost), group: fx.groupPayload(MONTH, cost), global: fx.globalPayload(MONTH, cost) };
  }
  return { tenant: fx.tenantPayload(MONTH), group: fx.groupPayload(MONTH), global: fx.globalPayload(MONTH) };
}

function previousMonth(month) {
  const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const index = Math.max(0, months.indexOf(month));
  const tenant = fx.tenantPayload(month, { ...COST_OK, runId: `run-${month}` }, fx.tenantLines().map((item) => ({ ...item, allocatedCost: null, margin: null, marginPct: null, allocatedCostOriginal: null })), NULL_TOTALS);
  return { tenant, group: { ...fx.groupPayload(month), lines: [], totals: NULL_TOTALS }, global: fx.previousGlobalPayload(month, index) };
}

/** Respostas da API por cenário. `carregando` nunca responde o mês da tela. */
function apiHandler(scenario, unknown) {
  return async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = route.request().method();
    if (method !== "GET") {
      unknown.add(`${method} ${path} (escrita bloqueada na captura)`);
      return route.fulfill(json(599, { error: { code: "CAPTURE_READ_ONLY", message: "a captura não grava" } }));
    }
    if (path === "/platform/billing/overview") {
      const period = url.searchParams.get("period");
      const groupBy = url.searchParams.get("groupBy");
      if (period === MONTH) {
        if (scenario === "carregando") return; // nunca responde
        if (scenario === "proibido") return route.fulfill(fail(403, "permission_required"));
        if (scenario === "erro") return route.fulfill(fail(500, "unknown_error"));
        if (scenario === "erro-grupo-duplo") return route.fulfill(fail(500, "membership_integrity_violation"));
        return route.fulfill(ok(screenMonth(scenario)[groupBy]));
      }
      return route.fulfill(ok(previousMonth(period)[groupBy]));
    }
    if (path === "/platform/cloud-cost-allocations/runs") {
      if (scenario === "processando") return route.fulfill(ok([...fx.RUNS_PAYLOAD, { id: "run-p", provider: "aws", status: "processing", periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-10-31T00:00:00.000Z", startedAt: "2026-11-14T14:40:00.000Z", createdAt: "2026-11-14T14:40:00.000Z" }]));
      return route.fulfill(ok(scenario === "vazio" || scenario === "sem-rateio" ? [] : fx.RUNS_PAYLOAD));
    }
    if (/^\/platform\/cloud-cost-allocations\/runs\/[^/]+\/tenant-allocations$/.test(path)) {
      return route.fulfill(ok([
        { serviceCode: "AmazonRDS", costCategory: "database", allocatedCost: 212.4, currency: "USD" },
        { serviceCode: "AmazonECS", costCategory: "compute", allocatedCost: 141.1, currency: "USD" },
        { serviceCode: "AmazonS3", costCategory: "storage", allocatedCost: 49.4, currency: "USD" },
      ]));
    }
    if (path === "/platform/billing/fx-rates") return route.fulfill(ok(scenario === "sem-dolar" ? fx.FX_PAYLOAD.filter((item) => item.month !== MONTH) : fx.FX_PAYLOAD));
    if (path === "/platform/billing/economic-groups") return route.fulfill(ok(fx.GROUPS_PAYLOAD));
    const group = /^\/platform\/billing\/economic-groups\/([^/]+)(\/history)?$/.exec(path);
    if (group) {
      const detail = fx.GROUP_DETAILS[group[1]];
      if (!detail) return route.fulfill(fail(404, "group_not_found"));
      return route.fulfill(ok(group[2] ? detail.members : detail));
    }
    if (path === "/platform/cloud-costs/imports") return route.fulfill(ok(scenario === "vazio" || scenario === "sem-rateio" ? [] : fx.IMPORTS_PAYLOAD));
    unknown.add(`${method} ${path}`);
    return route.fulfill(json(599, { error: { code: "FIXTURE_MISSING", message: "rota sem fixture na conferência visual" } }));
  };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function open({ appearance, width, height, scenario = "ok", perms = FULL }) {
  const unknown = new Set();
  const context = await browser.newContext({ viewport: { width, height }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await context.newPage();
  page.on("pageerror", (error) => note(`  [erro na página] ${error.message}`));
  await page.clock.setFixedTime(AGORA);
  await page.route(/\/api\/v1\//, apiHandler(scenario, unknown));
  await page.route(/:(3000|5173)\//, (route) => route.fulfill({ status: 599, body: "porta da demo bloqueada" }));
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(
    async ({ appearance, perms }) => {
      const auth = await import("/src/mocks/auth/context.ts");
      const session = { ...auth.mockSession, user: { ...auth.mockSession.user, name: "Admin Plataforma", roles: ["Super Admin"], permissions: perms } };
      localStorage.clear();
      localStorage.setItem("erp-techsolutions.auth-session", JSON.stringify(session));
      // a chave do console da plataforma (plano v2 §6.6): pessoal, sem organização ativa
      localStorage.setItem(`techsol.aparencia.plataforma.${session.user.id}`, JSON.stringify({ "platform-cloud-billing": appearance }));
    },
    { appearance, perms },
  );
  await page.goto(`${BASE}/platform/cloud-billing`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(scenario === "carregando" ? 1500 : 3500);
  return { context, page, unknown };
}

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    return {
      paginaSemRolagemLateral: doc.scrollWidth <= doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      aparencia: document.querySelector(".cb-view[data-aparencia]")?.getAttribute("data-aparencia") ?? null,
    };
  });
}

async function shot(page, name, width, height, full = false) {
  const file = `${OUT}/app-${name}-${width}x${height}.png`;
  await page.screenshot({ path: file, fullPage: full });
  note(`  captura ${file.split("/").pop()}`);
}

/** A tela rola dentro do contêiner do layout (não no documento): captura a tela inteira em quadros, rolando esse contêiner. */
async function shotScrolled(page, name, width, height) {
  const steps = await page.evaluate(() => {
    const scroller = [...document.querySelectorAll("*")].find((el) => {
      const style = getComputedStyle(el);
      return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4 && el.querySelector(".cb-view");
    });
    if (!scroller) return 0;
    scroller.setAttribute("data-captura-rolagem", "");
    return Math.min(6, Math.ceil(scroller.scrollHeight / (scroller.clientHeight * 0.9)));
  });
  for (let index = 0; index < Math.max(1, steps); index += 1) {
    if (steps) {
      await page.evaluate((i) => {
        const scroller = document.querySelector("[data-captura-rolagem]");
        scroller.scrollTop = Math.round(i * scroller.clientHeight * 0.9);
      }, index);
      await page.waitForTimeout(250);
    }
    await shot(page, `${name}-parte${index + 1}`, width, height);
  }
}

function reportUnknown(unknown) {
  if (unknown.size) note(`  rotas sem fixture: ${[...unknown].join(", ")}`);
}

const SIZES = [
  [1440, 900],
  [1366, 768],
  [1280, 720],
];
const DIALOGS = [
  ["importar", "header", "Importar arquivo de custo"],
  ["rodar", "header", "Rodar rateio do mês"],
  ["dolar", "header", "Dólar do mês"],
];

const PARTS = {
  async larguras() {
    for (const appearance of ["A", "B", "C"]) {
      for (const [width, height] of SIZES) {
        const { context, page, unknown } = await open({ appearance, width, height });
        const m = await measure(page);
        note(`${appearance} ${width}x${height} ${JSON.stringify(m)}${m.aparencia !== appearance ? " · AVISO: a aparência desenhada não é a pedida" : ""}`);
        await shotScrolled(page, appearance.toLowerCase(), width, height);
        reportUnknown(unknown);
        await context.close();
      }
    }
  },
  async detalhe() {
    for (const appearance of ["A", "B", "C"]) {
      const { context, page, unknown } = await open({ appearance, width: 1440, height: 900 });
      // o detalhe aberto: a 1ª linha da lista
      await page.locator("table.pat-ab-table tbody tr").first().click();
      await page.waitForTimeout(1200);
      await page.locator("[data-detalhe]").first().scrollIntoViewIfNeeded().catch(() => undefined);
      await shot(page, `${appearance.toLowerCase()}-detalhe`, 1440, 900);
      // um filtro ativo: o 1º bloco que filtra
      await page.locator("[data-alvo]").first().click();
      await page.waitForTimeout(600);
      await page.locator(".pat-filtro-chip-bar").first().scrollIntoViewIfNeeded().catch(() => undefined);
      await shot(page, `${appearance.toLowerCase()}-filtro`, 1440, 900);
      reportUnknown(unknown);
      await context.close();
    }
  },
  async janelas() {
    const { context, page, unknown } = await open({ appearance: "A", width: 1440, height: 900 });
    const closeDialog = async () => {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    };
    const openFrom = async (scope, label) => {
      await page.locator(`${scope} button`, { hasText: label }).first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(1200);
    };
    for (const [name, , label] of DIALOGS) {
      await openFrom(".pat-page-header__actions", label);
      await shot(page, `janela-${name}`, 1440, 900);
      await closeDialog();
    }
    // arquivos do mês (o aviso/o painel de importações)
    const imports = page.locator("button", { hasText: /Ver arquivos|arquivos do mês|Arquivos/ }).first();
    if (await imports.count()) {
      await imports.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(1000);
      await shot(page, "janela-arquivos", 1440, 900);
      await closeDialog();
    } else note("  janela-arquivos: botão não achado na A");
    // grupos: pela lista "Por grupo"
    await page.locator('button[role="tab"]', { hasText: "Por grupo" }).first().click();
    await page.waitForTimeout(600);
    await page.locator("table.pat-ab-table tbody tr", { hasText: "Grupo Vale" }).first().click();
    await page.waitForTimeout(1000);
    for (const [name, label] of [
      ["membros", "Editar membros"],
      ["historico", "Histórico"],
      ["renomear", "Renomear"],
      ["excluir", "Excluir grupo"],
    ]) {
      await openFrom("[data-detalhe]", label);
      await shot(page, `janela-${name}`, 1440, 900);
      await closeDialog();
    }
    await page.locator(".pat-os-toolbar button, button", { hasText: "Novo grupo" }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(600);
    await shot(page, "janela-novo-grupo", 1440, 900);
    await closeDialog();
    // "Mudar de grupo": quem não tem grupo e quem tem
    await page.locator('button[role="tab"]', { hasText: "Por organização" }).first().click();
    await page.waitForTimeout(600);
    for (const [name, org] of [
      ["mudar-sem-grupo", "Guincho Exemplo Ltda"],
      ["mudar-com-grupo", "Frota Vale Transportes"],
    ]) {
      await page.locator("table.pat-ab-table tbody tr", { hasText: org }).first().click();
      await page.waitForTimeout(800);
      await openFrom("[data-detalhe]", "Mudar de grupo");
      await shot(page, `janela-${name}`, 1440, 900);
      await closeDialog();
      await page.locator("table.pat-ab-table tbody tr", { hasText: org }).first().click();
      await page.waitForTimeout(400);
    }
    reportUnknown(unknown);
    await context.close();
  },
  async estados() {
    for (const appearance of ["A", "B", "C"]) {
      for (const scenario of ["carregando", "vazio", "erro", "erro-grupo-duplo", "proibido", "sem-rateio", "sem-dolar", "rateio-antigo", "processando"]) {
        const { context, page, unknown } = await open({ appearance, width: 1440, height: 900, scenario });
        const m = await measure(page);
        note(`${appearance} estado ${scenario} ${JSON.stringify(m)}`);
        await shot(page, `${appearance.toLowerCase()}-estado-${scenario}`, 1440, 900);
        reportUnknown(unknown);
        await context.close();
      }
    }
  },
  async consulta() {
    for (const appearance of ["A", "B", "C"]) {
      const { context, page, unknown } = await open({ appearance, width: 1440, height: 900, perms: READ_ONLY });
      const buttons = await page.locator(".pat-page-header__actions button").allInnerTexts();
      note(`${appearance} só consulta: botões do cabeçalho = ${JSON.stringify(buttons.map((text) => text.replace(/\s+/g, " ").trim()))}`);
      await shotScrolled(page, `${appearance.toLowerCase()}-so-consulta`, 1440, 900);
      if (appearance === "A") {
        await page.locator(".pat-page-header__actions button", { hasText: "Dólar do mês" }).first().click();
        await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
        await page.waitForTimeout(800);
        await shot(page, "a-so-consulta-dolar", 1440, 900);
      }
      reportUnknown(unknown);
      await context.close();
    }
  },
};

const order = PART === "tudo" ? Object.keys(PARTS) : [PART];
for (const part of order) {
  if (!PARTS[part]) throw new Error(`parte sem roteiro: ${part}`);
  note(`== ${part}`);
  await PARTS[part]();
}
await browser.close();
writeFileSync(`${OUT}/capturas-cloud-billing-${PART}.log`, `${log.join("\n")}\n`);
