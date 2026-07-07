import { Trash2, UserPlus } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { TEAM_STATUS_OPTIONS, validateTeam } from "../teams.adapter";
import { addTeamMember, createTeam, getTeam, removeTeamMember, updateTeam } from "../teams.service";
import type { Team, TeamCreatePayload, TeamField, TeamMember, TeamsApiContext, TenantUser } from "../teams.types";

const FIELD_ID: Record<string, string> = {
  name: "team-field-name",
  status: "team-field-status",
  leader: "team-field-leader",
  notes: "team-field-notes",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-12)",
};

const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const hintStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const memberRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-8)",
  padding: "var(--space-8) 0",
  borderBottom: "1px solid var(--border-subtle)",
};
const addMemberRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap", marginTop: "var(--space-8)" };

export function TeamFormModal({
  team,
  context,
  users,
  onClose,
  onSaved,
  onMembersChanged,
}: {
  readonly team: Team | null;
  readonly context: TeamsApiContext;
  readonly users: readonly TenantUser[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly onMembersChanged?: () => void;
}) {
  const isEdit = Boolean(team);
  const [name, setName] = useState(team?.name ?? "");
  const [status, setStatus] = useState(team?.status && TEAM_STATUS_OPTIONS.some((o) => o.value === team.status) ? team.status : "active");
  const [leaderUserId, setLeaderUserId] = useState(team?.leaderUserId ?? "");
  const [notes, setNotes] = useState(team?.notes ?? "");
  const [isActive, setIsActive] = useState(team?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TeamField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<TeamMember[]>(team?.members ?? []);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);

  // Ao editar, recarrega o detalhe para obter a lista atual de membros.
  useEffect(() => {
    if (!team) return;
    let active = true;
    void getTeam(context, team.id)
      .then((detail) => {
        if (active && detail) setMembers(detail.members);
      })
      .catch(() => {
        /* mantém os membros já conhecidos; a falha de leitura não bloqueia o formulário */
      });
    return () => {
      active = false;
    };
  }, [team, context]);

  const noUsersLoaded = users.length === 0;

  const leaderOptions = useMemo(() => {
    const options = users.map((user) => ({ value: user.id, label: user.name }));
    if (team?.leaderUserId && !options.some((option) => option.value === team.leaderUserId)) {
      const currentName = members.find((member) => member.userId === team.leaderUserId)?.userName ?? "Líder atual";
      options.unshift({ value: team.leaderUserId, label: currentName });
    }
    return options;
  }, [users, team?.leaderUserId, members]);

  const availableUsers = useMemo(
    () => users.filter((user) => !members.some((member) => member.userId === user.id)),
    [users, members],
  );

  function buildPayload(): TeamCreatePayload {
    return {
      name: name.trim(),
      leaderUserId: leaderUserId.trim() || undefined,
      status: status.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateTeam(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<TeamField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      if (isEdit && team) {
        await updateTeam(context, team.id, { ...payload, isActive });
      } else {
        await createTeam(context, payload);
      }
      onSaved();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Não foi possível salvar a equipe.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshMembers() {
    if (!team) return;
    const detail = await getTeam(context, team.id);
    if (detail) setMembers(detail.members);
  }

  async function handleAddMember() {
    if (!team) return;
    if (!newMemberUserId) {
      setMemberError("Selecione um usuário para adicionar.");
      return;
    }
    setMemberError(null);
    setAddingMember(true);
    try {
      await addTeamMember(context, team.id, { userId: newMemberUserId, roleInTeam: newMemberRole.trim() || undefined });
      await refreshMembers();
      setNewMemberUserId("");
      setNewMemberRole("");
      onMembersChanged?.();
    } catch (error) {
      const statusCode = error instanceof ApiError ? error.status : undefined;
      setMemberError(statusCode === 409 ? "Este usuário já faz parte da equipe." : error instanceof Error ? error.message : "Não foi possível adicionar o membro.");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!team) return;
    setMemberError(null);
    setRemovingUserId(member.userId);
    try {
      await removeTeamMember(context, team.id, member.userId);
      await refreshMembers();
      onMembersChanged?.();
    } catch (error) {
      setMemberError(error instanceof Error ? error.message : "Não foi possível remover o membro.");
    } finally {
      setRemovingUserId(null);
    }
  }

  function memberDisplayName(member: TeamMember): string {
    return member.userName ?? usersById.get(member.userId) ?? "Usuário";
  }

  return (
    <Modal title={isEdit ? "Editar equipe" : "Nova equipe"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <Field id={FIELD_ID.name} label="Nome da equipe" required value={name} onChange={setName} error={fieldErrors.name} maxLength={120} autoComplete="off" />
          <div>
            <Select id={FIELD_ID.status} label="Situação operacional" value={status} onChange={(event) => setStatus(event.target.value)}>
              {TEAM_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div style={fullWidth}>
            <Select id={FIELD_ID.leader} label="Líder" value={leaderUserId} onChange={(event) => setLeaderUserId(event.target.value)}>
              <option value="">Sem líder</option>
              {leaderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {noUsersLoaded ? <small style={hintStyle}>Não foi possível carregar os usuários da organização. Selecione um líder mais tarde.</small> : null}
          </div>

          {isEdit ? (
            <div style={fullWidth}>
              <Checkbox label="Equipe ativa" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            </div>
          ) : null}

          <label className="ui-field" style={fullWidth}>
            <span>Observações</span>
            <textarea
              id={FIELD_ID.notes}
              className="ui-input"
              style={{ minHeight: 92, padding: "var(--space-10)", resize: "vertical" }}
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              aria-invalid={fieldErrors.notes ? true : undefined}
              aria-describedby={fieldErrors.notes ? `${FIELD_ID.notes}-error` : undefined}
            />
            {fieldErrors.notes ? (
              <small className="form-error" id={`${FIELD_ID.notes}-error`}>
                {fieldErrors.notes}
              </small>
            ) : null}
          </label>

          {!isEdit ? <p style={{ ...hintStyle, gridColumn: "1 / -1" }}>Salve a equipe para adicionar membros.</p> : null}
        </div>

        {isEdit && team ? (
          <section style={{ marginTop: "var(--space-16)" }}>
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-8)" }}>Membros da equipe</h3>

            {memberError ? (
              <Alert title="Ação não concluída" tone="danger">
                {memberError}
              </Alert>
            ) : null}

            {members.length === 0 ? (
              <p style={hintStyle}>Nenhum membro na equipe ainda.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {members.map((member) => (
                  <li key={member.id} style={memberRowStyle}>
                    <span>
                      <strong>{memberDisplayName(member)}</strong>
                      {member.roleInTeam ? <span style={hintStyle}> — {member.roleInTeam}</span> : null}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={removingUserId === member.userId}
                      aria-label={`Remover ${memberDisplayName(member)} da equipe`}
                      onClick={() => void handleRemoveMember(member)}
                    >
                      <Trash2 size={14} aria-hidden /> Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div style={addMemberRowStyle}>
              <div style={{ flex: "1 1 200px" }}>
                <Select
                  label="Adicionar membro"
                  value={newMemberUserId}
                  disabled={availableUsers.length === 0 || addingMember}
                  onChange={(event) => setNewMemberUserId(event.target.value)}
                >
                  <option value="">Selecione um usuário</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <Input
                  label="Função (opcional)"
                  value={newMemberRole}
                  maxLength={60}
                  disabled={availableUsers.length === 0 || addingMember}
                  onChange={(event) => setNewMemberRole(event.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" disabled={availableUsers.length === 0 || addingMember || !newMemberUserId} onClick={() => void handleAddMember()}>
                <UserPlus size={16} aria-hidden /> {addingMember ? "Adicionando…" : "Adicionar"}
              </Button>
            </div>
            {availableUsers.length === 0 ? (
              <small style={hintStyle}>
                {noUsersLoaded ? "Não foi possível carregar os usuários da organização." : "Todos os usuários já fazem parte da equipe."}
              </small>
            ) : null}
          </section>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar equipe"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  maxLength,
  autoComplete,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly autoComplete?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small className="form-error" id={`${id}-error`}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

function focusField(field: TeamField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
