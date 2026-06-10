import { Badge } from "../../../../components/ui";
import { getDispatchPriorityLabel, getDispatchPriorityTone } from "../dispatches.adapter";
import type { DispatchPriority } from "../dispatches.types";

export function DispatchPriorityBadge({ priority }: { readonly priority: DispatchPriority }) {
  return <Badge tone={getDispatchPriorityTone(priority)}>{getDispatchPriorityLabel(priority)}</Badge>;
}
