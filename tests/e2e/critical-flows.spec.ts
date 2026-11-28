import { expect, test, type Locator, type Page } from "@playwright/test";
import { Prisma, type PrismaClient } from "@prisma/client";

import { createE2ePrisma } from "./apoio/banco.js";
import {
  DEMO_EMAIL,
  DEMO_ORGANIZATION,
  DEMO_PASSWORD,
  PLATFORM_EMAIL,
  PLATFORM_PASSWORD,
  SESSAO_ADMIN,
  entrarPelaTela,
  escolherOrganizacaoDemo,
} from "./apoio/sessao.js";

const emptyStorageState = { cookies: [], origins: [] };
const apiPort = process.env.E2E_API_PORT ?? "3442";
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${apiPort}/api/v1`;
const e2eChecklistId = "11111111-2222-4333-8444-555555555555";
const e2eVehicleComponentId = "11111111-2222-4333-8444-555555555556";
const e2ePhotoComponentId = "11111111-2222-4333-8444-555555555557";

let demoTenantId = "";

test.use({ storageState: SESSAO_ADMIN });

test.beforeAll(async () => {
  const prisma = createE2ePrisma();

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "demo" },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error("Tenant demo nao encontrado. Execute npm run db:seed antes do E2E.");
    }

    demoTenantId = tenant.id;
    await prisma.checklistTemplate.upsert({
      where: {
        tenant_id_id: {
          tenant_id: tenant.id,
          id: e2eChecklistId,
        },
      },
      create: {
        id: e2eChecklistId,
        tenant_id: tenant.id,
        name: "E2E Coleta obrigatoria",
        description: "Template publicado para validar runtime web no E2E.",
        type: "towing_collection",
        status: "published",
        version: 1,
        schema: { source: "e2e" },
        published_at: new Date(),
      },
      update: {
        name: "E2E Coleta obrigatoria",
        description: "Template publicado para validar runtime web no E2E.",
        type: "towing_collection",
        status: "published",
        version: 1,
        schema: { source: "e2e" },
        published_at: new Date(),
        deleted_at: null,
      },
    });
    await upsertChecklistComponent(prisma, tenant.id, {
      id: e2eVehicleComponentId,
      component_key: "vehicle_selector",
      type: "vehicle_selector",
      label: "Tipo de veiculo",
      required: true,
      order_index: 0,
      config: { options: [{ value: "car", label: "Carro" }] },
    });
    await upsertChecklistComponent(prisma, tenant.id, {
      id: e2ePhotoComponentId,
      component_key: "photo_upload",
      type: "photo_upload",
      label: "Foto obrigatoria",
      required: true,
      order_index: 1,
      config: { minPhotos: 1 },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test.describe("entrada pela tela", () => {
  test.use({ storageState: emptyStorageState });

  test("login real cria sessao, credenciais invalidas exibem erro e rota protegida exige auth", async ({ page }) => {
  await page.goto("/administrator/checklists");
  await expect(page).toHaveURL(/\/login$/);

  const invalid = await entrarPelaTela(page, DEMO_EMAIL, "senha-invalida");
  expect(invalid.status()).toBe(401);
  await expect(page.getByText(/e-mail ou senha inválidos/i)).toBeVisible();

  await resetDemoAuthState();
  const valid = await entrarPelaTela(page, DEMO_EMAIL, DEMO_PASSWORD);
  expect(valid.status()).toBe(200);
  await expect(page).toHaveURL(/\/select-context$/);

  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toContain(DEMO_EMAIL);
  expect(session).toContain("accessToken");
  expect(session).toContain("refreshToken");
  });
});

test("tenant admin ve Checklists, Configuracoes e Notificacoes no menu, ativa contexto e nao entra no console da plataforma", async ({ page }) => {
  const navigationResponse = page.waitForResponse((response) => response.url().includes("/api/v1/navigation/menu"));
  await page.goto("/dashboard");
  await navigationResponse;

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Checklists", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Configurações", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);

  await page.goto("/platform/tenants");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);
});

test("tenant admin acessa inbox interna de notificacoes sem depender de seed", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: "Notificações", exact: true }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible();
  await expect(page.getByText("Avisos e eventos operacionais do seu usuário na organização.", { exact: true })).toBeVisible();
});

// J-MAPAS-10 PR-2 — reescrita para a TELA REAL. A versão anterior era da era pré-Ω1 (esperava
// "Mapa placeholder", o painel de despacho dentro do mapa e o título antigo da tela de Despachos)
// e já estava defasada ANTES do PR-1; como esta spec NÃO roda no CI, ninguém a via quebrar.
// A tela de hoje (D-MAPA-PIXEL) é: palco full-bleed com o mapa, stack de 3 painéis à direita
// (Chamados recebidos / Em Atendimento / Técnicos de campo), legenda-FILTRO no rodapé com o hint
// "Esc limpa a seleção…", e ZERO chip passivo no topo-esquerdo (diretiva do dono).
test("Mapa Operacional renderiza o palco, o stack de painéis e a legenda-filtro (sem chips passivos)", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.goto("/operations/map");
  await expect(page).toHaveURL(/\/operations\/map$/);
  // O título da tela é acessível (o heading visual do shell vive na topbar) — existe no DOM/a11y.
  await expect(page.getByRole("heading", { name: "Mapa Operacional" })).toBeAttached();
  // Palco full-bleed: o mapa é o palco inteiro e tudo o mais flutua sobre ele.
  await expect(page.locator(".opmap-stage")).toBeVisible();
  await expect(page.locator(".opmap-stage__map")).toBeVisible();

  // Stack de 3 painéis à direita, com os títulos verbatim do protótipo.
  await expect(page.getByRole("region", { name: "Chamados recebidos", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Em Atendimento", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Técnicos de campo", exact: true })).toBeVisible();

  // Legenda-FILTRO no rodapé: 8 itens + hint verbatim. Clicar num item alterna a camada.
  await expect(page.getByText("Esc limpa a seleção · arraste uma OS até um técnico para alocar")).toBeAttached();
  const legendItem = page.getByRole("button", { name: /Disponível/ }).first();
  await expect(legendItem).toBeVisible();
  await legendItem.click();
  await expect(legendItem).toHaveAttribute("aria-pressed", "false");

  // Diretiva do dono (2026-08-06): os chips passivos do topo-esquerdo SAÍRAM.
  await expect(page.locator(".opmap-chips")).toHaveCount(0);
  await expect(page.getByText(/Atualização periódica|Fonte: /)).toHaveCount(0);

  // Estado honesto (D-007): ou há chamados reais na fila, ou o vazio verbatim do protótipo.
  await expect(
    page.getByText(/OS-|Nenhum chamado aguardando alocação|Nenhum técnico ou chamado no mapa/).first(),
  ).toBeVisible();
});

// B-SAN3-10-E2E-CI (F3, §4.2 linha 5) — a tela virou "Despachos AO VIVO". As quatro propriedades seguem: a lista é a
// que a API devolveu, os indicadores batem com ela, "Novo despacho" aparece a quem tem a permissão e a busca filtra.
// Limite declarado: a semente não tem técnico de campo e o despacho exige um; num banco novo a lista real é vazia.
test("Despachos AO VIVO lista o que a API devolve, mostra indicadores, oferece Novo despacho e a busca filtra", async ({ page }) => {
  await loginAndActivateContext(page);

  const listResponse = page.waitForResponse(
    (response) => /\/api\/v1\/operations\/dispatches(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  await page.goto("/operations/dispatches");
  await expect(page).toHaveURL(/\/operations\/dispatches$/);
  const response = await listResponse;
  expect(response.status()).toBe(200);
  const total = await dispatchCountOf(response);

  await expect(page.getByRole("heading", { level: 1, name: /^Despachos\s*AO VIVO$/ })).toBeVisible();
  await expect(page.getByText("Dados demonstrativos", { exact: true })).toHaveCount(0);

  for (const indicator of ["Total", "Atribuídos", "Em rota", "Em atendimento", "Concluídos", "Cancelados", "Urgentes"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${indicator}: \\d+\\. Abrir detalhes\\.$`) })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: `Total: ${total}. Abrir detalhes.`, exact: true })).toBeVisible();

  const rows = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Detalhe", exact: true }) });
  await expect(rows).toHaveCount(total);
  await expect(page.getByText("Nenhum despacho encontrado", { exact: true })).toHaveCount(total === 0 ? 1 : 0);
  await expect(page.getByRole("button", { name: "Novo despacho", exact: true })).toBeVisible();

  const search = page.getByPlaceholder("Buscar por OS, código ou operador");
  await search.fill("e2e-busca-sem-correspondencia");
  await expect(rows).toHaveCount(0);
  await expect(page.getByText("Nenhum despacho encontrado", { exact: true })).toBeVisible();
  await search.fill("");
  await expect(rows).toHaveCount(total);
});

