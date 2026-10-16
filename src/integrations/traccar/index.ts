// B-TRC-01 · camada anticorrupção do Traccar (plano v2.1 §2.3). Exporta só fábricas e tipos necessários.
// A ingestão vive num app e num listener PRÓPRIOS (traccar-ingest.app.ts / traccar-ingest.bootstrap.ts); nada
// daqui é montado em `src/app.ts`.

export {
  parseTraccarPositionEnvelope,
  TraccarPayloadError,
  TRACCAR_RESERVED_KEYS,
  type ParsedTraccarPosition,
  type TraccarPayloadErrorReason,
} from "./traccar-position.schema.js";
export {
  buildTraccarPositionCommand,
  computeExternalEventKey,
  computePayloadDigest,
  fixQuarantineReason,
  FIX_FUTURE_TOLERANCE_MS,
  KNOT_TO_METERS_PER_SECOND,
  type TraccarFixQuarantineReason,
  type TraccarPositionCommand,
} from "./traccar-position.adapter.js";
