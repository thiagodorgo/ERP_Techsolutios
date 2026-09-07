import assert from "node:assert/strict";
import test from "node:test";

import { FakeEvidenceScanner } from "../src/modules/evidence/evidence-storage.js";
import {
  resetEvidenceScannerForTests,
  setEvidenceScannerForTests,
} from "../src/modules/evidence/evidence-scanner.factory.js";
import {
  UploadGateError,
  assertUploadVerification,
  createUploadVerificationForTests,
  uploadGateStatus,
  verifyUploadContent,
  type UploadVerification,
} from "../src/modules/evidence/upload-gate.js";
import {
  HTML_BYTES,
  JPEG_BYTES,
  MZ_BYTES,
  PDF_BYTES,
  PNG_BYTES,
  SVG_BYTES,
  TRUNCATED_PNG_BYTES,
} from "./helpers/upload-fixtures.js";

// B-O6R-07b (Ω6R-SEC-004) · §6.2 do plano + EMENDA E1·10 — aceites B4–B12 do GATE e da MARCA.
//
// B7–B12 são a réplica EXECUTADA do ataque do `critico-adversarial`: no desenho original (marca com
// propriedade de chave `Symbol` + sha lido DO PRÓPRIO OBJETO) um spread de uma linha, sem nenhum cast,
// entregava bytes hostis ao provider. A MUTAÇÃO M-B9 que derruba B7–B11 é trocar `registry.get(value)`
// por uma checagem de propriedade/`Symbol` no objeto — identidade por CONTEÚDO em vez de por INSTÂNCIA.

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

async function verifyPng(): Promise<UploadVerification> {
  return verifyUploadContent({
    via: "V2",
    buffer: PNG_BYTES,
    declaredMimeType: "image/png",
    allowedMimeTypes: ALLOWED,
    scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
  });
}

test.afterEach(() => {
  resetEvidenceScannerForTests();
});

// ── O gate: ordem, recusas e o que ele devolve ─────────────────────────────────────────────────────

test("gate: PNG válido declarado image/png → marca válida com o tipo VERIFICADO", async () => {
  const verification = await verifyPng();
  const facts = assertUploadVerification(verification, PNG_BYTES);
  assert.equal(facts.mimeType, "image/png");
  assert.equal(facts.sizeBytes, PNG_BYTES.length);
  assert.equal(facts.sha256.length, 64);
});

test("gate: bytes PNG declarados image/jpeg → content_type_mismatch (nunca marca)", async () => {
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V2",
        buffer: PNG_BYTES,
        declaredMimeType: "image/jpeg",
        allowedMimeTypes: ALLOWED,
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "content_type_mismatch",
  );
});

test("gate: MZ declarado image/png → content_unrecognized", async () => {
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V2",
        buffer: MZ_BYTES,
        declaredMimeType: "image/png",
        allowedMimeTypes: ALLOWED,
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "content_unrecognized",
  );
});

test("gate: assinatura FORA da allowlist da via → unsupported_media_type", async () => {
  // A allowlist de V1 (evidência mobile) é jpeg/png. Um PDF de bytes válidos é reconhecido pelo sniff e
  // recusado pela allowlist DA VIA — recusa diferente de "não reconheço".
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V1",
        buffer: PDF_BYTES,
        declaredMimeType: "application/pdf",
        allowedMimeTypes: ["image/jpeg", "image/png"],
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "unsupported_media_type",
  );
});

test("gate: bytes truncados (7 de PNG) → content_unrecognized", async () => {
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V2",
        buffer: TRUNCATED_PNG_BYTES,
        declaredMimeType: "image/png",
        allowedMimeTypes: ALLOWED,
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "content_unrecognized",
  );
});

test("gate: scanner infected → scanner_infected (422)", async () => {
  setEvidenceScannerForTests(new FakeEvidenceScanner({ status: "infected" }));
  await assert.rejects(
    () => verifyPng(),
    (error: unknown) =>
      error instanceof UploadGateError && error.kind === "scanner_infected" && uploadGateStatus(error.kind) === 422,
  );
});

test("gate: scanner failed → scanner_unavailable (503)", async () => {
  setEvidenceScannerForTests(new FakeEvidenceScanner({ status: "failed" }));
  await assert.rejects(
    () => verifyPng(),
    (error: unknown) =>
      error instanceof UploadGateError && error.kind === "scanner_unavailable" && uploadGateStatus(error.kind) === 503,
  );
});

test("B6 gate: o SNIFF roda ANTES do scanner — bytes irreconhecíveis nem chegam a ser escaneados", async () => {
  let scanCalls = 0;
  setEvidenceScannerForTests({
    async scan() {
      scanCalls += 1;
      return { status: "clean" };
    },
  });
  await assert.rejects(() =>
    verifyUploadContent({
      via: "V2",
      buffer: MZ_BYTES,
      declaredMimeType: "image/png",
      allowedMimeTypes: ALLOWED,
      scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
    }),
  );
  assert.equal(scanCalls, 0, "sniff barato primeiro; o scanner só vê tipos bem-formados");
});

// ── B4/B5: a marca vale para AQUELES bytes, e só sai do gate ───────────────────────────────────────

