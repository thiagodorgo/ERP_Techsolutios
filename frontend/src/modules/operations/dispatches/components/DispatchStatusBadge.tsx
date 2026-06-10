import { Badge } from "../../../../components/ui";
import { getDispatchStatusLabel, getDispatchStatusTone } from "../dispatches.adapter";
import type { DispatchStatus } from "../dispatches.types";

export function DispatchStatusBadge({ status }: { readonly status: DispatchStatus }) {
  return <Badge tone={getDispatchStatusTone(status)}>{getDispatchStatusLabel(status)}</Badge>;
}
