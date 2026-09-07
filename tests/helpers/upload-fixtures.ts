/**
 * B-O6R-07b (Ω6R-SEC-004) — bytes de fixture para o gate de upload, EM UM LUGAR SÓ.
 *
 * Todo teste do bloco (e toda suíte antiga cujo fixture de 4 bytes deixou de passar no sniff) importa
 * daqui. Um lugar só porque a alternativa — cada suíte inventando o seu "PNG mínimo" — é como se chega
 * a fixtures que passam por acidente.
 *
 * As assinaturas seguem a `PD-O6R-B07B-MAGIC-BYTES` (docs/omega-pd.md): offset 0 estrito, JPEG sem
 * verificação do 4º byte, PNG com os 8 bytes da RFC 2083, WebP com 14 bytes (`VP` em 12-13), PDF com
 * `%PDF-` em offset 0.
 */

/** `89 50 4E 47 0D 0A 1A 0A` + um IHDR plausível (o sniff não o lê; está aqui só por realismo). */
export const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

/** `FF D8 FF E0` + `JFIF` + EOI `FF D9`. */
export const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xd9,
]);

/** `RIFF` + tamanho + `WEBP` + `VP8 ` (o 4º caractere é espaço, 0x20 — spec do contêiner). */
export const WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x20, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

/** `%PDF-1.4` + `%%EOF`. */
export const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n", "latin1");

/** Executável PE — `MZ`. NUNCA reconhecido: a tabela é allowlist, não denylist. */
export const MZ_BYTES = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00", "latin1");

/** HTML — scriptável; o WHATWG proíbe alcançá-lo por sniffing. */
export const HTML_BYTES = Buffer.from("<html><body><script>alert(1)</script></body></html>", "latin1");

/** SVG — XML scriptável, sem prefixo fixo. Fora da tabela por dois motivos independentes. */
export const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "latin1");

/** GIF87a — fora dos 4 tipos, e veículo histórico de poliglota. */
export const GIF_BYTES = Buffer.from("GIF87a\x01\x00\x01\x00\x80\x00\x00", "latin1");

/** ZIP — `PK\x03\x04`. Contêiner de conteúdo arbitrário; lido a partir do FIM. */
export const ZIP_BYTES = Buffer.from("PK\x03\x04\x14\x00\x00\x00\x00\x00", "latin1");

/** PNG truncado em 7 bytes: um a menos que a assinatura. Deve dar `undefined`. */
export const TRUNCATED_PNG_BYTES = PNG_BYTES.subarray(0, 7);

/** PDF precedido de 10 bytes de lixo — a tolerância de 1024 bytes NÃO entra (é o vetor do poliglota). */
export const PDF_WITH_LEADING_GARBAGE = Buffer.concat([Buffer.from("0123456789", "latin1"), PDF_BYTES]);

/** `RIFF` sem `WEBP` no offset 8 (é um WAV). Deve dar `undefined`. */
export const RIFF_NOT_WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
  0x66, 0x6d, 0x74, 0x20,
]);

/** JPEG legítimo com um ZIP anexado ao fim: É um JPEG, e o sniff diz `image/jpeg` — declarado no §3.3. */
export const JPEG_POLYGLOT_BYTES = Buffer.concat([JPEG_BYTES, ZIP_BYTES]);

/** Buffer vazio. */
export const EMPTY_BYTES = Buffer.alloc(0);

/** Ajuda a montar `{ buffer, sizeBytes }` coerentes sem repetir `.length` em toda suíte. */
export function uploadFile(buffer: Buffer, originalName: string, mimeType: string) {
  return { buffer, originalName, mimeType, sizeBytes: buffer.length } as const;
}
