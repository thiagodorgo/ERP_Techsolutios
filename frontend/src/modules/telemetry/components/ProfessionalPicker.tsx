import { useEffect, useMemo, useState } from "react";

import { Select } from "../../../components/ui";
import { isMockMode } from "../../../config/env";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getOperatorProfileDisplayName } from "../../registry/operator-profiles/operator-profiles.adapter";
import { listOperatorProfilesFromApi } from "../../registry/operator-profiles/operator-profiles.service";

// Ω4C PR-14 — seletor de profissional das telas Quilometragem/Acessos/Recusas (backend exige professionalId,
// 422 professional_required sem ele). Reusa o registry `operator-profiles` (id + fullName). Modo mock →
// lista vazia (D-007). Sem seleção = valor vazio → a tela mostra o estado honesto e NÃO chama o endpoint.

type ProfessionalOption = { readonly id: string; readonly name: string };

export function ProfessionalPicker({ value, onChange }: { value: string; onChange: (professionalId: string) => void }) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [options, setOptions] = useState<ProfessionalOption[]>([]);
  const [loading, setLoading] = useState(!isMockMode());

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  useEffect(() => {
    let active = true;
    if (!activeContext) return undefined;
    setLoading(!isMockMode());
    void listOperatorProfilesFromApi(context, { isActive: "active", limit: 200 }).then((result) => {
      if (!active) return;
      setOptions(
        result.items.map((item) => ({ id: item.id, name: getOperatorProfileDisplayName(item) })).filter((option) => option.name !== "—"),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeContext, context]);

  const placeholder = loading ? "Carregando profissionais…" : "Selecione um profissional";

  return (
    <Select label="Profissional" aria-label="Profissional" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  );
}

export default ProfessionalPicker;
