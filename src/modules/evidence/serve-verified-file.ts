import type { Response } from "express";
import type { Readable } from "node:stream";

import { SNIFF_HEAD_BYTES, sniffMimeType } from "./content-sniff.js";

/**
 * B-O6R-07b (Ω6R-SEC-004) · §3.5 do plano — EGRESSO ENDURECIDO, usado pelas 4 rotas de download
 * (E1 anexo genérico · E2 anexo de OS · E3 foto de dano · E4 anexo de checklist).
 *
 * O terceiro mecanismo do achado é o egresso: os 4 routers respondiam
 * `Content-Type: <o que a linha diz>` + `Content-Disposition: inline`. E o que a linha diz é o que o
 * CLIENTE declarou no upload — no provider local o `getObject` nem devolve `mimeType`
 * (`local-checklist-storage.provider.ts:41-52`), então o tipo servido vinha SEMPRE da coluna.
 *
 * AQUI O TIPO VEM DOS BYTES, NO ATO DO DOWNLOAD. É isso — e não uma migration — que resolve
 * simultaneamente (a) toda linha gravada antes deste bloco com tipo declarado, (b) as linhas que o
 * módulo de pátio grava com `content_type` do corpo e (c) o `ContentType` legado no S3. Zero migration,
 * zero varredura, zero backfill: o banco não é consultado para decidir o tipo.
 *
 * `attachment` PARA TODOS OS TIPOS — inclusive imagem verificada. Medido antes de decidir: o web
 * consome tudo por `fetch` → `blob` → `objectURL` (zero `window.open`, zero `<img src="/api/…">`) e o
 * Flutter não tem `Image.network` sobre rota de download; o `Content-Disposition` é **inerte** para
 * `fetch` (o Fetch Standard não o processa em passo algum). Logo `attachment` não quebra consumidor
 * nenhum e fecha o vetor "navegar até a URL e o navegador renderiza".
 *
 * HEADERS E FORMA DO `filename` = decisão da `PD-O6R-B07B-DISPOSITION` (docs/omega-pd.md, 13 fontes).
 * Três armadilhas que a PD mediu e que este código evita de propósito:
 *   1. `encodeURIComponent` está SUB-CODIFICADO para o `attr-char` do RFC 8187: deixa `' ( ) *` crus, e
 *      os quatro NÃO são `attr-char`. São percent-encodados à mão aqui.
 *   2. O `jshttp/content-disposition` (motor do `res.download` do Express) substitui não-ASCII por `?` —
 *      caractere RESERVADO em nome de arquivo no Windows. Aqui o substituto é `_`.
 *   3. Em vez de escapar `"` e `\` com `quoted-pair`, o fallback é SANEADO para um conjunto que nunca
 *      precisa de escape — o RFC 6266 Apêndice D manda evitar `\` e `%` porque os UAs divergem ao
 *      desescapá-los. Assim nenhum `quoted-pair` é emitido, e CR/LF/NUL (RFC 9110 §5.5 — "invalid and
 *      dangerous", o vetor de response splitting) morrem antes de qualquer concatenação.
 */

export type VerifiedFileToSend = {
  readonly body: Buffer | Readable;
  readonly fileName: string;
  readonly sizeBytes?: number;
};

/** Nomes de dispositivo do Windows: `CON`, `NUL`, `COM1`… — inválidos como nome de arquivo. */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/**
 * `attachment; filename="<fallback ASCII>"; filename*=UTF-8''<pct>` — `filename` ANTES de `filename*`
 * (RFC 6266 Apêndice D: há parser que erra na ordem inversa; o §4.3 garante que o UA moderno escolhe o
 * `filename*` de qualquer jeito).
 */
export function buildContentDisposition(rawFileName: string): string {
  // (0) Desarma caminho e framing ANTES de tudo: só o basename, e nenhum caractere de controle.
  const withoutPath = String(rawFileName ?? "").split(/[/\\]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex -- CR/LF/NUL e demais controles são exatamente o alvo.
  const name = withoutPath.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, "").trim();

  // (1) filename* — RFC 8187: tudo fora de `attr-char` vira %XX de bytes UTF-8.
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );

  // (2) filename — conjunto que NUNCA precisa de escape (nenhum quoted-pair é emitido).
  let fallback = name
    .replace(/[^\x20-\x7e]/g, "_") // não-ASCII → "_" (nunca "?": reservado no Windows)
    .replace(/["\\%/<>:|?*]/g, "_") // " \ sairiam do qdtext · % é ambíguo (RFC 6266 Ap. D) · o resto é reservado no Windows
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, ""); // Windows: não termina (nem começa) em "." ou espaço
  if (fallback.length > 100) {
    const dot = fallback.lastIndexOf(".");
    const extension = dot > 0 ? fallback.slice(dot) : "";
    fallback = `${fallback.slice(0, 100 - extension.length)}${extension}`;
  }
  if (!fallback || /^[._ ]*$/.test(fallback) || WINDOWS_RESERVED_NAME.test(fallback)) {
    const dot = name.lastIndexOf(".");
    const safeExtension = dot > 0 ? name.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "") : "";
    fallback = safeExtension ? `arquivo.${safeExtension}` : "arquivo";
  }

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Escreve a resposta de arquivo. Os headers só são escritos DEPOIS do peek — nada é enviado antes de o
 * tipo estar decidido pelos bytes.
 */
