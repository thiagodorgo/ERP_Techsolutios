// Ω-VID PR-09 — Histórico de Custódias: os MÚLTIPLOS processos de custódia que compartilham a MESMA identidade de
// veículo de terceiro (ThirdPartyVehicleIdentity, PR-01..05). O dossiê é aberto por processo; esta aba mostra as
// OUTRAS passagens do MESMO veículo pelo pátio (e a atual, marcada `isCurrent`). Módulo de LEITURA dedicado — mesmo
// padrão do `impound.checklist-link` (não acopla o domínio central `ImpoundProcess`, que não expõe `identity_id`).
//
// §allowlist: o resumo é ESTREITO — id do processo (opaco, mesma classe do `?dossie=`), placa (rótulo público já
// exibido no dossiê), estado, entrada e nome do pátio. NUNCA `tenant_id`, `identity_id` (resolvido server-side),
// hash-chain nem PII. Gate: `impound:read` (mesma do dossiê).

export type CustodyHistoryItem = {
  readonly id: string;
  readonly vehiclePlate?: string;
  readonly vehicleUnidentified: boolean;
  readonly status: string;
  readonly enteredAt?: Date;
  readonly yardName?: string;
  readonly isCurrent: boolean;
};

export class ImpoundCustodyHistoryError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ImpoundCustodyHistoryError";
  }
}
