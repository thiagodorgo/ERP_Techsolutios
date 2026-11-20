import { ERROR_TEXT } from "../billing-ops.errors";
import type { QueueLine } from "../billing-ops.types";

// B-ASS-10c-OPERACAO — o motivo de uma linha da fila em português. O `lastError` do servidor pode ser um código ou um texto
// técnico do provedor: só o código conhecido vira texto da lista fechada; o resto vira a frase padrão da situação (nunca o
// texto cru, §11.2). Leitura do dev, declarada no diário.

export function queueReason(line: QueueLine): string {
  const code = line.lastError?.trim() ?? "";
  if (code && Object.prototype.hasOwnProperty.call(ERROR_TEXT, code)) return ERROR_TEXT[code]!;
  if (line.status === "NEEDS_REVIEW") {
    return line.kind === "charge_cancel"
      ? "O cancelamento não teve resposta clara do provedor. Se a cobrança já foi cancelada no painel dele, confirme aqui com o código."
      : "O envio não teve resposta clara do provedor e espera revisão.";
  }
  return "O provedor recusou o envio. Reprocesse depois de conferir o motivo no painel do provedor.";
}
