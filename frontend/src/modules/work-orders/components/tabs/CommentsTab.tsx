import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";

import {
  addComment,
  deleteComment,
  editComment,
  listComments,
} from "../../comments.service";
import type { WorkOrderComment, WorkOrderCommentApiContext, WorkOrderCommentTag } from "../../comments.types";
import { listTagsFromApi } from "../../../registry/tags/tags.service";
import type { TagItem } from "../../../registry/tags/tags.types";
import { ApiError } from "../../../../services/api/client";

// Ω3F-5b — aba "Comentários" do Hub da OS (espelho do FinancialTab). Lista os comentários da OS em
// ordem cronológica (autor, mensagem, chips de etiquetas coloridas, selo "editado", data). Novo
// comentário (textarea + picker de etiquetas multi-seleção → tag_ids) gated por work_orders:comment.
// Editar/excluir gated por autoria (currentUserId === autor) OU work_orders:update. Estados §7:
// loading/erro/vazio. "Acesso não permitido" fica no shell.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const textarea: CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #CBD5E1", borderRadius: 10, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", minHeight: 74 };
const primaryBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };
const ghostBtn: CSSProperties = { ...primaryBtn, background: "#fff", color: "#475569", border: "1px solid #E2E8F0" };
const iconBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", cursor: "pointer" };

// Cor de texto legível sobre o fundo da etiqueta (luminância relativa; fallback #0F172A).
function readableTextColor(hex: string | null): string {
  if (!hex) return "#0F172A";
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#0F172A";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0F172A" : "#FFFFFF";
}

function TagChip({ tag }: { tag: WorkOrderCommentTag | TagItem }) {
  const bg = tag.color ?? "#E2E8F0";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: bg, color: readableTextColor(tag.color), border: tag.color ? "none" : "1px solid #CBD5E1" }}>
      {tag.name}
    </span>
  );
}

