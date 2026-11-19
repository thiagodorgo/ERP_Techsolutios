// B-ASS-08c3 · F-A2 — o censo dos escritores de `enabled` (A5/EW2) e do `setEnabledForTests` (EW3), por propriedade.
//
//  - EW2(i): em src/**, toda escrita Prisma em `billingProviderConfig` (update/upsert/create/updateMany/createMany)
//    que cite `enabled` está só em `PrismaProviderConfigRepository.setEnabled`.
//  - EW2(ii): nenhum SQL cru `UPDATE/INSERT billing_provider_configs` que cite `enabled`, e nenhum
//    `$executeRawUnsafe`/`$queryRawUnsafe` com concatenação/interpolação que cite `billing_provider_configs`.
//  - EW2(iii): `setEnabled(` só é chamado de `provider-config.service.ts` (fora as definições na porta, no dublê e no Prisma).
//  - EW3: `setEnabledForTests` não aparece em src/** fora da própria definição no dublê.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const REPO_FILE = "src/modules/subscription-billing/providers/provider-config.repository.ts";
const PRISMA_FILE = "src/modules/subscription-billing/vault/vault.prisma-runtime.ts";
const SERVICE_FILE = "src/modules/subscription-billing/providers/provider-config.service.ts";

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...sourceFiles(full));
    else if (entry.endsWith(".ts")) files.push(full);
  }
  return files;
}

function rel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function filesMatching(pattern: RegExp): string[] {
  return sourceFiles(SRC)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map(rel)
    .sort();
}

test("EW3 · setEnabledForTests não aparece em src/** fora do dublê", () => {
  assert.deepEqual(filesMatching(/setEnabledForTests/), [REPO_FILE]);
});

test("EW2 · setEnabled( só é chamado de provider-config.service.ts (fora as definições)", () => {
  const definitionFiles = new Set([REPO_FILE, PRISMA_FILE]);
  const offenders = filesMatching(/\bsetEnabled\s*\(/).filter((file) => file !== SERVICE_FILE && !definitionFiles.has(file));
  assert.deepEqual(offenders, []);
});

test("EW2 · escritas Prisma em billingProviderConfig que citam enabled só em PrismaProviderConfigRepository.setEnabled", async () => {
  const ts = (await import("typescript")).default;
  const PRISMA_WRITES = new Set(["update", "upsert", "create", "updateMany", "createMany"]);
  const writers = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("billingProviderConfig")) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node: import("typescript").Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const prop = node.expression.name;
        if (ts.isIdentifier(prop) && PRISMA_WRITES.has(prop.text)) {
          const obj = node.expression.expression;
          if (ts.isPropertyAccessExpression(obj) && ts.isIdentifier(obj.name) && obj.name.text === "billingProviderConfig") {
            const callText = node.getText(source);
            if (/\benabled\b/.test(callText)) {
              let method: string | undefined;
              let klass: string | undefined;
              for (let cur: import("typescript").Node | undefined = node.parent; cur; cur = cur.parent) {
                if (!method && ts.isMethodDeclaration(cur) && cur.name && ts.isIdentifier(cur.name)) method = cur.name.text;
                if (!klass && ts.isClassDeclaration(cur) && cur.name) klass = cur.name.text;
              }
              const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
              writers.add(`${rel(file)}:${line + 1} ${klass ?? "-"}.${method ?? "-"}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const normalized = [...writers].map((writer) => writer.replace(/:\d+ /, " ")).sort();
  assert.deepEqual(normalized, [`${PRISMA_FILE} PrismaProviderConfigRepository.setEnabled`]);
});

test("EW2 · nenhum SQL cru/rawUnsafe escreve billing_provider_configs fora do setEnabled", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!/billing_provider_configs/.test(line)) return;
      const rawUnsafe = /\$executeRawUnsafe|\$queryRawUnsafe/.test(line) && (line.includes("+") || line.includes("${"));
      const rawSqlEnabled = /\b(?:update|insert\s+into)\s+"?billing_provider_configs\b/i.test(line) && /\benabled\b/.test(line);
      if (rawUnsafe || rawSqlEnabled) {
        offenders.push(`${rel(file)}:${index + 1} → ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});