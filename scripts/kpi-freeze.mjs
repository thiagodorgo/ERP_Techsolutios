#!/usr/bin/env node
// Reinjeta a CÓPIA CONGELADA embutida no `Kpis/app.js` a partir do `Kpis/kpis-latest.json`.
//
// Por que isto existe: o painel hidrata dos JSON quando servido, mas por `file://` o navegador bloqueia
// o `fetch` de arquivo local. O fallback é uma cópia embutida, rotulada na tela como congelada. Uma cópia
// embutida é, por natureza, um segundo lugar onde o mesmo número mora — e dois lugares divergem. Já
// divergiram neste repositório: o `app.js` chegou a carregar número cravado que contradizia o JSON, que é
// exatamente o que a decisão D-KPI-INDEX-PAINEL proíbe.
//
// A regra que este script materializa: a cópia congelada NUNCA é digitada, é sempre gerada. E o guard
// `tests/kpi-dashboard-charts.test.ts` compara as duas — se alguém editar o JSON e esquecer de rodar isto,
// a bateria falha antes do merge, em vez de o painel mentir por `file://`.
//
// Uso:  node scripts/kpi-freeze.mjs          (reinjeta)
//       node scripts/kpi-freeze.mjs --check  (só verifica; sai 1 se defasado)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const APP_PATH = `${ROOT}Kpis/app.js`;
const LATEST_PATH = `${ROOT}Kpis/kpis-latest.json`;

const MARKER = /^var FROZEN = .*;$/m;

const latestRaw = readFileSync(LATEST_PATH, "utf8");
const latest = JSON.parse(latestRaw); // valida de passagem
const app = readFileSync(APP_PATH, "utf8");

if (!MARKER.test(app)) {
  console.error("kpi-freeze: não achei a linha `var FROZEN = ...;` no Kpis/app.js.");
  console.error("Se o fallback mudou de forma, atualize este script E o guard — os dois dependem da marca.");
  process.exit(2);
}

const linha = `var FROZEN = ${JSON.stringify(latest)};`;
const atualizado = app.replace(MARKER, () => linha);
const jaEstaEmDia = atualizado === app;

if (process.argv.includes("--check")) {
  if (jaEstaEmDia) {
    console.log(`kpi-freeze: em dia (snapshot ${latest.snapshot_date}).`);
    process.exit(0);
  }
  console.error("kpi-freeze: a cópia congelada do app.js DIVERGE do kpis-latest.json.");
  console.error("Rode `node scripts/kpi-freeze.mjs` e faça commit do app.js junto com o JSON.");
  process.exit(1);
}

if (jaEstaEmDia) {
  console.log(`kpi-freeze: nada a fazer, já em dia (snapshot ${latest.snapshot_date}).`);
} else {
  writeFileSync(APP_PATH, atualizado);
  console.log(`kpi-freeze: cópia congelada reinjetada (snapshot ${latest.snapshot_date}, ${linha.length} bytes).`);
}
