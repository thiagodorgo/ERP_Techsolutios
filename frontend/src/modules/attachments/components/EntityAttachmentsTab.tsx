import { Download, FileText, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { CSSProperties, RefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Alert, Badge, Button, EmptyState, ErrorState, SearchBar, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { contentTypeLabel, formatBytes } from "../attachments.adapter";
import { deleteAttachment, downloadAttachment, revokeAttachmentUrl, uploadAttachment } from "../attachments.service";
import type { AttachmentEntityType, AttachmentStatus, AttachmentView, AttachmentsApiContext } from "../attachments.types";
import { useEntityAttachments } from "../useEntityAttachments";

// PR-01 Ω4C — aba "Arquivos" polimórfica: recria o COMPORTAMENTO do AutEM (bloco "Detalhes do
// Registro" somente-leitura + seção "Arquivos" com toolbar e tabela Data e Hora | Extensão | Tipo)
// no visual do design system do ERP. Estados §7 (loading/vazio/acesso não permitido/dados
// desatualizados) + feedback de ação. §2.8: só renderiza a allow-list — nunca storageKey/fileUrl.
// RBAC herdada (D-Ω4C-ANEXOS-RBAC): canUpload=`<ent>:create`, canDelete=`<ent>:update` (o backend é a
// autoridade final; a UI apenas molda/esconde).

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // limite honesto do cliente; o backend valida de verdade
const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*,application/pdf";

const STATUS_META: Record<AttachmentStatus, { label: string; tone: "success" | "pending" | "danger" | "warning" }> = {
  stored: { label: "Disponível", tone: "success" },
  pending_review: { label: "Em análise", tone: "pending" },
  rejected: { label: "Rejeitado", tone: "danger" },
  scan_failed: { label: "Falha na verificação", tone: "warning" },
};

const sectionStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-16)" };
const blockStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-8)",
  background: "var(--surface-panel)",
  padding: "var(--space-16)",
};
const blockTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, margin: 0 };
const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "var(--space-12)",
  marginTop: "var(--space-12)",
};
const summaryLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" };
const summaryValueStyle: CSSProperties = { fontSize: "var(--text-sm)", marginTop: "var(--space-2)" };
const toolbarStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between", marginTop: "var(--space-12)" };
const toolbarActionsStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const fileCellStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)" };
const rowActionsStyle: CSSProperties = { display: "inline-flex", gap: "var(--space-6)", justifyContent: "flex-end" };

