import { Download, Eye } from "lucide-react";
import { useState } from "react";

import { Button, EmptyState } from "../../../components/ui";
import { revokeChecklistAttachmentDownloadUrl } from "../checklist-attachments.service";
import type { ChecklistAttachment, ChecklistAttachmentDownloadResult } from "../types";

export function ChecklistAttachmentList({
  attachments,
  onDownload,
}: {
  readonly attachments: readonly ChecklistAttachment[];
  readonly onDownload: (attachment: ChecklistAttachment) => Promise<ChecklistAttachmentDownloadResult>;
}) {
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (attachments.length === 0) {
    return <EmptyState title="Nenhuma evidencia anexada" detail="As evidencias enviadas para a execucao aparecerao aqui." />;
  }

  async function handleDownload(attachment: ChecklistAttachment) {
    setActiveAttachmentId(attachment.id);
    setError(null);

    try {
      const result = await onDownload(attachment);
      const link = document.createElement("a");
      link.href = result.objectUrl;
      link.download = result.fileName;
      link.rel = "noopener noreferrer";
      link.click();
      window.setTimeout(() => revokeChecklistAttachmentDownloadUrl(result.objectUrl), 1000);
    } catch {
      setError("Nao foi possivel baixar a evidencia.");
    } finally {
      setActiveAttachmentId(null);
    }
  }

  return (
    <section className="checklist-attachment-list">
      {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
      {attachments.map((attachment) => (
        <article key={attachment.id}>
          <div>
            <strong>{attachment.fileName ?? "Evidencia sem nome"}</strong>
            <span>
              {formatMimeType(attachment.mimeType)} · {formatBytes(attachment.sizeBytes)} · {formatDate(attachment.createdAt)}
            </span>
          </div>
          <div className="platform-actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => handleDownload(attachment)} disabled={activeAttachmentId === attachment.id}>
              <Download size={14} />
              {activeAttachmentId === attachment.id ? "Baixando..." : "Baixar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => handleDownload(attachment)} disabled={activeAttachmentId === attachment.id}>
              <Eye size={14} />
              Visualizar
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

function formatMimeType(value: string | undefined): string {
  if (!value) return "tipo desconhecido";
  if (value === "application/pdf") return "PDF";
  if (value.startsWith("image/")) return value.replace("image/", "").toUpperCase();
  return value;
}

function formatBytes(value: number | undefined): string {
  if (value === undefined) return "tamanho desconhecido";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}
