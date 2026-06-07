import { buildSchemaPreview } from "../checklist.builder";
import type { TenantChecklistBuilderDraft, TenantChecklistComponentType } from "../types";

const evidenceComponentTypes = new Set<TenantChecklistComponentType>(["photo_upload", "before_after", "damage_map"]);

export function ChecklistSchemaPreview({ draft }: { readonly draft: TenantChecklistBuilderDraft }) {
  const evidenceComponents = draft.components.filter((component) => evidenceComponentTypes.has(component.type));

  return (
    <div className="checklist-schema-preview">
      <pre>{JSON.stringify(buildSchemaPreview(draft), null, 2)}</pre>
      {evidenceComponents.length > 0 ? (
        <section className="checklist-evidence-capabilities">
          <strong>Evidencias no runtime</strong>
          <div>
            <span>Evidencias anexadas via upload seguro</span>
            <span>Download protegido por permissao</span>
            <span>Storage local em dev; S3-compatible futuro</span>
          </div>
          <ul>
            {evidenceComponents.map((component) => (
              <li key={component.id}>
                {component.label} · {component.type}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p>M10, M11 e M12 devem renderizar a partir do schema publicado pela API, sem campos hardcoded no cliente.</p>
    </div>
  );
}
