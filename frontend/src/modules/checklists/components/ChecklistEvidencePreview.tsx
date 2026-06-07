import { Download, FileText, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../../components/ui";
import { revokeChecklistAttachmentDownloadUrl } from "../checklist-attachments.service";
import type { ChecklistAttachment, ChecklistAttachmentDownloadResult } from "../types";

export function ChecklistEvidencePreview({
  attachment,
  onDownload,
}: {
  readonly attachment: ChecklistAttachment;
  readonly onDownload: (attachment: ChecklistAttachment) => Promise<ChecklistAttachmentDownloadResult>;
}) {
  const [preview, setPreview] = useState<ChecklistAttachmentDownloadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isImage = attachment.mimeType === "image/jpeg" || attachment.mimeType === "image/png" || attachment.mimeType === "image/webp";
  const isPdf = attachment.mimeType === "application/pdf";

  useEffect(() => () => {
    if (preview?.objectUrl) revokeChecklistAttachmentDownloadUrl(preview.objectUrl);
  }, [preview?.objectUrl]);

  async function loadPreview() {
    setLoading(true);
    setError(null);

    try {
      const result = await onDownload(attachment);
      setPreview((current) => {
        if (current?.objectUrl) revokeChecklistAttachmentDownloadUrl(current.objectUrl);
        return result;
      });
    } catch {
      setError("Nao foi possivel visualizar a evidencia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="checklist-evidence-preview">
      <header>
        <div>
          {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
          <strong>{attachment.fileName ?? "Evidencia"}</strong>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={loadPreview} disabled={loading}>
          <Download size={14} />
          {loading ? "Carregando..." : "Abrir"}
        </Button>
      </header>

      {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
      {preview && isImage ? <img src={preview.objectUrl} alt={attachment.fileName ?? "Evidencia anexada"} /> : null}
      {preview && isPdf ? (
        <a href={preview.objectUrl} target="_blank" rel="noopener noreferrer">
          Abrir PDF protegido
        </a>
      ) : null}
      {!isImage && !isPdf ? <p>Arquivo disponivel para download protegido.</p> : null}
    </section>
  );
}
