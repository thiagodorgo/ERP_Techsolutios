import { CH, TablePage, type TableRow } from "../../../components/TablePage";

// "Auditoria" da organização (sc auditTenant · tela genérica de lista).

const ROWS: TableRow[] = [
  { cells: [{ kind: "mono", text: "13/06 09:31", flex: 1.2 }, { kind: "text", text: "Carla Mendes", flex: 1.6 }, { kind: "text", text: "Concluiu OS-2891", flex: 2.2 }, { kind: "chip", text: "OK", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "13/06 09:05", flex: 1.2 }, { kind: "text", text: "Bruno Lima", flex: 1.6 }, { kind: "text", text: "Criou PC-0231", flex: 2.2 }, { kind: "chip", text: "OK", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "13/06 08:58", flex: 1.2 }, { kind: "text", text: "Helena Castro", flex: 1.6 }, { kind: "text", text: "Publicou checklist v4", flex: 2.2 }, { kind: "chip", text: "OK", ...CH.ok, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "13/06 08:40", flex: 1.2 }, { kind: "text", text: "user:desconhecido", flex: 1.6 }, { kind: "text", text: "Tentativa de acesso a área restrita", flex: 2.2 }, { kind: "chip", text: "Negado", ...CH.err, flex: 1.1 }] },
  { cells: [{ kind: "mono", text: "13/06 08:12", flex: 1.2 }, { kind: "text", text: "Rafael Souza", flex: 1.6 }, { kind: "text", text: "Aprovou APR-0039", flex: 2.2 }, { kind: "chip", text: "OK", ...CH.ok, flex: 1.1 }] },
];

export function AuditTenantPage() {
  return (
    <TablePage
      title="Auditoria"
      subtitle="trilha de eventos e auditoria da organização"
      actionLabel="Exportar CSV"
      searchPlaceholder="Buscar evento…"
      kpis={[
        { label: "Eventos (24h)", value: "312", color: "#2563EB" },
        { label: "Logins", value: "84", color: "#059669" },
        { label: "Alterações", value: "41", color: "#D97706" },
        { label: "Negados", value: "5", color: "#DC2626" },
      ]}
      columns={[{ label: "QUANDO", flex: 1.2 }, { label: "ATOR", flex: 1.6 }, { label: "AÇÃO", flex: 2.2 }, { label: "RESULTADO", flex: 1.1 }]}
      rows={ROWS}
    />
  );
}

export default AuditTenantPage;
