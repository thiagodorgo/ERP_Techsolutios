import { Download, FileWarning, ImageOff, ImagePlus, Trash2 } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Alert, Button, Chip, Modal, Skeleton } from "../../../../components/ui";
import {
  formatDamageDate,
  formatFileSize,
  formatValor,
  getDamageStatusLabel,
  getDamageStatusTone,
  getGravidadeLabel,
  getGravidadeTone,
  interpretDamageUploadError,
  isImageMimeType,
} from "../damages.adapter";
import {
  deleteDamageAttachment,
  downloadDamageAttachment,
  getDamage,
  revokeDamageAttachmentUrl,
  uploadDamageAttachment,
} from "../damages.service";
import type { Damage, DamageApiContext, DamageAttachment } from "../damages.types";

const fieldGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-12)" };
const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2)" };
const fieldLabelStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const fieldValueStyle: CSSProperties = { fontSize: "var(--text-sm)" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const sectionTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, margin: "var(--space-16) 0 var(--space-8)" };
const descricaoStyle: CSSProperties = { whiteSpace: "pre-wrap", fontSize: "var(--text-sm)" };
const galleryStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--space-10)" };
const uploadRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", marginTop: "var(--space-8)" };
const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-6)",
  padding: "var(--space-8)",
  borderRadius: "var(--radius-6)",
  border: "1px solid var(--border-subtle)",
  background: "var(--surface-panel)",
};
const thumbBoxStyle: CSSProperties = {
  position: "relative",
  height: 120,
  borderRadius: "var(--radius-4)",
  overflow: "hidden",
  background: "var(--surface-panel-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const thumbImgStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const cardActionsStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)", justifyContent: "space-between" };

