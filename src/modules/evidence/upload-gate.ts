import { createHash } from "node:crypto";

import pino from "pino";

import { env } from "../../config/env.js";
import { sniffMimeType, type SniffableMimeType } from "./content-sniff.js";
import { resolveEvidenceScanner } from "./evidence-scanner.factory.js";

/**
 * B-O6R-07b (Ω6R-SEC-004) · §3.1 + §3.4 do plano, EMENDADOS pelo E1·3 — O GATE ÚNICO.
 *
 * Princípio: **existe UM só lugar onde bytes são verificados, e o storage recusa byte não verificado**.
 * Quem chamar `save()`/`store()` dos providers sem a marca não passa no `tsc`; quem burlar o compilador
 * não grava, porque os providers chamam `assertUploadVerification` antes de escrever.
 *
 * ── A MARCA: IDENTIDADE POR INSTÂNCIA, NUNCA POR CONTEÚDO ──────────────────────────────────────────
 *
 * O desenho original do plano era "objeto com propriedade de chave `Symbol` + `sha256` + `sizeBytes`,
 * congelado na origem". O `critico-adversarial` o QUEBROU por execução (rodada 1, achado A4), com uma
 * linha e sem nenhum cast:
 *
 *     { ...marcaLegítima, sha256: sha(bufferHostil), sizeBytes: bufferHostil.length }
 *
 * O spread copia propriedades próprias **enumeráveis, inclusive as de chave `Symbol`** — a marca viajava
 * junto. `tsc` verde, censo de casts verde, o assert verde (o sha batia com os bytes hostis, porque ele
 * lia a propriedade DO PRÓPRIO OBJETO), e o provider gravava. `Object.freeze` na origem não impede o
 * clone: congelar protege a instância, não a cópia.
 *
 * A correção não é "escapar melhor", é trocar o critério de identidade:
 *   - a marca é um objeto **opaco e congelado**, sem NENHUMA propriedade — nem string, nem `Symbol`.
 *     Não há o que copiar; o tipo `UploadVerification` é um `unique symbol` DECLARADO, que não existe
 *     em runtime;
 *   - os FATOS (`mimeType` verificado, `sha256`, `sizeBytes`, scanner, `verifiedAt`) vivem num
 *     **`WeakMap` privado deste módulo**, não exportado, indexado pela INSTÂNCIA;
 *   - `assertUploadVerification` lê os fatos **do registro** (`registry.get(value)`), nunca do objeto, e
 *     **devolve** os fatos — os providers usam `facts.mimeType` do RETORNO, nunca leem a marca.
 *
 * Com isso morre a classe inteira de derivação, e não só o spread: `Object.assign({}, marca)`,
 * `Object.create(marca)` (prototype não é identidade), `structuredClone`, round-trip de JSON e
 * `new Proxy(marca, {})` (o proxy É outra chave de `WeakMap`) produzem todos um objeto NOVO, que não
 * está no registro → `upload_not_verified:brand`. E reusar uma marca legítima com OUTROS bytes cai em
 * `upload_not_verified:bytes`, porque o sha comparado é o do registro. São os casos B7–B12, e a
 * mutação M-B9 (voltar a identidade por conteúdo) os deixa vermelhos — o crítico re-executou o próprio
 * ataque contra este desenho e os seis atalhos morreram.
 *
 * PROPRIEDADE DECLARADA, para ninguém prometer o que isto não faz (nota R2·1 do crítico): a marca prova
 * *"estes bytes foram verificados no ato da chamada"*, não *"estes bytes foram gravados"* — há um
 * `await` entre o assert e a escrita. Não é exploit em nenhuma das 5 vias (o busboy monta um buffer por
 * requisição e não há segundo detentor), mas é a fronteira honesta da garantia.
 */

const logger = pino({ level: env.LOG_LEVEL });

declare const uploadVerificationBrand: unique symbol;

/**
 * Prova de que UM buffer específico passou pelo gate. Só `verifyUploadContent` a produz; é opaca (não há
 * nada a ler nela) e vale apenas para os bytes verificados.
 */
export type UploadVerification = { readonly [uploadVerificationBrand]: never };

export type VerifiedFacts = {
  readonly mimeType: SniffableMimeType;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly scanner: string;
  readonly verifiedAt: Date;
};

/** PRIVADO. Não exportar: a identidade da marca é este registro. */
const registry = new WeakMap<object, VerifiedFacts>();

export type UploadGateErrorKind =
  | "content_unrecognized"
  | "unsupported_media_type"
  | "content_type_mismatch"
  | "scanner_infected"
  | "scanner_unavailable";

/**
 * Erro NEUTRO do gate. Cada via o traduz para a SUA família de código (tabela §4 do plano) — nada de
 * família nova vazando em contrato existente.
 */
export class UploadGateError extends Error {
  constructor(
    readonly kind: UploadGateErrorKind,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "UploadGateError";
  }
}

export type UploadGateVia = "V1" | "V2" | "V3" | "V4" | "V5";

/**
 * Status HTTP canônico de cada recusa (plano §4). O `reason` das famílias 415 é o próprio `kind`; as
 * famílias 422/503 já existiam em V1–V3 com `reason` fixo e são preservadas — contrato vigente não muda.
 * Cada via traduz isto para a SUA classe de erro e o SEU `code`.
 */
