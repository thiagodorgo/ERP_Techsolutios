import { Camera, CheckSquare, ClipboardCheck, FileSignature, GitCompare, ImagePlus, MapPin } from "lucide-react";

import { Button } from "../../../components/ui";
import type { TenantChecklistComponentCatalogItem, TenantChecklistComponentType } from "../types";

const componentIconByType: Record<TenantChecklistComponentType, typeof CheckSquare> = {
  vehicle_selector: CheckSquare,
  damage_map: MapPin,
  photo_upload: Camera,
  observation: ClipboardCheck,
  comparison: GitCompare,
  acknowledgement: FileSignature,
  before_after: ImagePlus,
};

export function ChecklistComponentPalette({
  components,
  onAdd,
}: {
  readonly components: readonly TenantChecklistComponentCatalogItem[];
  readonly onAdd: (component: TenantChecklistComponentCatalogItem) => void;
}) {
  return (
    <div className="checklist-builder-palette">
      {components.map((component) => {
        const Icon = componentIconByType[component.type];
        return (
          <article key={component.type}>
            <div>
              <Icon size={18} />
              <span>{component.label}</span>
            </div>
            <p>{component.description}</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => onAdd(component)}>
              Adicionar
            </Button>
          </article>
        );
      })}
    </div>
  );
}
