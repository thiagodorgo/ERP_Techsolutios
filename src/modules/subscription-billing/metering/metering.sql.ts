// B-ASS-03 — o executor SQL do medidor, injetável para o dublê em memória. Toda leitura é feita SOB o
// contexto RLS da organização da volta (o chamador já setou `app.current_tenant_id`); nenhuma consulta
// filtra `tenant_id` com igualdade literal (só o GUC filtra — R-MED-3, guard T-MED-5).

import type { MeteringAttachmentModel } from "./metering.types.js";

export type AttachmentBytes = {
  readonly bytes: bigint;
  readonly withoutSize: number;
};

export type MeteringSqlExecutor = {
  /** `SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::text` — sem o GUC, devolve null. */
  currentTenantSetting(): Promise<string | null>;
  /** Leitura-canário: `SELECT tenant_id FROM users LIMIT 1`. Sem GUC sob FORCE RLS, devolve zero linhas. */
  canaryTenantId(): Promise<string | null>;
  countActiveUsers(): Promise<number>;
  sumAttachmentBytes(model: MeteringAttachmentModel): Promise<AttachmentBytes>;
  /** `SELECT coalesce(sum(pg_column_size(t.*)), 0)::bigint FROM "tabela" t` sob RLS. Estoura timeout -> TableMeasurementTimeoutError. */
  measureTableBytes(table: string): Promise<bigint>;
  countTrackedVehicles(dayStart: Date, dayEnd: Date): Promise<number>;
};
