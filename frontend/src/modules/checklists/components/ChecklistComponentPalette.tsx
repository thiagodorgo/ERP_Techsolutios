import { Camera, CheckSquare, CircleDot, ClipboardCheck, FileSignature, GitCompare, ImagePlus, ListChecks, MapPin, PenLine } from "lucide-react";

import { Button } from "../../../components/ui";
import { resolveChecklistComponentTypeDescription, resolveChecklistComponentTypeLabel } from "../checklist.constants";
import type { TenantChecklistComponentCatalogItem, TenantChecklistComponentType } from "../types";

const componentIconByType: Record<TenantChecklistComponentType, typeof CheckSquare> = {
  vehicle_selector: CheckSquare,
  damage_map: MapPin,
  photo_upload: Camera,
  observation: ClipboardCheck,
  comparison: GitCompare,
  acknowledgement: FileSignature,
  before_after: ImagePlus,
  single_choice: CircleDot,
  multi_choice: ListChecks,
  signature: PenLine,
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
              {/* PR-02a: rótulo/descrição SEMPRE do mapa local acentuado; o catálogo do backend vem
                  sem acento e serve só de fallback honesto para tipo desconhecido. */}
              <span>{resolveChecklistComponentTypeLabel(component.type, component.label)}</span>
            </div>
            <p>{resolveChecklistComponentTypeDescription(component.type, component.description)}</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => onAdd(component)}>
              Adicionar
            </Button>
          </article>
        );
      })}
    </div>
  );
}
