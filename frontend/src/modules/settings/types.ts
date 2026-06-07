import type { LucideIcon } from "lucide-react";

export type TenantSettingsCategoryStatus = "active" | "planned";

export type TenantSettingsThemeKey = "enterprise_blue" | "tech_dark" | "green_operations";

export type TenantSettingsCategory = {
  id: string;
  title: string;
  description: string;
  items: string[];
  status: TenantSettingsCategoryStatus;
  icon: LucideIcon;
  path?: string;
  ctaLabel?: string;
};

export type TenantSettingsTheme = {
  key: TenantSettingsThemeKey;
  label: string;
  use: string;
  profile: string;
  colors: string[];
};
