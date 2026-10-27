// Capturas 924×540 das 3 aparências nos estados da referência (B-SAN3-22, fatia web), com o Edge headless
// dirigido pelo Playwright (canal msedge) contra o app em `vite` próprio em porta alta, em modo simulado.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire("C:/Users/AMP/w-san322/package.json");
const { chromium } = require("playwright");

const BASE = process.argv[2] ?? "http://127.0.0.1:47322";
const OUT = process.argv[3];
const WIDTH = Number(process.argv[4] ?? 924);
const HEIGHT = Number(process.argv[5] ?? 540);
const TAG = `${WIDTH}x${HEIGHT}`;
mkdirSync(OUT, { recursive: true });

const TENANT = "ten-industrial-01";
const PERMS = [
  "dashboard:read",
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
];

const log = [];
function note(line) {
  log.push(line);
  console.log(line);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function openAs(appearance) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await context.newPage();
  page.on("pageerror", (error) => note(`  [erro na página] ${error.message}`));
  // Sessão simulada + organização ativa + aparência escolhida, gravadas como o app grava (antes do 1º script).
  await page.goto(`${BASE}/login`);
  await page.evaluate(
    async ({ appearance, TENANT, PERMS }) => {
      const auth = await import("/src/mocks/auth/context.ts");
      const session = { ...auth.mockSession, user: { ...auth.mockSession.user, roles: ["Administrador"], permissions: PERMS } };
      localStorage.setItem("erp-techsolutions.auth-session", JSON.stringify(session));
      localStorage.setItem(
        "erp-techsolutions.active-context",
        JSON.stringify({
          tenantId: TENANT,
          tenantName: "Techsolutions Industrial",
          tenantStatus: "active",
          branchId: "fil-sp-01",
          branchName: "Matriz",
          role: "Administrador",
          permissions: PERMS,
          enabledModules: ["dashboard", "tenant_checklist"],
          scope: "tenant",
        }),
      );
      localStorage.setItem(`techsol.aparencia.${TENANT}.${session.user.id}`, JSON.stringify({ "checklist-editor": appearance }));
    },
    { appearance, TENANT, PERMS },
  );
  return { context, page };
}

async function shot(page, name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-${TAG}.png` });
  note(`  captura ${name}-${TAG}.png`);
}

/** "Outra pessoa" grava pelo mesmo módulo simulado que o app usa (mesma instância servida pelo vite). */
async function otherPersonSaves(page, checklistId) {
  return page.evaluate(async (id) => {
    const mock = await import("/src/modules/checklists/checklist.mock.ts");
    const current = await mock.getMockTenantChecklist(id);
    const components = current.components.map((item, index) =>
      index === 0 ? { ...item, label: `${item.label} (revisado)` } : item,
    );
    const saved = await mock.updateMockTenantChecklist(id, { expectedUpdatedAt: current.updatedAt, components });
    return saved.updatedAt;
  }, checklistId);
}

for (const appearance of ["A", "B", "C"]) {
  const x = appearance.toLowerCase();
  note(`Aparência ${appearance}`);

  // Estado 1 — campos travados (modelo de demonstração com 2 vistorias em andamento).
  {
    const { context, page } = await openAs(appearance);
    await page.goto(`${BASE}/administrator/checklists/chk_vistoria_em_uso`);
    await page.waitForSelector(".ckb-ed-head", { timeout: 15000 });
    await page.getByRole("button", { name: "Configurar o campo Fotos das 4 laterais" }).evaluate((el) => el.click());
    const bar = await page.locator("#ckb-faixa-trava").count();
    const pill = await page.locator(".ckb-pill--inuse").first().textContent().catch(() => null);
    note(`  travado: faixa=${bar} pílula="${pill}"`);
    await shot(page, `${x}-travado`);
    if (appearance === "B") {
      await page.getByRole("button", { name: /Campos travados/ }).evaluate((el) => el.click());
      await page.locator(".b22-lista").scrollIntoViewIfNeeded();
      await shot(page, `${x}-travado-campos`);
    }
    if (appearance === "C") {
      await page.locator("text=Em uso agora").scrollIntoViewIfNeeded();
      await shot(page, `${x}-travado-painel`);
    }
    // O clique num controle travado explica (toast).
    await page.locator('[aria-label="Remover campo"][aria-disabled="true"]').first().evaluate((el) => el.click());
    const toast = await page.locator(".ckb-toast-msg").first().textContent({ timeout: 3000 }).catch(() => null);
    note(`  clique travado explica: "${toast}"`);
    await context.close();
  }

  // Estado 2 — outra pessoa salvou antes (409 do servidor simulado ao salvar).
  {
    const { context, page } = await openAs(appearance);
    await page.goto(`${BASE}/administrator/checklists/chk_towing_delivery`);
    await page.waitForSelector(".ckb-ed-head", { timeout: 15000 });
    await page.waitForTimeout(500);
    const savedAt = await otherPersonSaves(page, "chk_towing_delivery");
    await page.locator(".ckb-ed-name").fill("Entrega de veículo rebocado — revisão");
    await page.getByRole("button", { name: "Salvar" }).evaluate((el) => el.click());
    await page.waitForTimeout(1200);
    const dialog = await page.locator(".ckb-ed-modal-when").count();
    const bar = await page.locator('.ckb-ed-blockbar[role="alert"]').count();
    const cmp = await page.locator(".c22-cmp").count();
    note(`  conflito (outra pessoa salvou às ${savedAt}): diálogo-com-horário=${dialog} faixa=${bar} comparador=${cmp}`);
    if (appearance === "C") await page.locator(".c22-cmp").scrollIntoViewIfNeeded();
    await shot(page, `${x}-conflito`);
    await context.close();
  }
}

// Evidências de comportamento (aparência A): o 409 do publicar e a confirmação de inativar.
{
  const { context, page } = await openAs("A");
  await page.goto(`${BASE}/administrator/checklists/chk_technical_before_after`);
  await page.waitForSelector(".ckb-ed-head", { timeout: 15000 });
  await page.waitForTimeout(500);
  await otherPersonSaves(page, "chk_technical_before_after");
  await page.getByRole("button", { name: "Publicar" }).evaluate((el) => el.click());
  await page.waitForTimeout(1200);
  const overwrite = await page.getByRole("button", { name: "Sobrescrever mesmo assim" }).count();
  const reload = await page.getByRole("button", { name: "Recarregar o modelo" }).count();
  note(`Publicar com token defasado: Recarregar=${reload} Sobrescrever=${overwrite}`);
  await shot(page, "a-publicar-conflito");
  await page.getByRole("button", { name: "Recarregar o modelo" }).evaluate((el) => el.click());
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Inativar modelo" }).first().evaluate((el) => el.click());
  await page.waitForTimeout(400);
  const confirm = await page.locator("#ckb-inactivate-title").textContent().catch(() => null);
  note(`Inativar abre a confirmação: "${confirm}"`);
  await shot(page, "a-inativar-confirmacao");
  await context.close();
}

await browser.close();
writeFileSync(`${OUT}/capturas-${TAG}.log`, log.join("\n"), "utf8");
