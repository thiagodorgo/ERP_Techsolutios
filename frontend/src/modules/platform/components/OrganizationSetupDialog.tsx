import { Modal } from "../../../components/ui";
import type { PlatformOrganization } from "../platform.types";

export function OrganizationSetupDialog({ organization, onClose }: { readonly organization: PlatformOrganization; readonly onClose: () => void }) {
  return <Modal title={`Concluir cadastro de ${organization.name}`} open onClose={onClose}><p>Cadastro incompleto</p></Modal>;
}
