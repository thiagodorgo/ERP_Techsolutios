export type LogisticsAsset = {
  id: string;
  label: string;
  team: string;
  vehicle: string;
  status: "available" | "assigned" | "in_service" | "blocked";
  location: string;
  load: number;
};

export type DispatchQueue = {
  id: string;
  title: string;
  count: number;
  risk: "normal" | "attention" | "critical";
  items: string[];
};