// B-SAN3-01 (P-008) — os três casos abaixo substituem o antigo "renderiza lista, criacao e detalhe com fallback
// seguro", que EXIGIA a OS inventada (`OS-000101`) e usava âncoras de telas legadas sem rota. A propriedade em
// teste é a reação da WEB à recusa do servidor; por isso as recusas são forçadas com `page.route` (o contrato do
// backend tem a própria suíte). Ator: `admin.demo@example.com`, papel `tenant_admin` (tem `work_orders:read` e
// `work_orders:create` no catálogo — CE-G2). Resíduo declarado: E2 deixa uma OS `E2E-SAN3-01 <timestamp>` no
// tenant demo (cancelar exige decisão financeira e não é o objeto do teste; `B-SAN3-10` decide a limpeza).

const WORK_ORDER_LIST_PAGE_SIZE = 20;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

test("E1 — lista honesta: o que a tela mostra é o que a API devolveu", async ({ page }) => {
  await loginAndActivateContext(page);
  await ensureWorkOrderId(page);

  const listResponse = page.waitForResponse(
    (response) => /\/api\/v1\/work-orders(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  await page.goto("/work-orders");
  await expect(page).toHaveURL(/\/work-orders$/);
  const response = await listResponse;
  expect(response.status()).toBe(200);
  const codes = await workOrderCodesOf(response);

  await expect(page.getByRole("heading", { name: "Ordens de Serviço" })).toBeVisible();
  expect(codes.length).toBeGreaterThan(0);
  const rows = page.locator("tbody tr[data-row-key]");
  await expect(rows).toHaveCount(Math.min(codes.length, WORK_ORDER_LIST_PAGE_SIZE));
  const rendered = await rows.locator(".aparos-code").allTextContents();
  for (const code of rendered) expect(codes).toContain(code.trim());
  if (codes.length <= WORK_ORDER_LIST_PAGE_SIZE) expect(new Set(rendered.map((c) => c.trim()))).toEqual(new Set(codes));
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-state="error"]')).toHaveCount(0);

  // Busca real (aria-label da toolbar): filtra a lista carregada; nada é inventado para preencher o vazio.
  const search = page.getByRole("searchbox", { name: /Buscar/ });
  await search.fill(codes[0]);
  await expect(rows.first()).toContainText(codes[0]);
});

test("E2 — create recusado preserva o digitado e não navega; aceito navega para a OS real", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.goto("/work-orders/new");
  await expect(page.getByRole("heading", { name: /Nova OS/i })).toBeVisible();
  const title = `E2E-SAN3-01 ${Date.now()}`;
  const description = "Descrição digitada pelo operador durante o E2E.";
  const titleField = page.getByLabel(/^T[ií]tulo$/);
  // Pelo nome acessível, não por getByLabel: a <textarea> controlada vive DENTRO do <label> (WorkOrderForm.tsx) e o
  // React copia o valor para o texto dela, então o texto do rótulo vira "Descricao<digitado>" e o getByLabel ancorado
  // deixa de casar depois do preenchimento; o nome acessível continua "Descricao".
  const descriptionField = page.getByRole("textbox", { name: /^Descri[çc][ãa]o$/ });
  await titleField.fill(title);
  await descriptionField.fill(description);

  // Recusa forçada do servidor (422 destination_required): a web NÃO pode navegar nem perder o digitado.
  await page.route("**/api/v1/work-orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "WORK_ORDER_UNPROCESSABLE", reason: "destination_required", message: "" } }),
    });
  });
  await page.getByRole("button", { name: "Salvar OS" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/work-orders\/new$/);
  await expect(titleField).toHaveValue(title);
  await expect(descriptionField).toHaveValue(description);
  await expect(page.getByRole("button", { name: "Salvar OS" })).toBeEnabled();
  await expect(page.getByRole("alert")).not.toContainText(/destination_required|WORK_ORDER_UNPROCESSABLE|422/);
  await page.unroute("**/api/v1/work-orders");

  // Aceito de verdade: navega para a OS REAL, e o detalhe dela responde 200 (nada navegou para OS inexistente).
  const created = page.waitForResponse((response) => /\/api\/v1\/work-orders$/.test(response.url()) && response.request().method() === "POST");
  const detailLoaded = page.waitForResponse(
    (response) => new RegExp(`/api/v1/work-orders/${UUID_RE.source}$`).test(response.url()) && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Salvar OS" }).click();
  const createResponse = await created;
  expect(createResponse.status()).toBe(201);
  const createdBody = (await createResponse.json()) as { data?: { id?: string } };
  const id = createdBody.data?.id ?? "";
  expect(id).toMatch(UUID_RE);
  await expect(page).toHaveURL(new RegExp(`/work-orders/${id}$`));
  const detailResponse = await detailLoaded;
  expect(detailResponse.url()).toMatch(new RegExp(`/work-orders/${id}$`));
  expect(detailResponse.status()).toBe(200);
  await expect(page.getByText(title)).toBeVisible();
});

