#!/usr/bin/env node
// Sobe um servidor estático só para o painel de KPI.
//
// Por que existe: aberto por `file://`, o navegador BLOQUEIA a leitura dos JSON e o painel cai na
// cópia congelada — que funciona, mas mostra o snapshot do último merge e se anuncia como congelada.
// Para ver os dados vivos (e os gráficos, que exigem o histórico), a página precisa ser servida.
//
// Uso:  node scripts/kpi-serve.mjs [porta]      (padrão 8899)

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../Kpis/", import.meta.url));
const PORTA = Number(process.argv[2]) || 8899;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

createServer((req, res) => {
  const pedido = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = normalize(pedido === "/" ? "index.html" : pedido).replace(/^[\/\\]+/, "");
  const caminho = join(RAIZ, rel);

  // Não serve nada fora de Kpis/ — o painel é autocontido e não tem por que sair da pasta.
  if (!caminho.startsWith(RAIZ) || !existsSync(caminho)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("não encontrado em Kpis/: " + rel);
    return;
  }

  res.writeHead(200, {
    "Content-Type": TIPOS[extname(caminho)] || "application/octet-stream",
    "Cache-Control": "no-store", // o painel é sobre dado fresco; cache aqui só confundiria
  });
  res.end(readFileSync(caminho));
}).listen(PORTA, () => {
  console.log(`Painel de KPI servido em http://127.0.0.1:${PORTA}/`);
  console.log(`Raiz: ${RAIZ}`);
  console.log("Ctrl+C para parar.");
});
