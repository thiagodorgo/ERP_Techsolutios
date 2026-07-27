import { UserCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Badge, Button, Card, Checkbox } from "../../../../components/ui";
import { RECIPIENT_RELATIONSHIP_OPTIONS } from "../release.adapter";
import type { RecipientInput, RecipientRelationship, ReleaseCheckDto, ReleaseDto } from "../release.types";

// Dossiê da liberação (release:process) — QUEM RETIRA (nome + documento + relação) + CHECKLIST de requisitos (I9,
// snapshot do perfil). §2.8: o documento é digitado no console autenticado e renderiza APENAS no comprovante art.
// 24 — o resumo aqui mostra só nome + relação. White-label: "proprietário / quem retira", NUNCA "polícia".
const summaryBox: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: 12 };
const checkRow: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid #F1F5F9" };

export function DossieLiberacao({
  release,
  checks,
  canProcess,
  busy,
  error,
  onRecipient,
  onCheck,
}: {
  readonly release: ReleaseDto;
  readonly checks: readonly ReleaseCheckDto[];
  readonly canProcess: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onRecipient: (input: RecipientInput) => void;
  readonly onCheck: (code: string, satisfied: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [relationship, setRelationship] = useState<RecipientRelationship | "">("");

  const canSubmitRecipient = name.trim().length > 0 && !busy;

  return (
    <Card title="Quem retira e requisitos">
      {error ? (
        <Alert title="Não foi possível salvar o dossiê" tone="danger">
          {error}
        </Alert>
      ) : null}

      {release.recipientName ? (
        <div style={summaryBox}>
          <UserCheck size={18} aria-hidden color="#2563EB" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <strong style={{ fontSize: 14, color: "#0F172A" }}>{release.recipientName}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{release.recipientRelationshipLabel ?? "Quem retira"}</span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px" }}>Identifique a pessoa que retira o veículo (art. 24).</p>
      )}

      {canProcess ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
          <label className="ui-field" htmlFor="release-recipient-name">
            <span>Nome de quem retira *</span>
            <input id="release-recipient-name" className="ui-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="Nome completo" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label className="ui-field" htmlFor="release-recipient-document">
              <span>Documento</span>
              <input id="release-recipient-document" className="ui-input" value={document} onChange={(event) => setDocument(event.target.value)} maxLength={40} placeholder="CPF/CNPJ ou identidade" />
            </label>
            <label className="ui-field" htmlFor="release-recipient-relationship">
              <span>Relação com o veículo</span>
              <span className="ui-select">
                <select
                  id="release-recipient-relationship"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value as RecipientRelationship | "")}
                >
                  <option value="">Selecione…</option>
                  {RECIPIENT_RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="button"
              onClick={() =>
                onRecipient({
                  recipientName: name,
                  recipientDocument: document,
                  recipientRelationship: relationship || undefined,
                })
              }
              disabled={!canSubmitRecipient}
              aria-label="Salvar quem retira"
            >
              {busy ? "Salvando…" : "Salvar quem retira"}
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: 13, color: "#0F172A" }}>Checklist de requisitos</strong>
        </div>
        {checks.length === 0 ? (
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>Nenhum requisito exigido pelo perfil normativo deste processo.</p>
        ) : (
          <div role="list">
            {checks.map((check) => (
              <div key={check.id} style={checkRow} role="listitem">
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, color: "#0F172A" }}>
                    {check.label}
                    {check.required ? <Badge tone="warning">Obrigatório</Badge> : null}
                  </span>
                  {check.satisfied ? <small style={{ fontSize: 11, color: "#16A34A" }}>Atendido</small> : <small style={{ fontSize: 11, color: "#B45309" }}>Pendente</small>}
                </div>
                {canProcess ? (
                  <Checkbox
                    label="Atendido"
                    checked={check.satisfied}
                    disabled={busy}
                    onChange={(event) => onCheck(check.code, event.target.checked)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default DossieLiberacao;
