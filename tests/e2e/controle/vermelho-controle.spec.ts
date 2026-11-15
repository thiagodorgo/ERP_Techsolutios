import { expect, test } from "@playwright/test";

test("vermelho-controle prova que a esteira propaga falha", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await expect(
    page.getByText("e2e-canario: texto que nao existe"),
    "e2e-canario: sentinela",
  ).toBeVisible({ timeout: 3_000 });
});
