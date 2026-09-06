/**
 * B-O6R-07b (Ω6R-SEC-004) · §3.3 do plano — SNIFF DE ASSINATURA, in-house, ZERO dependência.
 *
 * O achado diz "MIME vem do cliente": as 5 vias de upload comparavam a allowlist contra
 * `info.mimeType` do busboy — o que o cliente escreveu no `Content-Type` do part — e era ESSE valor que
 * ia para o `save(...)`, para o `ContentType` do S3 e para a coluna `mime_type`. Este módulo é a única
 * fonte de verdade sobre o tipo: **a decisão sai dos BYTES**, nunca do nome do arquivo, da extensão ou
 * do tipo declarado.
 *
 * REGRA DO ESPELHO: o idioma (buffer puro, parse só de HEADER, nunca decodifica, fonte de cada offset
 * em comentário) vem de `src/modules/owner-portal/image-header-guard.ts`, aprovado por junta-5 no Ω5P
 * PR-17b. O que NÃO se copia dali é a REGRA: aquele guard limita dimensão (40 MP / 20 000 px), o que
 * rejeitaria foto legítima de câmera moderna, e dimensão não é este achado.
 *
 * A TABELA ABAIXO É A DECISÃO DA `PD-O6R-B07B-MAGIC-BYTES` (docs/omega-pd.md, 11 fontes, ≥3 normativas),
 * não a tabela provisória do plano. As quatro divergências entre o provisório e o decidido:
 *   1. JPEG: **NÃO** se verifica o 4º byte. `file(1)` mascara-o de propósito
 *      (`belong&0xffffff00 == 0xffd8ff00`), o WHATWG para no 3º e a allowlist honesta de marcadores
 *      seria "quase todos" + `FF` (fill bytes, T.81 §B.1.1.2) — só produziria falso-negativo, e o byte
 *      é escolhido pelo atacante ao custo de um byte.
 *   2. PNG: **NÃO** se verifica o chunk `IHDR`. Dobraria a cabeça lida (8 → 16) e os 8 bytes extras são
 *      tão copiáveis quanto os 8 primeiros — ganho de segurança zero.
 *   3. WebP: são **14** bytes, não 12, e o que se exige em 12-13 é `VP` (`56 50`) — não o fourCC
 *      inteiro. Cobre `VP8 ` (o 4º caractere é espaço, 0x20), `VP8L` e `VP8X` com uma comparação só.
 *   4. PDF: **offset 0 ESTRITO**, a tolerância de 1 024 bytes NÃO entra. ISO 32000-1 §7.5.2 diz
 *      "primeira linha"; a leniência é de LEITOR (Acrobat), e é justamente ela que a Glasswall documenta
 *      como o habilitador do poliglota imagem+PDF.
 *
 * A PROPRIEDADE QUE O OFFSET 0 ESTRITO COMPRA (achado da PD, não estava na pergunta): com todas as
 * quatro âncoras em 0, os primeiros bytes são **mutuamente exclusivos** — `FF` · `89` · `52` · `25`.
 * Logo nenhum buffer casa com dois tipos, a ordem da tabela é irrelevante, e o poliglota
 * "JPEG-com-%PDF--deslocado" cai sem regra especial. Tolerar deslocamento no PDF perderia isso inteiro.
 *
 * LIMITE DECLARADO (OWASP File Upload Cheat Sheet, citado na PD): assinatura *"should not be used on its
 * own, as bypassing it is pretty common and easy"*. Este módulo garante **TIPO**, não inocuidade. Um
 * JPEG com HTML ou ZIP anexado ao fim É um JPEG e passa — e é servido como `image/jpeg` +
 * `Content-Disposition: attachment` + `nosniff`, inerte no navegador. O que não é inerte (PDF com JS,
 * zip-bomb) é território do antivírus real (`P-O6R-B07B-SCANNER-AV-REAL`), não do sniff.
 */

export const SNIFFABLE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type SniffableMimeType = (typeof SNIFFABLE_MIME_TYPES)[number];

