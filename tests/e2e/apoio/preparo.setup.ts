import { test as setup } from "@playwright/test";

import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  SESSAO_ADMIN,
  entrarPelaTela,
  escolherOrganizacaoDemo,
} from "./sessao.js";

setup("prepara sessao do administrador demo", async ({ page }) => {
  const response = await entrarPelaTela(page, DEMO_EMAIL, DEMO_PASSWORD);
  if (response.status() !== 200) {
    throw new Error(`e2e: login de preparo respondeu ${response.status()}`);
  }
  await escolherOrganizacaoDemo(page);
  await page.context().storageState({ path: SESSAO_ADMIN });
});
