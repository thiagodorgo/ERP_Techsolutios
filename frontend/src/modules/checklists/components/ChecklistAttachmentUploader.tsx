import { Upload } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button } from "../../../components/ui";
import { uploadChecklistAttachment } from "../checklist-attachments.service";
import type { ChecklistApiContext, ChecklistAttachment, ChecklistAttachmentMetadata } from "../types";

const defaultAllowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const defaultMaxSizeMb = 10;

export function ChecklistAttachmentUploader({
  context,
  runId,
  componentId,
  metadata,
  allowedMimeTypes = defaultAllowedMimeTypes,
  maxSizeMb = defaultMaxSizeMb,
  onUploaded,
}: {
  readonly context: ChecklistApiContext;
  readonly runId?: string;
  readonly componentId?: string;
  readonly metadata?: ChecklistAttachmentMetadata;
  readonly allowedMimeTypes?: readonly string[];
  readonly maxSizeMb?: number;
  readonly onUploaded?: (attachment: ChecklistAttachment) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const accept = useMemo(() => allowedMimeTypes.join(","), [allowedMimeTypes]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSuccess(null);
    setError(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    const validationError = validateFile(nextFile, allowedMimeTypes, maxSizeMb);

    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(nextFile);
  }

  async function handleUpload() {
    if (!runId?.trim()) {
      setError("Selecione uma execucao antes de enviar evidencia.");
      return;
    }

    if (!componentId?.trim()) {
      setError("Selecione um componente antes de enviar evidencia.");
      return;
    }

    if (!file) {
      setError("Selecione um arquivo para enviar.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadChecklistAttachment({
        context,
        runId,
        componentId,
        file,
        metadata,
      });

      setSuccess("Evidencia enviada com sucesso.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.(result.attachment);
    } catch {
      setError("Nao foi possivel enviar a evidencia. Verifique permissoes e tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="checklist-attachment-uploader">
      <label className="ui-field">
        <span>Arquivo de evidencia</span>
        <input ref={inputRef} className="ui-input" type="file" accept={accept} onChange={handleFileChange} disabled={uploading} />
        <small>
          JPG, PNG, WebP ou PDF ate {maxSizeMb} MB.
        </small>
      </label>

      {file ? (
        <div className="checklist-attachment-selection">
          <strong>{file.name}</strong>
          <span>{formatBytes(file.size)}</span>
        </div>
      ) : null}

      {error ? <p className="checklist-attachment-message checklist-attachment-message--error">{error}</p> : null}
      {success ? <p className="checklist-attachment-message checklist-attachment-message--success">{success}</p> : null}

      <Button type="button" onClick={handleUpload} disabled={uploading || !file}>
        <Upload size={16} />
        {uploading ? "Enviando..." : "Enviar evidencia"}
      </Button>
    </section>
  );
}

function validateFile(file: File, allowedMimeTypes: readonly string[], maxSizeMb: number): string | null {
  if (!allowedMimeTypes.includes(file.type)) {
    return "Tipo de arquivo nao permitido para evidencia.";
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return `Arquivo acima do limite de ${maxSizeMb} MB.`;
  }

  return null;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
