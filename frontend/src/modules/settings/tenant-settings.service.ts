import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { adaptTenantSettingResponse, adaptTenantSettingsResponse } from "./tenant-settings.adapter";
import type {
  TenantSettingItem,
  TenantSettingUpsertPayload,
  TenantSettingsApiContext,
  TenantSettingsData,
} from "./tenant-settings.types";

// D-007: nunca fabricar parâmetros. Modo mock → dataset vazio (mock honesto); erro real → fallback
// vazio com motivo seguro para a UI (o client já sanitiza a mensagem por status).
export async function listTenantSettingsFromApi(context: TenantSettingsApiContext): Promise<TenantSettingsData> {
  if (isMockMode()) {
    return { items: [], source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>("/tenant-settings", context);
    return adaptTenantSettingsResponse(response, "api");
  } catch {
    return {
      items: [],
      source: "fallback",
      fallbackReason: "Não foi possível consultar os parâmetros da organização.",
    };
  }
}

// Upsert de um parâmetro (PUT /tenant-settings/:key). Permissão `tenant_settings:update` (o backend
// é a autoridade final; a UI só esconde o botão Salvar de quem não pode editar).
export async function upsertTenantSetting(
  context: TenantSettingsApiContext,
  key: string,
  payload: TenantSettingUpsertPayload,
): Promise<TenantSettingItem | null> {
  const response = await apiRequest<unknown>(`/tenant-settings/${encodeURIComponent(key)}`, {
    ...context,
    method: "PUT",
    body: payload,
  });
  return adaptTenantSettingResponse(response);
}
