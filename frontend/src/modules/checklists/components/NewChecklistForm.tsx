import type { FormEvent } from "react";

import { Button, Input, Select } from "../../../components/ui";
import { CHECKLIST_TYPES, checklistTypeLabel } from "../checklist.constants";
import type { TenantChecklistBuilderDraft, TenantChecklistType } from "../types";

export function NewChecklistForm({
  draft,
  saving,
  onCancel,
  onChange,
  onSubmit,
}: {
  readonly draft: TenantChecklistBuilderDraft;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onChange: (draft: TenantChecklistBuilderDraft) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="tenant-checklist-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <Input label="Nome" value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} required />
        <Input label="Descricao" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
        <Select
          label="Tipo"
          value={draft.type}
          onChange={(event) => onChange({ ...draft, type: event.target.value as TenantChecklistType, components: [] })}
        >
          {CHECKLIST_TYPES.map((type) => (
            <option key={type} value={type}>
              {checklistTypeLabel[type]}
            </option>
          ))}
        </Select>
      </div>

      <div className="checklist-builder-draft-summary">
        <strong>Componentes iniciais</strong>
        <span>{draft.components.length === 0 ? "Nenhum componente inicial" : draft.components.map((component) => component.label).join(", ")}</span>
      </div>

      <div className="platform-actions">
        <Button type="submit" disabled={saving || draft.name.trim().length === 0}>
          {saving ? "Salvando..." : "Criar draft"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
