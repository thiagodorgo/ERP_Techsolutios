import { Info } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Modal, Select } from "../../../components/ui";
import { interpretCycleCountError } from "../cycle-counts.adapter";
import { openCycleCount } from "../cycle-counts.service";
import type { CycleCount } from "../cycle-counts.types";
import type { InventoryAbcClass, InventoryApiContext } from "../inventory.types";

// F7b — "Nova contagem": escolhe a classe (A/B/C/Todas) e abre a sessão,
// que fotografa o saldo do sistema dos itens da classe (R7.6).
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const noteStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginTop: "var(--space-12)",
  padding: "var(--space-10)",
  borderRadius: "var(--radius-6)",
  background: "var(--surface-panel-muted)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontSize: "var(--text-sm)",
};

const CLASS_OPTIONS: readonly { value: "" | InventoryAbcClass; label: string }[] = [
  { value: "", label: "Todas as classes" },
  { value: "A", label: "Classe A" },
  { value: "B", label: "Classe B" },
  { value: "C", label: "Classe C" },
];

export function CycleCountModal({
  context,
  onClose,
  onCreated,
}: {
  readonly context: InventoryApiContext;
  readonly onClose: () => void;
  readonly onCreated: (created: CycleCount) => void;
}) {
  const [abcClass, setAbcClass] = useState<"" | InventoryAbcClass>("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setSaving(true);
    try {
      const created = await openCycleCount(context, abcClass ? { abcClass } : {});
      if (created) {
        onCreated(created);
      } else {
        setServerError("Não foi possível abrir a contagem. Tente novamente.");
      }
    } catch (error) {
      setServerError(interpretCycleCountError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova contagem" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível abrir a contagem" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <Select
          id="cycle-count-field-class"
          label="Classe da contagem"
          value={abcClass}
          onChange={(event) => setAbcClass(event.target.value as "" | InventoryAbcClass)}
        >
          {CLASS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <p style={noteStyle}>
          <Info size={16} aria-hidden /> A sessão fotografa o saldo do sistema dos itens da classe escolhida. Você informa o contado e, ao fechar,
          as variâncias viram movimentos de ajuste.
        </p>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Abrindo…" : "Abrir contagem"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
