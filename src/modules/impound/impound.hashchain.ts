import { createHash } from "node:crypto";

import { ImpoundError, type CanonicalValue, type CustodyEventType } from "./impound.types.js";

// ── I2 — cadeia de hash (o coração probatório) ─────────────────────────────────────────────────────────────
// Funções PURAS, node:crypto, ZERO dependência nova (canonical-json não existe no repo; lib nova exige junta-5).
//
// MODELO DE AMEAÇA (declarado à junta, honesto): a cadeia é tamper-EVIDENT (qualquer adulteração de payload/
// ordem/elo é DETECTADA por verifyChain), NAO tamper-PROOF contra adversário com escrita irrestrita de
// superuser que recompute a cadeia INTEIRA + a âncora custody_hash_head + o cross-anchor em audit_logs. As
// contramedidas baratas reusando a casa: (a) TRIGGER append-only no banco (a role da app não muta/apaga
// eventos); (b) âncora custody_hash_head no agregado (denuncia DELETE da ponta com âncora intacta); (c)
// cross-anchor em audit_logs (store INDEPENDENTE, MESMA tx do append) que o verifyChain RECONCILIA de forma
// AUTOMÁTICA — se a trilha do audit_logs conhece um seq além da ponta atual (tip truncado + custody_hash_head
// ajustado) ou um hash divergente do da cadeia, é `cross_anchor_mismatch`. Assim "forjar exige adulterar DOIS
// stores auditados na mesma janela" é VERDADE para o detector automático, não só para a perícia manual. Âncora
// externa forte (Sivec outbox/notarização) = Ω6 (D-Ω5P-05).

// RECORD SEPARATOR (U+001E): nunca aparece em hash hex, UUID, ISO-8601 nem em JSON (JSON.stringify o escapa
// como "", 6 chars ASCII), então canonicalJson(payload) NUNCA "vaza" para o campo seguinte do preimage
// — fecha o ataque de canonical-json injection (deslocar a fronteira de campo).
const SEP = "\u001e";
// Sentinela de actor_id ausente (sistema): hash determinístico sem ambiguidade null vs "".
const NULL_ACTOR = "\u0000";
const GENESIS_TAG = "SIGPRV-CUSTODY-GENESIS-v1";

