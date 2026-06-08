import { readFile } from "node:fs/promises";

import type { CloudCostImport } from "./aws-cur.types.js";
import { createDefaultCloudCostService } from "./aws-cur.service.js";

export type ImportAwsCurCostFileInput = {
  readonly sourceType?: "manual_csv" | "mock_fixture";
  readonly sourceUri?: string;
  readonly csv?: string;
  readonly importedBy?: string;
  readonly metadata?: Record<string, unknown>;
};

export async function importAwsCurCostFile(input: ImportAwsCurCostFileInput): Promise<CloudCostImport> {
  const service = await createDefaultCloudCostService();
  const csv = input.csv ?? (input.sourceUri ? await readFile(input.sourceUri, "utf8") : undefined);

  if (!csv) {
    throw new Error("AWS CUR import requires csv content or sourceUri.");
  }

  return service.importAwsCurCsv({
    csv,
    sourceType: input.sourceType ?? (input.sourceUri ? "mock_fixture" : "manual_csv"),
    sourceUri: input.sourceUri,
    importedBy: input.importedBy,
    metadata: input.metadata,
  });
}
