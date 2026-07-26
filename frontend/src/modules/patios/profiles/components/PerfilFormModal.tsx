import { Plus, Trash2 } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { validateProfileName } from "../profiles.adapter";
import { createProfile, FEDERAL_RELEASE_REQUIREMENTS, fetchJurisdictionDefaults, resolveLocalDefaults, updateProfile } from "../profiles.service";
import type {
  DailyCap,
  DailyModel,
  ProfileCreatePayload,
  ProfileDetail,
  ProfileScope,
  ProfileUpdatePayload,
  ProfilesApiContext,
  ReleaseRequirement,
} from "../profiles.types";

const SCOPE_OPTIONS: readonly { value: ProfileScope; label: string }[] = [
  { value: "PUBLIC_AGREEMENT", label: "Convênio público" },
  { value: "PRIVATE_CONTRACT", label: "Contrato privado" },
];

const DAILY_MODEL_OPTIONS: readonly { value: DailyModel; label: string }[] = [
  { value: "ROLLING_24H", label: "24 horas corridas" },
  { value: "CALENDAR", label: "Dia-calendário" },
];

const DAILY_CAP_OPTIONS: readonly { value: DailyCap; label: string }[] = [
  { value: "SIX_MONTHS", label: "6 meses (art. 271 §10)" },
  { value: "THIRTY_DAYS_LEGACY", label: "30 diárias (Tema 124)" },
  { value: "UNLIMITED", label: "Ilimitado (contratual)" },
];

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const reqRowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px auto auto", gap: 8, alignItems: "center", marginBottom: 8 };
const sectionTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 800, color: "#0F172A", margin: "var(--space-16) 0 var(--space-8)" };

