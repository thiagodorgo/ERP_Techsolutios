import { Chip } from "../../../../components/ui";
import { getStatusLabel, getStatusTone } from "../processes.adapter";
import type { ImpoundStatus } from "../processes.types";

// §11 — Chip semântico do estado de custódia (verde=custódia ativa, azul=recepção, vermelho=bloqueio judicial,
// âmbar=elegível a leilão). Reusa o label do backend quando presente; senão cai no fallback PT-BR do adapter.
export function ProcessStatusChip({ status, label }: { readonly status: ImpoundStatus; readonly label?: string }) {
  return <Chip tone={getStatusTone(status)}>{label ?? getStatusLabel(status)}</Chip>;
}

export default ProcessStatusChip;
