import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// B-SAN3-18 (R-A10 do plano v2) — o gate de módulo cobre `/api/v1`, montado em `src/app.ts`. Toda OUTRA instância
// `express()` de `src/` é uma superfície fora do gate, e tem de estar na lista abaixo COM a pendência dona. Superfície
// nova sem nome deixa este teste vermelho (fail-closed). Os jobs não são instância `express()`: ficam na pendência
// `P-SAN3-18-JOBS-SEM-GATE`, sem guard.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SUPERFICIES_FORA_DO_GATE: Record<string, string> = {
  "src/portal-app.ts": "P-SAN3-18-PORTAL-SEM-GATE (B-SAN3-18b)",
  "src/integrations/traccar/traccar-ingest.app.ts": "P-SAN3-18-TRACCAR-SEM-GATE (B-SAN3-18b)",
};

function arquivosTs(dir: string, saida: string[] = []): string[] {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) arquivosTs(caminho, saida);
    else if (entrada.name.endsWith(".ts") && !entrada.name.endsWith(".test.ts")) saida.push(caminho);
  }
  return saida;
}

test("A10 — toda instância express() de src/ é o app do gate ou uma superfície nomeada, com pendência", () => {
  const comExpress = arquivosTs(path.join(RAIZ, "src"))
    .filter((arquivo) => /\bexpress\(\s*\)/.test(fs.readFileSync(arquivo, "utf8")))
    .map((arquivo) => path.relative(RAIZ, arquivo).split(path.sep).join("/"))
    .sort();
  assert.ok(comExpress.includes("src/app.ts"), "o app do gate tem de ser achado pela varredura (controle)");
  const fora = comExpress.filter((arquivo) => arquivo !== "src/app.ts" && !(arquivo in SUPERFICIES_FORA_DO_GATE));
  assert.deepEqual(fora, [], "superfície express() fora do gate sem pendência");
  const mortas = Object.keys(SUPERFICIES_FORA_DO_GATE).filter((arquivo) => !comExpress.includes(arquivo));
  assert.deepEqual(mortas, [], "entrada da lista que não existe mais (a lista não apodrece)");
  for (const pendencia of Object.values(SUPERFICIES_FORA_DO_GATE)) assert.match(pendencia, /^P-SAN3-18-[A-Z-]+ \(B-SAN3-18b\)$/);
});

test("A10 — o gate é montado UMA vez, em src/app.ts, sob /api/v1", () => {
  const app = fs.readFileSync(path.join(RAIZ, "src/app.ts"), "utf8");
  const montagens = app.match(/app\.use\("\/api\/v1", attachAuthenticatedActor\(\), createModuleGate\(service\)\);/g) ?? [];
  assert.equal(montagens.length, 1);
  const posGate = app.indexOf("createModuleGate(service)");
  assert.ok(posGate > app.indexOf('app.use("/api/v1/auth", createAuthRouter('), "o gate vem depois de /auth");
  assert.ok(posGate < app.indexOf('app.use("/api/v1/platform"'), "o gate vem antes da primeira montagem de organização");
});
