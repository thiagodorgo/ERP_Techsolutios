import { StatusPill } from "../../../../components/patterns";
import { formatDateTime, monthLabel } from "../cloud-billing.labels";
import { formatCount } from "../cloud-billing.money";
import type { CloudAllocationRunStatus, CloudCostImportStatus } from "../cloud-billing.types";
import { CloseButton, DialogFrame, type DialogProps } from "./dialog.shared";

// B-ASS-10b (T5) · janela "Importações do mês" (plano v2 §4.1.6): os arquivos de custo do mês (só com
// `platform:cloud-costs:read`) e os rateios do mês, inclusive o que ficou em processamento (P-ASS09A-RUN-PRESA, parte de
// tela). O arquivo que vale é o que o servidor usou (`cost.importId`); os outros aparecem como substituídos, e nada é somado.

const IMPORT_STATUS: Readonly<Record<CloudCostImportStatus, readonly [string, string, string]>> = {
  completed: ["Concluída", "#ECFDF5", "#047857"],
  processing: ["Em processamento", "#FFFBEB", "#B45309"],
  pending: ["Na fila", "#FFFBEB", "#B45309"],
  failed: ["Falhou", "#FEF2F2", "#B91C1C"],
};
const RUN_STATUS: Readonly<Record<CloudAllocationRunStatus, readonly [string, string, string]>> = {
  completed: ["Concluído", "#ECFDF5", "#047857"],
  processing: ["Em processamento", "#FFFBEB", "#B45309"],
  pending: ["Na fila", "#FFFBEB", "#B45309"],
  failed: ["Falhou", "#FEF2F2", "#B91C1C"],
  unknown: ["Situação não reconhecida", "#F1F5F9", "#64748B"],
};

export function ImportsDialog({ model, onClose }: DialogProps) {
  const used = model.imports?.find((item) => item.id === model.usedImportId) ?? model.imports?.find((item) => item.status === "completed") ?? null;
  return (
    <DialogFrame title={`Importações de ${monthLabel(model.month)}`} onClose={onClose} footer={<CloseButton onClose={onClose} />} size="lg">
      <div className="cb-dialog__section">Arquivos de custo</div>
      {model.imports === null ? (
        <div className="pat-ab-detail-note">Seu perfil não consulta os arquivos de custo importados.</div>
      ) : model.imports.length ? (
        <table className="cb-dialog__table">
          <thead>
            <tr>
              <th>Importado em</th>
              <th>Linhas</th>
              <th>Moeda</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {model.imports.map((item) => {
              const [label, bg, fg] = item.id === used?.id ? (["Vale no mês", "#ECFDF5", "#047857"] as const) : item.status === "completed" ? (["Substituído", "#F1F5F9", "#64748B"] as const) : IMPORT_STATUS[item.status];
              return (
                <tr key={item.id}>
                  <td>{formatDateTime(item.importedAt ?? item.createdAt)}</td>
                  <td className="pat-mono">{formatCount(item.rowCount)}</td>
                  <td>{item.currency === "USD" ? "dólar" : item.currency === "BRL" ? "real" : item.currency ?? "—"}</td>
                  <td>
                    <StatusPill sm label={label} bg={bg} fg={fg} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="pat-ab-detail-note">Nenhum arquivo importado para este mês.</div>
      )}
      <div className="cb-dialog__section">Rateios</div>
      {model.runs.length ? (
        <table className="cb-dialog__table">
          <thead>
            <tr>
              <th>Iniciado em</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {model.runs.map((run) => {
              const [label, bg, fg] = RUN_STATUS[run.status];
              return (
                <tr key={run.id}>
                  <td>{formatDateTime(run.startedAt ?? run.createdAt)}</td>
                  <td>
                    <StatusPill sm label={run.status === "processing" || run.status === "pending" ? `${label} desde ${formatDateTime(run.startedAt ?? run.createdAt)}` : label} bg={bg} fg={fg} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="pat-ab-detail-note">Nenhum rateio neste mês.</div>
      )}
    </DialogFrame>
  );
}