test("E3 — detalhe inexistente e detalhe com erro são estados, não dados", async ({ page }) => {
  await loginAndActivateContext(page);

  // 404 REAL do backend (uuid válido que não existe): estado "não encontrada", sem cabeçalho de OS nem abas.
  await page.goto("/work-orders/00000000-0000-4000-8000-000000000000");
  await expect(page.locator('[data-state="not-found"]')).toBeVisible();
  await expect(page.getByText(/OS-\d/)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Seções da ordem de serviço" })).toHaveCount(0);

  // 500 forçado no detalhe de uma OS real: estado de erro com "Tentar novamente"; depois do retry a OS real aparece.
  const id = await ensureWorkOrderId(page);
  const detailUrl = `**/api/v1/work-orders/${id}`;
  await page.route(detailUrl, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", reason: "internal_error", message: "" } }) });
  });
  await page.goto(`/work-orders/${id}`);
  await expect(page.locator('[data-state="error"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  await expect(page.getByText(/OS-\d/)).toHaveCount(0);
  await page.unroute(detailUrl);

  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator('[data-state="error"]')).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Seções da ordem de serviço" })).toBeVisible();
});

async function dispatchCountOf(response: { json(): Promise<unknown> }): Promise<number> {
  const body = (await response.json()) as unknown[] | { items?: unknown[]; data?: unknown[] | { items?: unknown[] } };
  if (Array.isArray(body)) return body.length;
  const items = Array.isArray(body.items) ? body.items : Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];
  return items.length;
}

