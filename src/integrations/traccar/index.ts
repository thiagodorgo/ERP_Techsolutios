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
// B-TRC-02 — o event.forward (parser, adaptador, catálogo) e o domínio fechado dos atributos veiculares.
export { TRACCAR_EVENT_INGEST_PATH } from "./traccar-ingest.app.js";
export { parseTraccarEventEnvelope, type ParsedTraccarEvent } from "./traccar-event.schema.js";
export {
  buildTraccarEventCommand,
  computeTraccarEventDigest,
  computeTraccarEventKey,
  eventQuarantineReason,
  type TraccarEventBuildResult,
  type TraccarEventCommand,
} from "./traccar-event.adapter.js";
export { classifyTraccarEvent, TRACCAR_ALARM_CODES, TRACCAR_EVENT_TYPE_TO_KIND, TRACCAR_IGNORED_EVENT_TYPES } from "./traccar-telemetry-catalog.js";
export { normalizeVehicleTelemetry, VEHICLE_TELEMETRY_BOUNDS } from "../../modules/telemetry/vehicle-telemetry.bounds.js";