function sha256hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// Canonicalização determinística — serializador PRÓPRIO (NÃO JSON.stringify cru: ordem de chaves de objeto não
// é semanticamente estável). Testável por property-based: mesmo hash p/ payloads semanticamente iguais com
// ordem de inserção diferente.
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";

  const type = typeof value;

  if (type === "string") {
    // JSON.stringify escapa aspas/controle — inclusive o U+001E — então texto arbitrário nunca injeta o SEP.
    return JSON.stringify(value);
  }
  if (type === "boolean") {
    return value ? "true" : "false";
  }
  if (type === "number") {
    const numeric = value as number;
    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      // Dinheiro/km NUNCA são number — vão como string ("12.50"), coerente com Decimal(12,2)/(10,1). Fecha o
      // furo de 0.1+0.2 / 1.0 -> "1". number fracionário/não-finito no payload é rejeitado.
      throw new ImpoundError(
        422,
        "IMPOUND_NON_CANONICAL",
        "non_canonical_number",
        "payload numbers must be finite integers; money/km must be strings.",
      );
    }
    return String(numeric);
  }
  if (Array.isArray(value)) {
    // arrays: ordem PRESERVADA (ordem é semântica).
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (type === "object") {
    const record = value as Record<string, unknown>;
    // objetos: chaves ordenadas por code point (Array.sort default), recursivo, sem espaços.
    const keys = Object.keys(record).sort();
    const parts = keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${parts.join(",")}}`;
  }
  // undefined / função / symbol / bigint -> rejeitado (determinismo total).
  throw new ImpoundError(
    422,
    "IMPOUND_NON_CANONICAL",
    "non_canonical_value",
    `payload contains a non-serializable value of type ${type}.`,
  );
}

// GENESIS amarrado a tenant+process => uma subcadeia válida do processo A, replantada sob B, quebra logo no
// seq=1 (prev_hash esperado != ). Anti-enxerto cross-process.
export function genesisHash(tenantId: string, processId: string): string {
  return sha256hex(`${GENESIS_TAG}${SEP}${tenantId}${SEP}${processId}`);
}

export type EventHashInput = {
  readonly prevHash: string;
  readonly seq: number;
  readonly type: CustodyEventType | string;
  readonly payload: CanonicalValue;
  readonly occurredAt: Date;
  readonly actorId?: string | null;
};

// preimage endurecido = prev_hash | seq | type | canonicalJson(payload) | occurred_at ISO | actor_id (SEP entre
// campos). seq no preimage => reordenar 2 eventos muda o hash (anti-reorder), além do encadeamento por prev_hash.
export function computeEventHash(input: EventHashInput): string {
  const preimage = [
    input.prevHash,
    String(input.seq),
    String(input.type),
    canonicalJson(input.payload),
    input.occurredAt.toISOString(),
    input.actorId ?? NULL_ACTOR,
  ].join(SEP);
  return sha256hex(preimage);
}

export type ChainBreakReason =
  | "seq_gap"
  | "prev_hash_mismatch"
  | "hash_mismatch"
  | "head_mismatch"
  | "count_mismatch"
  | "cross_anchor_mismatch";

// Cross-anchor (I2): o par {seq, hash} gravado em audit_logs (store independente) na MESMA tx do append. §allowlist:
// só seq/hash — NUNCA payload/PII. verifyChain reconcilia a trilha contra a cadeia recomputada.
export type CrossAnchor = {
  readonly seq: number;
  readonly hash: string;
};

export type ChainEventLike = {
  readonly seq: number;
  readonly type: CustodyEventType | string;
  readonly payload: CanonicalValue;
  readonly occurredAt: Date;
  readonly actorId?: string | null;
  readonly prevHash: string;
  readonly hash: string;
};

export type VerifyChainResult = {
  readonly processId: string;
  readonly valid: boolean;
  readonly eventCount: number;
  readonly headHash: string | null;
  readonly brokenAt?: { readonly seq: number; readonly reason: ChainBreakReason };
  readonly checkedAt: string;
};

// verifyChain — recomputa do GENESIS, confronta a âncora do agregado E reconcilia o cross-anchor (audit_logs).
// Determinística, sem PII (só hashes/seq). crossAnchors OPCIONAL: undefined = pula a reconciliação (chamadas
// puras sem acesso ao store independente); o serviço SEMPRE fornece a trilha do audit_logs.
export function verifyChain(params: {
  readonly tenantId: string;
  readonly processId: string;
  readonly events: readonly ChainEventLike[];
  readonly head: { readonly seq: number; readonly hash: string | null };
  readonly crossAnchors?: readonly CrossAnchor[];
}): VerifyChainResult {
  const { tenantId, processId, events, head, crossAnchors } = params;
  const checkedAt = new Date().toISOString();
  const sorted = [...events].sort((left, right) => left.seq - right.seq);

  const broken = (seq: number, reason: ChainBreakReason): VerifyChainResult => ({
    processId,
    valid: false,
    eventCount: sorted.length,
    headHash: head.hash,
    brokenAt: { seq, reason },
    checkedAt,
  });

  let expectedPrev = genesisHash(tenantId, processId);
  let expectedSeq = 1;

  for (const event of sorted) {
    // (i) seq contíguo? senão seq_gap (faltando/inserido/reordenado).
    if (event.seq !== expectedSeq) {
      return broken(event.seq, "seq_gap");
    }
    // (ii) elo íntegro? senão prev_hash_mismatch (elo quebrado / enxerto / GENESIS trocado).
    if (event.prevHash !== expectedPrev) {
      return broken(event.seq, "prev_hash_mismatch");
    }
    // (iii) hash bate com o preimage recomputado? senão hash_mismatch (payload/occurred_at/actor/type/seq
    // adulterados — ou payload não-canônico injetado).
    let recomputed: string;
    try {
      recomputed = computeEventHash({
        prevHash: event.prevHash,
        seq: event.seq,
        type: event.type,
        payload: event.payload,
        occurredAt: event.occurredAt,
        actorId: event.actorId ?? null,
      });
    } catch {
      return broken(event.seq, "hash_mismatch");
    }
    if (recomputed !== event.hash) {
      return broken(event.seq, "hash_mismatch");
    }
    expectedPrev = event.hash;
    expectedSeq += 1;
  }

  // Âncora do agregado (mantida na MESMA tx do append). count_mismatch/head_mismatch DETECTAM o DELETE da ponta
  // (apagar o último evento não muda os anteriores, mas a âncora denuncia) e a adulteração do custody_hash_head.
  if (sorted.length !== head.seq) {
    return broken(head.seq, "count_mismatch");
  }
  const finalHash = sorted.length === 0 ? null : sorted[sorted.length - 1].hash;
  if (finalHash !== head.hash) {
    return broken(head.seq, "head_mismatch");
  }

  // Reconciliação do CROSS-ANCHOR (store INDEPENDENTE, audit_logs). Roda DEPOIS da âncora do agregado — pega
  // exatamente o ataque que a âncora do agregado NÃO pega sozinha: apagar a ponta E ajustar custody_hash_head
  // (a cadeia+âncora ficam coerentes entre si, mas o audit_logs ainda guarda o anchor do seq apagado). Também
  // pega reescrita da cadeia com head ajustado sem reescrever o audit_logs (hash do anchor ≠ hash da cadeia) e
  // anchor faltando. Forjar de verdade passa a exigir adulterar OS DOIS stores na mesma janela.
  if (crossAnchors !== undefined) {
    const anchorBySeq = new Map<number, string>();
    let maxAnchorSeq = 0;
    for (const anchor of crossAnchors) {
      anchorBySeq.set(anchor.seq, anchor.hash);
      if (anchor.seq > maxAnchorSeq) maxAnchorSeq = anchor.seq;
    }
    // O audit_logs conhece um seq além da ponta atual → tip truncado com âncora do agregado ajustada.
    if (maxAnchorSeq > head.seq) {
      return broken(maxAnchorSeq, "cross_anchor_mismatch");
    }
    // Todo evento da cadeia tem de ter um anchor CORRESPONDENTE (mesmo hash) no store independente.
    for (const event of sorted) {
      const anchorHash = anchorBySeq.get(event.seq);
      if (anchorHash === undefined || anchorHash !== event.hash) {
        return broken(event.seq, "cross_anchor_mismatch");
      }
    }
  }

  return {
    processId,
    valid: true,
    eventCount: sorted.length,
    headHash: finalHash,
    checkedAt,
  };
}
