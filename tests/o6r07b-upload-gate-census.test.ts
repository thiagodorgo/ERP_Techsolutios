import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// B-O6R-07b (Ω6R-SEC-004) · §3.6 do plano, com o ALCANCE emendado pelo E1·7 — CENSO PERMANENTE.
// Precedentes do idioma: `financial-entry-link-census.test.ts`, `db-catalog-write-guard.test.ts`,
// `seed-guard.test.ts`.
//
// O QUE ESTE ARQUIVO É, E O QUE NÃO É (a fronteira que o E1·7 mandou escrever, para o próximo bloco não
// herdar uma garantia que não existe):
//
//   camada 1 — TIPO (build): quem chamar `save()` dos 2 providers de checklist ou `store()` do provider
//              de evidência SEM `verification` falha o `tsc`. Não alcança `tests/**` (fora do
//              tsconfig), `.js`/`.mjs` em `src/`, `scripts/**`, nem quem escreva bytes sem passar por
//              provider nenhum.
//   camada 2 — RUNTIME (providers): `assertUploadVerification` nos 3 `save`/`store`. Pega teste, JS e
//              cast. Não alcança quem escreve fora dos providers.
//   camada 3 — ESTE CENSO: **tripwire de TEXTO, não prova**. Pontos cegos DECLARADOS: acesso dinâmico
//              (`fs[nome]`), alias de import (`import * as x from "node:fs"` + `x.writeFile`), e
//              código em `scripts/`. Um quinto LEITOR de `getObject` também não é pego — o censo cobre
//              ESCRITA, não leitura (nota residual R2·3 do `critico-adversarial`).
//
// A mensagem de falha de cada cláusula cita ESTE plano: quem alargar a lista sabe o que está alargando.

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(here, "..", "src");

/** Os 5 parsers de multipart, nominais. Um sexto que apareça derruba a C1 (mutação M-B5). */
const PARSER_ALLOWLIST = [
  "modules/attachments/attachment.storage.ts",
  "modules/checklists/checklist-attachment.storage.ts",
  "modules/damages/damage-attachment.storage.ts",
  "modules/mobile/mobile-evidence-upload.ts",
  "modules/work-orders/work-order-attachment.storage.ts",
] as const;

/** Os 3 (e únicos) escritores de blob. */
const WRITER_ALLOWLIST = [
  "modules/checklists/storage/local-checklist-storage.provider.ts",
  "modules/checklists/storage/s3-checklist-storage.provider.ts",
  "modules/evidence/evidence-storage.ts",
] as const;

const WRITE_PATTERNS = [
  "writeFile(",
  "writeFileSync(",
  "appendFile(",
  "appendFileSync(",
  "copyFile(",
  "copyFileSync(",
  "createWriteStream(",
  "PutObjectCommand",
  "UploadPartCommand",
  "fs.promises.",
] as const;

type SourceFile = { readonly relativePath: string; readonly code: string };

let cache: readonly SourceFile[] | undefined;

/**
 * Todo `.ts` de `src/**`, com COMENTÁRIOS REMOVIDOS. Sem isso o censo acusaria a si mesmo: os
 * comentários deste bloco citam `new NoopEvidenceScanner(` de propósito, ao explicar por que ele morreu.
 * Um censo que não distingue código de comentário obriga a inchar a allowlist — e allowlist inchada é
 * exatamente como um guard deixa de guardar.
 */
async function sourceFiles(): Promise<readonly SourceFile[]> {
  if (cache) return cache;
  const entries = await readdir(srcRoot, { withFileTypes: true, recursive: true });
  const files: SourceFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const absolute = path.join(entry.parentPath ?? entry.path, entry.name);
    const relativePath = path.relative(srcRoot, absolute).split(path.sep).join("/");
    files.push({ relativePath, code: stripComments(await readFile(absolute, "utf8")) });
  }
  cache = files;
  return files;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => {
      // Remove `//` fora de string/template. Heurística conservadora: só corta quando as aspas antes do
      // `//` estão balanceadas — na dúvida, mantém a linha (falso-positivo é preferível a furo).
      const index = line.indexOf("//");
      if (index < 0) return line;
      const before = line.slice(0, index);
      const balanced = (char: string): boolean => (before.split(char).length - 1) % 2 === 0;
      return balanced('"') && balanced("'") && balanced("`") ? before : line;
    })
    .join("\n");
}

