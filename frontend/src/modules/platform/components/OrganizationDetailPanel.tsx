import { useState } from "react";

import { Alert, EmptyState, ErrorState, Skeleton } from "../../../components/ui";
import type { PlatformOrganization } from "../platform.types";
import type { PlatformTenantDetailData } from "../platform-tenant-detail.types";
import { createTenantAdminUser, updatePlatformTenant, updatePlatformTenantStatus } from "../platform.service";
import { usePlatformOrganizationDetail } from "../usePlatformOrganizationDetail";
import { OrganizationAdminDialog } from "./OrganizationAdminDialog";
import { OrganizationEditNameDialog } from "./OrganizationEditNameDialog";
import { OrganizationSetupDialog } from "./OrganizationSetupDialog";
import { OrganizationStatusDialog } from "./OrganizationStatusDialog";

export type OrganizationPanelAction = "edit" | "status" | "admin" | "setup";
type Action = OrganizationPanelAction | null;

export function OrganizationDetailPanelView({ organization, data, returnSearch = "", permissions = [], stale = false, showFullLink = true, onAction = () => undefined }: { readonly organization: PlatformOrganization; readonly data: PlatformTenantDetailData; readonly returnSearch?: string; readonly permissions?: readonly string[]; readonly stale?: boolean; readonly showFullLink?: boolean; readonly onAction?: (action: Exclude<Action, null>) => void }) {
  if (data.forbidden) return <ErrorState title="Acesso não permitido" detail="Seu perfil não consulta o detalhe desta organização." />;
  if (data.notFound) return <EmptyState title="Organização não encontrada" detail="Atualize a lista para conferir as organizações disponíveis." />;
  const detail = data.detail;
  if (!detail) return <Alert title="Não foi possível carregar a organização" tone="warning">Tente novamente. Nenhuma ação está disponível sem uma leitura válida.</Alert>;
  const can = (permission: string) => permissions.includes(permission);
  const actionsAllowed = !organization.system && !stale;
  const enabledModules = detail.modules.filter((item) => item.enabled);
  return (
    <section className="platform-organizations__detail" aria-label={`Detalhes de ${organization.name}`}>
      {stale ? <Alert title="Dados desatualizados" tone="warning">Atualize os dados antes de confirmar uma alteração.</Alert> : null}
      <div className="platform-organizations__detail-head">
        <div><h2>{organization.name}</h2><p>{organization.system ? "Organização de sistema" : organization.group?.name ?? "Sem grupo cadastrado"}</p></div>
        <strong>{detail.subscription === null ? "Sem plano contratado" : detail.subscription.planName}</strong>
      </div>
      <div className="platform-organizations__detail-grid">
        <div><b>Usuários</b>{detail.users.length ? <ul>{detail.users.slice(0, 3).map((user) => <li key={user.email}>{user.name} · {user.status === "active" ? "Ativo" : "Inativo"}</li>)}</ul> : <p>Nenhum usuário cadastrado.</p>}</div>
        <div><b>Módulos habilitados</b>{enabledModules.length ? <ul>{enabledModules.map((module) => <li key={module.key}>{module.label}</li>)}</ul> : <p>Nenhum módulo habilitado.</p>}</div>
      </div>
      <div className="platform-organizations__detail-actions">
        {showFullLink ? <a className="pat-btn" href={`/platform/tenants/${organization.id}${returnSearch}`}>Ver detalhes completos</a> : null}
        {actionsAllowed && can("platform:tenants:update") ? <button type="button" className="pat-btn" onClick={() => onAction("edit")}>Editar nome</button> : null}
        {actionsAllowed && can("platform:tenants:suspend") ? <button type="button" className="pat-btn" onClick={() => onAction("status")}>Alterar situação</button> : null}
        {actionsAllowed && can("platform:users:create_admin") ? <button type="button" className="pat-btn" onClick={() => onAction("admin")}>Criar administrador</button> : null}
        {actionsAllowed && !organization.setup.complete && can("platform:billing:manage") ? <button type="button" className="pat-btn" onClick={() => onAction("setup")}>Concluir cadastro</button> : null}
      </div>
    </section>
  );
}

export function OrganizationDetailPanel({ organization, returnSearch = "", permissions = [], onRefreshList = () => undefined }: { readonly organization: PlatformOrganization; readonly returnSearch?: string; readonly permissions?: readonly string[]; readonly onRefreshList?: () => void }) {
  const state = usePlatformOrganizationDetail(organization.id, organization);
  const [action, setAction] = useState<Action>(null);
  const close = () => setAction(null);
  const done = async () => { close(); await state.refresh(false); onRefreshList(); };
  const openAction = (next: Exclude<Action, null>) => {
    if (next !== "status") { setAction(next); return; }
    void state.refresh(false).then((fresh) => {
      if (fresh.data.source === "api" && fresh.data.detail && !fresh.data.forbidden && !fresh.data.notFound) setAction("status");
    });
  };
  if (state.loading && !state.data.detail) return <div className="platform-organizations__detail"><Skeleton lines={4} /></div>;
  return <>
    <OrganizationDetailPanelView organization={organization} data={state.data} stale={state.stale} returnSearch={returnSearch} permissions={permissions} onAction={openAction} />
    {action === "edit" ? <OrganizationEditNameDialog organization={organization} onClose={close} onConfirm={async (name) => { await updatePlatformTenant(organization.id, { name }); await done(); }} /> : null}
    {action === "status" ? <OrganizationStatusDialog organization={organization} detail={state.data} onClose={close} onConfirm={async (input) => { await updatePlatformTenantStatus(organization.id, input); await done(); }} /> : null}
    {action === "admin" ? <OrganizationAdminDialog organization={organization} onClose={close} onConfirm={async (input) => createTenantAdminUser(organization.id, input)} onDone={() => void done()} /> : null}
    {action === "setup" ? <OrganizationSetupDialog organization={organization} permissions={permissions} onClose={close} /> : null}
  </>;
}
