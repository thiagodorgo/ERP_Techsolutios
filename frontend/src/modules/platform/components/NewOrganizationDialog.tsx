import { useCallback, useEffect, useMemo, useState } from "react";

import { Modal, StepList } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { createPlatformTenant, createTenantAdminUser, getPlatformTenantById, listPlatformEconomicGroups, listPlatformPlans } from "../platform.service";
import type { CreatePlatformOrganizationResult, CreateTenantInput, PlatformCatalogPlan, PlatformEconomicGroup, PlatformOrganization, PlatformPlan } from "../platform.types";
import { OrganizationSetupDialog } from "./OrganizationSetupDialog";
import { OrganizationAdminDialog } from "./OrganizationAdminDialog";

type CatalogState = "loading" | "ready" | "forbidden" | "error";

export function pendingProvisioningSteps(result: CreatePlatformOrganizationResult): string[] {
  return (["profile", "subscription", "admin"] as const).filter((key) => result.provisioning[key].status !== "done");
}

export function NewOrganizationResultView({ result, onClose, permissions = [] }: { readonly result: CreatePlatformOrganizationResult; readonly onClose: () => void; readonly permissions?: readonly string[] }) {
  const [copied, setCopied] = useState(false);
  const [setup, setSetup] = useState<"plan" | "profile" | null>(null);
  const [admin, setAdmin] = useState(false);
  const [organization, setOrganization] = useState<PlatformOrganization | null>(null);
  const pending = pendingProvisioningSteps(result);
  const refreshOrganization = useCallback(async () => {
    const fresh = await getPlatformTenantById(result.organization.id);
    setOrganization(fresh);
  }, [result.organization.id]);
  useEffect(() => { void refreshOrganization().catch(() => undefined); }, [refreshOrganization]);
  async function copyPassword() {
    if (!result.temporaryPassword || !globalThis.navigator?.clipboard?.writeText) return;
    await globalThis.navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
  }
  if (setup && organization) return <OrganizationSetupDialog organization={organization} item={setup} permissions={permissions} onClose={() => setSetup(null)} onChanged={async () => { await refreshOrganization(); setSetup(null); }} />;
  if (admin && organization) return <OrganizationAdminDialog organization={organization} onClose={() => setAdmin(false)} onConfirm={(input) => createTenantAdminUser(organization.id, input)} onDone={() => { setAdmin(false); void refreshOrganization(); }} />;
  return <>
    <div className="ui-alert ui-alert--info"><strong>Organização criada.</strong> Os complementos abaixo refletem o retorno real da provisão.</div>
    <ul>{(["group", "profile", "subscription", "admin"] as const).map((key) => <li key={key}>{key === "group" ? "Grupo" : key === "profile" ? "Dados da empresa" : key === "subscription" ? "Plano" : "Administrador"}: {result.provisioning[key].status === "done" ? "Concluído" : result.provisioning[key].status === "failed" ? "Falhou" : "Pendente"}</li>)}</ul>
    {result.temporaryPassword ? <div className="platform-organizations__temporary-password"><p>A senha provisória aparece somente agora.</p><code aria-label="Senha provisória">{result.temporaryPassword}</code><button type="button" className="pat-btn" onClick={() => void copyPassword()}>{copied ? "Copiada" : "Copiar"}</button></div> : null}
    <div className="platform-organizations__dialog-actions">
      {organization?.setup.missing.includes("plan") && permissions.includes("platform:billing:manage") && permissions.includes("platform:billing:read") ? <button type="button" className="pat-btn pat-btn--primary" onClick={() => setSetup("plan")}>Escolher plano</button> : null}
      {organization?.setup.missing.includes("profile") && permissions.includes("platform:billing:manage") && permissions.includes("platform:billing:read") ? <button type="button" className="pat-btn pat-btn--primary" onClick={() => setSetup("profile")}>Preencher</button> : null}
      {organization?.setup.missing.includes("admin") && permissions.includes("platform:users:create_admin") ? <button type="button" className="pat-btn pat-btn--primary" onClick={() => setAdmin(true)}>Criar administrador</button> : null}
      <button type="button" className="pat-btn" onClick={onClose}>Fechar</button>
    </div>
  </>;
}

