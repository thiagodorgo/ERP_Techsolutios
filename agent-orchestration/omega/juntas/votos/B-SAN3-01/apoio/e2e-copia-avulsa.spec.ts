import { expect, test, type Page } from "@playwright/test";

// APOIO DA JUNTA — B-SAN3-01 (votos/B-SAN3-01/apoio/). Copie para tests/e2e/ do SEU worktree antes de rodar.
// Os casos E1-E3 e os auxiliares workOrderCodesOf/ensureWorkOrderId/enableWorkOrdersFrontendContext são cópia VERBATIM de
// tests/e2e/critical-flows.spec.ts no commit ca7c5d04 (com o conserto do E2); só o login foi ajustado ao formulário ATUAL
// (e-mail + senha; o campo "Tenant ID" saiu em d5a4ed43, 2026-07-02). O login do arquivo rastreado segue defasado:
// P-SAN3-01-E2E-LOGIN-DEFASADO (dono B-SAN3-10).

const demoEmail = process.env.E2E_DEMO_ADMIN_EMAIL ?? "admin.demo@example.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";

async function loginAndActivateContext(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("usuario@empresa.com.br").fill(demoEmail);
  await page.getByPlaceholder("••••••••").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/select-context$/);
  await page.getByRole("button", { name: /Acessar/ }).first().click();
}

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
