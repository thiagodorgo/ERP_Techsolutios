import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { importAwsCurCostFile, type ImportAwsCurCostFileInput } from "./aws-cur.importer.js";

export const AWS_CUR_IMPORT_COST_FILE_JOB = "aws-cur.import-cost-file" as const;

export function createAwsCurImportCostFileJobHandler(): JobHandler<ImportAwsCurCostFileInput> {
  return async (payload) => {
    await importAwsCurCostFile(payload);
  };
}
