import { randomUUID } from "node:crypto";

import {
  fieldLocationBusyError,
  operatorProfileRequiredError,
  trackingConsentRequiredError,
  type FieldOperatorLocation,
  type ListFieldLocationHistoryInput,
  type ListLatestFieldLocationsInput,
  type RecordFieldLocationInput,
} from "./field-location.types.js";

// B-SAN3-17 (Emenda 1.5, CX3-568-01): a posição enviada pelo app só é gravada se o titular consente NO INSTANTE da
// escrita. A checagem do serviço é só a resposta rápida; a autoridade é a da escrita, no mesmo passo atômico. Sem a
// guarda, a escrita grava como antes (quem grava a viatura é a ingestão do Traccar, que não passa por aqui).
export type FieldLocationWriteGuard = { readonly requireTrackingConsent: true };

/** Lê o consentimento do perfil (organização, usuário) no instante da chamada, sem `await`; `undefined` = sem perfil. */
export type TrackingConsentReader = (tenantId: string, userId: string) => boolean | undefined;

/** A decisão da escrita: sem perfil → 422 `operator_profile_required`; sem consentimento → 422 `tracking_consent_required`. */
export function assertTrackingConsentForWrite(consent: boolean | undefined): void {
  if (consent === undefined) throw operatorProfileRequiredError();
  if (consent !== true) throw trackingConsentRequiredError();
}

export interface FieldLocationRepository {
  record(input: RecordFieldLocationInput, guard?: FieldLocationWriteGuard): Promise<FieldOperatorLocation>;
  listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]>;
  listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]>;
}

export class InMemoryFieldLocationRepository implements FieldLocationRepository {
  private readonly locations = new Map<string, FieldOperatorLocation>();

  // Emenda 1.5.1: o leitor é síncrono, e a conferência fica imediatamente antes do `set`, sem `await` entre as duas.
  constructor(private readonly readTrackingConsent?: TrackingConsentReader) {}

  async record(input: RecordFieldLocationInput, guard?: FieldLocationWriteGuard): Promise<FieldOperatorLocation> {
    const now = new Date();
    const location: FieldOperatorLocation = {
      id: randomUUID(),
      tenantId: input.tenantId,
      operatorUserId: input.operatorUserId,
      source: input.source ?? "mobile",
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      headingDegrees: input.headingDegrees,
      speedMetersPerSecond: input.speedMetersPerSecond,
      batteryLevel: input.batteryLevel,
      recordedAt: input.recordedAt ?? now,
      receivedAt: now,
      metadata: input.metadata ?? {},
    };

    if (guard?.requireTrackingConsent) {
      if (!this.readTrackingConsent) throw new Error("InMemoryFieldLocationRepository: a guarda de consentimento exige o leitor");
      assertTrackingConsentForWrite(this.readTrackingConsent(input.tenantId, input.operatorUserId));
    }
    this.locations.set(location.id, location);

    return location;
  }

  async listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    const latestByOperator = new Map<string, FieldOperatorLocation>();

    for (const location of this.sortedByRecordedAtDesc()) {
      if (location.tenantId !== input.tenantId) continue;
      if (input.since && location.recordedAt < input.since) continue;
      if (latestByOperator.has(location.operatorUserId)) continue;

      latestByOperator.set(location.operatorUserId, location);
      if (latestByOperator.size >= (input.limit ?? 100)) break;
    }

    return [...latestByOperator.values()];
  }

  async listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    return this.sortedByRecordedAtDesc()
      .filter((location) => location.tenantId === input.tenantId)
      .filter((location) => location.operatorUserId === input.operatorUserId)
      .filter((location) => !input.from || location.recordedAt >= input.from)
      .filter((location) => !input.to || location.recordedAt <= input.to)
      .filter((location) => !input.sources || input.sources.includes(location.source))
      .slice(0, input.limit ?? 100);
  }

  reset(): void {
    this.locations.clear();
  }

  private sortedByRecordedAtDesc(): FieldOperatorLocation[] {
    return [...this.locations.values()].sort((a, b) => {
      const recordedDiff = b.recordedAt.getTime() - a.recordedAt.getTime();
      if (recordedDiff !== 0) return recordedDiff;
      return b.receivedAt.getTime() - a.receivedAt.getTime();
    });
  }
}

// B-SAN3-17 (Emenda 1.7, C16-05; Emenda 1.8, E17-02 e E17-07): a fila do TITULAR, por processo. No máximo `limit`
// escritas da mesma chave (organização:titular) seguram conexão ao mesmo tempo. As demais esperam aqui, FORA do pool
// comum, na ordem de chegada, e a vaga passa direto ao próximo. Quem espera mais que `maxWaitMs` sai com 503
// `field_location_busy` sem tocar no banco: nada é gravado depois que o app desiste (15 s), e ele repete.
export const HOLDER_GATE_MAX_WAIT_MS = 3_000;

export class HolderWriteGate {
  private readonly slots = new Map<string, { active: number; waiting: Array<() => void> }>();

  constructor(private readonly limit: number) {}

  async run<T>(
    key: string,
    work: () => Promise<T>,
    options: { readonly onWait?: () => void; readonly maxWaitMs?: number } = {},
  ): Promise<T> {
    let slot = this.slots.get(key);
    if (!slot) {
      slot = { active: 0, waiting: [] };
      this.slots.set(key, slot);
    }
    const mine = slot;
    if (mine.active < this.limit) {
      mine.active += 1;
    } else {
      await new Promise<void>((resolve, reject) => {
        const wake = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          const at = mine.waiting.indexOf(wake);
          if (at >= 0) mine.waiting.splice(at, 1);
          reject(fieldLocationBusyError());
        }, options.maxWaitMs ?? HOLDER_GATE_MAX_WAIT_MS);
        mine.waiting.push(wake);
        options.onWait?.();
      });
    }
    try {
      return await work();
    } finally {
      const next = mine.waiting.shift();
      if (next) {
        next();
      } else {
        mine.active -= 1;
        if (mine.active === 0) this.slots.delete(key);
      }
    }
  }
}