export async function sendVerifiedFile(response: Response, file: VerifiedFileToSend): Promise<void> {
  if (Buffer.isBuffer(file.body)) {
    writeVerifiedFileHeaders(response, file.body, file.fileName, file.body.byteLength);
    response.send(file.body);
    return;
  }

  // Corpo em fluxo (o provider local devolve `createReadStream`; o S3, o `Body` da resposta).
  // Lê só a CABEÇA (14 bytes bastam para as 4 assinaturas), decide o tipo, escreve os headers, manda a
  // cabeça e emenda o resto por `pipe` — o corpo sai byte-idêntico, sem `unshift` (que lançaria
  // `ERR_STREAM_UNSHIFT_AFTER_END_EVENT` num arquivo menor que a cabeça, o caso de 0 B e 5 B).
  const source = file.body;
  const { head, ended } = await readStreamHead(source, SNIFF_HEAD_BYTES);

  if (ended) {
    // Arquivo menor que a cabeça (0 B, 5 B): o fluxo já acabou, a cabeça É o corpo inteiro.
    writeVerifiedFileHeaders(response, head, file.fileName, head.byteLength);
    response.send(head);
    return;
  }

  writeVerifiedFileHeaders(response, head, file.fileName, file.sizeBytes);
  response.write(head);
  source.pipe(response);
}

function writeVerifiedFileHeaders(
  response: Response,
  head: Uint8Array,
  fileName: string,
  sizeBytes: number | undefined,
): void {
  // O TIPO VEM DOS BYTES. Nunca do banco, nunca do cliente. Sem assinatura reconhecida →
  // `application/octet-stream` (o legado sem assinatura e o arquivo truncado caem aqui).
  const mimeType = sniffMimeType(head) ?? "application/octet-stream";

  response.setHeader("Content-Type", mimeType);
  // Cinto e suspensório: o helmet global já emite `nosniff` (`app.ts`), mas garantia que só existe numa
  // composição de middleware é garantia que não se testa por resposta. É ele que torna o Content-Type
  // acima VINCULANTE e que remove o escape-hatch de sniffing do ORB.
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Disposition", buildContentDisposition(fileName));
  // Única camada que sobrevive se o `Content-Disposition` for ignorado no caminho (proxy, extensão,
  // visualizador): origem opaca + zero script. `allow-downloads` é obrigatório — `sandbox` pelado
  // BLOQUEIA o download, que é a razão de existir deste helper.
  response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox allow-downloads");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // Arquivo é tenant-scoped e auth-gated: fora de cache compartilhado.
  response.setHeader("Cache-Control", "private, no-store");
  if (sizeBytes !== undefined) {
    response.setHeader("Content-Length", sizeBytes.toString());
    // RFC 9110 §8.6: Content-Length que discorda do corpo é erro de FRAMING (a primitiva de desync),
    // não cosmético. Para o corpo em fluxo o tamanho vem de segunda fonte (`stat`/`ContentLength`);
    // este guard do Node transforma a divergência em `ERR_HTTP_CONTENT_LENGTH_MISMATCH` — a resposta
    // morre em vez de entregar bytes dessincronizados.
    response.strictContentLength = true;
  }
}

/**
 * Lê a cabeça de um fluxo sem perder byte. `ended: true` significa que o fluxo terminou antes de
 * completar `size` bytes — nesse caso a cabeça é o corpo inteiro e não há nada para emendar depois.
 */
function readStreamHead(stream: Readable, size: number): Promise<{ head: Buffer; ended: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const detach = (): void => {
      stream.off("readable", onReadable);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    const finish = (ended: boolean): void => {
      if (settled) return;
      settled = true;
      detach();
      resolve({ head: Buffer.concat(chunks), ended });
    };
    const onError = (error: Error): void => {
      if (settled) return;
      settled = true;
      detach();
      reject(error);
    };
    const onEnd = (): void => finish(true);
    const onReadable = (): void => {
      let chunk = stream.read() as Buffer | null;
      while (chunk !== null) {
        chunks.push(chunk);
        total += chunk.length;
        if (total >= size) {
          finish(false);
          return;
        }
        chunk = stream.read() as Buffer | null;
      }
    };

    stream.on("readable", onReadable);
    stream.on("end", onEnd);
    stream.on("error", onError);
  });
}
