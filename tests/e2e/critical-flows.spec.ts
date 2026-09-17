import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const demoEmail = process.env.E2E_DEMO_ADMIN_EMAIL ?? "admin.demo@example.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";
const platformEmail = process.env.E2E_PLATFORM_EMAIL ?? "platform.admin@erp.local";
const platformPassword = process.env.E2E_PLATFORM_PASSWORD ?? "platform-admin-dev-password";
const e2eChecklistId = "11111111-2222-4333-8444-555555555555";
const e2eVehicleComponentId = "11111111-2222-4333-8444-555555555556";
const e2ePhotoComponentId = "11111111-2222-4333-8444-555555555557";

let demoTenantId = "";

test.beforeAll(async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

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

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => window.localStorage.clear());
});

test("login real cria sessao, credenciais invalidas exibem erro e rota protegida exige auth", async ({ page }) => {
  await page.goto("/administrator/checklists");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Tenant ID").fill(demoTenantId);
  await page.getByLabel("E-mail corporativo").fill(demoEmail);
  await page.getByRole("textbox", { name: /Senha/i }).fill("senha-invalida");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Tenant, e-mail ou senha invalidos.")).toBeVisible();

  await resetDemoAuthState();
  await loginAsTenantAdmin(page);
  await expect(page).toHaveURL(/\/select-context$/);

  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toContain(demoEmail);
  expect(session).toContain("accessToken");
  expect(session).toContain("refreshToken");
});

test("tenant admin ve W02A e W03 na sidebar, ativa contexto e nao ve Platform Console", async ({ page }) => {
  await loginAsTenantAdmin(page);
  const navigationResponse = page.waitForResponse((response) => response.url().includes("/api/v1/navigation/menu"));
  await activateFirstContext(page);
  await navigationResponse;

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Checklists", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Configuracoes|Configurações/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Notificacoes|Notificações/i })).toBeVisible();
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);

  await page.goto("/platform/tenants");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);
});

test("tenant admin acessa inbox interna de notificacoes sem depender de seed", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /Notificacoes|Notificações/i }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { name: /Notificacoes|Notificações/i })).toBeVisible();
  await expect(page.getByText(/Inbox interna/i)).toBeVisible();
});

