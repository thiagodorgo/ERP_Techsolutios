// B-APAR-OS (fundação da trilha B-APAR-3, plano §0.5 "Conferência visual") — capturas do APP no Edge headless (Playwright,
// canal msedge) contra um Vite PRÓPRIO em porta alta, em modo REAL (`VITE_USE_MOCKS=false`), com TODA chamada `/api/v1/**`
// interceptada por `page.route` e respondida com as fixtures da referência aprovada. Rota sem fixture responde 599 (falha
// fechada, registrada no log) — nunca a demo, nunca a base viva. O relógio da página fica preso no `AGORA` da maquete, e a
// lista vem na ordem do servidor (mais recentes primeiro), como na referência.
//
// Uso (a partir de `frontend/`, para o `tsx` resolver as fixtures TypeScript):
//   node --import tsx ../docs/revisoes/TELAS/B-APAR-capturas/capture-app.mjs <base> <saída> <tela>
//   ex.: node --import tsx ../docs/revisoes/TELAS/B-APAR-capturas/capture-app.mjs http://127.0.0.1:5191 C:/…/apar-os os
// Cada tela da trilha acrescenta o seu roteiro em `SCREENS` (os blocos seguintes só somam fixtures e roteiro).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve(process.cwd(), "../package.json"));
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://127.0.0.1:5191";
const OUT = process.argv[3];
const SCREEN = process.argv[4] ?? "os";
if (!OUT) throw new Error("informe a pasta de saída");
mkdirSync(OUT, { recursive: true });

const fixture = await import(pathToFileURL(resolve(process.cwd(), "tests/helpers/os-aparencias.fixture.ts")).href);
const { OS_FIXTURE, toListDto, AGORA } = fixture;

const TENANT = "org-guincho-exemplo";
const PERMS = [
  "dashboard:read",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:status",
  "work_orders:cancel",
  "work_orders:comment",
  "work_orders:approve",
  "work_order_financials:read",
  "service_quotes:read",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:cancel",
];

const log = [];
const note = (line) => {
  log.push(line);
  console.log(line);
};

