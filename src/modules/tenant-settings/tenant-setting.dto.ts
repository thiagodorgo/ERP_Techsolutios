import type { TenantSetting, ListTenantSettingResult } from "./tenant-setting.types.js";

export function toTenantSettingDto(setting: TenantSetting) {
  return {
    key: setting.key,
    value: setting.value,
    category: setting.category ?? null,
    description: setting.description ?? null,
    updatedAt: setting.updatedAt.toISOString(),
  };
}

export function toTenantSettingListDto(result: ListTenantSettingResult) {
  return {
    items: result.items.map(toTenantSettingDto),
    pagination: {
      total: result.total,
    },
  };
}
