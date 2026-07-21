// Ω4C PR-02 — barrel do módulo "Contas a Pagar por origem" (toggle compartilhado PayableToggle).
export { PayableToggle, PayableCreateToggle, PayableEditToggle, PayableToggleView, validatePayableForm } from "./components/PayableToggle";
export type { PayableToggleProps } from "./components/PayableToggle";
export { usePayableSource } from "./usePayableSource";
export { getPayableForSource, launchPayable, removePayable, adaptPayableTitle } from "./payable-source.service";
export type {
  PayableSourceModule,
  PayableSourceApiContext,
  PayableSourceData,
  PayableSourceSource,
  PayableTitleView,
  PayableLaunchBody,
} from "./payable-source.types";
export { emptyPayableSource } from "./payable-source.types";
