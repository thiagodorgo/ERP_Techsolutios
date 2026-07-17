import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";

import {
  deleteAttachment,
  downloadAttachment,
  formatBytes,
  listAttachments,
  uploadAttachment,
} from "../../attachments.service";
import type { WorkOrderAttachment, WorkOrderAttachmentApiContext, WorkOrderAttachmentStatus } from "../../attachments.types";
import { ApiError } from "../../../../services/api/client";

// Ω3F-5b — aba "Arquivos" do Hub da OS (espelho do FinancialTab). Lista anexos (nome, tipo, tamanho,
// badge de status, autor, data). Download só quando status=stored (senão desabilitado com tooltip).
// Upload manual (multipart) gated por work_orders:create OU update; excluir gated por work_orders:update.
// §2.8: a UI só usa downloadPath/fileName/status — NUNCA storageKey/checksum (o DTO nem expõe).
// Estados §7: loading/erro/vazio. "Acesso não permitido" fica no shell.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const th: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 700, textAlign: "left", padding: "10px 14px", textTransform: "uppercase", letterSpacing: ".3px" };
const td: CSSProperties = { fontSize: 13, color: "#0F172A", padding: "12px 14px", borderTop: "1px solid #F1F5F9", verticalAlign: "middle" };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const iconBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", cursor: "pointer" };

const STATUS_BADGE: Record<WorkOrderAttachmentStatus, { label: string; color: string; background: string }> = {
  stored: { label: "Disponível", color: "#16A34A", background: "#F0FDF4" },
  pending_review: { label: "Em análise", color: "#B45309", background: "#FFFBEB" },
  rejected: { label: "Rejeitado", color: "#DC2626", background: "#FEF2F2" },
  scan_failed: { label: "Falha na verificação", color: "#475569", background: "#F1F5F9" },
};

// Rótulo curto de tipo a partir do MIME (a coluna mostra o rótulo; nada de bucket/storage key).
function mimeLabel(mime: string): string {
  if (mime.startsWith("image/")) return `Imagem ${mime.slice(6).toUpperCase()}`.trim();
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("video/")) return "Vídeo";
  if (mime.startsWith("audio/")) return "Áudio";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Planilha";
  if (mime.includes("word") || mime.includes("document")) return "Documento";
  if (mime === "text/plain") return "Texto";
  return "Arquivo";
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 415) return "Formato não suportado.";
    if (err.status === 413) return "Arquivo muito grande.";
    if (err.status === 422) return "Arquivo rejeitado na verificação.";
    if (err.status === 409) return "Arquivo já enviado.";
    if (err.status === 503) return "Verificação indisponível, tente novamente.";
    return err.safeMessage;
  }
  return "Não foi possível enviar o arquivo.";
}

function formatDateTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function AttachmentsTab({
  workOrderId,
  context,
  permissions,
}: {
  workOrderId: string;
  context: WorkOrderAttachmentApiContext;
  permissions: readonly string[];
}) {
  const [attachments, setAttachments] = useState<readonly WorkOrderAttachment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = permissions.includes("work_orders:create") || permissions.includes("work_orders:update");
  const canDelete = permissions.includes("work_orders:update");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAttachments(context, workOrderId);
      setAttachments(data.items);
    } catch {
      setError("Não foi possível carregar os arquivos desta ordem de serviço.");
    } finally {
      setLoading(false);
    }
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitUpload = async () => {
    if (!file) {
      setActionError("Selecione um arquivo para enviar.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await uploadAttachment(context, workOrderId, { file, description });
      setFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setActionError(uploadErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachment: WorkOrderAttachment) => {
    if (attachment.status !== "stored") return;
    setBusy(true);
    setActionError(null);
    try {
      await downloadAttachment(context, workOrderId, attachment.id, attachment.fileName);
    } catch (err) {
      // 409 attachment_not_ready quando o status mudou desde o carregamento.
      setActionError(err instanceof ApiError && err.status === 409 ? "Arquivo ainda não está disponível para download." : "Não foi possível baixar o arquivo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (attachment: WorkOrderAttachment) => {
    if (typeof window !== "undefined" && !window.confirm(`Excluir o arquivo "${attachment.fileName}"?`)) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteAttachment(context, workOrderId, attachment.id);
      await load();
    } catch {
      setActionError("Não foi possível excluir o arquivo.");
    } finally {
      setBusy(false);
    }
  };

  const items = attachments ?? [];

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Arquivos</div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Documentos e evidências anexados a esta ordem de serviço. O download é liberado após a verificação.</div>
        </div>
      </div>

      {canUpload ? (
        <div style={{ marginTop: 16, padding: 14, border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Arquivo
              <input ref={fileInputRef} type="file" style={{ ...input, padding: "7px 8px" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Tipo/descrição (opcional)
              <input style={input} value={description} placeholder="Ex.: Foto do veículo" onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" style={primaryBtn} disabled={busy || !file} onClick={() => void submitUpload()}>
              <Upload size={16} aria-hidden /> Enviar arquivo
            </button>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div style={{ marginTop: 14, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>{actionError}</div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 14, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
      ) : null}

      {loading ? (
        <div style={{ marginTop: 18, fontSize: 13, color: "#94A3B8" }}>Carregando arquivos…</div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: 18, padding: "28px 20px", textAlign: "center", border: "1px dashed #E2E8F0", borderRadius: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Nenhum arquivo anexado</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Envie documentos ou evidências para vê-los aqui.</div>
        </div>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Arquivo</th>
                <th style={th}>Tipo</th>
                <th style={{ ...th, textAlign: "right" }}>Tamanho</th>
                <th style={th}>Situação</th>
                <th style={th}>Enviado por</th>
                <th style={th}>Data</th>
                <th style={{ ...th, textAlign: "right", width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  canDelete={canDelete}
                  busy={busy}
                  onDownload={() => void download(attachment)}
                  onDelete={() => void remove(attachment)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canUpload && !loading ? (
        <div style={{ marginTop: 14, fontSize: 12, color: "#94A3B8" }}>Você pode visualizar e baixar arquivos, mas não tem permissão para enviar novos.</div>
      ) : null}
    </div>
  );
}

// Linha da tabela de anexos (extraída para SSR-testar badge de status + download gated por status).
export function AttachmentRow({
  attachment,
  canDelete,
  busy,
  onDownload,
  onDelete,
}: {
  attachment: WorkOrderAttachment;
  canDelete: boolean;
  busy: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[attachment.status];
  const downloadable = attachment.status === "stored";
  return (
    <tr>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} aria-hidden style={{ color: "#94A3B8", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{attachment.fileName}</span>
        </div>
      </td>
      <td style={td}>{mimeLabel(attachment.mimeType)}</td>
      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatBytes(attachment.sizeBytes)}</td>
      <td style={td}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, color: badge.color, background: badge.background }}>{badge.label}</span>
      </td>
      {/* §11.2 — NOME de quem enviou (resolvido no backend); o UUID nunca aparece. */}
      <td style={td}>{attachment.uploadedByName ?? "—"}</td>
      <td style={td}>{formatDateTime(attachment.createdAt)}</td>
      <td style={{ ...td, textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            type="button"
            style={{ ...iconBtn, ...(downloadable ? { borderColor: "#2563EB", color: "#2563EB" } : { color: "#CBD5E1", cursor: "not-allowed" }) }}
            disabled={busy || !downloadable}
            onClick={onDownload}
            aria-label="Baixar arquivo"
            title={downloadable ? "Baixar arquivo" : "Disponível após verificação"}
          >
            <Download size={15} />
          </button>
          {canDelete ? (
            <button type="button" style={{ ...iconBtn, color: "#DC2626" }} disabled={busy} onClick={onDelete} aria-label="Excluir arquivo"><Trash2 size={15} /></button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default AttachmentsTab;
