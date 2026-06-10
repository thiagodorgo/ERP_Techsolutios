import { Badge } from "../../../components/ui";
import { getWorkOrderPriorityLabel, getWorkOrderPriorityTone } from "../work-orders.adapter";
import type { WorkOrderPriority } from "../work-orders.types";

export function WorkOrderPriorityBadge({ priority }: { readonly priority: WorkOrderPriority }) {
  return <Badge tone={getWorkOrderPriorityTone(priority)}>{getWorkOrderPriorityLabel(priority)}</Badge>;
}
