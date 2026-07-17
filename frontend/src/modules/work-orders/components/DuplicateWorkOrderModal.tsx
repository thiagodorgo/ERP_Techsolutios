import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, Button, Checkbox, Modal } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { duplicateWorkOrder } from "../work-orders.service";
import type { WorkOrdersApiContext } from "../work-orders.types";

// Ω3F-6b — duplicar a OS (contrato Ω3F-6a: POST /work-orders/:id/duplicate → 201 com a OS nova).
// C2 (J-Ω3F-6A): NÃO existe "copiar orçamento" aqui — a cópia nasce SEM os valores/preço congelado da
// original (invariante do domínio: preço congelado não se herda). Só comentários e checklist são copiáveis,
// ambos desmarcados por padrão. A nota abaixo diz isso ao gestor em PT-BR de negócio, antes de ele clicar.

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const legendStyle: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 8 };
const noteStyle: CSSProperties = { marginTop: 14, padding: "10px 13px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, color: "#475569" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };

// Idempotência do duplo-clique: um id por ABERTURA do modal. O backend devolve 409 no replay, então dois
// cliques no mesmo modal nunca viram duas OS.
function newClientActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `wo-duplicate-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function DuplicateWorkOrderModal({
  workOrderId,
  workOrderCode,
  context,
  onClose,
}: {
  readonly workOrderId: string;
  readonly workOrderCode: string;
  readonly context: WorkOrdersApiContext;
  readonly onClose: () => void;
}) {
  const navigate = useNavigate();
  const [copyComments, setCopyComments] = useState(false);
  const [copyChecklist, setCopyChecklist] = useState(false);
  const [clientActionId] = useState(newClientActionId);
  const [error, setError] = useState<string | null>(null);
  // 409 = replay do mesmo clique. Não é falha do gestor: a cópia já existe. Tom calmo, não vermelho.
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAlreadyDone(false);
    setSaving(true);

    try {
      const created = await duplicateWorkOrder(context, workOrderId, { copyComments, copyChecklist, clientActionId });
      navigate(`/work-orders/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyDone(true);
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Ordem de serviço não encontrada.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Você não tem permissão para criar ordens de serviço.");
      } else {
        setError("Não foi possível duplicar a ordem de serviço.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Duplicar ordem de serviço" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error ? (
          <Alert title="Não foi possível duplicar" tone="danger">
            {error}
          </Alert>
        ) : null}

        {alreadyDone ? (
          <Alert title="Esta OS já foi duplicada" tone="info">
            A cópia já havia sido criada. Atualize a lista de ordens para encontrá-la.
          </Alert>
        ) : null}

        <p style={introStyle}>
          Uma nova ordem de serviço será criada a partir da OS {workOrderCode}, com protocolo próprio.
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={legendStyle}>O que copiar junto</legend>
          <Checkbox
            label="Copiar comentários"
            checked={copyComments}
            onChange={(event) => setCopyComments(event.target.checked)}
          />
          <Checkbox
            label="Copiar checklist"
            checked={copyChecklist}
            onChange={(event) => setCopyChecklist(event.target.checked)}
          />
        </fieldset>

        <p style={noteStyle}>
          A nova ordem nasce sem os valores financeiros e sem o orçamento da original: preços são
          congelados no lançamento e não passam para a cópia. Lance os valores da nova ordem quando ela abrir.
        </p>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Duplicando…" : "Duplicar OS"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default DuplicateWorkOrderModal;