function messageForError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "Comentário muito longo. Reduza o texto e tente novamente.";
    if (err.status === 403) return "Sem permissão para editar/excluir este comentário.";
    if (err.status === 400) return "Escreva uma mensagem para comentar.";
    if (err.status === 404) return "Comentário não encontrado.";
    return err.safeMessage;
  }
  return fallback;
}

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function CommentsTab({
  workOrderId,
  context,
  permissions,
  currentUserId,
}: {
  workOrderId: string;
  context: WorkOrderCommentApiContext;
  permissions: readonly string[];
  currentUserId?: string;
}) {
  const [comments, setComments] = useState<readonly WorkOrderComment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>([]);
  const [tagOptions, setTagOptions] = useState<readonly TagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  const canComment = permissions.includes("work_orders:comment");
  const canUpdate = permissions.includes("work_orders:update");

  // Editar/excluir: só o autor (quando conhecido) OU quem tem work_orders:update (moderação).
  const canModerate = useCallback(
    (comment: WorkOrderComment): boolean => {
      if (canUpdate) return true;
      return Boolean(currentUserId) && currentUserId === comment.authorUserId;
    },
    [canUpdate, currentUserId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listComments(context, workOrderId);
      setComments(data.items);
    } catch {
      setError("Não foi possível carregar os comentários desta ordem de serviço.");
    } finally {
      setLoading(false);
    }
  }, [context, workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTagPicker = async () => {
    const next = !tagPickerOpen;
    setTagPickerOpen(next);
    if (next && tagOptions.length === 0) {
      setTagsLoading(true);
      try {
        const data = await listTagsFromApi(context, { isActive: "active" });
        setTagOptions(data.items);
      } finally {
        setTagsLoading(false);
      }
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const submit = async () => {
    if (!message.trim()) {
      setActionError("Escreva uma mensagem para comentar.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await addComment(context, workOrderId, { message, tagIds: selectedTagIds });
      setMessage("");
      setSelectedTagIds([]);
      setTagPickerOpen(false);
      await load();
    } catch (err) {
      setActionError(messageForError(err, "Não foi possível publicar o comentário."));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (comment: WorkOrderComment) => {
    setEditingId(comment.id);
    setEditMessage(comment.message);
    setActionError(null);
  };

  const saveEdit = async (comment: WorkOrderComment) => {
    if (!editMessage.trim()) {
      setActionError("A mensagem não pode ficar vazia.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await editComment(context, workOrderId, comment.id, editMessage);
      setEditingId(null);
      await load();
    } catch (err) {
      setActionError(messageForError(err, "Não foi possível salvar a alteração."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (comment: WorkOrderComment) => {
    if (typeof window !== "undefined" && !window.confirm("Excluir este comentário?")) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteComment(context, workOrderId, comment.id);
      await load();
    } catch (err) {
      setActionError(messageForError(err, "Não foi possível excluir o comentário."));
    } finally {
      setBusy(false);
    }
  };

  const items = comments ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Comentários</div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>Anotações internas da equipe sobre esta ordem de serviço, com etiquetas para organização.</div>

        {canComment ? (
          <div style={{ marginTop: 16, padding: 14, border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
            <textarea
              style={textarea}
              value={message}
              placeholder="Escreva um comentário…"
              onChange={(e) => setMessage(e.target.value)}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" style={ghostBtn} disabled={busy} onClick={() => void openTagPicker()}>
                {tagPickerOpen ? "Ocultar etiquetas" : "Adicionar etiquetas"}
              </button>
              {selectedTagIds.length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {tagOptions.filter((t) => selectedTagIds.includes(t.id)).map((t) => <TagChip key={t.id} tag={t} />)}
                </div>
              ) : null}
            </div>

            {tagPickerOpen ? (
              <div style={{ marginTop: 10 }}>
                {tagsLoading ? (
                  <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Carregando etiquetas…</div>
                ) : tagOptions.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Nenhuma etiqueta ativa cadastrada.</div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tagOptions.map((tag) => {
                      const selected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          aria-pressed={selected}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, border: selected ? "2px solid #2563EB" : "1px solid #E2E8F0", background: "#fff", color: "#334155" }}
                        >
                          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 99, background: tag.color ?? "#CBD5E1", display: "inline-block" }} />
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" style={primaryBtn} disabled={busy} onClick={() => void submit()}>
                <MessageSquarePlus size={16} aria-hidden /> Comentar
              </button>
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div style={{ marginTop: 14, padding: "10px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, color: "#B91C1C" }}>{actionError}</div>
        ) : null}
      </div>

      {error ? (
        <div style={{ ...card, padding: "12px 16px", background: "#FEF2F2", borderColor: "#FECACA", fontSize: 12.5, color: "#B91C1C" }}>{error}</div>
      ) : null}

      {loading ? (
        <div style={{ ...card, padding: 20, fontSize: 13, color: "#94A3B8" }}>Carregando comentários…</div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: "28px 20px", textAlign: "center", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#334155" }}>Nenhum comentário ainda</div>
          <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>Registre a primeira anotação da equipe sobre esta ordem de serviço.</div>
        </div>
      ) : (
        items.map((comment) => {
          const editing = editingId === comment.id;
          const moderate = canModerate(comment);
          return (
            <div key={comment.id} style={{ ...card, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, color: "#64748B" }}>
                  {/* §11.2 — NOME do autor (resolvido no backend). O UUID (authorUserId) só governa o
                      gating de autoria; jamais é renderizado. */}
                  <span style={{ fontWeight: 700, color: "#334155" }}>{comment.authorName ?? "Usuário"}</span>
                  {comment.createdAt ? <span> · {formatDateTime(comment.createdAt)}</span> : null}
                  {comment.editedAt ? <span style={{ color: "#94A3B8" }}> · editado</span> : null}
                </div>
                {moderate && !editing ? (
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button type="button" style={iconBtn} disabled={busy} onClick={() => startEdit(comment)} aria-label="Editar comentário"><Pencil size={15} /></button>
                    <button type="button" style={{ ...iconBtn, color: "#DC2626" }} disabled={busy} onClick={() => void remove(comment)} aria-label="Excluir comentário"><Trash2 size={15} /></button>
                  </div>
                ) : null}
              </div>

              {editing ? (
                <div style={{ marginTop: 10 }}>
                  <textarea style={textarea} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button type="button" style={primaryBtn} disabled={busy} onClick={() => void saveEdit(comment)}>Salvar</button>
                    <button type="button" style={ghostBtn} disabled={busy} onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: "#0F172A", marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{comment.message}</div>
              )}

              {!editing && comment.tags.length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {comment.tags.map((tag) => <TagChip key={tag.id} tag={tag} />)}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

export default CommentsTab;
