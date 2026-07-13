import { Check, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Button, Input, Select } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { deriveSettingLabel, formatSettingUpdatedAt } from "../tenant-settings.adapter";
import { resolveTenantSettingEditor } from "../tenant-settings.presentation";
import { upsertTenantSetting } from "../tenant-settings.service";
import type { TenantSettingItem, TenantSettingsApiContext } from "../tenant-settings.types";

type SaveStatus = "idle" | "saved" | "error";

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "var(--space-12)",
  alignItems: "end",
  padding: "var(--space-12) 0",
  borderBottom: "1px solid var(--border-subtle, #E2E8F0)",
};
const helperStyle: CSSProperties = { display: "block", marginTop: "var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-xs)" };
const metaStyle: CSSProperties = { display: "block", marginTop: "var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-xs)" };
const actionColStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", paddingBottom: "var(--space-4)" };
const okStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-4)", color: "var(--color-success, #16a34a)", fontSize: "var(--text-xs)", fontWeight: 700 };
const errStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-4)", color: "var(--color-danger, #dc2626)", fontSize: "var(--text-xs)", fontWeight: 700 };

// Uma linha = um parâmetro. Responsabilidade única: manter o rascunho editável do valor, salvar
// via PUT /:key e reportar sucesso/erro. Edição só existe quando `canUpdate` (o backend decide).
export function TenantSettingRow({
  item,
  canUpdate,
  context,
  onSaved,
}: {
  readonly item: TenantSettingItem;
  readonly canUpdate: boolean;
  readonly context: TenantSettingsApiContext;
  readonly onSaved?: (saved?: TenantSettingItem) => void;
}) {
  const [draft, setDraft] = useState(item.value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const label = deriveSettingLabel(item);
  const editor = resolveTenantSettingEditor(item.key);
  const fieldId = `tenant-setting-${item.key.replace(/[^a-z0-9]+/gi, "-")}`;
  const dirty = draft !== item.value;

  function changeDraft(value: string) {
    setDraft(value);
    setStatus("idle");
    setErrorMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      const saved = await upsertTenantSetting(context, item.key, { value: draft });
      setStatus("saved");
      onSaved?.(saved ?? undefined);
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setErrorMessage(error.safeMessage);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o parâmetro.");
      }
    } finally {
      setSaving(false);
    }
  }

  const knownOption = editor.kind === "select" && editor.options.some((option) => option.value === draft);

  return (
    <div className="tenant-setting-row" style={rowStyle}>
      <div>
        {editor.kind === "select" ? (
          <>
            <Select
              id={fieldId}
              label={label}
              value={draft}
              disabled={!canUpdate}
              onChange={(event) => changeDraft(event.target.value)}
            >
              {knownOption ? null : <option value={draft}>{draft || "—"}</option>}
              {editor.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {item.description ? <small style={helperStyle}>{item.description}</small> : null}
          </>
        ) : (
          <Input
            id={fieldId}
            label={label}
            value={draft}
            disabled={!canUpdate}
            autoComplete="off"
            helper={item.description ?? undefined}
            onChange={(event) => changeDraft(event.target.value)}
          />
        )}
        <small style={metaStyle}>Atualizado em {formatSettingUpdatedAt(item.updatedAt)}</small>
      </div>

      {canUpdate ? (
        <div style={actionColStyle}>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={!dirty || saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          {status === "saved" ? (
            <span role="status" style={okStyle}>
              <Check size={14} aria-hidden /> Salvo
            </span>
          ) : null}
          {status === "error" ? (
            <span role="alert" style={errStyle}>
              <TriangleAlert size={14} aria-hidden /> {errorMessage}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default TenantSettingRow;
