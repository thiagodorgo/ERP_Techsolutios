import { createDefaultCloudUsageService } from "./cloud-usage.service.js";

export async function aggregateDailyUsage(date = new Date()) {
  const service = await createDefaultCloudUsageService();

  return service.aggregateDailyUsage(date);
}
