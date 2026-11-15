// B-ASS-08c1b (F9; Emenda 1 §3.1, o LF3) — os tetos de tempo de UMA tentativa, do claim ao fim da chamada ao provedor, cabem
// em METADE da janela da órfã (`OUTBOX_ORPHAN_MS`) com 60 s de folga. Sem banco. As constantes de `outbox/**` vêm por
// importação, como o produto as usa; os dois tempos do cliente HTTP são lidos COMO TEXTO, com a âncora contada (1 cada),
// porque `providers/**` é PROIBIDO a este bloco.
//   tentativa de criação     = o perfil (2 chamadas: busca + criação do cliente) + a lista + a leitura dos fatos + o
//                              `confirmLease` + o POST (o maior entre o tempo do cartão e POST + QR do pix);
//   tentativa de cancelamento = a lista + o `confirmLease` + o DELETE.
// Uma transação curta custa no máximo `CLAIM_BUDGET.maxWait + CLAIM_BUDGET.timeout`. Hoje: 175 s e 65 s contra 300 s.
// Também confere que ninguém em `src/modules/subscription-billing` passa `cardTimeoutMs` nem `timeoutMs` ao cliente: os
// tempos que valem são os padrões lidos aqui.
// Mutação M-LF3 (literal): `OUTBOX_ORPHAN_MS = 10 * 60 * 1000` → `5 * 60 * 1000` → LF3 vermelho.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CLAIM_BUDGET } from "../src/modules/subscription-billing/outbox/outbox.prisma.js";
import { OUTBOX_ORPHAN_MS } from "../src/modules/subscription-billing/outbox/outbox.types.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE = path.join(ROOT, "src/modules/subscription-billing");
const HTTP_CLIENT = path.join(MODULE, "providers/http/billing-http.client.ts");
const FOLGA_MS = 60_000;

const num = (text: string): number => Number(text.replaceAll("_", ""));

/** O único grupo capturado da âncora, que tem de aparecer exatamente 1 vez. */
function one(text: string, pattern: RegExp, what: string): string {
  const all = [...text.matchAll(new RegExp(pattern.source, "g"))];
  assert.equal(all.length, 1, `âncora ${what}: esperava 1, achei ${all.length}`);
  return all[0]![1]!;
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

test("LF3: a tentativa de criação e a de cancelamento, mais 60 s de folga, cabem em metade da janela da órfã", (t) => {
  const http = readFileSync(HTTP_CLIENT, "utf8");
  const card = num(one(http, /cardTimeoutMs \?\? ([\d_]+)\)/, "cardTimeoutMs"));
  const plain = num(one(http, /timeoutMs \?\? ([\d_]+)\);/, "timeoutMs"));
  const tx = CLAIM_BUDGET.maxWait + CLAIM_BUDGET.timeout;
  const attempt = 2 * plain + plain + tx + tx + Math.max(card, 2 * plain);
  const cancel = plain + tx + plain;
  const ceiling = OUTBOX_ORPHAN_MS / 2;
  const measured = { card, plain, tx, attempt, cancel, folga: FOLGA_MS, orfa: OUTBOX_ORPHAN_MS, teto: ceiling };
  assert.ok(attempt + FOLGA_MS <= ceiling, `a tentativa de criação não cabe em metade da janela da órfã: ${JSON.stringify(measured)}`);
  assert.ok(cancel + FOLGA_MS <= ceiling, `a tentativa de cancelamento não cabe em metade da janela da órfã: ${JSON.stringify(measured)}`);
  t.diagnostic(`LF3 ${JSON.stringify(measured)}`);
});

test("LF3: ninguém no módulo passa cardTimeoutMs nem timeoutMs ao cliente HTTP (valem os padrões lidos acima)", () => {
  const uses = sources(MODULE)
    .filter((file) => file !== HTTP_CLIENT)
    .flatMap((file) =>
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line, index) => ({ file: path.relative(ROOT, file).replaceAll("\\", "/"), line: index + 1, text: line }))
        .filter((entry) => /\b(cardTimeoutMs|timeoutMs)\b/.test(entry.text)),
    );
  assert.deepEqual(uses, []);
});