const json = (status, body) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Respostas da API por cenário da lista. `pendente` nunca responde (estado carregando). */
function apiHandler(scenario, unknown) {
  let listCalls = 0;
  return async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const method = route.request().method();
    if (method === "GET" && /^\/work-orders$/.test(path)) {
      listCalls += 1;
      const mode = typeof scenario === "function" ? scenario(listCalls) : scenario;
      if (mode === "pendente") return; // nunca responde
      if (mode === "403") return route.fulfill(json(403, { error: { code: "FORBIDDEN", reason: "permission_required", message: "One of these permissions is required: work_orders:read." } }));
      if (mode === "500") return route.fulfill(json(500, { error: { code: "INTERNAL_SERVER_ERROR", reason: "unknown_error", message: "Unexpected error." } }));
      if (mode === "vazio") return route.fulfill(json(200, { items: [], pagination: { limit: 20, offset: 0, total: 0 } }));
      return route.fulfill(json(200, { items: [...OS_FIXTURE].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).map(toListDto), pagination: { limit: 20, offset: 0, total: OS_FIXTURE.length } }));
    }
    const detail = /^\/work-orders\/([^/]+)$/.exec(path);
    if (method === "GET" && detail) {
      const order = OS_FIXTURE.find((o) => o.id === detail[1]);
      return route.fulfill(order ? json(200, { data: { ...toListDto(order), description: "Atendimento de exemplo da referência aprovada." } }) : json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "Not found." } }));
    }
    if (method === "GET" && /^\/work-orders\/[^/]+\/(timeline|comments|attachments|financial-items|quotes|audit-logs|checklists|registry-links)/.test(path)) return route.fulfill(json(200, { data: [] }));
    if (method === "GET" && /^\/approvals\/pending/.test(path)) return route.fulfill(json(200, { data: [] }));
    if (method === "GET" && /^\/notifications/.test(path)) return route.fulfill(json(200, { data: [], items: [], pagination: { limit: 20, offset: 0, total: 0 } }));
    unknown.add(`${method} ${path}`);
    return route.fulfill({ status: 599, contentType: "application/json", body: JSON.stringify({ error: { code: "FIXTURE_MISSING", message: "rota sem fixture na conferência visual" } }) });
  };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function open({ appearance, width, height, scenario = "ok", entry = "/work-orders" }) {
  const unknown = new Set();
  const context = await browser.newContext({ viewport: { width, height }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await context.newPage();
  page.on("pageerror", (error) => note(`  [erro na página] ${error.message}`));
  await page.clock.setFixedTime(AGORA);
  await page.route(/\/api\/v1\//, apiHandler(scenario, unknown));
  await page.route(/:(3000|5173)\//, (route) => route.fulfill({ status: 599, body: "porta da demo bloqueada" }));
  await page.goto(`${BASE}/login`);
  await page.evaluate(
    async ({ appearance, TENANT, PERMS }) => {
      const auth = await import("/src/mocks/auth/context.ts");
      const session = { ...auth.mockSession, user: { ...auth.mockSession.user, name: "Mariana Costa", roles: ["Gestor Operacional"], permissions: PERMS } };
      localStorage.clear();
      localStorage.setItem("erp-techsolutions.auth-session", JSON.stringify(session));
      localStorage.setItem(
        "erp-techsolutions.active-context",
        JSON.stringify({ tenantId: TENANT, tenantName: "Guincho Exemplo Ltda", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Gestor Operacional", permissions: PERMS, enabledModules: ["dashboard", "work-orders", "field_operations"], scope: "tenant" }),
      );
      localStorage.setItem(`techsol.aparencia.${TENANT}.${session.user.id}`, JSON.stringify({ "ordens-de-servico": appearance }));
    },
    { appearance, TENANT, PERMS },
  );
  await page.goto(`${BASE}${entry}`);
  await page.waitForTimeout(scenario === "pendente" ? 800 : 1500);
  return { context, page, unknown };
}

/** Medidas da página (a lista do §0.5): rolagem lateral, altura das linhas, foco e hover visíveis. */
async function measure(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement ?? document.documentElement;
    const rows = [...document.querySelectorAll("tr.pat-ab-row[data-row-key]")].map((tr) => Math.round(tr.getBoundingClientRect().height));
    const card = document.querySelector(".aparos-card");
    return {
      paginaSemRolagemLateral: doc.scrollWidth <= doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      cartaoRolaPorDentro: card ? card.scrollWidth > card.clientWidth : null,
      linhas: rows.length,
      alturaMaxLinha: rows.length ? Math.max(...rows) : null,
      aparencia: document.querySelector("[data-aparencia]")?.getAttribute("data-aparencia") ?? null,
    };
  });
}

async function shot(page, name, width, height, full = false) {
  const file = `${OUT}/app-${name}-${width}x${height}.png`;
  await page.screenshot({ path: file, fullPage: full });
  note(`  captura ${file.split("/").pop()}`);
}

const SIZES = [
  [1440, 900],
  [390, 844],
];
const EXTRA = [
  [1366, 768],
  [1280, 720],
  [924, 540],
];

const SCREENS = {
  async os() {
    for (const appearance of ["A", "B", "C"]) {
      for (const [width, height] of [...SIZES, ...EXTRA]) {
        const { context, page, unknown } = await open({ appearance, width, height });
        const m = await measure(page);
        note(`${appearance} ${width}x${height} ${JSON.stringify(m)}`);
        const full = SIZES.some(([w, h]) => w === width && h === height);
        await shot(page, `${appearance.toLowerCase()}`, width, height, full);
        if (unknown.size) note(`  rotas sem fixture: ${[...unknown].join(", ")}`);
        await context.close();
      }
    }

    // A: resumo aberto; hover e foco medidos por estilo computado
    {
      const { context, page } = await open({ appearance: "A", width: 1440, height: 900 });
      await page.locator('tr.pat-ab-row[data-row-key="os-102"]').click();
      await page.waitForTimeout(300);
      await shot(page, "a-resumo", 1440, 900);
      const row = page.locator('tr.pat-ab-row[data-row-key="os-103"]');
      const rest = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
      await row.hover();
      const hover = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
      await page.keyboard.press("Tab");
      const kpi = page.locator("button.pat-kpi--clickable").first();
      await kpi.focus();
      const kpiFocus = await kpi.evaluate((el) => getComputedStyle(el).outlineStyle);
      note(`  A linha repouso=${rest} hover=${hover} · indicador foco outline=${kpiFocus}`);
      await page.locator('tr.pat-ab-row[data-row-key="os-102"]').focus();
      await page.keyboard.press("Escape");
      const expanded = await page.locator('tr.pat-ab-row[data-row-key="os-102"]').getAttribute("aria-expanded");
      note(`  A Escape na linha aberta → aria-expanded=${expanded}`);
      await context.close();
    }

    // B: janela aberta (Informações gerais e Arquivos), Escape fecha e o foco volta à linha
    {
      const { context, page } = await open({ appearance: "B", width: 1440, height: 900 });
      await page.locator('tr.pat-ab-row[data-row-key="os-122"]').click();
      await page.getByRole("button", { name: "Abrir OS" }).click();
      await page.waitForTimeout(1200);
      const box = await page.locator("[role='dialog']").boundingBox();
      note(`  B janela ${JSON.stringify(box)} url=${page.url().replace(BASE, "")}`);
      await shot(page, "b-janela-informacoes", 1440, 900);
      await page.getByRole("button", { name: "Arquivos" }).click();
      await page.waitForTimeout(600);
      const box2 = await page.locator("[role='dialog']").boundingBox();
      note(`  B janela após trocar de seção ${JSON.stringify(box2)} (mesmo tamanho: ${JSON.stringify(box) === JSON.stringify(box2)})`);
      await shot(page, "b-janela-arquivos", 1440, 900);
      const focusedInDialog = await page.evaluate(() => document.querySelector("[role='dialog']")?.contains(document.activeElement) ?? false);
      note(`  B foco dentro da janela: ${focusedInDialog}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => ({ dialog: Boolean(document.querySelector("[role='dialog']")), focused: document.activeElement?.getAttribute("data-row-key") ?? document.activeElement?.tagName }));
      note(`  B Escape → janela aberta=${after.dialog} foco em=${after.focused}`);
      await shot(page, "b-depois-de-fechar", 1440, 900);
      // filtro por barra
      await page.getByRole("button", { name: /^Aberta: 5/ }).click();
      await page.waitForTimeout(300);
      await shot(page, "b-filtro-situacao", 1440, 900);
      await context.close();
    }

    // C: grupo Atrasadas filtrado + resumo com o ciclo
    {
      const { context, page } = await open({ appearance: "C", width: 1440, height: 900 });
      await page.getByRole("button", { name: /^Atrasadas: 6/ }).click();
      await page.locator('tr.pat-ab-row[data-row-key="os-109"]').click();
      await page.waitForTimeout(300);
      await shot(page, "c-atrasadas-resumo", 1440, 900);
      await context.close();
    }

    // Estados §7 na A
    for (const [state, scenario] of [["carregando", "pendente"], ["vazio", "vazio"], ["erro", "500"], ["proibido", "403"]]) {
      const { context, page } = await open({ appearance: "A", width: 1440, height: 900, scenario });
      await shot(page, `a-estado-${state}`, 1440, 900);
      await context.close();
    }
    await SCREENS["os-desatualizado"]();
    // o menu de aparência (rodapé da barra lateral) com rolagem
    {
      const { context, page } = await open({ appearance: "A", width: 1440, height: 900 });
      await page.getByRole("button", { name: "Aparência das telas" }).click();
      await page.waitForTimeout(300);
      const panel = await page.locator("[role='menu'][aria-label='Aparência das telas']").evaluate((el) => ({ h: Math.round(el.getBoundingClientRect().height), sh: el.scrollHeight, top: Math.round(el.getBoundingClientRect().top) }));
      note(`  menu de aparência ${JSON.stringify(panel)}`);
      await shot(page, "menu-aparencia", 1440, 900);
      await context.close();
    }
  },
  // o Vite de desenvolvimento roda o React em modo estrito: a 1ª carga pede a lista DUAS vezes (a 2ª vale); só as
  // chamadas seguintes (a auto-atualização de 30 s) falham.
  async "os-desatualizado"() {
    const { context, page } = await open({ appearance: "A", width: 1440, height: 900, scenario: (n) => (n <= 2 ? "ok" : "500") });
    note("  desatualizado: espera o ciclo de auto-atualização (30 s)…");
    await page.waitForTimeout(31500);
    note(`  desatualizado: faixa=${await page.locator("[data-state='stale']").count()} linhas=${await page.locator("tr.pat-ab-row[data-row-key]").count()}`);
    await shot(page, "a-estado-desatualizado", 1440, 900);
    await context.close();
  },
};

if (!SCREENS[SCREEN]) throw new Error(`tela sem roteiro: ${SCREEN}`);
await SCREENS[SCREEN]();
await browser.close();
writeFileSync(`${OUT}/capturas-app${SCREEN === "os" ? "" : `-${SCREEN}`}.log`, `${log.join("\n")}\n`);
