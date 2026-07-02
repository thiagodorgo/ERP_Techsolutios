import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Relatórios" (sc reports · tela genérica de lista). Alvo: ERP Web.dc.html.

const ROWS: TableRow[] = [
  { cells: [{ kind: "strong", text: "Produtividade de campo", flex: 2.2 }, { kind: "text", text: "Operações", flex: 1.3 }, { kind: "text", text: "hoje 06:00", flex: 1.3 }, { kind: "chip", text: "Pronto", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "strong", text: "Fluxo de caixa mensal", flex: 2.2 }, { kind: "text", text: "Financeiro", flex: 1.3 }, { kind: "text", text: "hoje 06:00", flex: 1.3 }, { kind: "chip", text: "Pronto", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "strong", text: "Giro de estoque", flex: 2.2 }, { kind: "text", text: "Inventário", flex: 1.3 }, { kind: "text", text: "ontem 23:30", flex: 1.3 }, { kind: "chip", text: "Pronto", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "strong", text: "SLA de atendimento", flex: 2.2 }, { kind: "text", text: "Operações", flex: 1.3 }, { kind: "text", text: "processando", flex: 1.3 }, { kind: "chip", text: "Gerando", ...CH.warn, flex: 1.1 }] },
  { cells: [{ kind: "strong", text: "Conciliação NF-e", flex: 2.2 }, { kind: "text", text: "Financeiro", flex: 1.3 }, { kind: "text", text: "hoje 02:10", flex: 1.3 }, { kind: "chip", text: "Falhou", ...CH.err, flex: 1.1 }] },
];

export function ReportsPage() {
  return (
    <TablePage
      title="Relatórios"
      subtitle="central de relatórios, agendamentos e downloads"
      actionLabel="Gerar relatório"
      searchPlaceholder="Buscar relatório…"
      kpis={[
        { label: "No catálogo", value: "24", color: "#2563EB" },
        { label: "Agendados", value: "6", color: "#7C3AED" },
        { label: "Gerados (mês)", value: "148", color: "#059669" },
        { label: "Falhas", value: "1", color: "#DC2626" },
      ]}
      columns={[{ label: "RELATÓRIO", flex: 2.2 }, { label: "DOMÍNIO", flex: 1.3 }, { label: "ÚLTIMA EXECUÇÃO", flex: 1.3 }, { label: "STATUS", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default ReportsPage;
