import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Usuários" (sc users · tela genérica de lista). Alvo: ERP Web.dc.html.

const ROWS: TableRow[] = [
  { cells: [{ kind: "two", text: "Rafael Souza", sub: "rafael.souza@techsolutions.com.br", flex: 2.2 }, { kind: "text", text: "Gestor de operações", flex: 1.4 }, { kind: "text", text: "hoje 08:12", flex: 1.3 }, { kind: "chip", text: "Ativo", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Beatriz Lima", sub: "beatriz.lima@techsolutions.com.br", flex: 2.2 }, { kind: "text", text: "Financeiro", flex: 1.4 }, { kind: "text", text: "hoje 07:50", flex: 1.3 }, { kind: "chip", text: "Ativo", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Carla Mendes", sub: "carla.mendes@techsolutions.com.br", flex: 2.2 }, { kind: "text", text: "Técnica de campo", flex: 1.4 }, { kind: "text", text: "hoje 09:31", flex: 1.3 }, { kind: "chip", text: "Ativo", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Novo Operador", sub: "convite@techsolutions.com.br", flex: 2.2 }, { kind: "text", text: "Técnico de campo", flex: 1.4 }, { kind: "text", text: "—", flex: 1.3 }, { kind: "chip", text: "Convidado", ...CH.warn, flex: 1.1 }] },
  { cells: [{ kind: "two", text: "Lucas Prado", sub: "lucas.prado@techsolutions.com.br", flex: 2.2 }, { kind: "text", text: "Almoxarife", flex: 1.4 }, { kind: "text", text: "há 9 dias", flex: 1.3 }, { kind: "chip", text: "Suspenso", ...CH.err, flex: 1.1 }] },
];

export function UsersPage() {
  return (
    <TablePage
      title="Usuários"
      subtitle="gestão de acesso, papéis e permissões"
      actionLabel="Novo usuário"
      searchPlaceholder="Buscar usuário…"
      kpis={[
        { label: "Ativos", value: "138", color: "#059669" },
        { label: "Convidados", value: "6", color: "#D97706" },
        { label: "Suspensos", value: "4", color: "#DC2626" },
        { label: "Papéis", value: "7", color: "#2563EB" },
      ]}
      columns={[{ label: "USUÁRIO", flex: 2.2 }, { label: "PAPEL", flex: 1.4 }, { label: "ÚLTIMO ACESSO", flex: 1.3 }, { label: "STATUS", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default UsersPage;
