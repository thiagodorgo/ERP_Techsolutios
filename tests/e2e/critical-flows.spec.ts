import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const demoEmail = process.env.E2E_DEMO_ADMIN_EMAIL ?? "admin.demo@example.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";

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

  await loginAsTenantAdmin(page);
  await expect(page).toHaveURL(/\/select-context$/);

  const session = await page.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
  expect(session).toContain(demoEmail);
  expect(session).toContain("accessToken");
});

test("tenant admin ve W02A e W03 na sidebar, ativa contexto e nao ve Platform Console", async ({ page }) => {
  await loginAsTenantAdmin(page);
  await activateFirstContext(page);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: /Checklists/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Configuracoes|Configurações/i })).toBeVisible();
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);

  await page.goto("/platform/tenants");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Console da Plataforma")).toHaveCount(0);
});

test("W02A Checklists renderiza builder, lista e preview sem quebrar", async ({ page }) => {
  await loginAndActivateContext(page);

  await page.getByRole("link", { name: /Checklists/i }).click();
  await expect(page).toHaveURL(/\/administrator\/checklists$/);
  await expect(page.getByRole("heading", { name: "Checklists", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Checklists do tenant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Builder visual" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview de schema" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Novo checklist/i })).toBeVisible();
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

async function activateFirstContext(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Definir tenant, filial e papel ativo" })).toBeVisible();
  await page.getByRole("button", { name: "Ativar contexto" }).first().click();
}
