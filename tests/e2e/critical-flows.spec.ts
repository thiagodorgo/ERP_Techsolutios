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

test("Mapa Operacional renderiza UI inicial e fallback sem Google Maps real", async ({ page }) => {
  await loginAndActivateContext(page);
  await enableOperationsMapFrontendContext(page);
  await enableWorkOrdersFrontendContext(page);

  await page.goto("/operations/map");
  await expect(page).toHaveURL(/\/operations\/map$/);
  await expect(page.getByRole("heading", { name: "Mapa Operacional" })).toBeVisible();
  await expect(page.getByText("Visualização operacional inicial", { exact: true })).toBeVisible();
  await expect(page.getByText(/Google Maps futuro/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /OS-/ }).first()).toBeVisible();
  await expect(page.getByText(/Marina Costa|Operador API|Nenhum operador localizado/i).first()).toBeVisible();
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

test("Ordens de Servico renderiza lista, criacao e detalhe com fallback seguro", async ({ page }) => {
  await loginAndActivateContext(page);
  await enableWorkOrdersFrontendContext(page);

  await page.goto("/work-orders");
  await expect(page).toHaveURL(/\/work-orders$/);
  await expect(page.getByRole("heading", { name: "Ordens de Servico" })).toBeVisible();
  await expect(page.getByText("Total de OS")).toBeVisible();
  await expect(page.getByText(/OS-000101|Nenhuma OS encontrada/).first()).toBeVisible();

  await page.getByPlaceholder("Buscar por codigo, titulo ou cliente").fill("Atlas");
  await expect(page.getByText(/Atlas Refrigeracao|Nenhuma OS encontrada/).first()).toBeVisible();

  await page.goto("/work-orders/new");
  await expect(page.getByRole("heading", { name: /Nova OS/i })).toBeVisible();
  await page.getByRole("button", { name: "Salvar OS" }).click();
  await expect(page.getByText("Titulo obrigatorio.")).toBeVisible();

  await page.goto("/work-orders/11111111-1111-4111-8111-000000000001");
  await expect(page.getByText("OS-000101")).toBeVisible();
  await expect(page.getByText("Timeline")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alterar status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atribuir operador" })).toBeVisible();
});

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

test("W02A Checklists renderiza builder, lista e preview sem quebrar", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /^Checklists$/ }).click();
  await expect(page).toHaveURL(/\/administrator\/checklists$/);
  await expect(page.getByRole("heading", { name: "Checklists", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Checklists do tenant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Builder visual" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview de schema" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Novo checklist/i })).toBeVisible();
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
