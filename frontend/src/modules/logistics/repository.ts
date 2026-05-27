import { mockAssets, mockQueues } from "../../mocks/logistics/logistics";
import { mockWorkOrders } from "../../mocks/work-orders/workOrders";

export async function getLogisticsPanel() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return {
    assets: mockAssets,
    queues: mockQueues,
    workOrders: mockWorkOrders,
  };
}
