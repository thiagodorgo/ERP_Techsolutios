import type { CloudBillingAction } from "../views/cloudBilling.shared";
import { DeleteGroupDialog } from "./DeleteGroupDialog";
import type { DialogProps } from "./dialog.shared";
import { FxRateDialog } from "./FxRateDialog";
import { GroupFormDialog } from "./GroupFormDialog";
import { GroupHistoryDialog } from "./GroupHistoryDialog";
import { GroupMembersDialog } from "./GroupMembersDialog";
import { ImportCostDialog } from "./ImportCostDialog";
import { ImportsDialog } from "./ImportsDialog";
import { MoveGroupDialog } from "./MoveGroupDialog";
import { RunAllocationDialog } from "./RunAllocationDialog";

// B-ASS-10b (T5) — as 10 janelas da tela de custo e margem (plano v2 §4.1.6): importar, rodar, dólar, importações,
// novo grupo, renomear, membros, histórico, excluir e mudar de grupo. A janela de escrita só abre com a própria
// permissão (o botão nem é desenhado sem ela, §6.4.3); a do dólar abre para quem lê, só com o histórico.

export type DialogAction = Exclude<CloudBillingAction, { readonly kind: "open-org" } | { readonly kind: "retry" }>;

export function CloudBillingDialogs({ dialog, ...props }: DialogProps & { readonly dialog: DialogAction | null }) {
  if (!dialog) return null;
  const { access, model } = props;
  switch (dialog.kind) {
    case "import":
      return access.importCosts ? <ImportCostDialog {...props} /> : null;
    case "run":
      return access.runAllocation ? <RunAllocationDialog {...props} /> : null;
    case "fx":
      return <FxRateDialog {...props} />;
    case "imports":
      return <ImportsDialog {...props} />;
    case "group-new":
      return access.manageBilling ? <GroupFormDialog {...props} /> : null;
    case "group-rename": {
      const group = model.groups.find((item) => item.id === dialog.groupId);
      return access.manageBilling ? <GroupFormDialog {...props} groupId={dialog.groupId} initialName={group?.name ?? ""} initialNotes={group?.notes ?? ""} /> : null;
    }
    case "group-members":
      return access.manageBilling ? <GroupMembersDialog {...props} groupId={dialog.groupId} /> : null;
    case "group-history":
      return <GroupHistoryDialog {...props} groupId={dialog.groupId} />;
    case "group-delete":
      return access.manageBilling ? <DeleteGroupDialog {...props} groupId={dialog.groupId} /> : null;
    case "move":
      return access.manageBilling ? <MoveGroupDialog {...props} tenantId={dialog.tenantId} /> : null;
    default:
      return null;
  }
}