export function uploadGateStatus(kind: UploadGateErrorKind): 415 | 422 | 503 {
  if (kind === "scanner_infected") return 422;
  if (kind === "scanner_unavailable") return 503;
  return 415;
}

export type VerifyUploadContentInput = {
  readonly via: UploadGateVia;
  readonly buffer: Buffer;
  readonly declaredMimeType: string;
  readonly allowedMimeTypes: readonly string[];
  readonly scan: {
    readonly tenantId: string;
    readonly evidenceId: string;
    readonly clientEvidenceId: string;
  };
};

/**
 * Sniff → scanner → marca. Nesta ordem: o sniff é barato e roda primeiro, e assim o scanner só vê tipos
 * bem-formados.
 */
export async function verifyUploadContent(input: VerifyUploadContentInput): Promise<UploadVerification> {
  const sizeBytes = input.buffer.length;
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const declared = input.declaredMimeType.trim().toLowerCase();
  const allowed = input.allowedMimeTypes.map((entry) => entry.trim().toLowerCase());

  // Monta o erro E registra a linha de log. Devolve (em vez de lançar) para o `throw` ficar no ponto de
  // decisão — assim o TypeScript estreita `sniffed` depois do primeiro guard.
  const rejection = (kind: UploadGateErrorKind, sniffed: string | undefined, detail: string): UploadGateError => {
    // 1 linha de log estruturado. Sem PII, sem path, sem nome de arquivo, sem bytes.
    logger.warn(
      {
        event: "upload_gate.rejected",
        via: input.via,
        tenantId: input.scan.tenantId,
        kind,
        declared,
        sniffed: sniffed ?? null,
        sizeBytes,
        sha256,
      },
      "upload rejected by content gate",
    );
    return new UploadGateError(kind, detail);
  };

  // (1) SNIFF — o tipo efetivo sai dos bytes.
  const sniffed = sniffMimeType(input.buffer);
  if (!sniffed) {
    throw rejection("content_unrecognized", undefined, "File content does not match any supported file signature.");
  }
  if (!allowed.includes(sniffed)) {
    throw rejection("unsupported_media_type", sniffed, "File content type is not allowed for this upload.");
  }
  if (sniffed !== declared) {
    throw rejection("content_type_mismatch", sniffed, "File content does not match the declared content type.");
  }

  // (2) SCANNER — fail-closed por ambiente (`evidence-scanner.factory.ts`).
  const scanner = resolveEvidenceScanner();
  const result = await scanner.scan({
    tenantId: input.scan.tenantId,
    evidenceId: input.scan.evidenceId,
    clientEvidenceId: input.scan.clientEvidenceId,
    mimeType: sniffed,
    sizeBytes,
    checksumSha256: sha256,
    buffer: input.buffer,
  });
  if (result.status === "infected") {
    throw rejection("scanner_infected", sniffed, "File was rejected by the safety scan.");
  }
  if (result.status === "failed") {
    throw rejection("scanner_unavailable", sniffed, "File safety scan is unavailable; retry later.");
  }

  // (3) A MARCA. Objeto opaco: nada a copiar, nada a mutar. Os fatos ficam no registro.
  const verification = Object.freeze({}) as UploadVerification;
  registry.set(verification, {
    mimeType: sniffed,
    sha256,
    sizeBytes,
    scanner: scanner.constructor.name,
    verifiedAt: new Date(),
  });
  return verification;
}

/**
 * Recusa qualquer coisa que não seja uma marca EMITIDA por `verifyUploadContent` para EXATAMENTE estes
 * bytes, e devolve os fatos verificados. É a camada de runtime: pega cast, JS sem tipos, e a classe
 * inteira de clonagem que o crítico atacou.
 *
 * Não é de uso único (B12): a mesma marca com os mesmos bytes vale em chamadas repetidas — o retry
 * idempotente de uma via não pode falhar por isso.
 */
export function assertUploadVerification(value: UploadVerification, buffer: Buffer): VerifiedFacts {
  if (typeof value !== "object" || value === null) {
    throw new UploadGateError("content_unrecognized", "upload_not_verified:brand");
  }
  const facts = registry.get(value as object);
  if (!facts) {
    // Objeto que não saiu deste módulo: clone, spread, proxy, literal forjado por cast.
    throw new UploadGateError("content_unrecognized", "upload_not_verified:brand");
  }
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (facts.sizeBytes !== buffer.length || facts.sha256 !== sha256) {
    // Marca legítima, bytes OUTROS: a verificação vale para AQUELES bytes.
    throw new UploadGateError("content_unrecognized", "upload_not_verified:bytes");
  }
  return facts;
}

/**
 * SÓ PARA TESTE de provider/unidade que precise de uma marca sem subir uma via inteira. A cláusula C4 do
 * censo (`tests/o6r07b-upload-gate-census.test.ts`) proíbe qualquer referência a este nome em `src/**` —
 * ele não pode virar a porta dos fundos do gate.
 */
export function createUploadVerificationForTests(buffer: Buffer, mimeType: SniffableMimeType): UploadVerification {
  const verification = Object.freeze({}) as UploadVerification;
  registry.set(verification, {
    mimeType,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    sizeBytes: buffer.length,
    scanner: "TestHarness",
    verifiedAt: new Date(),
  });
  return verification;
}
