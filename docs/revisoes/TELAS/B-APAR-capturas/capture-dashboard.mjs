// B-APAR-DASH (trilha B-APAR-3, plano §2.5) — capturas do Dashboard no Edge headless (Playwright, canal msedge) contra um
// Vite PRÓPRIO em porta alta, em modo REAL (`VITE_USE_MOCKS=false`), no mesmo padrão do `capture-app.mjs` da OS: TODA
// chamada `/api/v1/**` é interceptada por `page.route` e respondida com as fixtures da referência aprovada
// (`frontend/tests/helpers/dashboard-aparencias.fixture.ts`); rota sem fixture responde 599 (falha fechada, registrada no
// log) — nunca a demo, nunca a base viva. O relógio da página fica preso no `NOW` da maquete (14/10/2026 09:40).
//
// Uso (a partir de `frontend/`, para o `tsx` resolver a fixture TypeScript):
//   node --import tsx ../docs/revisoes/TELAS/B-APAR-capturas/capture-dashboard.mjs <base> <saída>
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve(process.cwd(), "../package.json"));
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://127.0.0.1:47195";
const OUT = process.argv[3];
if (!OUT) throw new Error("informe a pasta de saída");
mkdirSync(OUT, { recursive: true });

const fx = await import(pathToFileURL(resolve(process.cwd(), "tests/helpers/dashboard-aparencias.fixture.ts")).href);
const { AGORA, SUMMARY_DTO, SERIES_POINTS, DISPATCHES_DTO, LOCATIONS_DTO, APPROVALS_DTO, WORK_ORDER_DTOS } = fx;

const TENANT = "org-guincho-exemplo";
const PROFILES = {
  gestor: { roles: ["Gestor Operacional"], perms: ["dashboard:read", "work_orders:read", "work_orders:create", "field_dispatch:read", "field_location:read", "customers:read", "vehicles:read", "teams:read", "services:read"] },
  suporte: { roles: ["Suporte"], perms: ["dashboard:read"] },
};