function filesMatching(files: readonly SourceFile[], needle: string | RegExp): readonly string[] {
  const test_ = (code: string): boolean => (typeof needle === "string" ? code.includes(needle) : needle.test(code));
  return files.filter((file) => test_(file.code)).map((file) => file.relativePath);
}

// ── C1: os parsers de multipart são os 5 nominais ─────────────────────────────────────────────────

test("C1 censo: todo arquivo de src/** com `Busboy(` está na lista nominal V1–V5", async () => {
  const found = [...filesMatching(await sourceFiles(), "Busboy(")].sort();
  assert.deepEqual(
    found,
    [...PARSER_ALLOWLIST].sort(),
    "Parser de multipart NOVO em src/**. Uma via de bytes que não passe pelo gate único é o achado Ω6R-SEC-004 renascendo — ver B-O6R-07b §3.6 (C1). Se a via é legítima, ligue-a a `verifyUploadContent` e acrescente-a a esta lista NO MESMO PR.",
  );
});

// ── C2: só o gate escaneia ────────────────────────────────────────────────────────────────────────

test("C2 censo: `.scan(` sobre EvidenceScanner só ocorre em upload-gate.ts", async () => {
  const found = [...filesMatching(await sourceFiles(), ".scan(")].sort();
  assert.deepEqual(
    found,
    ["modules/evidence/upload-gate.ts"],
    "Chamada a `.scan(` fora do gate único. O bloco existe porque havia TRÊS chamadas independentes (e duas vias sem nenhuma) — ver B-O6R-07b §3.6 (C2).",
  );
});

// ── C3: só a factory instancia scanner ────────────────────────────────────────────────────────────

