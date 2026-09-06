import assert from "node:assert/strict";
import test from "node:test";

import {
  SNIFFABLE_MIME_TYPES,
  SNIFF_HEAD_BYTES,
  isSniffableMimeType,
  sniffMimeType,
} from "../src/modules/evidence/content-sniff.js";
import {
  EMPTY_BYTES,
  GIF_BYTES,
  HTML_BYTES,
  JPEG_BYTES,
  JPEG_POLYGLOT_BYTES,
  MZ_BYTES,
  PDF_BYTES,
  PDF_WITH_LEADING_GARBAGE,
  PNG_BYTES,
  RIFF_NOT_WEBP_BYTES,
  SVG_BYTES,
  TRUNCATED_PNG_BYTES,
  WEBP_BYTES,
  ZIP_BYTES,
} from "./helpers/upload-fixtures.js";

// B-O6R-07b (Ω6R-SEC-004) · §6.2 do plano — aceites B1–B3 do sniff de assinatura.
// A tabela é a DECISÃO da PD-O6R-B07B-MAGIC-BYTES; cada caso negativo aqui é um tipo que alguém
// poderia querer ligar por env e que o gate NÃO sabe verificar.
// MUTAÇÃO QUE DERRUBA B1: trocar 1 byte de qualquer entrada da tabela → o caso daquele formato cai.

// ── B1 (9 casos): 4 assinaturas positivas + 5 negativas ────────────────────────────────────────────

test("B1.1 sniff: JPEG (FF D8 FF) → image/jpeg", () => {
  assert.equal(sniffMimeType(JPEG_BYTES), "image/jpeg");
});

test("B1.2 sniff: PNG (8 bytes da RFC 2083) → image/png", () => {
  assert.equal(sniffMimeType(PNG_BYTES), "image/png");
});

test("B1.3 sniff: WebP (RIFF + WEBP + VP) → image/webp", () => {
  assert.equal(sniffMimeType(WEBP_BYTES), "image/webp");
});

test("B1.4 sniff: PDF (%PDF- em offset 0) → application/pdf", () => {
  assert.equal(sniffMimeType(PDF_BYTES), "application/pdf");
});

test("B1.5 sniff: MZ (executável PE) → undefined", () => {
  // A tabela é ALLOWLIST: `MZ` não entra nem como entrada "conhecida e rejeitada", senão vira denylist.
  assert.equal(sniffMimeType(MZ_BYTES), undefined);
});

test("B1.6 sniff: HTML → undefined", () => {
  assert.equal(sniffMimeType(HTML_BYTES), undefined);
});

test("B1.7 sniff: GIF87a → undefined", () => {
  assert.equal(sniffMimeType(GIF_BYTES), undefined);
});

test("B1.8 sniff: SVG (XML scriptável, sem prefixo fixo) → undefined", () => {
  assert.equal(sniffMimeType(SVG_BYTES), undefined);
});

test("B1.9 sniff: ZIP (PK\\x03\\x04) → undefined", () => {
  assert.equal(sniffMimeType(ZIP_BYTES), undefined);
});

// ── B2, B3 e as propriedades que a PD comprou ──────────────────────────────────────────────────────

test("B2 sniff: PDF com 10 bytes de lixo antes do %PDF- → undefined (offset 0 é ESTRITO)", () => {
  // A tolerância de 1024 bytes é leniência de LEITOR (Acrobat), não conformidade ISO 32000-1 §7.5.2 —
  // e é exatamente ela que habilita o poliglota imagem+PDF. Se este caso ficar verde com um sniff que
  // varre, o verde é cego.
  assert.equal(sniffMimeType(PDF_WITH_LEADING_GARBAGE), undefined);
});

test("B3 sniff: RIFF sem WEBP no offset 8 (é um WAV) → undefined", () => {
  assert.equal(sniffMimeType(RIFF_NOT_WEBP_BYTES), undefined);
});

test("sniff: PNG truncado em 7 bytes (um a menos que a assinatura) → undefined", () => {
  assert.equal(sniffMimeType(TRUNCATED_PNG_BYTES), undefined);
  assert.equal(TRUNCATED_PNG_BYTES.length, 7);
});

test("sniff: buffer vazio → undefined, e nunca lança", () => {
  assert.equal(sniffMimeType(EMPTY_BYTES), undefined);
});

test("sniff: buffer com 1 byte de cada âncora → undefined (guard de comprimento explícito)", () => {
  // Em JS `buf[n]` fora do fim devolve `undefined` em silêncio: uma comparação ingênua "funcionaria
  // por acidente". Cada entrada tem `minLength` conferido ANTES de indexar.
  for (const anchor of [0xff, 0x89, 0x52, 0x25]) {
    assert.equal(sniffMimeType(Buffer.from([anchor])), undefined, `âncora 0x${anchor.toString(16)}`);
  }
});

test("sniff: as 4 âncoras de offset 0 são MUTUAMENTE EXCLUSIVAS (nenhum buffer casa com 2 tipos)", () => {
  // É esta propriedade — comprada pelo offset 0 estrito em todas as entradas — que faz a ordem da
  // tabela ser irrelevante e derruba o poliglota "JPEG com %PDF- deslocado" sem regra especial.
  const anchors = [JPEG_BYTES[0], PNG_BYTES[0], WEBP_BYTES[0], PDF_BYTES[0]];
  assert.equal(new Set(anchors).size, 4, "as âncoras precisam ser distintas");
});

test("sniff: JPEG com ZIP anexado ao fim É um JPEG — o sniff garante TIPO, não inocuidade", () => {
  // Declarado em voz alta no §3.3 do plano: poliglota com carga ANEXADA passa, e é servido como
  // image/jpeg + attachment + nosniff (inerte no navegador). Inocuidade é território do antivírus.
  assert.equal(sniffMimeType(JPEG_POLYGLOT_BYTES), "image/jpeg");
});

test("sniff: JPEG aceita QUALQUER 4º byte (libmagic mascara-o; a allowlist honesta seria 'quase todos')", () => {
  for (const marker of [0x00, 0xe0, 0xe1, 0xdb, 0xee, 0xc0, 0xfe, 0xff]) {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, marker]);
    assert.equal(sniffMimeType(bytes), "image/jpeg", `4º byte 0x${marker.toString(16)}`);
  }
});

test("SNIFFABLE_MIME_TYPES tem exatamente os 4 tipos, e SNIFF_HEAD_BYTES cobre a maior assinatura", () => {
  assert.deepEqual([...SNIFFABLE_MIME_TYPES], ["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  assert.equal(SNIFF_HEAD_BYTES, 14, "WebP é a maior assinatura da tabela");
  assert.equal(isSniffableMimeType("image/png"), true);
  assert.equal(isSniffableMimeType("image/svg+xml"), false);
  assert.equal(isSniffableMimeType("text/html"), false);
});

test("sniff: a cabeça de SNIFF_HEAD_BYTES basta — nenhuma entrada precisa de mais bytes", () => {
  for (const bytes of [JPEG_BYTES, PNG_BYTES, WEBP_BYTES, PDF_BYTES]) {
    const head = bytes.subarray(0, SNIFF_HEAD_BYTES);
    assert.equal(sniffMimeType(head), sniffMimeType(bytes));
  }
});
