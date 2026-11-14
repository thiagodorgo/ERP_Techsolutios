// B-SEC-LOG-SANITIZA — o boot na forma real sem banco (B1 e B2) e o helper de sentinelas (S1).
//
// B1 e B2 sobem `src/server.ts` como processo filho, com o banco inalcançável, e exigem a linha positiva da variante
// (a sonda de login escreve "desfecho não classificado" com `DatabaseNotReachable` e `P2010` na mesma linha) com 0
// sentinela no log inteiro. A espera, a repetição e as mensagens de falha estão em `tests/helpers/sec-log-sentinelas.ts`
// (`bootNaFormaReal`), pela regra da Emenda 1.2 §5.5 com o item 5 da Emenda 1.2.1. Não precisam de banco.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  REDIS_URL_SENTINELA,
  SENTINELAS_NUMERICOS,
  bootNaFormaReal,
  contarSentinelas,
  explicarBoot,
  medirPortaLivre,
  type VarianteDeBoot,
} from "./helpers/sec-log-sentinelas.js";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/** A mensagem da linha positiva da sonda de login (o `ã` tem 2 bytes: `n[^ ]*`, como no aceite de boot). */
const DESFECHO_NAO_CLASSIFICADO = /desfecho n[^ ]* classificado/;

async function conferirBoot(variante: VarianteDeBoot) {
  const resultado = await bootNaFormaReal(RAIZ, variante);
  assert.equal(resultado.veredito, "LIMPO", explicarBoot(variante, resultado));
  const ultima = resultado.tentativas[resultado.tentativas.length - 1];
  assert.deepEqual(ultima.sentinelas, [], explicarBoot(variante, resultado));
  assert.ok(ultima.positivo >= 1, explicarBoot(variante, resultado));
}

test("B1 (VA) banco em host que não resolve: o boot loga a falha da sonda com 0 sentinela", async () => {
  await conferirBoot({
    rotulo: "B1 (VA)",
    // Emenda 1.2 §5.5 item 4: o host `.invalid` falha no DNS em ~0,1 s; o sentinela `hstdb-sentinela` está dentro dele.
    env: {
      DATABASE_URL: "postgresql://usrdb-sentinela:pwddb-sentinela@hstdb-sentinela.invalid:5439/bcodb-sentinela",
      REDIS_URL: REDIS_URL_SENTINELA,
      JOBS_WORKER_ENABLED: "false",
    },
    mensagem: DESFECHO_NAO_CLASSIFICADO,
    codigos: ["DatabaseNotReachable", "P2010"],
    modo: "sonda",
  });
});

test("B2 (VB) banco em porta fechada: o boot loga a falha da sonda com 0 sentinela", async () => {
  await conferirBoot({
    rotulo: "B2 (VB)",
    env: {
      DATABASE_URL: "postgresql://usrdb-sentinela:pwddb-sentinela@127.0.0.1:5439/bcodb-sentinela",
      REDIS_URL: REDIS_URL_SENTINELA,
      JOBS_WORKER_ENABLED: "false",
    },
    mensagem: DESFECHO_NAO_CLASSIFICADO,
    codigos: ["DatabaseNotReachable", "P2010"],
    modo: "sonda",
  });
});

test("S1 o helper de sentinelas: porta sorteada não conta, vazamento real conta, e a porta igual a um sentinela é recusada", async () => {
  const controle = '{"level":30,"port":54390,"msg":"ERP Techsolutions API listening"} {"port":65439} {"port":63915} {"x":15439}';
  assert.equal(contarSentinelas(controle), 0, "porta que só contém o número do sentinela não é vazamento");
  const vazamentos =
    'connect ECONNREFUSED 127.0.0.1:6391 e hstdb-sentinela.invalid:5439 e "port":5439 e 127.0.0.1:55598';
  assert.equal(contarSentinelas(vazamentos, { portaCluster: 55598 }), 5);
  assert.equal(contarSentinelas('{"time":5439,"pid":6391,"msg":"ok"}'), 0, "time e pid saem antes de contar");

  const sorteios = [...SENTINELAS_NUMERICOS, 55598, 50123];
  const porta = await medirPortaLivre([55598], async () => sorteios.shift() ?? 0);
  assert.equal(porta, 50123, "a medição sorteia de novo quando cai num sentinela numérico ou numa porta proibida");
  const livre = await medirPortaLivre();
  assert.ok(livre > 0 && !SENTINELAS_NUMERICOS.includes(livre), `porta medida: ${livre}`);
});
