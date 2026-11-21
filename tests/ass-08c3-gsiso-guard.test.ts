import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const NEEDLE = "new PrismaOutboxRepository(";

function balancedScope(source: string, startParen: number): string {
  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = startParen; i < source.length; i += 1) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(startParen, i + 1);
    }
  }
  throw new Error("parêntese sem fechamento em um construtor de PrismaOutboxRepository");
}

function constructorScopes(source: string): string[] {
  const scopes: string[] = [];
  let quote: "'" | '"' | "`" | null = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }
    if (source.startsWith(NEEDLE, i)) {
      scopes.push(balancedScope(source, i + NEEDLE.length - 1));
      i += NEEDLE.length - 1;
    }
  }
  return scopes;
}

test("GS-ISO-T · todo `new PrismaOutboxRepository(` em tests/ass-08c*-*.test.ts leva `tenantIds`", () => {
  const files = readdirSync(TESTS_DIR)
    .filter((name) => /^ass-08c.*-.*\.test\.ts$/.test(name))
    .sort();
  const missing: string[] = [];
  let total = 0;
  for (const file of files) {
    const source = readFileSync(path.join(TESTS_DIR, file), "utf8");
    for (const scope of constructorScopes(source)) {
      total += 1;
      if (!scope.includes("tenantIds")) missing.push(`${file} · ${scope.replace(/\s+/g, " ").trim()}`);
    }
  }
  assert.ok(total > 0, "nenhum construtor de PrismaOutboxRepository encontrado");
  assert.deepEqual(missing, [], missing.join("\n"));
});