async function workOrderCodesOf(response: { json(): Promise<unknown> }): Promise<string[]> {
  const body = (await response.json()) as { items?: Array<{ code?: unknown }>; data?: Array<{ code?: unknown }> | { items?: Array<{ code?: unknown }> } };
  const items = Array.isArray(body.items) ? body.items : Array.isArray(body.data) ? body.data : Array.isArray(body.data?.items) ? body.data.items : [];
  return items.map((item) => item.code).filter((code): code is string => typeof code === "string");
}

/** Id de uma OS real do tenant demo: a primeira da lista, ou uma criada pela própria UI (prefixo E2E-SAN3-01). */
async function ensureWorkOrderId(page: Page): Promise<string> {
  const listResponse = page.waitForResponse(
    (response) => /\/api\/v1\/work-orders(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  await page.goto("/work-orders");
  const body = (await (await listResponse).json()) as { items?: Array<{ id?: unknown }> };
  const first = body.items?.find((item) => typeof item.id === "string" && UUID_RE.test(item.id));
  if (first && typeof first.id === "string") return first.id;

  await page.goto("/work-orders/new");
  await page.getByLabel(/^T[ií]tulo$/).fill(`E2E-SAN3-01 ${Date.now()} (E3)`);
  const created = page.waitForResponse((response) => /\/api\/v1\/work-orders$/.test(response.url()) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Salvar OS" }).click();
  const createdBody = (await (await created).json()) as { data?: { id?: string } };
  const id = createdBody.data?.id ?? "";
  expect(id).toMatch(UUID_RE);
  return id;
}

test.describe("administrador da plataforma pela tela", () => {
  test.use({ storageState: emptyStorageState });

  // B-SAN3-10-E2E-CI (F3, §4.2 linha 9) — desde o #111 o menu do console é uma lista fixa no navegador
  // (`PlatformLayout.tsx`, `PLATFORM_NAV`); "o menu vem do servidor" saiu do teste e ficou na pendência
  // P-WEB-PLATAFORMA-MENU-FIXO. A permissão de cada rota segue no servidor: a tela Organizações só carrega com 200.
  test("administrador da plataforma entra no console, a tela Organizacoes carrega da API e ele navega ao Cloud Billing", async ({ page }) => {
  const overviewResponse = page.waitForResponse(
    (response) => /\/api\/v1\/platform\/overview(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  const login = await entrarPelaTela(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);
  expect(login.status()).toBe(200);

  await expect(page).toHaveURL(/\/platform\/tenants$/);
  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toContain(PLATFORM_EMAIL);
  expect(session).toContain("accessToken");
  expect(session).toContain("refreshToken");

  expect((await overviewResponse).status()).toBe(200);
  await expect(page.getByText("Cadastros e situação das organizações clientes, filiais de cada grupo", { exact: true })).toBeVisible();
  await expect(page.getByRole("row", { expanded: false }).filter({ hasText: DEMO_ORGANIZATION })).toBeVisible();

  const menu = page.getByRole("navigation");
  for (const item of ["Visão Geral", "Organizações", "Custo da nuvem", "Saúde do Sistema"]) {
    await expect(menu.getByRole("link", { name: item, exact: true })).toBeVisible();
  }

  await menu.getByRole("link", { name: "Custo da nuvem", exact: true }).click();
  await expect(page).toHaveURL(/\/platform\/cloud-billing$/);
  await expect(page.getByRole("combobox", { name: "Mês de referência" })).toBeVisible();
  await expect(page.getByText("Acesso não permitido", { exact: true })).toHaveCount(0);
  // Emenda 2.3: o estado que a tela mostra no e2e presente, e os 2 erros de carga da tela nova (#567) ausentes. Num banco
  // novo é o vazio do mês, medido no e2e local; o nome do mês muda com a data, por isso a regex. A positiva vem antes:
  // uma ausência se satisfaz durante o esqueleto de carregamento (medido), e só depois dela as ausências provam algo.
  await expect(page.getByRole("status").filter({ hasText: /^Nenhum custo nem assinatura em \S/ })).toBeVisible();
  await expect(page.getByText("Não foi possível carregar o custo e a margem", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Não foi possível montar a visão de /)).toHaveCount(0);
  });
});

// CHECKLIST P1 PR-02a — a tela virou "Modelos de Checklist" no desenho do protótipo do dono
// (as âncoras antigas "Checklists do tenant"/"Preview de schema" já estavam defasadas da tela).
test("PR-02a Modelos de Checklist renderiza a lista nova e o builder sem quebrar", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /Modelos de Checklist/ }).click();
  await expect(page).toHaveURL(/\/administrator\/checklists$/);
  await expect(page.getByRole("heading", { name: "Modelos de Checklist", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Novo modelo/i })).toBeVisible();
});

// B-SAN3-10-E2E-CI (F3, §4.2 linha 11) — o link do menu chama-se "Checklists". As três propriedades seguem: a lista dos
// publicados abre, uma execução começa e concluir com obrigatório em branco é recusado.
test("Checklists lista os publicados, inicia uma execucao e recusa concluir com obrigatorio em branco", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: "Checklists", exact: true }).click();
  await expect(page).toHaveURL(/\/operations\/checklists$/);
  await expect(page.getByRole("heading", { level: 1, name: "Checklists Operacionais", exact: true })).toBeVisible();
  await expect(page.getByText("Execução web de checklists publicados para a operação de campo.", { exact: true })).toBeVisible();

  await page.getByPlaceholder("Buscar checklist operacional").fill("E2E Coleta obrigatoria");
  await expect(page.getByRole("heading", { level: 2, name: "E2E Coleta obrigatoria", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar execução", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/operations/checklists/${e2eChecklistId}/run$`));
  await expect(page.getByRole("heading", { level: 1, name: "E2E Coleta obrigatoria", exact: true })).toBeVisible();
  await expect(page.getByLabel("Progresso de preenchimento")).toBeVisible();

  await page.getByRole("button", { name: "Concluir checklist", exact: true }).click();
  await expect(page.getByText("Preencha o campo obrigatório Tipo de veiculo.", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Checklist concluído com sucesso.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Concluir checklist", exact: true })).toBeEnabled();
});

// B-SAN3-10-E2E-CI (F3, Emenda 2.2, nova linha 12 do §4.2) — desde o #169 a página mostra os parâmetros que o servidor
// manda, agrupados por categoria. Localiza só por papel e texto visível. Não afirma a ausência de outras categorias.
test("Configuracoes mostra os grupos que o servidor manda e oferece os 3 temas pelos rotulos", async ({ page }) => {
  await loginAndActivateContext(page);

  const settingsResponse = page.waitForResponse(
    (response) => /\/api\/v1\/tenant-settings(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  await page.getByRole("link", { name: "Configurações", exact: true }).click();
  await expect(page).toHaveURL(/\/administrator\/settings$/);
  expect((await settingsResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Configurações", exact: true })).toBeVisible();

  const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["Geral", ["Fuso horário", "Moeda", "Razão social"]],
    ["Aparência", ["Tema visual"]],
  ];
  for (const [group, labels] of groups) {
    await expect(page.getByRole("heading", { level: 2, name: group, exact: true })).toBeVisible();
    for (const label of labels) {
      const field = page.getByLabel(label);
      await expect(field).toBeVisible();
      expect(await groupOfField(page, field), `${label} fica no grupo ${group}`).toBe(group);
    }
  }

  const theme = page.getByRole("combobox", { name: /Tema visual/ });
  for (const label of [
    "Enterprise Blue — corporativo e limpo",
    "Tech Dark — técnico e de alto contraste",
    "Green Operations — operacional e prático",
  ]) {
    await expect(theme.getByRole("option", { name: label, exact: true })).toHaveCount(1);
  }
  for (const technicalValue of ["enterprise_blue", "tech_dark", "green_operations"]) {
    await expect(theme.getByRole("option", { name: technicalValue, exact: true })).toHaveCount(0);
  }
});

/** O título de nível 2 que vem logo antes do campo, na ordem do documento: é o grupo em que a tela o mostra. */
async function groupOfField(page: Page, field: Locator): Promise<string> {
  const headings = await page.getByRole("heading", { level: 2 }).elementHandles();
  return field.evaluate((target, candidates) => {
    let group = "";
    for (const heading of candidates) {
      if (heading.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) group = heading.textContent?.trim() ?? "";
    }
    return group;
  }, headings);
}

test.describe("logout com sessão própria", () => {
  test.use({ storageState: emptyStorageState });

  test("logout real revoga sessao local e volta ao login", async ({ page }) => {
  const login = await entrarPelaTela(page, DEMO_EMAIL, DEMO_PASSWORD);
  expect(login.status()).toBe(200);
  await escolherOrganizacaoDemo(page);
  const refreshToken = await page.evaluate(() => {
    const raw = window.localStorage.getItem("erp-techsolutions.auth-session");
    return raw ? (JSON.parse(raw) as { refreshToken?: string }).refreshToken ?? "" : "";
  });
  expect(refreshToken).not.toBe("");

  const logoutResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/logout") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sair" }).click();
  expect((await logoutResponse).status()).toBe(200);

  await expect(page).toHaveURL(/\/login$/);
  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toBeNull();
  const refresh = await page.request.post(`${apiBaseUrl}/auth/refresh`, { data: { refreshToken } });
  expect(refresh.status()).toBe(401);
  });
});

async function loginAndActivateContext(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function resetDemoAuthState(): Promise<void> {
  const prisma = createE2ePrisma();

  try {
    await prisma.localAuthCredential.updateMany({
      where: {
        tenant_id: demoTenantId,
        email: DEMO_EMAIL,
      },
      data: {
        failed_attempts: 0,
        locked_until: null,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function upsertChecklistComponent(
  prisma: PrismaClient,
  tenantId: string,
  input: {
    id: string;
    component_key: string;
    type: string;
    label: string;
    required: boolean;
    order_index: number;
    config: Prisma.InputJsonValue;
  },
): Promise<void> {
  await prisma.checklistTemplateComponent.upsert({
    where: {
      tenant_id_id: {
        tenant_id: tenantId,
        id: input.id,
      },
    },
    create: {
      ...input,
      tenant_id: tenantId,
      template_id: e2eChecklistId,
      validation_rules: {},
      visibility_rules: {},
    },
    update: {
      component_key: input.component_key,
      type: input.type,
      label: input.label,
      required: input.required,
      order_index: input.order_index,
      config: input.config,
      validation_rules: {},
      visibility_rules: {},
    },
  });
}