export function PerfilFormModal({
  profile,
  context,
  onClose,
  onSaved,
}: {
  readonly profile: ProfileDetail | null;
  readonly context: ProfilesApiContext;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const isEdit = Boolean(profile);
  const initialScope: ProfileScope = profile?.scope ?? "PUBLIC_AGREEMENT";
  const initialDefaults = resolveLocalDefaults(initialScope);

  const [name, setName] = useState(profile?.name ?? "");
  const [scope, setScope] = useState<ProfileScope>(initialScope);
  const [ownerNotifDays, setOwnerNotifDays] = useState(String(profile?.ownerNotifDays ?? initialDefaults.ownerNotifDays));
  const [noticeEdictDay, setNoticeEdictDay] = useState(String(profile?.noticeEdictDay ?? initialDefaults.noticeEdictDay));
  const [auctionEligibleDay, setAuctionEligibleDay] = useState(String(profile?.auctionEligibleDay ?? initialDefaults.auctionEligibleDay));
  const [auctionEdictBusinessDays, setAuctionEdictBusinessDays] = useState(String(profile?.auctionEdictBusinessDays ?? initialDefaults.auctionEdictBusinessDays));
  const [dailyModel, setDailyModel] = useState<DailyModel>(profile?.dailyModel ?? initialDefaults.dailyModel);
  const [dailyCap, setDailyCap] = useState<DailyCap>(profile?.dailyCap ?? initialDefaults.dailyCap);
  const [requirements, setRequirements] = useState<ReleaseRequirement[]>(profile?.releaseRequirements ?? []);
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [active, setActive] = useState(profile?.active ?? true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ao escolher o Escopo num perfil NOVO, consome GET /jurisdiction-defaults?scope= e pré-preenche prazos/modelo/teto.
  async function handleScopeChange(next: ProfileScope) {
    setScope(next);
    if (isEdit) return;
    const defaults = await fetchJurisdictionDefaults(context, next);
    setOwnerNotifDays(String(defaults.ownerNotifDays));
    setNoticeEdictDay(String(defaults.noticeEdictDay));
    setAuctionEligibleDay(String(defaults.auctionEligibleDay));
    setAuctionEdictBusinessDays(String(defaults.auctionEdictBusinessDays));
    setDailyModel(defaults.dailyModel);
    setDailyCap(defaults.dailyCap);
  }

  function updateRequirement(index: number, patch: Partial<ReleaseRequirement>) {
    setRequirements((current) => current.map((requirement, position) => (position === index ? { ...requirement, ...patch } : requirement)));
  }

  function toInt(value: string): number | undefined {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  function cleanRequirements(): ReleaseRequirement[] {
    return requirements
      .map((requirement) => ({ code: requirement.code.trim(), label: requirement.label.trim(), required: requirement.required }))
      .filter((requirement) => requirement.code && requirement.label);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const error = validateProfileName(name);
    if (!isEdit && error) {
      setNameError(error);
      return;
    }
    setNameError(null);

    setSaving(true);
    try {
      const shared = {
        scope,
        ownerNotifDays: toInt(ownerNotifDays),
        noticeEdictDay: toInt(noticeEdictDay),
        auctionEligibleDay: toInt(auctionEligibleDay),
        auctionEdictBusinessDays: toInt(auctionEdictBusinessDays),
        dailyModel,
        dailyCap,
        releaseRequirements: cleanRequirements(),
        notes: notes.trim() || undefined,
      };

      if (isEdit && profile) {
        // Nome é chave natural IMUTÁVEL — fica FORA do payload de edição (lição veto B2).
        const patch: ProfileUpdatePayload = { ...shared, active };
        await updateProfile(context, profile.id, patch);
      } else {
        const payload: ProfileCreatePayload = { name: name.trim(), ...shared };
        await createProfile(context, payload);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError("Já existe um perfil normativo com este nome nesta organização. Informe outro nome.");
      } else {
        setServerError(err instanceof Error ? err.message : "Não foi possível salvar o perfil normativo.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar perfil normativo" : "Novo perfil normativo"} open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Input
              id="perfil-field-name"
              label="Nome *"
              value={name}
              maxLength={160}
              autoComplete="off"
              disabled={isEdit}
              helper={isEdit ? "Fixo após a criação — o nome identifica o perfil na organização." : "Ex.: Convênio Estadual · Contrato Pátio Norte"}
              aria-invalid={nameError ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError ? <small className="form-error">{nameError}</small> : null}
          </div>

          <Select id="perfil-field-scope" label="Escopo" value={scope} onChange={(event) => void handleScopeChange(event.target.value as ProfileScope)}>
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select id="perfil-field-daily-model" label="Modelo de diária" value={dailyModel} onChange={(event) => setDailyModel(event.target.value as DailyModel)}>
            {DAILY_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select id="perfil-field-daily-cap" label="Teto de estada" value={dailyCap} onChange={(event) => setDailyCap(event.target.value as DailyCap)}>
            {DAILY_CAP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <p style={sectionTitleStyle}>Prazos legais (dias)</p>
        <div style={gridStyle}>
          <NumberField id="perfil-field-owner-notif" label="Notificação ao proprietário" value={ownerNotifDays} onChange={setOwnerNotifDays} helper="Res. 1025 art. 15" />
          <NumberField id="perfil-field-notice-edict" label="Edital complementar" value={noticeEdictDay} onChange={setNoticeEdictDay} helper="Res. 1025 art. 26" />
          <NumberField id="perfil-field-auction-eligible" label="Elegível a leilão" value={auctionEligibleDay} onChange={setAuctionEligibleDay} helper="CTB art. 328 / Res. 1025 art. 25" />
          <NumberField id="perfil-field-auction-edict" label="Edital do leilão (dias úteis)" value={auctionEdictBusinessDays} onChange={setAuctionEdictBusinessDays} helper="Lei 14.133/2021" />
        </div>

        <p style={sectionTitleStyle}>Exigências de liberação</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <Button type="button" size="sm" variant="secondary" onClick={() => setRequirements([...FEDERAL_RELEASE_REQUIREMENTS])}>
            Usar baseline federal
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setRequirements((current) => [...current, { code: "", label: "", required: true }])}>
            <Plus size={13} aria-hidden /> Adicionar exigência
          </Button>
        </div>
        {requirements.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: "0 0 var(--space-8)" }}>
            Nenhuma exigência definida. Os documentos variam por órgão — use o baseline federal ou adicione as suas.
          </p>
        ) : (
          requirements.map((requirement, index) => (
            <div key={index} style={reqRowStyle}>
              <input
                className="ui-input"
                aria-label={`Descrição da exigência ${index + 1}`}
                placeholder="Descrição (ex.: Comprovante de propriedade)"
                value={requirement.label}
                maxLength={160}
                onChange={(event) => updateRequirement(index, { label: event.target.value })}
              />
              <input
                className="ui-input"
                aria-label={`Código da exigência ${index + 1}`}
                placeholder="CÓDIGO"
                value={requirement.code}
                maxLength={60}
                onChange={(event) => updateRequirement(index, { code: event.target.value.toUpperCase() })}
              />
              <Checkbox label="Obrigatória" checked={requirement.required} onChange={(event) => updateRequirement(index, { required: event.target.checked })} />
              <Button type="button" size="sm" variant="ghost" aria-label={`Remover a exigência ${index + 1}`} onClick={() => setRequirements((current) => current.filter((_, position) => position !== index))}>
                <Trash2 size={13} aria-hidden />
              </Button>
            </div>
          ))
        )}

        <label className="ui-field" style={{ ...fullWidth, marginTop: "var(--space-12)" }}>
          <span>Observações</span>
          <textarea
            id="perfil-field-notes"
            className="ui-input"
            style={{ minHeight: 72, padding: "var(--space-10)", resize: "vertical" }}
            rows={2}
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {isEdit ? (
          <div style={{ marginTop: "var(--space-12)" }}>
            <Checkbox label="Perfil ativo" checked={active} onChange={(event) => setActive(event.target.checked)} />
          </div>
        ) : null}

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar perfil"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly helper?: string;
}) {
  return (
    <Input id={id} label={label} value={value} inputMode="numeric" maxLength={4} helper={helper} onChange={(event) => onChange(event.target.value)} />
  );
}
