// B-ASS-10b (T5, F11) — capturas da REFERÊNCIA aprovada da tela de custos
// (`screen-refs/platform-cloud-billing-3opcoes.reference.html`, aberta por `file://`), trocando a opção no seletor dela, no
// Edge headless (Playwright, canal msedge), nos mesmos tamanhos das capturas do app (`capture-cloud-billing.mjs`), mais o
// detalhe aberto de cada opção — para a conferência lado a lado (plano v2 §9.3). PNG e log ficam fora do repositório.
// Uso (a partir de `frontend/`): node ../docs/revisoes/TELAS/B-APAR-capturas/capture-ref-cloud-billing.mjs <referência.html> <saída>
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve(process.cwd(), "../package.json"));
const { chromium } = require("playwright");

const REF = process.argv[2];
const OUT = process.argv[3];
if (!REF || !OUT) throw new Error("uso: capture-ref-cloud-billing.mjs <referência.html> <saída>");
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
    await page.waitForTimeout(300);
    const file = `${OUT}/ref-${option}-${width}x${height}.png`;
    await page.locator(".viewport-canvas").screenshot({ path: file });
    log.push(`ref ${option} ${width}x${height} → ${file.split("/").pop()}`);
    if (width === 1440) {
      const row = page.locator(`[data-view="${option}"] tr.pat-ab-row[data-linha]`).first();
      if (await row.count()) {
        await row.click();
        await page.waitForTimeout(300);
        await page.locator(`[data-view="${option}"] tr.pat-ab-detail-row`).first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${OUT}/ref-${option}-detalhe-1440x900.png` });
        log.push(`ref ${option} detalhe 1440x900`);
      } else log.push(`ref ${option}: linha não achada`);
    }
  }
  await context.close();
}
await browser.close();
writeFileSync(`${OUT}/capturas-ref-cloud-billing.log`, `${log.join("\n")}\n`);
console.log(log.join("\n"));
