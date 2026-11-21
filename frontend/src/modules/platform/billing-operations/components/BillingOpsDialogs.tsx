import type { Row } from "../billing-ops.state";
import type { Payment, Provider, QueueLine } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { CredentialDialog } from "./CredentialDialog";
import { EnableDialog } from "./EnableDialog";
import { DisableDialog, ProviderSettingsDialog } from "./ProviderDialogs";
import { ConfirmCancelledDialog, ResolveQueueDialog, RetryQueueDialog } from "./QueueDialogs";
import { ReversePaymentDialog } from "./ReversePaymentDialog";
import { CancelChargeDialog, CancelUnknownChargeDialog, ChargeDialog, InvoiceDialog, PaymentDialog } from "./StatementDialogs";

// B-ASS-10c-OPERACAO — a janela aberta da tela. Uma por vez; cada uma recebe a LINHA (organização + demonstrativo) ou o
// provedor que abriu, e devolve `onDone` para a tela reler o que mudou (R-RELE).

export type DialogAction =
  | { readonly kind: "charge"; readonly row: Row }
  | { readonly kind: "cancel"; readonly row: Row }
  | { readonly kind: "cancel-unknown"; readonly row: Row }
  | { readonly kind: "payment"; readonly row: Row }
  | { readonly kind: "reverse"; readonly row: Row; readonly payment: Payment }
  | { readonly kind: "invoice"; readonly row: Row }
  | { readonly kind: "resolve"; readonly row: Row; readonly line: QueueLine }
  | { readonly kind: "retry"; readonly row: Row; readonly line: QueueLine }
  | { readonly kind: "confirm-cancelled"; readonly row: Row; readonly line: QueueLine }
  | { readonly kind: "provider-settings"; readonly provider: Provider }
  | { readonly kind: "credential"; readonly provider: Provider; readonly webhook: boolean }
  | { readonly kind: "enable"; readonly provider: Provider }
  | { readonly kind: "disable"; readonly provider: Provider };

type Props = {
  readonly dialog: DialogAction | null;
  readonly actions: BillingOpsActions;
  readonly today: string;
  readonly channelOff: boolean | null;
  readonly invoiceOff: boolean | null;
  readonly serverOff: boolean | null;
  readonly onClose: () => void;
  /** Depois de uma escrita num demonstrativo: relê a organização e o demonstrativo. */
  readonly onStatementDone: (row: Row) => void;
  /** Depois de uma escrita no canal: relê os provedores. */
  readonly onProviderDone: () => void;
  readonly onSeeChannel: () => void;
  readonly onOpen: (dialog: DialogAction) => void;
};

export function BillingOpsDialogs({ dialog, actions, today, channelOff, invoiceOff, serverOff, onClose, onStatementDone, onProviderDone, onSeeChannel, onOpen }: Props) {
  if (!dialog) return null;
  if (dialog.kind === "provider-settings") return <ProviderSettingsDialog provider={dialog.provider} actions={actions} onClose={onClose} onDone={onProviderDone} />;
  if (dialog.kind === "credential") return <CredentialDialog provider={dialog.provider} webhook={dialog.webhook} actions={actions} onClose={onClose} onDone={onProviderDone} />;
  if (dialog.kind === "enable") return <EnableDialog provider={dialog.provider} actions={actions} serverOff={serverOff} now={new Date()} onClose={onClose} onDone={onProviderDone} />;
  if (dialog.kind === "disable") return <DisableDialog provider={dialog.provider} actions={actions} onClose={onClose} onDone={onProviderDone} />;
  const row = dialog.row;
  const base = {
    row,
    actions,
    today,
    channelOff,
    invoiceOff,
    onClose,
    onDone: () => onStatementDone(row),
    onSeeChannel,
    onCancelCharge: () => onOpen({ kind: "cancel", row }),
  };
  switch (dialog.kind) {
    case "charge":
      return <ChargeDialog {...base} />;
    case "cancel":
      return <CancelChargeDialog {...base} />;
    case "cancel-unknown":
      return <CancelUnknownChargeDialog {...base} />;
    case "payment":
      return <PaymentDialog {...base} />;
    case "reverse":
      return <ReversePaymentDialog {...base} payment={dialog.payment} />;
    case "invoice":
      return <InvoiceDialog {...base} />;
    case "resolve":
      return <ResolveQueueDialog {...base} line={dialog.line} />;
    case "retry":
      return <RetryQueueDialog {...base} line={dialog.line} />;
    case "confirm-cancelled":
      return <ConfirmCancelledDialog {...base} line={dialog.line} />;
  }
}
