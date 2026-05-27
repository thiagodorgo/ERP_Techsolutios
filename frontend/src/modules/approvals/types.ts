export type ApprovalRequest = {
  id: string;
  workOrderCode: string;
  requester: string;
  impact: string;
  threshold: string;
  urgency: "normal" | "high" | "critical";
  nextApprover: string;
  state: "requested" | "resolved";
};
