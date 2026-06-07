import { buildSchemaPreview } from "../checklist.builder";
import type { TenantChecklistBuilderDraft } from "../types";

export function ChecklistSchemaPreview({ draft }: { readonly draft: TenantChecklistBuilderDraft }) {
  return (
    <div className="checklist-schema-preview">
      <pre>{JSON.stringify(buildSchemaPreview(draft), null, 2)}</pre>
      <p>M10, M11 e M12 devem renderizar a partir do schema publicado pela API, sem campos hardcoded no cliente.</p>
    </div>
  );
}
