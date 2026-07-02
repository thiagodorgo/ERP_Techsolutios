import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Operadores de Campo" / Técnicos · Disponibilidade (sc fieldOperators).

const ROWS: TableRow[] = [
  { cells: [{ kind: "two", text: "Carla Mendes", sub: "carla.mendes@…", flex: 2 }, { kind: "text", text: "Técnica de campo", flex: 1.4 }, { kind: "mono", text: "OS-2891", flex: 1.2 }, { kind: "text", text: "há 2 min", flex: 1.4 }, { kind: "chip", text: "Em campo", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "João Reis", sub: "joao.reis@…", flex: 2 }, { kind: "text", text: "Técnico de campo", flex: 1.4 }, { kind: "mono", text: "OS-2892", flex: 1.2 }, { kind: "text", text: "há 5 min", flex: 1.4 }, { kind: "chip", text: "Em campo", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Pedro Anhaia", sub: "pedro.anhaia@…", flex: 2 }, { kind: "text", text: "Guincheiro", flex: 1.4 }, { kind: "text", text: "—", flex: 1.2 }, { kind: "text", text: "há 12 min", flex: 1.4 }, { kind: "chip", text: "Disponível", ...CH.info, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Marcos Vieira", sub: "marcos.vieira@…", flex: 2 }, { kind: "text", text: "Técnico de campo", flex: 1.4 }, { kind: "mono", text: "OS-2884", flex: 1.2 }, { kind: "text", text: "há 1 h", flex: 1.4 }, { kind: "chip", text: "Em pausa", ...CH.warn, flex: 1.1 }] },
];

export function FieldOperatorsPage() {
  return (
    <TablePage
      title="Operadores de Campo"
      subtitle="disponibilidade, localização e carga da equipe de campo"
      actionLabel="Convidar operador"
      searchPlaceholder="Buscar operador…"
      kpis={[
        { label: "Em campo", value: "8", color: "#059669" },
        { label: "Disponíveis", value: "5", color: "#2563EB" },
        { label: "Em pausa", value: "2", color: "#D97706" },
        { label: "Offline", value: "3", color: "#94A3B8" },
      ]}
      columns={[{ label: "OPERADOR", flex: 2 }, { label: "FUNÇÃO", flex: 1.4 }, { label: "OS ATUAL", flex: 1.2 }, { label: "ÚLTIMA POSIÇÃO", flex: 1.4 }, { label: "STATUS", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default FieldOperatorsPage;
