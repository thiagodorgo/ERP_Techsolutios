import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateChecklistRunDto } from "../src/modules/checklists/checklist.validator.js";

test("parseCreateChecklistRunDto derives relatedEntityType/relatedEntityId from workOrderId when absent", () => {
  const parsed = parseCreateChecklistRunDto({
    checklistId: "checklist_1",
    workOrderId: "os_123",
  });

  assert.equal(parsed.relatedEntityType, "work_order");
  assert.equal(parsed.relatedEntityId, "os_123");
});

test("parseCreateChecklistRunDto keeps explicit relatedEntityType/relatedEntityId even when workOrderId is also sent", () => {
  const parsed = parseCreateChecklistRunDto({
    checklistId: "checklist_1",
    workOrderId: "os_123",
    relatedEntityType: "impound_process",
    relatedEntityId: "impound_456",
  });

  assert.equal(parsed.relatedEntityType, "impound_process");
  assert.equal(parsed.relatedEntityId, "impound_456");
});

test("parseCreateChecklistRunDto leaves relatedEntityType/relatedEntityId undefined without workOrderId or explicit fields", () => {
  const parsed = parseCreateChecklistRunDto({
    checklistId: "checklist_1",
  });

  assert.equal(parsed.relatedEntityType, undefined);
  assert.equal(parsed.relatedEntityId, undefined);
});

test("parseCreateChecklistRunDto treats blank/empty workOrderId as absent", () => {
  const emptyString = parseCreateChecklistRunDto({
    checklistId: "checklist_1",
    workOrderId: "",
  });
  assert.equal(emptyString.relatedEntityType, undefined);
  assert.equal(emptyString.relatedEntityId, undefined);

  const whitespaceOnly = parseCreateChecklistRunDto({
    checklistId: "checklist_1",
    workOrderId: "   ",
  });
  assert.equal(whitespaceOnly.relatedEntityType, undefined);
  assert.equal(whitespaceOnly.relatedEntityId, undefined);
});

test("parseCreateChecklistRunDto still accepts templateId alias and empty answers by default", () => {
  const parsed = parseCreateChecklistRunDto({
    templateId: "checklist_1",
    workOrderId: "os_999",
  });

  assert.equal(parsed.checklistId, "checklist_1");
  assert.equal(parsed.relatedEntityType, "work_order");
  assert.equal(parsed.relatedEntityId, "os_999");
  assert.deepEqual(parsed.answers, []);
});