/** A maior assinatura da tabela (WebP = 14). É a cabeça que basta ler do arquivo. */
export const SNIFF_HEAD_BYTES = 14;

type SignatureRule = {
  readonly mimeType: SniffableMimeType;
  /** Comprimento mínimo do buffer para a entrada sequer ser avaliada. */
  readonly minLength: number;
  /** Pares `[offset, byte]` — os offsets NÃO listados são curinga. Todos ancorados em 0. */
  readonly bytes: readonly (readonly [number, number])[];
};

const SIGNATURES: readonly SignatureRule[] = [
  {
    // JPEG — WHATWG MIME Sniffing: padrão `FF D8 FF`, máscara `FF FF FF`. O 4º byte é curinga.
    mimeType: "image/jpeg",
    minLength: 3,
    bytes: [
      [0, 0xff],
      [1, 0xd8],
      [2, 0xff],
    ],
  },
  {
    // PNG — RFC 2083 §3.1 / W3C PNG 3rd ed. §5.2: 137 80 78 71 13 10 26 10. IHDR não entra.
    mimeType: "image/png",
    minLength: 8,
    bytes: [
      [0, 0x89],
      [1, 0x50],
      [2, 0x4e],
      [3, 0x47],
      [4, 0x0d],
      [5, 0x0a],
      [6, 0x1a],
      [7, 0x0a],
    ],
  },
  {
    // WebP — WHATWG: `RIFF`(0-3) + tamanho uint32 LITTLE-ENDIAN (4-7, curinga) + `WEBP`(8-11) + `VP`(12-13).
    // `VP` cobre os três fourCC canônicos da spec do contêiner: `VP8 `, `VP8L`, `VP8X` (14-15 são curinga).
    mimeType: "image/webp",
    minLength: 14,
    bytes: [
      [0, 0x52], // R
      [1, 0x49], // I
      [2, 0x46], // F
      [3, 0x46], // F
      [8, 0x57], // W
      [9, 0x45], // E
      [10, 0x42], // B
      [11, 0x50], // P
      [12, 0x56], // V
      [13, 0x50], // P
    ],
  },
  {
    // PDF — ISO 32000-1 §7.5.2: `%PDF-` na PRIMEIRA LINHA. Offset 0 estrito; a versão não se verifica
    // (rejeitaria PDF 2.x e futuros).
    mimeType: "application/pdf",
    minLength: 5,
    bytes: [
      [0, 0x25], // %
      [1, 0x50], // P
      [2, 0x44], // D
      [3, 0x46], // F
      [4, 0x2d], // -
    ],
  },
];

/**
 * O tipo efetivo dos bytes, ou `undefined` quando nenhuma assinatura da tabela casa.
 *
 * NUNCA lança: buffer vazio, curto ou desconhecido devolve `undefined` (o WHATWG começa o algoritmo de
 * casamento com "If input's length is less than pattern's length, return false"). O guard de
 * comprimento é EXPLÍCITO por entrada, antes de qualquer indexação — em JS ler além do fim de um
 * `Buffer` devolve `undefined` em silêncio, então uma comparação ingênua "funcionaria por acidente" e
 * quebraria no dia em que alguém trocasse por `readUInt32BE`.
 */
export function sniffMimeType(buffer: Uint8Array): SniffableMimeType | undefined {
  for (const signature of SIGNATURES) {
    if (buffer.length < signature.minLength) continue;
    let matched = true;
    for (const [offset, expected] of signature.bytes) {
      if (buffer[offset] !== expected) {
        matched = false;
        break;
      }
    }
    // Ordem é irrelevante: as âncoras em offset 0 são mutuamente exclusivas (FF · 89 · 52 · 25), logo
    // nenhum buffer casa com duas entradas. O primeiro casamento vence e retorna já.
    if (matched) return signature.mimeType;
  }
  return undefined;
}

/** `true` para os quatro tipos que o gate sabe verificar nos bytes. Usado pelo gate de boot da env. */
export function isSniffableMimeType(value: string): value is SniffableMimeType {
  return (SNIFFABLE_MIME_TYPES as readonly string[]).includes(value);
}
