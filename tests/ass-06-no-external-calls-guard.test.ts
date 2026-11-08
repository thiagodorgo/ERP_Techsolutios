// B-ASS-06 · F1 — guard SEM REDE (plano §4.6, R-PAY-6 / R-EXT-0, §12).
//
//  1. Em `src/modules/subscription-billing/**`, fetch/undici/http/axios só podem morar em
//     `billing-http.client.ts` (o único ponto de fetch do módulo).
//  2. Em `tests/**`, nenhum host real de provedor fora da lista fechada: `tests/helpers/fake-providers/**`
//     (e o `provider.catalog.ts`, que fica em src e não é varrido aqui).
//  3. Nos `fake-providers/**`, corpos copiados da pesquisa podem trazer `https://www.asaas.com/i/...` como
//     DADO de fixture; nenhum `fetch(`/`new URL(` nesses arquivos pode usar host real.
//
// Mutações do plano: `fetch` direto num adaptador → vermelho; host real em `tests/ass-06-*.test.ts` → vermelho.
// Conserto A9: reconhece também `http.get`/`https.get`, import nomeado de `node:http`/`node:https` e import
// dinâmico `import("node:http")`/`import("node:https")` (M-PAY6b/c).

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const REPO = process.cwd();

function listTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "dist" || entry === "coverage") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) listTsFiles(full, out);
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const NET_PATTERNS: readonly { readonly name: string; readonly re: RegExp }[] = [
  { name: "fetch(", re: /fetch\s*\(/ },
  { name: "globalThis.fetch", re: /globalThis\.fetch/ },
  { name: "undici", re: /\bundici\b/ },
  { name: "http.request", re: /http\.request/ },
  { name: "https.request", re: /https\.request/ },
  { name: "http.get", re: /http\.get\s*\(/ },
  { name: "https.get", re: /https\.get\s*\(/ },
  { name: "node:http import", re: /from\s+["']node:https?["']/ },
  { name: "node:http dynamic import", re: /import\s*\(\s*["']node:https?["']\s*\)/ },
  { name: "axios", re: /\baxios\b/ },
];

const HOST_PATTERNS: readonly RegExp[] = [
  /asaas\.com/,
  /iugu\.com/,
  /mercadopago\.com/,
  /focusnfe\.com\.br/,
  /nfe\.io/,
  /nfse\.io/,
  /plugnotas\.com\.br/,
];

const GUARD_FILE = "tests/ass-06-no-external-calls-guard.test.ts";

function rel(file: string): string {
  return relative(REPO, file).split("\\").join("/");
}

test("T-PAY-GUARD-1 · no módulo subscription-billing, rede só em billing-http.client.ts", () => {
  const files = listTsFiles(join(REPO, "src", "modules", "subscription-billing"));
  assert.ok(files.length > 0, "o módulo subscription-billing existe");
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const base = rel(file).split("/").pop();
    if (base === "billing-http.client.ts") continue;
    for (const pattern of NET_PATTERNS) {
      if (pattern.re.test(text)) offenders.push(`${rel(file)} usa ${pattern.name}`);
    }
  }
  assert.deepEqual(offenders, [], "nenhuma chamada de rede fora do cliente HTTP único");
});

test("T-PAY-GUARD-2 · nenhum host real de provedor em tests/ fora dos fake-providers", () => {
  const files = listTsFiles(join(REPO, "tests"));
  const offenders: string[] = [];
  for (const file of files) {
    const r = rel(file);
    if (r === GUARD_FILE) continue;
    if (r.startsWith("tests/helpers/fake-providers/")) continue;
    const text = readFileSync(file, "utf8");
    for (const host of HOST_PATTERNS) {
      if (host.test(text)) offenders.push(`${r} contém host real (${host.source})`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("T-PAY-GUARD-3 · nos fake-providers, fetch/new URL nunca usam host real", () => {
  const files = listTsFiles(join(REPO, "tests", "helpers", "fake-providers"));
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const [index, line] of text.split("\n").entries()) {
      if (/\bfetch\s*\(/.test(line) || /new\s+URL\s*\(/.test(line)) {
        if (HOST_PATTERNS.some((host) => host.test(line))) {
          offenders.push(`${rel(file)}:${index + 1} → ${line.trim()}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("T-PAY-GUARD-4 · o cliente HTTP é o único ponto de fetch (sanity da lista)", () => {
  const files = listTsFiles(join(REPO, "src", "modules", "subscription-billing"));
  const client = files.find((file) => rel(file).split("/").pop() === "billing-http.client.ts");
  assert.ok(client, "billing-http.client.ts existe");
});
