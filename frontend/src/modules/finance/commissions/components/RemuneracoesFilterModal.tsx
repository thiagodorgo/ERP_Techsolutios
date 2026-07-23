import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Button, Input, Modal, Select } from "../../../../components/ui";
import type { OperatorProfileItem } from "../../../registry/operator-profiles/operator-profiles.types";
import type { ConferenceProfessional } from "../commissions.types";

// Ω4C PR-10 (D-Ω4C-REM-MODAL, RN-REM-08) — filtro-modal-ao-entrar, EXCLUSIVO da tela Remunerações (as demais
// telas mantêm o filtro padrão do ERP). Ao abrir a página, este modal pede Período + Profissional antes de
// carregar a conferência — fidelidade COMPORTAMENTAL ao AutEM (ANALISE:234), não visual. §3 PT-BR
// "Profissional/Período"; §2.8: o select lista Profissionais só por NOME (nunca CNH).

const sectionStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-6)", marginBottom: "var(--space-14)" };
const sectionTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" };
const periodRowStyle: CSSProperties = { display: "flex", gap: "var(--space-8)", flexWrap: "wrap" };
const dateFieldStyle: CSSProperties = { minWidth: 150, flex: 1 };
const hintStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

export function RemuneracoesFilterModal({
  open,
  operatorProfiles,
  initialFrom,
  initialTo,
  initialProfileId,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly operatorProfiles: readonly OperatorProfileItem[];
  readonly initialFrom: string;
  readonly initialTo: string;
  readonly initialProfileId: string;
  readonly onClose: () => void;
  readonly onConfirm: (selection: { from: string; to: string; professional: ConferenceProfessional }) => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [profileId, setProfileId] = useState(initialProfileId);

  const selectedProfile = useMemo(
    () => operatorProfiles.find((profile) => profile.id === profileId) ?? null,
    [operatorProfiles, profileId],
  );

  // §7 sem profissional válido → confirmação bloqueada (o profissional é obrigatório).
  const canConfirm = Boolean(selectedProfile && selectedProfile.userId);

  function handleConfirm() {
    if (!selectedProfile || !selectedProfile.userId) return;
    onConfirm({
      from,
      to,
      professional: {
        profileId: selectedProfile.id,
        userId: selectedProfile.userId,
        name: selectedProfile.fullName?.trim() || "Profissional",
      },
    });
  }

  return (
    <Modal title="Conferir remunerações" open={open} onClose={onClose}>
      <p style={hintStyle}>Selecione o período e o profissional para conferir e liquidar as remunerações.</p>

      <div style={{ marginTop: "var(--space-14)" }}>
        <div style={sectionStyle}>
          <span style={sectionTitleStyle}>Período</span>
          <div style={periodRowStyle}>
            <div style={dateFieldStyle}>
              <Input label="De" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Início do período" />
            </div>
            <div style={dateFieldStyle}>
              <Input label="Até" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Fim do período" />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <span style={sectionTitleStyle}>Profissional</span>
          <Select
            label="Profissional"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            aria-label="Selecionar profissional"
          >
            <option value="">Selecione um profissional…</option>
            {operatorProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName?.trim() || "Profissional"}
              </option>
            ))}
          </Select>
          {operatorProfiles.length === 0 ? (
            <span style={hintStyle}>Nenhum profissional cadastrado nesta organização.</span>
          ) : null}
        </div>
      </div>

      <footer style={footerStyle}>
        <Button type="button" variant="ghost" onClick={onClose}>
          Voltar
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
          Confirmar
        </Button>
      </footer>
    </Modal>
  );
}

export default RemuneracoesFilterModal;