export function DamageDetailModal({
  damage,
  vehicleLabel,
  workOrderCode,
  canUpload,
  canDelete,
  context,
  onClose,
  onChanged,
}: {
  readonly damage: Damage;
  readonly vehicleLabel?: string;
  readonly workOrderCode?: string;
  readonly canUpload: boolean;
  readonly canDelete: boolean;
  readonly context: DamageApiContext;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<DamageAttachment[]>(damage.attachments ?? []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);

  // Recarrega o dano (GET /:id inclui os anexos) ao abrir — a lista não traz as fotos.
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const fresh = await getDamage(context, damage.id);
      setAttachments(fresh?.attachments ?? []);
    } catch {
      setLoadError("Não foi possível carregar as fotos deste dano.");
    } finally {
      setLoading(false);
    }
  }, [context, damage.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setActionError(null);
    try {
      await uploadDamageAttachment(context, damage.id, file, {});
      if (inputRef.current) inputRef.current.value = "";
      await reload();
      onChanged();
    } catch (error) {
      // 415/400 unsupported_media_type → "Formato de imagem não suportado".
      setUploadError(interpretDamageUploadError(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: DamageAttachment) {
    setBusyAttachmentId(attachment.id);
    setActionError(null);
    try {
      await deleteDamageAttachment(context, damage.id, attachment.id);
      await reload();
      onChanged();
    } catch {
      setActionError("Não foi possível remover a foto. Tente novamente.");
    } finally {
      setBusyAttachmentId(null);
    }
  }

  return (
    <Modal title="Detalhes do dano" open onClose={onClose}>
      <div style={fieldGridStyle}>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Situação</span>
          <span>
            <Chip tone={getDamageStatusTone(damage.status)}>{getDamageStatusLabel(damage.status)}</Chip>
          </span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Gravidade</span>
          <span>
            <Chip tone={getGravidadeTone(damage.gravidade)}>{getGravidadeLabel(damage.gravidade)}</Chip>
          </span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Viatura</span>
          <span style={fieldValueStyle}>
            <Link
              to="/cadastros/viaturas"
              aria-label={vehicleLabel ? `Ver viatura ${vehicleLabel} em Cadastros` : "Ver viaturas em Cadastros"}
            >
              {vehicleLabel ?? "Viatura"}
            </Link>
          </span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>OS de origem</span>
          <span style={fieldValueStyle}>
            {damage.workOrderId ? (
              <Link to={`/work-orders/${damage.workOrderId}`} aria-label={`Abrir OS de origem ${workOrderCode ?? damage.workOrderId}`}>
                {workOrderCode ?? "Abrir OS"}
              </Link>
            ) : (
              <span style={mutedStyle}>—</span>
            )}
          </span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Data</span>
          <span style={fieldValueStyle}>{formatDamageDate(damage.data)}</span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Custo estimado</span>
          <span style={fieldValueStyle}>{formatValor(damage.custoEstimado)}</span>
        </div>
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Custo real</span>
          <span style={fieldValueStyle}>{formatValor(damage.custoReal)}</span>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-12)" }}>
        <span style={fieldLabelStyle}>Descrição</span>
        <p style={descricaoStyle}>{damage.descricao}</p>
      </div>

      <h3 style={sectionTitleStyle}>Fotos do dano</h3>

      {loadError ? (
        <Alert title="Falha ao carregar fotos" tone="warning">
          {loadError}
        </Alert>
      ) : null}
      {uploadError ? (
        <Alert title="Envio não concluído" tone="danger">
          {uploadError}
        </Alert>
      ) : null}
      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      {canUpload ? (
        <div style={uploadRowStyle}>
          <input
            ref={inputRef}
            id="damage-attachment-upload"
            className="ui-input"
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={handleFileChange}
            aria-label="Enviar foto do dano"
          />
          <span style={mutedStyle}>
            <ImagePlus size={14} aria-hidden /> {uploading ? "Enviando foto…" : "Anexe uma imagem (JPG, PNG ou WebP)."}
          </span>
        </div>
      ) : null}

      {loading ? (
        <Skeleton lines={3} />
      ) : attachments.length === 0 ? (
        <p style={mutedStyle}>Nenhuma foto anexada a este dano.</p>
      ) : (
        <div style={galleryStyle}>
          {attachments.map((attachment) => (
            <DamageAttachmentCard
              key={attachment.id}
              attachment={attachment}
              damageId={damage.id}
              context={context}
              canDelete={canDelete}
              busy={busyAttachmentId === attachment.id}
              onDelete={() => void handleDelete(attachment)}
            />
          ))}
        </div>
      )}

      <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" }}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </footer>
    </Modal>
  );
}

// Miniatura via stream autenticado: baixa o blob, gera object URL para o <img> e revoga no unmount.
// Não-imagem/erro → cartão com nome/tamanho + botão "Baixar" (também autenticado).
function DamageAttachmentCard({
  attachment,
  damageId,
  context,
  canDelete,
  busy,
  onDelete,
}: {
  readonly attachment: DamageAttachment;
  readonly damageId: string;
  readonly context: DamageApiContext;
  readonly canDelete: boolean;
  readonly busy: boolean;
  readonly onDelete: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isImage = isImageMimeType(attachment.mimeType) || attachment.mimeType === undefined;

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let createdUrl: string | null = null;

    void downloadDamageAttachment(context, damageId, attachment.id)
      .then((result) => {
        if (!active) {
          revokeDamageAttachmentUrl(result.objectUrl);
          return;
        }
        createdUrl = result.objectUrl;
        setObjectUrl(result.objectUrl);
      })
      .catch(() => {
        if (active) setThumbError(true);
      });

    return () => {
      active = false;
      if (createdUrl) revokeDamageAttachmentUrl(createdUrl);
    };
  }, [attachment.id, context, damageId, isImage]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const result = await downloadDamageAttachment(context, damageId, attachment.id);
      triggerBrowserDownload(result.objectUrl, result.fileName);
      // O object URL do download é revogado logo após o clique programático.
      setTimeout(() => revokeDamageAttachmentUrl(result.objectUrl), 0);
    } catch {
      setThumbError(true);
    } finally {
      setDownloading(false);
    }
  }

  const caption = attachment.fileName ?? "Foto do dano";
  const size = formatFileSize(attachment.sizeBytes);

  return (
    <figure style={cardStyle}>
      <div style={thumbBoxStyle}>
        {isImage && objectUrl && !thumbError ? (
          <img src={objectUrl} alt={caption} style={thumbImgStyle} onError={() => setThumbError(true)} />
        ) : thumbError ? (
          <ImageOff size={28} aria-hidden />
        ) : isImage ? (
          <Skeleton lines={1} />
        ) : (
          <FileWarning size={28} aria-hidden />
        )}
      </div>
      <figcaption style={mutedStyle} title={caption}>
        {caption}
        {size ? ` · ${size}` : ""}
      </figcaption>
      <div style={cardActionsStyle}>
        <Button type="button" size="sm" variant="secondary" onClick={() => void handleDownload()} disabled={downloading} aria-label={`Baixar ${caption}`}>
          <Download size={14} aria-hidden /> {downloading ? "Baixando…" : "Baixar"}
        </Button>
        {canDelete ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete} disabled={busy} aria-label={`Remover ${caption}`}>
            <Trash2 size={14} aria-hidden /> Remover
          </Button>
        ) : null}
      </div>
    </figure>
  );
}

function triggerBrowserDownload(objectUrl: string, fileName: string): void {
  if (typeof document === "undefined" || typeof document.createElement !== "function") return;
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
}
