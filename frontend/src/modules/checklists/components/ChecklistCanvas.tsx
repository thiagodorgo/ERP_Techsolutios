import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button, EmptyState } from "../../../components/ui";
import type { TenantChecklistBuilderComponent } from "../types";

export function ChecklistCanvas({
  components,
  selectedComponentId,
  onMove,
  onRemove,
  onSelect,
}: {
  readonly components: readonly TenantChecklistBuilderComponent[];
  readonly selectedComponentId?: string;
  readonly onMove: (componentId: string, direction: "up" | "down") => void;
  readonly onRemove: (componentId: string) => void;
  readonly onSelect: (componentId: string) => void;
}) {
  if (components.length === 0) {
    return <EmptyState title="Canvas vazio" detail="Adicione componentes da palette para montar o schema do checklist." />;
  }

  return (
    <div className="checklist-builder-canvas">
      {components.map((component, index) => (
        <article key={component.id} className={component.id === selectedComponentId ? "is-selected" : ""}>
          <button type="button" onClick={() => onSelect(component.id)}>
            <strong>{component.label}</strong>
            <span>
              {index + 1}. {component.type} · {component.required ? "Obrigatório" : "Opcional"}
            </span>
          </button>
          <div className="platform-actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => onMove(component.id, "up")} disabled={index === 0}>
              <ArrowUp size={14} />
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onMove(component.id, "down")} disabled={index === components.length - 1}>
              <ArrowDown size={14} />
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onRemove(component.id)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