test("C3 censo: `new NoopEvidenceScanner(`/`new UnavailableEvidenceScanner(` só na factory", async () => {
  const files = await sourceFiles();
  const found = [...filesMatching(files, /new (Noop|Unavailable)EvidenceScanner\(/)].sort();
  assert.deepEqual(
    found,
    ["modules/evidence/evidence-scanner.factory.ts"],
    "Scanner instanciado fora do registro único. Um quarto default privado dizendo 'limpo' é o mecanismo (1) do Ω6R-SEC-004 — ver B-O6R-07b §3.6 (C3).",
  );
});

// ── C4: os helpers de teste do gate não vazam para src ────────────────────────────────────────────

test("C4 censo: identificadores *ForTests do gate/factory não são referenciados em src/** fora do módulo que os define", async () => {
  const files = await sourceFiles();
  const owners: Record<string, string> = {
    createUploadVerificationForTests: "modules/evidence/upload-gate.ts",
    setEvidenceScannerForTests: "modules/evidence/evidence-scanner.factory.ts",
    resetEvidenceScannerForTests: "modules/evidence/evidence-scanner.factory.ts",
  };
  // Os wrappers finos das 3 vias (§3.2) existem para as suítes antigas não mudarem: eles PODEM
  // referenciar `set`/`reset`. O que NUNCA pode vazar é o construtor de marca.
  const wrapperFiles = new Set([
    "modules/attachments/attachment.storage.ts",
    "modules/work-orders/work-order-attachment.storage.ts",
    "modules/mobile/mobile-evidence-upload.ts",
  ]);
  for (const [identifier, owner] of Object.entries(owners)) {
    const found = filesMatching(files, identifier).filter((file) => file !== owner);
    const offenders = identifier === "createUploadVerificationForTests" ? found : found.filter((f) => !wrapperFiles.has(f));
    assert.deepEqual(
      offenders,
      [],
      `\`${identifier}\` referenciado em src/** fora de ${owner}: ${offenders.join(", ")}. É a porta dos fundos do gate — ver B-O6R-07b §3.6 (C4).`,
    );
  }
});

// ── C5: só os 3 providers escrevem bytes ──────────────────────────────────────────────────────────

test("C5 censo: padrões de ESCRITA em src/** só nos 3 providers (tripwire de texto, alcance declarado)", async () => {
  const files = await sourceFiles();
  const offenders: string[] = [];
  for (const pattern of WRITE_PATTERNS) {
    for (const file of filesMatching(files, pattern)) {
      if ((WRITER_ALLOWLIST as readonly string[]).includes(file)) continue;
      offenders.push(`${file} (${pattern})`);
    }
  }
  assert.deepEqual(
    offenders.sort(),
    [],
    "Escrita de bytes fora dos 3 providers. Quem escreve por fora não passa pela marca de verificação — ver B-O6R-07b §3.6 (C5) e a fronteira do E1·7. Pontos cegos DECLARADOS (não pegos por este guard): acesso dinâmico `fs[nome]`, alias de import, e `scripts/`.",
  );
});

test("C5b censo: a allowlist de escritores tem exatamente 3 arquivos, e todos existem", async () => {
  const files = await sourceFiles();
  const known = new Set(files.map((file) => file.relativePath));
  assert.equal(WRITER_ALLOWLIST.length, 3);
  for (const writer of WRITER_ALLOWLIST) {
    assert.ok(known.has(writer), `escritor da allowlist não existe mais: ${writer}`);
  }
});

// ── C6: higiene de cast (NÃO é prova da marca — E1·3) ─────────────────────────────────────────────

test("C6 censo: nenhum `as UploadVerification` em src/** fora do próprio upload-gate.ts", async () => {
  // ATENÇÃO ao que esta cláusula vale: depois do E1·3 ela é HIGIENE, não prova. O ataque que quebrou o
  // desenho original (spread de uma marca legítima) não usava cast NENHUM e passava por este guard
  // tranquilo. Quem prova a marca são B7–B12 + a mutação M-B9 em `o6r07b-upload-gate.test.ts`.
  const files = await sourceFiles();
  const found = filesMatching(files, /as (unknown as )?UploadVerification/).filter(
    (file) => file !== "modules/evidence/upload-gate.ts",
  );
  assert.deepEqual(
    found,
    [],
    "Cast para UploadVerification fora do gate. O único produtor legítimo da marca é `verifyUploadContent` — ver B-O6R-07b §3.6 (C6).",
  );
});

// ── C7: o guard de tenant está nos 4 resolvers (o alcance da LEITURA, declarado) ──────────────────

test("C7 censo: os 4 sítios de `getObject(` que consomem storage chamam o guard de tenant antes", async () => {
  // O E1·2 fecha o vazamento cross-tenant por HERANÇA DE CHAMADA: E5 (owner-portal) alcança o objeto
  // por `resolveAttachmentDownload`. Esta cláusula afirma que os 4 resolvers têm o guard — e DECLARA o
  // que não cobre: um QUINTO leitor que apareça amanhã passa por fora em silêncio (R2·3 do crítico).
  const files = await sourceFiles();
  const resolvers = [
    "modules/attachments/attachment.storage.ts",
    "modules/work-orders/work-order-attachment.storage.ts",
    "modules/damages/damage-attachment.storage.ts",
    "modules/checklists/checklist-attachment.storage.ts",
  ];
  for (const resolver of resolvers) {
    const file = files.find((candidate) => candidate.relativePath === resolver);
    assert.ok(file, `resolver sumiu: ${resolver}`);
    assert.ok(
      file.code.includes("assertStorageKeyWithinTenant("),
      `${resolver} lê o storage sem conferir o prefixo de tenant da linha — ver B-O6R-07b E1·2.`,
    );
  }
  // E o guard não é chamado de lugar nenhum além destes 4 + o próprio módulo.
  const callers = filesMatching(files, "assertStorageKeyWithinTenant(")
    .filter((file) => file !== "modules/evidence/storage-key-scope.ts")
    .sort();
  assert.deepEqual(callers, [...resolvers].sort());
});
