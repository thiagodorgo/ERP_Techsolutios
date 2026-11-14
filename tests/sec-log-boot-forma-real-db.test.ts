// B-SEC-LOG-SANITIZA — o boot na forma real com o banco no ar e o Redis inalcançável (B3 e B4).
//
// Usam o `DATABASE_URL` do ambiente (o banco migrado do job `backend`, ou o cluster descartável do dev, em UTC): com o
// banco no ar, o boot passa da trava de fuso do #554 e chega ao worker, que falha no Redis sentinela. Sem
// `DATABASE_URL`, pulam declarando, como as outras suítes `-db`. O boot não escreve no banco (plano v2, V6).
// A porta do banco conta como sentinela numérico, como a do cluster no aceite de boot.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { REDIS_URL_SENTINELA, bootNaFormaReal, explicarBoot, type VarianteDeBoot } from "./helpers/sec-log-sentinelas.js";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;
const SEM_BANCO = DATABASE_URL ? false : "sem DATABASE_URL: B3 e B4 precisam do banco no ar (rodam no job backend)";

function portaDoBanco(url: string): number | undefined {
  const porta = Number(new URL(url).port || 5432);
  return Number.isInteger(porta) && porta > 0 ? porta : undefined;
}

async function conferirBoot(variante: VarianteDeBoot) {
  const resultado = await bootNaFormaReal(RAIZ, variante);
  assert.equal(resultado.veredito, "LIMPO", explicarBoot(variante, resultado));
  const ultima = resultado.tentativas[resultado.tentativas.length - 1];
  assert.deepEqual(ultima.sentinelas, [], explicarBoot(variante, resultado));
  assert.ok(ultima.positivo >= 1, explicarBoot(variante, resultado));
}

test("B3 (RA) worker ligado, banco no ar, Redis em host que não resolve: Failed to start com 0 sentinela", { skip: SEM_BANCO }, async () => {
  const url = DATABASE_URL ?? "";
  await conferirBoot({
    rotulo: "B3 (RA)",
    env: { DATABASE_URL: url, REDIS_URL: REDIS_URL_SENTINELA, JOBS_WORKER_ENABLED: "true" },
    mensagem: /Failed to start/,
    codigos: ["ENOTFOUND", "getaddrinfo"],
    modo: "escuta",
    portaCluster: portaDoBanco(url),
  });
});

test("B4 (RB) worker ligado, banco no ar, Redis em porta fechada: Failed to start com 0 sentinela", { skip: SEM_BANCO }, async () => {
  const url = DATABASE_URL ?? "";
  await conferirBoot({
    rotulo: "B4 (RB)",
    env: {
      DATABASE_URL: url,
      REDIS_URL: "redis://usrrd-sentinela:pwdrd-sentinela@127.0.0.1:6391/0",
      JOBS_WORKER_ENABLED: "true",
    },
    mensagem: /Failed to start/,
    codigos: ["ECONNREFUSED", "connect"],
    modo: "escuta",
    portaCluster: portaDoBanco(url),
  });
});
