import { Badge } from "../../../components/ui";
import { getWorkOrderStatusLabel, getWorkOrderStatusTone } from "../work-orders.adapter";
import type { WorkOrderStatus } from "../work-orders.types";

export function WorkOrderStatusBadge({ status }: { readonly status: WorkOrderStatus }) {
  return <Badge tone={getWorkOrderStatusTone(status)}>{getWorkOrderStatusLabel(status)}</Badge>;
}
