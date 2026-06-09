import { Chip } from "../../../../components/ui";
import { getFieldLocationStatusLabel, getFieldLocationStatusTone } from "../operations-map.adapter";
import type { FieldLocationItem, FieldLocationStatus } from "../operations-map.types";

export function OperationsMapStatusBadge({
  status,
  isStale = false,
}: {
  status: FieldLocationStatus;
  isStale?: boolean;
}) {
  return <Chip tone={getFieldLocationStatusTone(status, isStale)}>{isStale ? "Localização antiga" : getFieldLocationStatusLabel(status)}</Chip>;
}

export function OperationsOperatorStatus({ location }: { location: FieldLocationItem }) {
  return <OperationsMapStatusBadge status={location.status} isStale={location.isStale} />;
}
