import type { CSSProperties } from "react";
import { useMemo } from "react";

import { Card } from "../../../components/ui";
import { groupTenantSettings } from "../tenant-settings.adapter";
import {
  TENANT_SETTINGS_CATEGORY_PRESENTATION,
  TENANT_SETTINGS_FALLBACK_ICON,
} from "../tenant-settings.presentation";
import type { TenantSettingItem, TenantSettingsApiContext } from "../tenant-settings.types";
import { TenantSettingRow } from "./TenantSettingRow";

// Apresentação pura dos parâmetros agrupados por categoria. Depende só de props (DIP) — não conhece
// o hook nem a API — o que a torna testável em SSR sem depender de efeito de carga.
const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginBottom: "var(--space-8)",
};
const groupTitleStyle: CSSProperties = { fontSize: "var(--text-md, 1rem)", fontWeight: 700, margin: 0 };

export function TenantSettingsGroups({
  items,
  canUpdate,
  context,
  onSaved,
}: {
  readonly items: readonly TenantSettingItem[];
  readonly canUpdate: boolean;
  readonly context: TenantSettingsApiContext;
  readonly onSaved?: (saved?: TenantSettingItem) => void;
}) {
  const groups = useMemo(() => groupTenantSettings(items), [items]);

  return (
    <>
      {groups.map((group) => {
        const Icon = group.category
          ? TENANT_SETTINGS_CATEGORY_PRESENTATION[group.category]?.icon ?? TENANT_SETTINGS_FALLBACK_ICON
          : TENANT_SETTINGS_FALLBACK_ICON;

        return (
          <Card key={group.category ?? "__uncategorized__"}>
            <header style={groupHeaderStyle}>
              <Icon size={18} aria-hidden />
              <h2 style={groupTitleStyle}>{group.title}</h2>
            </header>
            <div>
              {group.items.map((item) => (
                <TenantSettingRow key={item.key} item={item} canUpdate={canUpdate} context={context} onSaved={onSaved} />
              ))}
            </div>
          </Card>
        );
      })}
    </>
  );
}

export default TenantSettingsGroups;
