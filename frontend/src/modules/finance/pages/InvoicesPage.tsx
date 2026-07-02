import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Faturas" (sc invoices · tela genérica de lista).

const ROWS: TableRow[] = [
  { cells: [{ kind: "mono", text: "4471", flex: 1.1 }, { kind: "text", text: "Indústria Alfa Ltda", flex: 1.8 }, { kind: "strong", text: "R$ 24.800", flex: 1 }, { kind: "mono", text: "11/06", flex: 1 }, { kind: "chip", text: "Autorizada", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "4470", flex: 1.1 }, { kind: "text", text: "Beta Comércio SA", flex: 1.8 }, { kind: "strong", text: "R$ 12.300", flex: 1 }, { kind: "mono", text: "10/06", flex: 1 }, { kind: "chip", text: "Autorizada", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "4469", flex: 1.1 }, { kind: "text", text: "Delta Tech S.A.", flex: 1.8 }, { kind: "strong", text: "R$ 18.900", flex: 1 }, { kind: "mono", text: "09/06", flex: 1 }, { kind: "chip", text: "Rejeitada", ...CH.err, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "4468", flex: 1.1 }, { kind: "text", text: "Gama Serviços ME", flex: 1.8 }, { kind: "strong", text: "R$ 6.750", flex: 1 }, { kind: "mono", text: "08/06", flex: 1 }, { kind: "chip", text: "Cancelada", ...CH.warn, flex: 1.1 }] },
];

export function InvoicesPage() {
  return (
    <TablePage
      title="Faturas"
      subtitle="emissão, autorização e gestão de notas fiscais"
      actionLabel="Emitir NF-e"
      searchPlaceholder="Buscar fatura…"
      kpis={[
        { label: "Emitidas (mês)", value: "128", color: "#2563EB" },
        { label: "Autorizadas", value: "121", color: "#059669" },
        { label: "Rejeitadas", value: "3", color: "#DC2626" },
        { label: "Canceladas", value: "4", color: "#D97706" },
      ]}
      columns={[{ label: "NF-e", flex: 1.1 }, { label: "DESTINATÁRIO", flex: 1.8 }, { label: "VALOR", flex: 1 }, { label: "EMISSÃO", flex: 1 }, { label: "STATUS", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default InvoicesPage;
