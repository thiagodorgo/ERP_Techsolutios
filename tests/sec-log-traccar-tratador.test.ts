// B-SEC-LOG-SANITIZA, Emenda 1.7 (J-571, C3-A2): a prova de comportamento da exceção da G4e.
//
// O app da ingestão do Traccar (`createTraccarIngestApp`, do #454) não termina com `installFinalErrorHandler`: ele tem o
// tratador próprio, de 4 argumentos, como última camada. A G4e o aceita só por exceção explícita, e esta prova monta o
// app de verdade, com dependências de teste, para mostrar que o erro não tratado não sai com texto nem com stack:
// (a) JSON malformado com sentinelas → 400 `invalid_json`, corpo igual a `errorBody("invalid_json")`;
// (b) a dependência que lança um `Error` com sentinelas na mensagem e no `cause` → 503 `unavailable`, sem stack.
// Nos dois, 0 sentinela no corpo e no log capturado. O arquivo do Traccar não muda (v2 §6.2).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { Writable } from "node:stream";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DATABASE_URL_SENTINELA,
  REDIS_URL_SENTINELA,
  sentinelasEncontrados,
} from "./helpers/sec-log-sentinelas.js";

process.env.DATABASE_URL = DATABASE_URL_SENTINELA;
process.env.REDIS_URL = REDIS_URL_SENTINELA;
process.env.LOG_LEVEL = "info";

const { createLogger } = await import("../src/infra/logging/logger.js");
const { createTraccarForwardAuthenticator } = await import("../src/integrations/traccar/traccar-forward-auth.js");
const { createTraccarIngestApp, TRACCAR_INGEST_PATH } = await import("../src/integrations/traccar/traccar-ingest.app.js");
const { createTraccarIngestLimiter } = await import("../src/integrations/traccar/traccar-rate-limit.js");

type Ingest = Parameters<typeof createTraccarIngestApp>[0]["ingest"];

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = "j571-token-de-teste-com-32-caracteres-ou-mais";
const TEXTO_COM_SENTINELAS = `connect ECONNREFUSED hstdb-sentinela:5439 ${DATABASE_URL_SENTINELA} ${REDIS_URL_SENTINELA}`;

function corpoValido(): string {
  return readFileSync(path.join(RAIZ, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8");
}

/** Monta o app real, sobe numa porta livre, faz 1 pedido e devolve o status, o corpo e o log capturado. */
async function pedir(ingest: Ingest, corpo: string): Promise<{ status: number; corpo: string; log: string }> {
  const linhas: string[] = [];
  const logger = createLogger({
    destination: new Writable({
      write(pedaco, _codificacao, pronto) {
        linhas.push(String(pedaco));
        pronto();
      },
    }),
  });
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: TOKEN }),
    limiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
    ingest,
    instanceKey: "erp-dev",
    timeoutMs: 2_000,
    logger,
  });
  const servidor: Server = createServer(app);
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", () => resolve()));
  try {
    const { port } = servidor.address() as AddressInfo;
    const resposta = await fetch(`http://127.0.0.1:${port}${TRACCAR_INGEST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-traccar-forward-token": TOKEN },
      body: corpo,
    });
    const texto = await resposta.text();
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { status: resposta.status, corpo: texto, log: linhas.join("") };
  } finally {
    servidor.closeAllConnections();
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
  }
}

const naoChamado: Ingest = async () => {
  throw new Error("o serviço não devia ser chamado com JSON malformado");
};

test("T1 (a) JSON malformado com sentinelas → 400 invalid_json, corpo fixo e 0 sentinela no corpo e no log", async () => {
  const malformado = `{"position": {"host": "hstdb-sentinela", "url": "${DATABASE_URL_SENTINELA}", `;
  const { status, corpo, log } = await pedir(naoChamado, malformado);
  assert.equal(status, 400);
  assert.deepEqual(JSON.parse(corpo), { error: { code: "invalid_json" } });
  assert.deepEqual(sentinelasEncontrados(corpo), [], `sentinelas no corpo: ${corpo}`);
  assert.deepEqual(sentinelasEncontrados(log), [], `sentinelas no log: ${log.slice(0, 800)}`);
  assert.ok(log.includes('"code":"invalid_json"'), "o tratador próprio loga o código");
});

test("T2 (b) a dependência lança um Error com sentinelas na mensagem e no cause → 503 unavailable, sem stack", async () => {
  let chamado = 0;
  const lanca: Ingest = async () => {
    chamado += 1;
    throw new Error(TEXTO_COM_SENTINELAS, { cause: new Error(`causa ${REDIS_URL_SENTINELA} hstrd-sentinela:6391`) });
  };
  const { status, corpo, log } = await pedir(lanca, corpoValido());
  assert.equal(chamado, 1, "o pedido chegou à dependência");
  assert.equal(status, 503);
  assert.deepEqual(JSON.parse(corpo), { error: { code: "unavailable" } });
  assert.deepEqual(sentinelasEncontrados(corpo), [], `sentinelas no corpo: ${corpo}`);
  assert.deepEqual(sentinelasEncontrados(log), [], `sentinelas no log: ${log.slice(0, 800)}`);
  for (const saida of [corpo, log]) {
    assert.ok(!/\bat [^\n]*\.(ts|js):\d+/.test(saida) && !saida.includes('"stack"'), `stack na saída: ${saida.slice(0, 800)}`);
  }
});
