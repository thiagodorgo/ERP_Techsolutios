export type OperationalKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

export type OperationalAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "danger";
  workOrderId?: string;
};
