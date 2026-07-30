// Ω5P PR-17b — S1+C1 (junta-5 UNÂNIME, requisito OBRIGATÓRIO — convergência agente-secops + critico-adversarial):
// parseia SÓ o HEADER de PNG/JPEG (NUNCA decodifica pixel-data) para extrair width/height ANTES de qualquer
// chamada a `Jimp.read()`. Fecha o vetor mais grave apontado pelo crítico (C1): `Jimp.read()` ALOCA o bitmap
// RGBA completo (width*height*4 bytes) ANTES de qualquer cap de pixels PÓS-decode rodar — um PNG pequeno em
// BYTES e de baixa entropia (ex. um retângulo sólido) pode decodificar para dezenas de GB em memória
// (decompression-bomb). Rejeitar pelo HEADER, sem nunca tocar o corpo comprimido, é a única defesa que não paga
// o custo da bomba. Zero dependência nova — buffer puro (node:buffer).
//
// S1 (agente-secops): cap de DIMENSÃO INDIVIDUAL (width<=20000 && height<=20000) — um cap SÓ de produto de
// pixels deixaria passar um retângulo degenerado 1×40_000_000 (produto pequeno, uma dimensão absurda).

// Ordem de grandeza do teto de pixels do Pillow (DecompressionBombError) — referência OWASP/City File Upload
// Cheat Sheet citada no plano (PD-Ω5P-FOTOS-DEP).
export const MAX_DECODED_PIXELS = 40_000_000;
// S1 — cap de dimensão INDIVIDUAL (não só o produto).
export const MAX_IMAGE_DIMENSION_PX = 20_000;

// Mensagem SEMPRE genérica ao cliente (§2.8 — nunca detalha o motivo interno: dimensão exata, formato, etc. são
// pistas úteis a um atacante afinando o próximo payload). O motivo interno fica só no campo `reason` (uso local/
// log de depuração — NUNCA repassado à resposta HTTP).
export class ImageHeaderRejectedError extends Error {
  constructor(readonly reason: string) {
    super("Imagem rejeitada: não foi possível processar o arquivo.");
    this.name = "ImageHeaderRejectedError";
  }
}

type ImageDimensions = { readonly width: number; readonly height: number };

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// PNG: assinatura de 8 bytes + o 1º chunk é SEMPRE IHDR (offset fixo, RFC 2083 §11.2.2) — 4 bytes de
// comprimento (=13), 4 bytes "IHDR", 4 bytes width (BE), 4 bytes height (BE), ... Lemos só os 24 primeiros bytes.
function readPngDimensions(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// JPEG: SOI (0xFFD8) seguido de uma sequência de marcadores. Marcadores SEM payload (RST0-7/TEM) não têm campo
// de comprimento; os demais têm 2 bytes de comprimento (BE, inclui os próprios 2 bytes) logo após o marcador.
// O marcador SOFn (Start Of Frame, 0xC0-0xCF exceto 0xC4/0xC8/0xCC — que são DHT/JPG/DAC, não SOF) carrega
// [precision(1)][height(2 BE)][width(2 BE)]. Paramos no 1º SOF encontrado (suficiente p/ baseline e progressive).
function readJpegDimensions(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 2 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1; // bytes de preenchimento (0xFF repetido ou padding) entre marcadores são válidos — resync.
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1; // 0xFF de preenchimento antes do byte de marcador real.
      continue;
    }
    // Marcadores sem campo de comprimento: TEM (0x01) e RST0-7 (0xD0-0xD7). SOI/EOI não deveriam reaparecer aqui.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9) break; // EOI sem ter achado SOF — malformado.
    if (offset + 4 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > buffer.length) break;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xda) break; // SOS — início dos dados de varredura comprimidos; header acabou sem SOF.
    if (segmentLength < 2) break; // comprimento inválido — evita loop infinito/negativo.
    offset += 2 + segmentLength;
  }
  return undefined;
}

// Ponto de entrada — chamado SEMPRE ANTES de `Jimp.read()` (owner-portal.photo-pipeline.ts). Lança
// ImageHeaderRejectedError p/ formato não reconhecido, dimensão ausente/não-positiva, dimensão INDIVIDUAL acima
// do teto (S1) ou produto de pixels acima do teto (C1). Nunca decodifica o corpo comprimido da imagem.
export function assertSafeImageDimensions(buffer: Buffer): void {
  const dimensions = readPngDimensions(buffer) ?? readJpegDimensions(buffer);
  if (!dimensions) {
    throw new ImageHeaderRejectedError("header_unrecognized");
  }
  const { width, height } = dimensions;
  if (!(width > 0) || !(height > 0)) {
    throw new ImageHeaderRejectedError("non_positive_dimension");
  }
  if (width > MAX_IMAGE_DIMENSION_PX || height > MAX_IMAGE_DIMENSION_PX) {
    throw new ImageHeaderRejectedError("dimension_too_large"); // S1
  }
  if (width * height > MAX_DECODED_PIXELS) {
    throw new ImageHeaderRejectedError("pixel_cap_exceeded"); // C1 — decompression-bomb pelo produto
  }
}