const log = [];
const note = (line) => {
  log.push(line);
  console.log(line);
};
const json = (status, body) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Respostas da API. `summary` escolhe o cenário do agregado (`ok`, `pendente`, `500`, `403`, `vazio`, ou função do nº da chamada). */
function apiHandler({ summary = "ok" }, unknown) {
  let summaryCalls = 0;
  return async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = route.request().method();
    if (method !== "GET") {
      unknown.add(`${method} ${path}`);
      return route.fulfill(json(599, { error: { code: "FIXTURE_MISSING" } }));
    }
    if (path === "/dashboard/summary") {
      summaryCalls += 1;
      const mode = typeof summary === "function" ? summary(summaryCalls) : summary;
      if (mode === "pendente") return;
      if (mode === "403") return route.fulfill(json(403, { error: { code: "FORBIDDEN", reason: "permission_required", message: "Forbidden." } }));
      if (mode === "500") return route.fulfill(json(500, { error: { code: "INTERNAL_SERVER_ERROR", reason: "unknown_error", message: "Unexpected error." } }));
      if (mode === "vazio") return route.fulfill(json(200, { data: { ...SUMMARY_DTO, criticalWorkOrders: [], recentEvents: [] } }));
      return route.fulfill(json(200, { data: SUMMARY_DTO }));
    }
    if (path === "/operations/work-orders-timeseries") return route.fulfill(json(200, { data: { from: SERIES_POINTS[0].date, to: SERIES_POINTS[29].date, points: SERIES_POINTS } }));
    if (path === "/operations/dispatches") return route.fulfill(json(200, { data: DISPATCHES_DTO }));
    if (path === "/field-locations/latest") return route.fulfill(json(200, { data: LOCATIONS_DTO }));
    if (path === "/approvals/pending") return route.fulfill(json(200, { data: APPROVALS_DTO }));
    if (path === "/work-orders") return route.fulfill(json(200, { items: WORK_ORDER_DTOS, pagination: { limit: 100, offset: 0, total: WORK_ORDER_DTOS.length } }));
    const detail = /^\/work-orders\/([^/]+)$/.exec(path);
    if (detail) {
      const order = WORK_ORDER_DTOS.find((o) => o.id === detail[1]);
      return route.fulfill(order ? json(200, { data: order }) : json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "Not found." } }));
    }
    if (/^\/(notifications|vehicles|fleet)/.test(path)) return route.fulfill(json(200, { data: [], items: [], pagination: { limit: 20, offset: 0, total: 0 } }));
    unknown.add(`${method} ${path}`);
    return route.fulfill(json(599, { error: { code: "FIXTURE_MISSING", message: "rota sem fixture na conferência visual" } }));
  };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function open({ appearance, width, height, profile = "gestor", summary = "ok", entry = "/dashboard" }) {
  const unknown = new Set();
  const context = await browser.newContext({ viewport: { width, height }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await context.newPage();
  page.on("pageerror", (error) => note(`  [erro na página] ${error.message}`));
  await page.clock.setFixedTime(AGORA);
  await page.route(/\/api\/v1\//, apiHandler({ summary }, unknown));
  await page.route(/:(3000|5173)\//, (route) => route.fulfill({ status: 599, body: "porta da demo bloqueada" }));
  await page.goto(`${BASE}/login`);
  const { roles, perms } = PROFILES[profile];
  await page.evaluate(
    async ({ appearance, TENANT, perms, roles }) => {
      const auth = await import("/src/mocks/auth/context.ts");
      const session = { ...auth.mockSession, user: { ...auth.mockSession.user, name: "Mariana Costa", roles, permissions: perms } };
      localStorage.clear();
      localStorage.setItem("erp-techsolutions.auth-session", JSON.stringify(session));
      localStorage.setItem(
        "erp-techsolutions.active-context",
        JSON.stringify({ tenantId: TENANT, tenantName: "Guincho Exemplo Ltda", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: roles[0], permissions: perms, enabledModules: ["dashboard", "work-orders", "field_operations"], scope: "tenant" }),
      );
      localStorage.setItem(`techsol.aparencia.${TENANT}.${session.user.id}`, JSON.stringify({ dashboard: appearance }));
    },
    { appearance, TENANT, perms, roles },
  );
  await page.goto(`${BASE}${entry}`);
  await page.waitForTimeout(summary === "pendente" ? 800 : 1600);
  return { context, page, unknown };
}

/** Medidas (§0.5): rolagem lateral da página e dos contêineres, altura das linhas, valor cortado, alvos de ação. */
async function measure(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    const rows = [...document.querySelectorAll("tr.pat-ab-row[data-row-key]")].map((tr) => Math.round(tr.getBoundingClientRect().height));
    const overflowing = [...document.querySelectorAll(".pat-card, .pat-table, .apardash-c-rail, .pat-dash-kpis, .apardash-c-blocos")]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible")
      .map((el) => el.className.split(" ")[0]);
    const clippedValues = [...document.querySelectorAll(".pat-kpi__value, .apardash-c-kpi b, .apardash-bloco-c b, .pat-dash-cads__n")].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
    const smallTargets = [...document.querySelectorAll(".apardash-c-kpi, .apardash-rail-item:not(.apardash-rail-item--static), .apardash-bloco-c")].filter((el) => el.getBoundingClientRect().height < 44).length;
    return {
      aparencia: document.querySelector("[data-aparencia]")?.getAttribute("data-aparencia") ?? null,
      paginaSemRolagemLateral: doc.scrollWidth <= doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      conteineresVazando: overflowing,
      linhas: rows.length,
      alturaMaxLinha: rows.length ? Math.max(...rows) : null,
      valoresCortados: clippedValues,
      alvosMenoresQue44: smallTargets,
    };
  });
}

/** Hover e foco visíveis: o estilo computado muda em repouso × hover × foco por teclado. */
async function hoverFocus(page, selector, label) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return note(`  ${label}: (não há ${selector})`);
  const style = () => el.evaluate((node) => {
    const cs = getComputedStyle(node);
    return `${cs.backgroundColor}|${cs.borderColor}|${cs.outlineStyle}|${cs.boxShadow}`;
  });
  await page.mouse.move(0, 0);
  const rest = await style();
  await el.hover();
  await page.waitForTimeout(250); // os controles têm transição de 150 ms
  const hover = await style();
  await page.mouse.move(0, 0);
  await el.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  const focus = await style();
  note(`  ${label}: hover muda=${rest !== hover} · foco muda=${rest !== focus}`);
}

async function shot(page, name, width, height, full = false) {
  const file = `${OUT}/app-${name}-${width}x${height}.png`;
  await page.screenshot({ path: file, fullPage: full });
  note(`  captura ${file.split("/").pop()}`);
}

const WIDTHS = [
  [1440, 900],
  [1366, 768],
  [1280, 720],
];

for (const appearance of ["A", "B", "C"]) {
  for (const [width, height] of WIDTHS) {
    const { context, page, unknown } = await open({ appearance, width, height });
    note(`${appearance} ${width}x${height} ${JSON.stringify(await measure(page))}`);
    await shot(page, appearance.toLowerCase(), width, height, width === 1440);
    if (unknown.size) note(`  rotas sem fixture: ${[...unknown].join(", ")}`);
    await context.close();
  }
  // 924×540 (a medida do §11) só para conferir que não há rolagem lateral
  const { context, page } = await open({ appearance, width: 924, height: 540 });
  note(`${appearance} 924x540 ${JSON.stringify(await measure(page))}`);
  await shot(page, `${appearance.toLowerCase()}`, 924, 540);
  await context.close();
}

// A: o painel do cartão aberto; hover e foco do cartão e da linha
{
  const { context, page } = await open({ appearance: "A", width: 1440, height: 900 });
  await page.getByRole("button", { name: "OS abertas: 18 — ver detalhes" }).click();
  await page.waitForTimeout(300);
  note(`  A painel aberto: ${await page.locator("section.apardash-panel").count()} · url=${page.url().replace(BASE, "")}`);
  await shot(page, "a-painel-cartao", 1440, 900);
  await hoverFocus(page, "button.pat-kpi--clickable", "A cartão");
  await hoverFocus(page, "tr.pat-ab-row[data-row-key]", "A linha");
  await hoverFocus(page, "button.apardash-cads-pill", "A cadastro");
  await context.close();
}

// B: a linha aberta (o detalhe pede GET /work-orders/:id)
{
  const { context, page } = await open({ appearance: "B", width: 1440, height: 900 });
  await page.locator('tr.pat-ab-row[data-row-key="crit:OS-2026-0418"]').click();
  await page.waitForTimeout(900);
  await page.locator('tr.pat-ab-row[data-row-key="crit:OS-2026-0418"]').scrollIntoViewIfNeeded();
  note(`  B linha aberta: detalhes=${await page.locator("tr.pat-ab-detail-row").count()} · url=${page.url().replace(BASE, "")}`);
  await shot(page, "b-linha-aberta", 1440, 900);
  await hoverFocus(page, "button.apardash-etapa-bar", "B etapa");
  await hoverFocus(page, "button.apardash-day", "B dia");
  await context.close();
}

// C: a fila com os tipos (inteira) e um item aberto
{
  const { context, page } = await open({ appearance: "C", width: 1440, height: 900 });
  const kinds = await page.locator("tr.pat-ab-row[data-row-key^='fila:'] td:first-child").allInnerTexts();
  note(`  C tipos na fila: ${JSON.stringify([...new Set(kinds)])}`);
  await shot(page, "c-fila-tipos", 1440, 900, true);
  await page.locator('tr.pat-ab-row[data-row-key="fila:stale-l1"]').click();
  await page.waitForTimeout(300);
  await shot(page, "c-item-aberto", 1440, 900);
  await hoverFocus(page, "button.apardash-bloco-c[aria-pressed=\"false\"]", "C bloco (não pressionado)");
  await hoverFocus(page, "button.apardash-c-kpi", "C número do resumo");
  await hoverFocus(page, "button.apardash-rail-item", "C item do Agora");
  await context.close();
}

// Perfil Suporte (só dashboard:read) nas 3
for (const appearance of ["A", "B", "C"]) {
  const { context, page, unknown } = await open({ appearance, width: 1440, height: 900, profile: "suporte" });
  note(`Suporte ${appearance} ${JSON.stringify(await measure(page))} · Nova OS=${await page.getByRole("button", { name: "Nova OS" }).count()} · Abrir OS=${await page.getByRole("button", { name: "Abrir OS" }).count()}`);
  await shot(page, `suporte-${appearance.toLowerCase()}`, 1440, 900, true);
  if (unknown.size) note(`  rotas sem fixture: ${[...unknown].join(", ")}`);
  await context.close();
}

// Estados §7 na A
for (const [state, summary] of [["carregando", "pendente"], ["vazio", "vazio"], ["erro", "500"], ["proibido", "403"]]) {
  const { context, page } = await open({ appearance: "A", width: 1440, height: 900, summary });
  await shot(page, `a-estado-${state}`, 1440, 900);
  await context.close();
}

await browser.close();
writeFileSync(`${OUT}/capturas-app-dashboard.log`, `${log.join("\n")}\n`);
