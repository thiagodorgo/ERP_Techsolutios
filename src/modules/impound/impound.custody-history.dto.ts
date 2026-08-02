import type { CustodyHistoryItem } from "./impound.custody-history.types.js";

// §allowlist: tenant_id/identity_id/hash-chain NUNCA são expostos. `id` é o UUID opaco do processo (mesma classe
// do `?dossie=` já usado no PR-07). `status` é o enum (o frontend aplica o rótulo/tom PT-BR).
export function toCustodyHistoryListDto(items: readonly CustodyHistoryItem[]) {
  return {
    items: items.map((item) => ({
      id: item.id,
      vehiclePlate: item.vehiclePlate ?? null,
      vehicleUnidentified: item.vehicleUnidentified,
      status: item.status,
      enteredAt: item.enteredAt ? item.enteredAt.toISOString() : null,
      yardName: item.yardName ?? null,
      isCurrent: item.isCurrent,
    })),
  };
}
