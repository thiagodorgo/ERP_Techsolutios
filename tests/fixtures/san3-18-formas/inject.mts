// B-SAN3-18 (P2, mutações (ii) e (iii) do §3) — injeta uma rota NOVA no app real, numa montagem própria sob `/api/v1`,
// ANTES do 404 padrão (a última camada do app). Serve para provar que o censo enxerga rota e montagem novas e que o
// gate recusa a rota sem classe. Nunca é importado por `src/`.
import { createRequire } from "node:module";

export function injetarRota(app: any, metodo: "get" | "post", caminho: string): void {
  const req0 = createRequire(process.cwd() + "/package.json");
  const express = req0("express");
  const router = express.Router();
  router[metodo](caminho, (_request: any, response: any) => {
    response.status(200).json({ data: { injetada: true } });
  });
  const pilha = app.router.stack;
  const antes = pilha.length;
  app.use("/api/v1", router);
  const novas = pilha.splice(antes, pilha.length - antes);
  // A última camada antes da injeção é o 404 padrão de `/api/v1` (src/app.ts): a rota nova entra logo antes dela.
  pilha.splice(antes - 1, 0, ...novas);
}
