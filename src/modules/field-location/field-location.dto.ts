import type { FieldOperatorLocation } from "./field-location.types.js";

export function toFieldOperatorLocationDto(location: FieldOperatorLocation) {
  return {
    id: location.id,
    operatorUserId: location.operatorUserId,
    source: location.source,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters,
    headingDegrees: location.headingDegrees,
    speedMetersPerSecond: location.speedMetersPerSecond,
    batteryLevel: location.batteryLevel,
    recordedAt: location.recordedAt.toISOString(),
    receivedAt: location.receivedAt.toISOString(),
    operator: location.operator,
  };
}
