// B-APAR-OS (fundação da trilha B-APAR-3) — capturas da REFERÊNCIA aprovada (`screen-refs/<tela>-3opcoes.reference.html`,
// aberta por `file://`) trocando a opção no seletor dela, no Edge headless (Playwright, canal msedge), nos mesmos tamanhos
// das capturas do app — para a conferência lado a lado (cognicao-visual + revisor Codex).
// Uso: node ../docs/revisoes/APAR/B-APAR-capturas/capture-ref.mjs <referência.html> <saída>
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve(process.cwd(), "../package.json"));
const { chromium } = require("playwright");

const REF = process.argv[2];
const OUT = process.argv[3];
if (!REF || !OUT) throw new Error("uso: capture-ref.mjs <referência.html> <saída>");
mkdirSync(OUT, { recursive: true });
const log = [];

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1280, 720],
]) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "pt-BR" });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve(REF)).href);
  for (const option of ["a", "b", "c"]) {
    await page.locator(`[data-opcao="${option}"]`).click();
    await page.waitForTimeout(250);
    const canvas = page.locator(".viewport-canvas");
    const file = `${OUT}/ref-${option}-${width}x${height}.png`;
    await canvas.screenshot({ path: file });
    log.push(`ref ${option} ${width}x${height} → ${file.split("/").pop()}`);
  }
  if (width === 1440) {
    await page.locator('[data-opcao="b"]').click();
    await page.locator('[data-view="b"] tr[data-linha]').first().click();
    await page.locator('[data-view="b"] [data-abrir-os]').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/ref-b-janela-1440x900.png` });
    log.push("ref b janela 1440x900");
  }
  await context.close();
}
await browser.close();
writeFileSync(`${OUT}/capturas-ref.log`, `${log.join("\n")}\n`);
console.log(log.join("\n"));