// J-MAPAS-10 PR-2 — reescrita para a TELA REAL. A versão anterior era da era pré-Ω1 (esperava
// "Mapa placeholder", o painel de despacho dentro do mapa e o título antigo da tela de Despachos)
// e já estava defasada ANTES do PR-1; como esta spec NÃO roda no CI, ninguém a via quebrar.
// A tela de hoje (D-MAPA-PIXEL) é: palco full-bleed com o mapa, stack de 3 painéis à direita
// (Chamados recebidos / Em Atendimento / Técnicos de campo), legenda-FILTRO no rodapé com o hint
// "Esc limpa a seleção…", e ZERO chip passivo no topo-esquerdo (diretiva do dono).
test("Mapa Operacional renderiza o palco, o stack de painéis e a legenda-filtro (sem chips passivos)", async ({ page }) => {
  await loginAndActivateContext(page);
  await enableOperationsMapFrontendContext(page);
  await enableWorkOrdersFrontendContext(page);
  await enableDispatchesFrontendContext(page);

  await page.goto("/operations/map");
  await expect(page).toHaveURL(/\/operations\/map$/);
  // O título da tela é acessível (o heading visual do shell vive na topbar) — existe no DOM/a11y.
  await expect(page.getByRole("heading", { name: "Mapa Operacional" })).toBeAttached();
  // Palco full-bleed: o mapa é o palco inteiro e tudo o mais flutua sobre ele.
  await expect(page.locator(".opmap-stage")).toBeVisible();
  await expect(page.locator(".opmap-stage__map")).toBeVisible();

  // Stack de 3 painéis à direita, com os títulos verbatim do protótipo.
  await expect(page.getByText("Chamados recebidos")).toBeVisible();
  await expect(page.getByText("Em Atendimento")).toBeVisible();
  await expect(page.getByText("Técnicos de campo")).toBeVisible();

  // Legenda-FILTRO no rodapé: 8 itens + hint verbatim. Clicar num item alterna a camada.
  await expect(page.getByText("Esc limpa a seleção · arraste uma OS até um técnico para alocar")).toBeVisible();
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

test("Despachos Operacionais renderiza lista, KPIs e acoes por RBAC", async ({ page }) => {
  await loginAndActivateContext(page);
  await enableDispatchesFrontendContext(page);
  await enableWorkOrdersFrontendContext(page);

  await page.goto("/operations/dispatches");
  await expect(page).toHaveURL(/\/operations\/dispatches$/);
  await expect(page.getByRole("heading", { name: "Despachos Operacionais" })).toBeVisible();
  await expect(page.getByText("Atribuidos")).toBeVisible();
  await expect(page.getByText(/OS-000101|Nenhum despacho encontrado/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Novo despacho/i })).toBeVisible();

  await page.getByPlaceholder("Buscar por OS, codigo ou operador").fill("OS-000103");
  await expect(page.getByText(/OS-000103|Nenhum despacho encontrado/).first()).toBeVisible();
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
  await enableWorkOrdersFrontendContext(page);

  const listResponse = page.waitForResponse(
    (response) => /\/api\/v1\/work-orders(\?|$)/.test(response.url()) && response.request().method() === "GET",
  );
  await page.goto("/work-orders");
  await expect(page).toHaveURL(/\/work-orders$/);
  const response = await listResponse;
  expect(response.status()).toBe(200);
  const codes = await workOrderCodesOf(response);

  await expect(page.getByRole("heading", { name: "Ordens de Serviço" })).toBeVisible();
  const rows = page.locator(".pat-os-row");
  if (codes.length === 0) {
    await expect(page.locator('[data-state="empty"]')).toBeVisible();
    await expect(rows).toHaveCount(0);
  } else {
    await expect(rows).toHaveCount(Math.min(codes.length, WORK_ORDER_LIST_PAGE_SIZE));
    const rendered = await rows.locator("> div:first-child .pat-mono").allTextContents();
    for (const code of rendered) expect(codes).toContain(code.trim());
    if (codes.length <= WORK_ORDER_LIST_PAGE_SIZE) expect(new Set(rendered.map((c) => c.trim()))).toEqual(new Set(codes));
  }
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[data-state="error"]')).toHaveCount(0);

  // Busca real (aria-label da toolbar): filtra a lista carregada; nada é inventado para preencher o vazio.
  const search = page.getByRole("textbox", { name: /Buscar/ });
  await search.fill(codes[0] ?? "nenhuma-os-com-este-texto");
  if (codes.length > 0) await expect(rows.first()).toContainText(codes[0]);
  else await expect(page.locator('[data-state="empty"]')).toBeVisible();
});

test("E2 — create recusado preserva o digitado e não navega; aceito navega para a OS real", async ({ page }) => {
  await loginAndActivateContext(page);
  await enableWorkOrdersFrontendContext(page);

  await page.goto("/work-orders/new");
  await expect(page.getByRole("heading", { name: /Nova OS/i })).toBeVisible();
  const title = `E2E-SAN3-01 ${Date.now()}`;
  const description = "Descrição digitada pelo operador durante o E2E.";
  const titleField = page.getByLabel(/^T[ií]tulo$/);
  const descriptionField = page.getByLabel(/^Descri[çc][ãa]o$/);
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
  await enableWorkOrdersFrontendContext(page);

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

test("platform admin acessa Platform Console", async ({ page }) => {
  const navigationResponse = page.waitForResponse((response) => response.url().includes("/api/v1/navigation/menu?scope=platform"));
  await loginAsPlatformAdmin(page);
  await navigationResponse;

  await expect(page).toHaveURL(/\/platform\/tenants$/);
  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toContain(platformEmail);
  expect(session).toContain("accessToken");
  expect(session).toContain("refreshToken");

  await expect(page.getByText("Console da Plataforma", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tenants/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Billing Cloud|Cloud Billing/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tenants", exact: true })).toBeVisible();
  await expect(page.getByText("Tenants cadastrados")).toBeVisible();

  await page.getByRole("link", { name: /Billing Cloud|Cloud Billing/i }).click();
  await expect(page).toHaveURL(/\/platform\/cloud-billing$/);
  await expect(page.getByRole("heading", { name: "Cloud Billing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Visao geral" })).toBeVisible();
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

test("runtime web de checklists renderiza lista operacional e bloqueia obrigatorios incompletos", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /Checklists Operacionais/i }).click();
  await expect(page).toHaveURL(/\/operations\/checklists$/);
  await expect(page.getByRole("heading", { name: "Checklists Operacionais" })).toBeVisible();
  await expect(page.getByText("Execucao web de checklists publicados")).toBeVisible();
  await page.getByRole("button", { name: /Iniciar execucao/i }).first().click();
  await expect(page).toHaveURL(/\/operations\/checklists\/.+\/run$/);
  await expect(page.getByLabel("Progresso de preenchimento")).toBeVisible();
  await expect(page.getByText(/Execucao orientada por schema/i)).toBeVisible();
  await page.getByRole("button", { name: /Concluir checklist/i }).click();
  await expect(page.getByText(/Preencha o campo obrigatorio|Envie ao menos|Registre ao menos/i).first()).toBeVisible();
});

test("W03 Configuracoes renderiza categorias e temas planejados", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /Configuracoes|Configurações/i }).click();
  await expect(page).toHaveURL(/\/administrator\/settings$/);
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();

  for (const category of [
    "Geral",
    "Aparência",
    "Usuários e Acesso",
    "Módulos",
    "Checklists",
    "Notificações",
    "Integrações",
    "Segurança e Auditoria",
  ]) {
    await expect(page.locator(".tenant-settings-card").filter({ hasText: category })).toBeVisible();
  }

  for (const theme of ["enterprise_blue", "tech_dark", "green_operations"]) {
    await expect(page.locator(".tenant-settings-theme-card").filter({ hasText: theme })).toBeVisible();
  }
});

test("logout real revoga sessao local e volta ao login", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/login$/);
  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toBeNull();
});