export function NewOrganizationDialog({ onClose, onCreated, groups: suppliedGroups, plans: suppliedPlans, permissions = [] }: { readonly onClose: () => void; readonly onCreated: () => void; readonly groups?: readonly PlatformEconomicGroup[]; readonly plans?: readonly PlatformCatalogPlan[]; readonly permissions?: readonly string[] }) {
  const [step, setStep] = useState(0);
  const [groups, setGroups] = useState<readonly PlatformEconomicGroup[]>(suppliedGroups ?? []);
  const [plans, setPlans] = useState<readonly PlatformCatalogPlan[]>(suppliedPlans ?? []);
  const [groupState, setGroupState] = useState<CatalogState>(suppliedGroups ? "ready" : "loading");
  const [planState, setPlanState] = useState<CatalogState>(suppliedPlans ? "ready" : "loading");
  const [groupMode, setGroupMode] = useState<"existing" | "new">("existing");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [planCode, setPlanCode] = useState<PlatformPlan | "">("");
  const [withAdmin, setWithAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatePlatformOrganizationResult | null>(null);

  useEffect(() => {
    if (!suppliedGroups) void listPlatformEconomicGroups().then((value) => { setGroups(value); setGroupState("ready"); }).catch((item: unknown) => setGroupState(item instanceof ApiError && item.status === 403 ? "forbidden" : "error"));
    if (!suppliedPlans) void listPlatformPlans().then((value) => { setPlans(value.filter((plan) => plan.active && plan.currentVersion)); setPlanState("ready"); }).catch((item: unknown) => setPlanState(item instanceof ApiError && item.status === 403 ? "forbidden" : "error"));
  }, [suppliedGroups, suppliedPlans]);

  const validGroup = groupMode === "existing" ? Boolean(groupId) : Boolean(groupName.trim());
  const validAdmin = !withAdmin || (Boolean(adminName.trim()) && Boolean(adminEmail.trim()));
  const canSubmit = validGroup && Boolean(name.trim()) && validAdmin && !sending;
  const canEditSteps = !sending;
  const input = useMemo<CreateTenantInput | null>(() => canSubmit ? {
    name: name.trim(),
    group: groupMode === "existing" ? { id: groupId } : { name: groupName.trim() },
    ...(planCode ? { plan: { code: planCode } } : {}),
    ...(withAdmin ? { admin: { name: adminName.trim(), email: adminEmail.trim() } } : {}),
  } : null, [adminEmail, adminName, canSubmit, groupId, groupMode, groupName, name, planCode, withAdmin]);

  async function create() {
    if (!input || sending) return;
    setSending(true); setError(null);
    try { const created = await createPlatformTenant(input); setResult(created); onCreated(); }
    catch (item) { setError(item instanceof ApiError && item.status === 409 ? "Já existe uma organização com esse nome dentro do grupo escolhido." : "Não foi possível criar a organização. Revise os dados e tente novamente."); setSending(false); }
  }

  function goToStep(index: number) {
    if (!canEditSteps) return;
    setStep(index);
  }

  const stepNames = ["Grupo (matriz)", "Filial", "Plano", "Administrador"] as const;
  const stepBodies = [
    <section key="group"><p>Obrigatório.</p><h3>Grupo obrigatório</h3><label><input type="radio" checked={groupMode === "existing"} onChange={() => setGroupMode("existing")} />Grupo existente</label><label><input type="radio" checked={groupMode === "new"} onChange={() => setGroupMode("new")} />Novo grupo</label>{groupMode === "existing" ? <label className="ui-field"><span>Grupo</span><select className="ui-input" value={groupId} onChange={(event) => setGroupId(event.currentTarget.value)} disabled={groupState !== "ready"}><option value="">Selecione</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : <label className="ui-field"><span>Nome do novo grupo</span><input className="ui-input" value={groupName} onChange={(event) => setGroupName(event.currentTarget.value)} /></label>}{groupState === "loading" ? <p>Carregando grupos…</p> : groupState === "forbidden" ? <p>Seu perfil não consulta grupos existentes. Ainda é possível criar um novo grupo.</p> : groupState === "error" ? <p>Não foi possível carregar os grupos.</p> : groups.length === 0 ? <p>Nenhum grupo existente.</p> : null}</section>,
    <section key="organization"><p>Obrigatório.</p><h3>Organização</h3><label className="ui-field"><span>Nome da organização</span><input className="ui-input" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={160} /></label><p>O nome precisa ser único somente dentro do grupo escolhido.</p></section>,
    <section key="plan"><h3>Plano opcional</h3><label className="ui-field"><span>Plano</span><select className="ui-input" value={planCode} onChange={(event) => setPlanCode(event.currentTarget.value as PlatformPlan | "")} disabled={planState !== "ready"}><option value="">Concluir depois</option>{plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name}</option>)}</select></label>{planState === "loading" ? <p>Carregando planos…</p> : planState === "forbidden" ? <p>Seu perfil não consulta planos. A organização pode ser criada sem plano.</p> : planState === "error" ? <p>Não foi possível carregar os planos. A organização pode ser criada sem plano.</p> : plans.length === 0 ? <p>Nenhum plano ativo disponível.</p> : null}</section>,
    <section key="admin"><h3>Administrador</h3><label><input type="checkbox" checked={withAdmin} onChange={(event) => setWithAdmin(event.currentTarget.checked)} />Criar já com o perfil Administrador</label>{withAdmin ? <><label className="ui-field"><span>Nome</span><input className="ui-input" value={adminName} onChange={(event) => setAdminName(event.currentTarget.value)} /></label><label className="ui-field"><span>E-mail</span><input className="ui-input" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.currentTarget.value)} /></label></> : <p>O administrador pode ser criado depois.</p>}</section>,
  ] as const;

  return <Modal title="Nova organização" open onClose={onClose} size="lg">
    {result ? <NewOrganizationResultView result={result} onClose={onClose} permissions={permissions} /> : <>
      <StepList label="Criação da organização" steps={stepNames.map((name, index) => ({
        key: name,
        state: index < step ? "done" : index === step ? "current" : "future",
        heading: `Etapa ${index + 1} de 4 · ${name}`,
        doneLabel: index < step ? "feito" : undefined,
        futureNote: index >= 2 ? "pode ficar para depois" : undefined,
        futureTitle: name,
        action: index < step ? <button type="button" className="ui-steps__action" disabled={!canEditSteps} onClick={() => goToStep(index)}>Alterar</button> : undefined,
        children: stepBodies[index],
      }))} />
      {error ? <div role="alert" className="form-error">{error}</div> : null}
      <div className="platform-organizations__dialog-actions"><button type="button" className="pat-btn" onClick={onClose}>Cancelar</button>{step > 0 ? <button type="button" className="pat-btn" disabled={sending} onClick={() => goToStep(step - 1)}>Voltar</button> : null}{step < 3 ? <button type="button" className="pat-btn pat-btn--primary" onClick={() => goToStep(step + 1)}>Continuar</button> : <button type="button" className="pat-btn pat-btn--primary" disabled={!canSubmit} onClick={() => void create()}>{sending ? "Criando…" : "Criar organização"}</button>}</div>
    </>}
  </Modal>;
}