// ── Componente conectado (montado nos consumidores) ──────────────────────────
export function EntityAttachmentsTab({
  entityType,
  entityId,
  summary,
  canUpload,
  canDelete,
}: {
  readonly entityType: AttachmentEntityType;
  readonly entityId: string;
  readonly summary?: readonly { label: string; value: string }[];
  readonly canUpload: boolean;
  readonly canDelete: boolean;
}) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  const context = useMemo<AttachmentsApiContext>(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const { items, loading, forbidden, source, refresh } = useEntityAttachments(context, entityType, entityId);

  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const busy = uploading || busyId !== null;

  const visibleItems = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.fileName.toLowerCase().includes(term) ||
        item.extension.toLowerCase().includes(term) ||
        contentTypeLabel(item).toLowerCase().includes(term),
    );
  }, [filter, items]);

  const handleUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        setFeedback({ tone: "danger", text: "Arquivo acima de 20 MB. Envie um arquivo menor." });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setUploading(true);
      setFeedback(null);
      try {
        await uploadAttachment(context, entityType, entityId, file, makeClientActionId());
        setFeedback({ tone: "success", text: "Arquivo enviado." });
        await refresh();
      } catch (err) {
        setFeedback({ tone: "danger", text: uploadErrorMessage(err) });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [context, entityType, entityId, refresh],
  );

  const handleDownload = useCallback(
    async (attachment: AttachmentView) => {
      if (attachment.status !== "stored") {
        setFeedback({ tone: "danger", text: "Arquivo disponível somente após a verificação." });
        return;
      }
      setBusyId(attachment.id);
      setFeedback(null);
      try {
        const result = await downloadAttachment(context, attachment.id, attachment.fileName);
        triggerBrowserDownload(result.objectUrl, result.fileName);
        // O object URL do download é revogado logo após o clique programático.
        setTimeout(() => revokeAttachmentUrl(result.objectUrl), 0);
      } catch (err) {
        setFeedback({
          tone: "danger",
          text: err instanceof ApiError && err.status === 409 ? "Arquivo ainda não está disponível para download." : "Não foi possível baixar o arquivo.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [context],
  );

  const handleDelete = useCallback(
    async (attachment: AttachmentView) => {
      if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(`Excluir o arquivo "${attachment.fileName}"?`)) return;
      setBusyId(attachment.id);
      setFeedback(null);
      try {
        await deleteAttachment(context, attachment.id);
        setFeedback({ tone: "success", text: "Arquivo excluído." });
        await refresh();
      } catch {
        setFeedback({ tone: "danger", text: "Não foi possível excluir o arquivo." });
      } finally {
        setBusyId(null);
      }
    },
    [context, refresh],
  );

  return (
    <EntityAttachmentsView
      summary={summary}
      items={visibleItems}
      loading={loading}
      forbidden={forbidden}
      source={source}
      canUpload={canUpload}
      canDelete={canDelete}
      busy={busy}
      busyId={busyId}
      feedback={feedback}
      filter={filter}
      onFilterChange={setFilter}
      onRefresh={() => void refresh()}
      onPickFile={() => fileInputRef.current?.click()}
      onFileSelected={(file) => void handleUpload(file)}
      onDownload={(attachment) => void handleDownload(attachment)}
      onDelete={(attachment) => void handleDelete(attachment)}
      fileInputRef={fileInputRef}
    />
  );
}

// ── Componente de apresentação (puro, SSR-testável com estados explícitos) ────
export function EntityAttachmentsView({
  summary,
  items,
  loading,
  forbidden,
  source,
  canUpload,
  canDelete,
  busy,
  busyId,
  feedback,
  filter,
  onFilterChange,
  onRefresh,
  onPickFile,
  onFileSelected,
  onDownload,
  onDelete,
  fileInputRef,
}: {
  readonly summary?: readonly { label: string; value: string }[];
  readonly items: readonly AttachmentView[];
  readonly loading: boolean;
  readonly forbidden: boolean;
  readonly source: "api" | "mock" | "fallback";
  readonly canUpload: boolean;
  readonly canDelete: boolean;
  readonly busy: boolean;
  readonly busyId?: string | null;
  readonly feedback?: { tone: "success" | "danger"; text: string } | null;
  readonly filter: string;
  readonly onFilterChange: (value: string) => void;
  readonly onRefresh: () => void;
  readonly onPickFile: () => void;
  readonly onFileSelected: (file: File | null) => void;
  readonly onDownload: (attachment: AttachmentView) => void;
  readonly onDelete: (attachment: AttachmentView) => void;
  readonly fileInputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <section style={sectionStyle}>
      {summary && summary.length > 0 ? (
        <div style={blockStyle}>
          <h3 style={blockTitleStyle}>Detalhes do Registro</h3>
          <dl style={summaryGridStyle}>
            {summary.map((field) => (
              <div key={field.label}>
                <dt style={summaryLabelStyle}>{field.label}</dt>
                <dd style={summaryValueStyle}>{field.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div style={blockStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-8)", flexWrap: "wrap" }}>
          <h3 style={blockTitleStyle}>Arquivos</h3>
        </div>

        <div style={toolbarStyle}>
          <SearchBar value={filter} onChange={onFilterChange} placeholder="Filtrar por nome, extensão ou tipo…" />
          <div style={toolbarActionsStyle}>
            <Button type="button" size="sm" variant="secondary" onClick={onRefresh} disabled={busy} aria-label="Atualizar lista de arquivos">
              <RefreshCw size={14} aria-hidden /> Atualizar
            </Button>
            {canUpload ? (
              <>
                <Button type="button" size="sm" onClick={onPickFile} disabled={busy} aria-label="Cadastrar arquivo">
                  <Plus size={14} aria-hidden /> Cadastrar Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  style={{ display: "none" }}
                  aria-hidden
                  tabIndex={-1}
                  onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
                />
              </>
            ) : null}
          </div>
        </div>

        {feedback ? (
          <div style={{ marginTop: "var(--space-12)" }}>
            <Alert title={feedback.tone === "success" ? "Tudo certo" : "Ação não concluída"} tone={feedback.tone === "success" ? "info" : "danger"}>
              {feedback.text}
            </Alert>
          </div>
        ) : null}

        {source === "fallback" && !forbidden ? (
          <div style={{ marginTop: "var(--space-12)" }}>
            <Alert title="Dados podem estar desatualizados" tone="warning">
              Não foi possível confirmar os arquivos deste registro agora. Use Atualizar para tentar de novo.
            </Alert>
          </div>
        ) : null}

        <div style={{ marginTop: "var(--space-12)" }}>
          {forbidden ? (
            <ErrorState title="Acesso não permitido" detail="Você não tem permissão para ver os arquivos deste registro." />
          ) : loading && items.length === 0 ? (
            <Skeleton lines={4} />
          ) : items.length === 0 ? (
            <EmptyState title="Nenhum registro encontrado" detail="Nenhum arquivo foi anexado a este registro até o momento." />
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Extensão</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((attachment) => (
                    <AttachmentRow
                      key={attachment.id}
                      attachment={attachment}
                      canDelete={canDelete}
                      busy={busy || busyId === attachment.id}
                      onDownload={() => onDownload(attachment)}
                      onDelete={() => onDelete(attachment)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Linha da tabela (extraída para SSR-testar colunas + download gated por status).
export function AttachmentRow({
  attachment,
  canDelete,
  busy,
  onDownload,
  onDelete,
}: {
  readonly attachment: AttachmentView;
  readonly canDelete: boolean;
  readonly busy: boolean;
  readonly onDownload: () => void;
  readonly onDelete: () => void;
}) {
  const meta = STATUS_META[attachment.status];
  const downloadable = attachment.status === "stored";
  const size = formatBytes(attachment.sizeBytes);
  return (
    <tr>
      <td style={{ fontVariantNumeric: "tabular-nums" }}>{attachment.uploadedAt}</td>
      <td>
        <div style={fileCellStyle}>
          <FileText size={15} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, wordBreak: "break-word" }} title={size !== "—" ? `${attachment.fileName} · ${size}` : attachment.fileName}>
            {attachment.extension}
          </span>
        </div>
      </td>
      <td>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-6)" }}>
          {contentTypeLabel(attachment)}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </span>
      </td>
      <td>
        <div style={rowActionsStyle}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !downloadable}
            onClick={onDownload}
            aria-label={`Baixar ${attachment.fileName}`}
            title={downloadable ? "Baixar arquivo" : "Disponível após a verificação"}
          >
            <Download size={14} aria-hidden /> Baixar
          </Button>
          {canDelete ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onDelete} aria-label={`Excluir ${attachment.fileName}`}>
              <Trash2 size={14} aria-hidden /> Excluir
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function triggerBrowserDownload(objectUrl: string, fileName: string): void {
  if (typeof document === "undefined" || typeof document.createElement !== "function") return;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
}

// Idempotência do upload (RN-ANEXO-06): id de ação estável por tentativa do cliente.
function makeClientActionId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return "Arquivo muito grande.";
    if (err.status === 415) return "Formato de arquivo não suportado.";
    if (err.status === 422) return "Arquivo rejeitado na verificação.";
    if (err.status === 409) return "Arquivo já enviado.";
    if (err.status === 503) return "Verificação indisponível. Tente novamente em instantes.";
    return err.safeMessage;
  }
  return "Não foi possível enviar o arquivo.";
}

export default EntityAttachmentsTab;
