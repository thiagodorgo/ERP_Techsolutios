import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Pagamentos" (sc payments · tela genérica de lista).

const ROWS: TableRow[] = [
  { cells: [{ kind: "mono", text: "PAY-8832", flex: 1.1 }, { kind: "text", text: "Fornecedor Delta", flex: 1.8 }, { kind: "strong", text: "R$ 8.400", flex: 1 }, { kind: "mono", text: "20/06", flex: 1 }, { kind: "chip", text: "Agendado", ...CH.purple, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "PAY-8831", flex: 1.1 }, { kind: "text", text: "Beta Suprimentos", flex: 1.8 }, { kind: "strong", text: "R$ 2.310", flex: 1 }, { kind: "mono", text: "15/06", flex: 1 }, { kind: "chip", text: "Agendado", ...CH.purple, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "PAY-8829", flex: 1.1 }, { kind: "text", text: "Elétrica Sul", flex: 1.8 }, { kind: "strong", text: "R$ 1.180", flex: 1 }, { kind: "mono", text: "13/06", flex: 1 }, { kind: "chip", text: "Vencendo", ...CH.warn, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "PAY-8825", flex: 1.1 }, { kind: "text", text: "TechParts BR", flex: 1.8 }, { kind: "strong", text: "R$ 890", flex: 1 }, { kind: "mono", text: "05/06", flex: 1 }, { kind: "chip", text: "Pago", ...CH.ok, flex: 1.1 }] },
];

export function PaymentsPage() {
  return (
    <TablePage
      title="Pagamentos"
      subtitle="contas a pagar, agendamentos e fluxo de saída"
      actionLabel="Agendar pagamento"
      searchPlaceholder="Buscar pagamento…"
      kpis={[
        { label: "A pagar (30d)", value: "R$ 268k", color: "#2563EB" },
        { label: "Agendados", value: "R$ 142k", color: "#7C3AED" },
        { label: "Pagos (mês)", value: "R$ 311k", color: "#059669" },
        { label: "Vencendo hoje", value: "R$ 8,4k", color: "#D97706" },
      ]}
      columns={[{ label: "DOC", flex: 1.1 }, { label: "FORNECEDOR", flex: 1.8 }, { label: "VALOR", flex: 1 }, { label: "VENC.", flex: 1 }, { label: "STATUS", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default PaymentsPage;
