import { Checkbox, EmptyState, Input } from "../../../components/ui";
import type { ChecklistJsonRecord, TenantChecklistBuilderComponent } from "../types";

export function ChecklistInspector({
  component,
  onChange,
}: {
  readonly component?: TenantChecklistBuilderComponent;
  readonly onChange: (componentId: string, patch: Partial<Pick<TenantChecklistBuilderComponent, "label" | "required" | "config">>) => void;
}) {
  if (!component) {
    return <EmptyState title="Nenhum componente selecionado" detail="Selecione um item no canvas para ajustar label, obrigatoriedade e configuracoes." />;
  }

  return (
    <div className="checklist-builder-inspector">
      <Input label="Label" value={component.label} onChange={(event) => onChange(component.id, { label: event.target.value })} />
      <Checkbox label="Componente obrigatorio" checked={component.required} onChange={(event) => onChange(component.id, { required: event.target.checked })} />
      <div>
        <strong>Configuracoes basicas</strong>
        {Object.entries(component.config).length === 0 ? (
          <p>Nenhuma configuracao inicial definida pelo catalogo.</p>
        ) : (
          Object.entries(component.config).map(([key, value]) => (
            <Input
              key={key}
              label={key}
              value={String(value)}
              onChange={(event) =>
                onChange(component.id, {
                  config: {
                    ...component.config,
                    [key]: parseConfigValue(event.target.value),
                  },
                })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function parseConfigValue(value: string): ChecklistJsonRecord[string] {
  if (value === "true") return true;
  if (value === "false") return false;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && value.trim() !== "" ? numericValue : value;
}
