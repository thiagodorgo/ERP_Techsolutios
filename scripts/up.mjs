#!/usr/bin/env node
// Sobe o SISTEMA INTEIRO de desenvolvimento com um comando: `npm run up`.
//
// Por que existe: subir o ambiente exigia lembrar de quatro coisas em quatro terminais — o compose do
// banco, o backend, o console web e o painel de KPI. Esquecer uma delas produz o pior tipo de erro: a
// tela sobe, parece funcionar, e o que falta só aparece depois. Agora é um comando e um relatório.
//
// Uso:  npm run up            (tudo)
//       npm run up -- --sem-docker    (pula o compose; útil quando o banco já está de pé)

import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
const semDocker = process.argv.includes("--sem-docker");

const PECAS = [
  { nome: "backend",  porta: 3000, cmd: "npm", args: ["run", "dev"],     cor: "\x1b[36m" },
  { nome: "web",      porta: 5173, cmd: "npm", args: ["run", "web:dev"], cor: "\x1b[35m" },
  { nome: "kpis",     porta: 8899, cmd: "node", args: ["scripts/kpi-serve.mjs", "8899"], cor: "\x1b[33m" },
];

const RESET = "\x1b[0m";
const log = (nome, cor, txt) => process.stdout.write(`${cor}[${nome}]${RESET} ${txt}\n`);

function subirDocker() {
  if (semDocker) {
    console.log("• banco e cache: PULADOS (--sem-docker)");
    return;
  }
  const r = spawnSync("docker", ["compose", "up", "-d", "erp-postgres", "erp-redis"], {
    cwd: RAIZ, stdio: "inherit", shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error("\n✗ o compose não subiu (Docker está rodando?).");
    console.error("  O backend vai subir mesmo assim e falhar ao falar com o banco — o que é o comportamento");
    console.error("  correto, mas você precisa saber que a causa é esta, e não o código.\n");
  }
}

const filhos = [];

function subir(peca) {
  const p = spawn(peca.cmd, peca.args, { cwd: RAIZ, shell: process.platform === "win32" });
  filhos.push({ ...peca, proc: p });

  const escrever = (buf) => {
    for (const linha of String(buf).split("\n")) {
      if (linha.trim()) log(peca.nome, peca.cor, linha);
    }
  };
  p.stdout.on("data", escrever);
  p.stderr.on("data", escrever);
  p.on("exit", (code) => log(peca.nome, peca.cor, `saiu com código ${code}`));
}

console.log("\nSubindo o ambiente de desenvolvimento…\n");
subirDocker();
for (const peca of PECAS) subir(peca);

setTimeout(() => {
  console.log("\n" + "─".repeat(64));
  console.log("  Backend      http://127.0.0.1:3000/api/v1/health");
  console.log("  Console web  http://127.0.0.1:5173/");
  console.log("  Painel KPI   http://127.0.0.1:8899/");
  console.log("─".repeat(64));
  console.log("  Ctrl+C encerra tudo junto.\n");
}, 2500);

function encerrar() {
  console.log("\nEncerrando…");
  for (const f of filhos) {
    try { f.proc.kill(); } catch { /* já morreu */ }
  }
  process.exit(0);
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