test("B4 marca: marca de A + buffer B → upload_not_verified:bytes", async () => {
  const verification = await verifyPng();
  assert.throws(
    () => assertUploadVerification(verification, JPEG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:bytes",
  );
});

test("B5 marca: objeto forjado ({} as UploadVerification) → upload_not_verified:brand", () => {
  assert.throws(
    () => assertUploadVerification({} as unknown as UploadVerification, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("marca: valores não-objeto (null, string, número) → upload_not_verified:brand, sem lançar TypeError", () => {
  for (const value of [null, undefined, "x", 1, true]) {
    assert.throws(
      () => assertUploadVerification(value as unknown as UploadVerification, PNG_BYTES),
      (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
      `valor ${String(value)}`,
    );
  }
});

// ── B7–B12: a CLASSE INTEIRA de derivação (o ataque do crítico e os cinco irmãos) ──────────────────

test("B7 marca: SPREAD do crítico — { ...marca, sha256: sha(hostil), sizeBytes } → :brand", async () => {
  // ESTE é o ataque que quebrou o desenho original, em uma linha e SEM NENHUM CAST: o spread copia
  // propriedades próprias enumeráveis, INCLUSIVE as de chave Symbol. Com identidade por instância o
  // objeto derivado é NOVO e não está no WeakMap.
  const verification = await verifyPng();
  const forged = { ...(verification as object) } as UploadVerification;
  assert.throws(
    () => assertUploadVerification(forged, MZ_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
  // E nem com os bytes originais: o que morre é a IDENTIDADE, não a coerência do sha.
  assert.throws(
    () => assertUploadVerification(forged, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("B8 marca: Object.assign({}, marca) → :brand", async () => {
  const verification = await verifyPng();
  const forged = Object.assign({}, verification as object) as UploadVerification;
  assert.throws(
    () => assertUploadVerification(forged, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("B9 marca: Object.create(marca) → :brand (prototype não é identidade)", async () => {
  const verification = await verifyPng();
  const forged = Object.create(verification as object) as UploadVerification;
  assert.throws(
    () => assertUploadVerification(forged, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("B10 marca: structuredClone e round-trip de JSON → :brand", async () => {
  const verification = await verifyPng();
  const cloned = structuredClone(verification as object) as UploadVerification;
  assert.throws(
    () => assertUploadVerification(cloned, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
  const roundTripped = JSON.parse(JSON.stringify(verification)) as UploadVerification;
  assert.throws(
    () => assertUploadVerification(roundTripped, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("B11 marca: new Proxy(marca, {}) → :brand (o proxy É outra chave de WeakMap)", async () => {
  const verification = await verifyPng();
  const proxied = new Proxy(verification as object, {}) as UploadVerification;
  assert.throws(
    () => assertUploadVerification(proxied, PNG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:brand",
  );
});

test("B12 marca: NÃO é de uso único — mesma marca + mesmos bytes vale 2× (retry idempotente)", async () => {
  const verification = await verifyPng();
  assert.equal(assertUploadVerification(verification, PNG_BYTES).mimeType, "image/png");
  assert.equal(assertUploadVerification(verification, PNG_BYTES).mimeType, "image/png");
});

test("marca: é opaca e congelada — nada a copiar, nada a mutar", async () => {
  const verification = (await verifyPng()) as object;
  assert.equal(Object.isFrozen(verification), true);
  assert.deepEqual(Object.keys(verification), [], "nenhuma propriedade de string");
  assert.deepEqual(Object.getOwnPropertySymbols(verification), [], "nenhuma propriedade de Symbol em runtime");
});

test("helper de teste: createUploadVerificationForTests produz marca válida SÓ para aqueles bytes", () => {
  const verification = createUploadVerificationForTests(PNG_BYTES, "image/png");
  assert.equal(assertUploadVerification(verification, PNG_BYTES).mimeType, "image/png");
  assert.throws(
    () => assertUploadVerification(verification, JPEG_BYTES),
    (error: unknown) => error instanceof UploadGateError && error.message === "upload_not_verified:bytes",
  );
});

// ── A11 (EMENDA E1·4): a SEGUNDA camada — svg NA allowlist é entrada MORTA ─────────────────

test("A11 gate: allowlist COM image/svg+xml + bytes SVG declarados image/svg+xml → content_unrecognized", async () => {
  // Este caso mora no nível do gate DE PROPÓSITO. Em rota ele seria verde-cego: a allowlist efetiva
  // vem de `env`, cujo snapshot congela no primeiro import, então quem recusaria seria o PARSER com a
  // allowlist antiga — e o gate nem seria alcançado. Aqui a allowlist é parâmetro, e o que se prova é
  // a promessa do E1·4: mesmo com o gate de BOOT mutilado (svg ligado por env), nenhum SVG entra,
  // porque `sniffMimeType` NUNCA devolve tipo fora do conjunto sniffável e o gate exige
  // `sniffado ∈ allowlist`. O gate de boot é a camada BARULHENTA; esta é a que segura o byte.
  // MUTAÇÃO QUE DERRUBA: sniff devolvendo o tipo DECLARADO quando não reconhece → a marca sai.
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V2",
        buffer: SVG_BYTES,
        declaredMimeType: "image/svg+xml",
        allowedMimeTypes: [...ALLOWED, "image/svg+xml"],
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "content_unrecognized",
  );
});

test("A11b gate: allowlist COM text/html + bytes HTML declarados text/html → content_unrecognized", async () => {
  await assert.rejects(
    () =>
      verifyUploadContent({
        via: "V2",
        buffer: HTML_BYTES,
        declaredMimeType: "text/html",
        allowedMimeTypes: [...ALLOWED, "text/html"],
        scan: { tenantId: "t1", evidenceId: "e1", clientEvidenceId: "c1" },
      }),
    (error: unknown) => error instanceof UploadGateError && error.kind === "content_unrecognized",
  );
});
