/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL) — TOAST de alocação bottom-center (estilo verbatim do protótipo:
 * verde rgba(22,101,52,0.92), borda rgba(74,222,128,0.4), texto #dcfce7, some sozinho). A COPY é
 * a adaptada por honestidade (D-007/J-MAPAS-7, divergência 7 registrada):
 * "✓ {código} alocada para {nome} — ~{Y} min (estimado, sem trânsito) · ~{X} km (linha reta)"
 * — o "chegada estimada em" do protótipo é PROIBIDO pela regra ETA-honesto. Erros REAIS do
 * backend (404/409/422 traduzidos) usam a variante vermelha — feedback nunca fabricado.
 *
 * A11y: região viva não-agressiva (role=status/aria-live=polite); sempre presente no DOM.
 */
export function OperationsAllocationToast({
  message,
  tone = "success",
}: {
  readonly message: string | null;
  readonly tone?: "success" | "error";
}) {
  return (
    <div
      className={`opmap-toast${message ? " show" : ""}`}
      data-tone={tone}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
