import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";

import { Alert, Button, Checkbox, Input, Modal, Select } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { listProfilesFromApi } from "../../profiles/profiles.service";
import type { ProfileItem } from "../../profiles/profiles.types";
import { listYardsFromApi } from "../../yards/yards.service";
import type { YardItem } from "../../yards/yards.types";
import { validateProcessCreate } from "../processes.adapter";
import { createProcess } from "../processes.service";
import type { ProcessCreateField, ProcessCreatePayload, ProcessDetail, ProcessesApiContext } from "../processes.types";

// Criação manual MÍNIMA (R3, impound:create): identidade + Autoridade solicitante (req) + Perfil normativo (req)
// + Pátio (opcional). O processo nasce IN_REMOVAL. A entrada guiada rica (vistoria art.9º/14) é o PR-08c. A UI
// só molda/valida; a regra (D-Ω5P-09: não-identificado exige justificativa) é re-checada no backend.
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function NovoProcessoModal({
  context,
  onClose,
  onCreated,
}: {
  readonly context: ProcessesApiContext;
  readonly onClose: () => void;
  readonly onCreated: (created: ProcessDetail | null) => void;
}) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [yards, setYards] = useState<YardItem[]>([]);

  const [profileId, setProfileId] = useState("");
  const [originAuthority, setOriginAuthority] = useState("");
  const [yardId, setYardId] = useState("");
  const [plate, setPlate] = useState("");
  const [unidentified, setUnidentified] = useState(false);
  const [unidentifiedReason, setUnidentifiedReason] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [caseNumber, setCaseNumber] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProcessCreateField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void listProfilesFromApi(context, { limit: 100 }).then((data) => {
      if (active) setProfiles(data.items);
    });
    void listYardsFromApi(context, { limit: 100 }).then((data) => {
      if (active) setYards(data.items);
    });
    return () => {
      active = false;
    };
  }, [context]);

  function buildPayload(): ProcessCreatePayload {
    return {
      profileId,
      originAuthority: originAuthority.trim(),
      yardId: yardId || undefined,
      vehicleUnidentified: unidentified || undefined,
      unidentifiedReason: unidentified ? unidentifiedReason.trim() || undefined : undefined,
      vehiclePlate: !unidentified ? plate.trim() || undefined : undefined,
      legalBasis: legalBasis.trim() || undefined,
      authorityCaseNumber: caseNumber.trim() || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const payload = buildPayload();
    const errors = validateProcessCreate(payload);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<ProcessCreateField, string>>);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const created = await createProcess(context, payload);
      onCreated(created);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerError("Já existe um processo com estes dados nesta organização.");
      } else if (error instanceof ApiError && error.status === 422) {
        setServerError("Dados do processo inválidos. Revise os campos e tente novamente.");
      } else {
        setServerError(error instanceof Error ? error.message : "Não foi possível registrar o processo.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo processo de custódia" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível registrar" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <div style={gridStyle}>
          <div style={fullWidth}>
            <Select label="Perfil normativo *" value={profileId} onChange={(event) => setProfileId(event.target.value)} required aria-invalid={fieldErrors.profileId ? true : undefined}>
              <option value="">Selecione o perfil…</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.scopeLabel}
                </option>
              ))}
            </Select>
            {fieldErrors.profileId ? <small className="form-error">{fieldErrors.profileId}</small> : null}
          </div>

          <div style={fullWidth}>
            <Input
              label="Autoridade solicitante *"
              value={originAuthority}
              maxLength={200}
              onChange={(event) => setOriginAuthority(event.target.value)}
              aria-invalid={fieldErrors.originAuthority ? true : undefined}
              helper="Órgão que originou a solicitação de remoção."
            />
            {fieldErrors.originAuthority ? <small className="form-error">{fieldErrors.originAuthority}</small> : null}
          </div>

          <div style={fullWidth}>
            <Checkbox label="Bem não identificado (sem placa/chassi/RENAVAM legíveis)" checked={unidentified} onChange={(event) => setUnidentified(event.target.checked)} />
          </div>

          {unidentified ? (
            <div style={fullWidth}>
              <Input
                label="Justificativa de não identificação *"
                value={unidentifiedReason}
                maxLength={400}
                onChange={(event) => setUnidentifiedReason(event.target.value)}
                aria-invalid={fieldErrors.unidentifiedReason ? true : undefined}
                helper="Motivo pelo qual o bem não pôde ser identificado (art. 9º)."
              />
              {fieldErrors.unidentifiedReason ? <small className="form-error">{fieldErrors.unidentifiedReason}</small> : null}
            </div>
          ) : (
            <div>
              <Input
                label="Placa"
                value={plate}
                maxLength={10}
                autoComplete="off"
                onChange={(event) => setPlate(event.target.value.toUpperCase())}
                aria-invalid={fieldErrors.vehiclePlate ? true : undefined}
              />
              {fieldErrors.vehiclePlate ? <small className="form-error">{fieldErrors.vehiclePlate}</small> : null}
            </div>
          )}

          <Select label="Pátio (opcional)" value={yardId} onChange={(event) => setYardId(event.target.value)}>
            <option value="">Definir depois</option>
            {yards.map((yard) => (
              <option key={yard.id} value={yard.id}>
                {yard.name}
              </option>
            ))}
          </Select>

          <Input label="Nº do procedimento/auto" value={caseNumber} maxLength={60} autoComplete="off" onChange={(event) => setCaseNumber(event.target.value)} />

          <div style={fullWidth}>
            <Input label="Fundamento legal" value={legalBasis} maxLength={200} autoComplete="off" onChange={(event) => setLegalBasis(event.target.value)} helper="Ex.: CTB art. 271." />
          </div>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Registrando…" : "Registrar processo"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default NovoProcessoModal;
