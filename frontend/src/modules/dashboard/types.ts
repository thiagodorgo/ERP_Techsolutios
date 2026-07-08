export type OperationalKpi = {
  id: string;
  label: string;
  value: string;
  // Rótulo descritivo do card (ex.: "no período"). Nunca um percentual
  // fabricado: quando não há base de comparação real, use rótulo ou omita.
  delta?: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

export type OperationalAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "danger";
  workOrderId?: string;
};
