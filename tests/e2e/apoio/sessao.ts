import { expect, test, type Page } from "@playwright/test";

export const SESSAO_ADMIN = "test-results/.auth/admin-demo.json";
export const DEMO_EMAIL = process.env.E2E_DEMO_ADMIN_EMAIL ?? "admin.demo@example.com";
export const DEMO_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";
export const PLATFORM_EMAIL = process.env.E2E_PLATFORM_EMAIL ?? "platform.admin@erp.local";
export const PLATFORM_PASSWORD = process.env.E2E_PLATFORM_PASSWORD ?? "platform-admin-dev-password";
export const DEMO_ORGANIZATION = "Organização Demonstração";

export async function entrarPelaTela(page: Page, email: string, password: string) {
  await page.goto("/login");
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/auth/login") && response.request().method() === "POST",
  );
  await page.getByLabel("E-mail corporativo").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const response = await responsePromise;
  test.info().annotations.push({ type: "e2e-login", description: email });

  if (response.status() === 429) {
    throw new Error("e2e: o freio de login respondeu 429 — o orçamento de logins pela tela estourou");
  }

  return response;
}

export async function escolherOrganizacaoDemo(page: Page): Promise<void> {
  await expect(page.getByText("Selecione a organização", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(DEMO_ORGANIZATION) }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
