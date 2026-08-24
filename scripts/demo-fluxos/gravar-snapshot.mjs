// Grava um SNAPSHOT do sistema real para os vídeos de fluxo.
//
// Por que existe: os vídeos em docs/demo-fluxos/ têm que ser espelho do sistema,
// não uma recriação que envelhece calada. Então em vez de mocks escritos à mão,
// este script abre o app REAL (localhost:5173) contra o backend REAL, faz login
// de verdade, navega as rotas dos 4 fluxos e grava TODA resposta /api/v1 que a
// tela consumiu.
//
// O vídeo depois monta os MESMOS componentes de frontend/src e serve estas
// respostas no lugar da rede. Mudou a tela → recompila e o vídeo muda. Mudou o
// dado → roda este script de novo e o vídeo muda.
//
// Pré-requisitos: API em :3000 e web em :5173 no ar.
//
// Uso:  node scripts/demo-fluxos/gravar-snapshot.mjs
//       node scripts/demo-fluxos/gravar-snapshot.mjs --rotas /patios/painel,/checklists

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB = process.env.DEMO_WEB_URL ?? "http://localhost:5173";
// Administrador por padrao: e o papel que enxerga o sistema inteiro com as
// acoes habilitadas. Com "gestor" o editor de checklist nasce em modo somente
// leitura, e o video mostraria um botao Publicar que aquele perfil nao tem.
const EMAIL = process.env.DEMO_EMAIL ?? "admin.demo@example.com";
const SENHA = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";
const SAIDA = path.join(process.cwd(), "docs", "demo-fluxos", "snapshot-api.json");

/* As rotas que os 4 vídeos percorrem. Cada uma é visitada de verdade; o que a
   tela pedir ao backend entra no snapshot. */
const ROTAS_PADRAO = [
  // Fluxo 1 — do chamado a rua
  "/dashboard",
  "/work-orders",
  "/operations/dispatches",
  "/work-orders/3d748a21-63c9-4fcc-9836-e53d15ddb8bf",
  // A aba Financeiro da OS pede /work-orders/:id/financial-items — sem visitar a
  // aba, o video cai no envelope vazio e a narracao diz "o banco tem zero itens"
  // quando o que aconteceu foi "o snapshot nao tem esse endereco".
  "/work-orders/3d748a21-63c9-4fcc-9836-e53d15ddb8bf?aba=financeiro",
  // Fluxo 2 — o checklist
  "/operations/checklists",
  "/administrator/checklists",
  "/administrator/checklists/97986f53-5e44-4689-b165-a87ff29a451e",
  // Fluxo 3 — do resgate a custodia
  "/patios/painel",
  "/patios/processos",
  "/patios/processos/3264086d-3c58-4fb3-9080-2e2961e7cab9",
  "/patios/patios",
  "/patios/patios/23c99fed-2ba1-48b1-92b4-4438e3e05306",
  // Fluxo 4 — do servico ao dinheiro
  "/cadastros/tabelas-valores",
  "/finance",
  "/finance/charges",
  "/finance/payments",
  "/finance/commissions",
  "/cadastros/tarifas",
  "/cadastros/servicos",
  "/cadastros/clientes",
];

const argRotas = process.argv.indexOf("--rotas");
const ROTAS = argRotas > -1 ? process.argv[argRotas + 1].split(",") : ROTAS_PADRAO;

/** Chave de uma requisição: método + caminho + query ordenada. */
function chaveDe(metodo, url) {
  const u = new URL(url);
  const params = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const busca = params.length ? "?" + params.map(([k, v]) => `${k}=${v}`).join("&") : "";
  return `${metodo} ${u.pathname}${busca}`;
}

const navegador = await chromium.launch({ channel: "msedge" });
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } });

const respostas = {};
const falhas = [];
let capturadas = 0;

pagina.on("response", async (r) => {
  const url = r.url();
  if (!url.includes("/api/v1")) return;
  const req = r.request();
  const chave = chaveDe(req.method(), url);
  try {
    const corpo = await r.json();
    // Nunca gravamos credencial: a resposta de login some do snapshot.
    if (/\/auth\/(login|refresh)/.test(url)) return;
    respostas[chave] = { status: r.status(), corpo };
    capturadas += 1;
  } catch {
    falhas.push(`${chave} — corpo não-JSON (${r.status()})`);
  }
});

console.log(`abrindo ${WEB} …`);
await pagina.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });

// Login real — pelo formulário, como uma pessoa faria.
await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
await pagina.fill('input[type="password"], input[name="password"]', SENHA);
await pagina.click('button[type="submit"]');
await pagina.waitForTimeout(2500);

const sessao = await pagina.evaluate(() => window.localStorage.getItem("erp-techsolutions.auth-session"));
if (!sessao) {
  await navegador.close();
  throw new Error(`login falhou para ${EMAIL} — a sessão não foi gravada. API no ar em :3000?`);
}
const sessaoObj = JSON.parse(sessao);
console.log(`sessão de ${sessaoObj?.user?.email ?? EMAIL}`);

// O app exige escolher a organização antes de liberar qualquer rota: sem este
// passo TODA rota volta para /select-context e nenhuma tela chega a pedir dado.
if (pagina.url().includes("/select-context")) {
  const acessar = pagina.getByRole("button", { name: /acessar/i }).first();
  await acessar.click();
  await pagina.waitForTimeout(2500);
  console.log(`organização selecionada · url ${new URL(pagina.url()).pathname}`);
}

for (const rota of ROTAS) {
  const antes = capturadas;
  await pagina.goto(`${WEB}${rota}`, { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(3200);
  const destino = new URL(pagina.url()).pathname;
  const desviou = destino !== rota ? `  →  DESVIOU para ${destino}` : "";
  console.log(`  ${rota.padEnd(30)} +${capturadas - antes} respostas${desviou}`);
}

/* O vídeo precisa do localStorage inteiro para nascer JÁ com a organização
   escolhida — sem isso ele cai no /select-context como o gravador caiu. */
const armazenamento = await pagina.evaluate(() => {
  const saida = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    saida[k] = window.localStorage.getItem(k);
  }
  return saida;
});

await navegador.close();

/* O token não entra no snapshot — só a forma da sessão, para o vídeo montar o
   AppShell com o nome e o papel certos (§2.8: nada de segredo em artefato). */
const sessaoLimpa = {
  ...sessaoObj,
  accessToken: "video-sem-token",
  refreshToken: "video-sem-token",
};

const snapshot = {
  gravado_em: new Date().toISOString(),
  origem: `${WEB} contra a API em :3000`,
  como_regravar: "node scripts/demo-fluxos/gravar-snapshot.mjs",
  rotas: ROTAS,
  sessao: sessaoLimpa,
  // Mesma redação do token aqui: o vídeo monta a casca com o nome e o papel
  // certos, sem carregar credencial nenhuma (§2.8).
  armazenamento: Object.fromEntries(
    Object.entries(armazenamento).map(([k, v]) => [
      k,
      k.includes("auth-session") ? JSON.stringify(sessaoLimpa) : v,
    ]),
  ),
  respostas,
};

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify(snapshot, null, 2));

const chaves = Object.keys(respostas).sort();
console.log(`\ngravado ${path.relative(process.cwd(), SAIDA)} — ${chaves.length} respostas`);
for (const k of chaves) console.log("  " + k);
if (falhas.length) {
  console.log(`\n${falhas.length} respostas não-JSON (ignoradas):`);
  for (const f of falhas.slice(0, 10)) console.log("  " + f);
}
