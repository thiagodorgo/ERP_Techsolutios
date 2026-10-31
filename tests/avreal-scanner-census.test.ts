import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("adaptador importa somente node:* e caminhos relativos", async () => {
  const source = await readFile("src/modules/evidence/clamav-scanner.ts", "utf8");
  const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert(specifiers.length > 0);
  assert.deepEqual(
    specifiers.filter((specifier) => !specifier.startsWith("node:") && !specifier.startsWith(".")),
    [],
  );
});

test("ClamAvEvidenceScanner só é instanciado na factory", async () => {
  const files = [
    "src/modules/evidence/clamav-scanner.ts",
    "src/modules/evidence/evidence-scanner.factory.ts",
    "src/modules/evidence/upload-gate.ts",
  ];
  const found: string[] = [];
  for (const file of files) {
    if ((await readFile(file, "utf8")).includes("new ClamAvEvidenceScanner(")) found.push(file);
  }
  assert.deepEqual(found, ["src/modules/evidence/evidence-scanner.factory.ts"]);
});
