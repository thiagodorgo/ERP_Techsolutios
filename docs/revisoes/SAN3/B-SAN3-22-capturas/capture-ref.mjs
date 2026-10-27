import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire("C:/Users/AMP/w-san322/package.json");
const { chromium } = require("playwright");
const [OUT, WIDTH, HEIGHT] = process.argv.slice(2);
const REF = pathToFileURL("C:/Users/AMP/w-san322/docs/claude-code-handoff/screen-refs/checklist-editor-estados-3opcoes.reference.html").href;
const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const hash of ["a-travado", "a-conflito", "b-travado", "b-travado-campos", "b-conflito", "c-travado", "c-conflito"]) {
  const page = await browser.newPage({ viewport: { width: Number(WIDTH), height: Number(HEIGHT) } });
  await page.goto(`${REF}#${hash}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/ref-${hash}-${WIDTH}x${HEIGHT}.png` });
  await page.close();
}
await browser.close();
console.log("ok");