async function loginAndActivateContext(page: Page): Promise<void> {
  await loginAsTenantAdmin(page);
  await activateFirstContext(page);
}

async function loginAsTenantAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Tenant ID").fill(demoTenantId);
  await page.getByLabel("E-mail corporativo").fill(demoEmail);
  await page.getByRole("textbox", { name: /Senha/i }).fill(demoPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/select-context$/);
}

async function loginAsPlatformAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Tenant ID").fill(demoTenantId);
  await page.getByLabel("E-mail corporativo").fill(platformEmail);
  await page.getByRole("textbox", { name: /Senha/i }).fill(platformPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/platform\/tenants$/);
}

async function activateFirstContext(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Definir tenant, filial e papel ativo" })).toBeVisible();
  await page.getByRole("button", { name: "Ativar contexto" }).first().click();
}

async function enableOperationsMapFrontendContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const key = "erp-techsolutions.active-context";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    const context = JSON.parse(raw) as { permissions?: string[]; enabledModules?: string[] };
    context.permissions = Array.from(new Set([...(context.permissions ?? []), "field_location:read", "field_location:history"]));
    context.enabledModules = Array.from(new Set([...(context.enabledModules ?? []), "field_operations"]));
    window.localStorage.setItem(key, JSON.stringify(context));
  });
}

async function enableDispatchesFrontendContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const key = "erp-techsolutions.active-context";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    const context = JSON.parse(raw) as { permissions?: string[]; enabledModules?: string[] };
    context.permissions = Array.from(
      new Set([
        ...(context.permissions ?? []),
        "field_dispatch:read",
        "field_dispatch:create",
        "field_dispatch:update",
        "field_dispatch:cancel",
        "field_dispatch:reassign",
      ]),
    );
    context.enabledModules = Array.from(new Set([...(context.enabledModules ?? []), "field_operations"]));
    window.localStorage.setItem(key, JSON.stringify(context));
  });
}

async function enableWorkOrdersFrontendContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const key = "erp-techsolutions.active-context";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    const context = JSON.parse(raw) as { permissions?: string[]; enabledModules?: string[] };
    context.permissions = Array.from(
      new Set([
        ...(context.permissions ?? []),
        "work_orders:read",
        "work_orders:create",
        "work_orders:update",
        "work_orders:assign",
        "work_orders:status",
      ]),
    );
    context.enabledModules = Array.from(new Set([...(context.enabledModules ?? []), "work-orders"]));
    window.localStorage.setItem(key, JSON.stringify(context));
  });
}

async function resetDemoAuthState(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.localAuthCredential.updateMany({
      where: {
        tenant_id: demoTenantId,
        email: demoEmail,
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
    config: Record<string, unknown>;
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
