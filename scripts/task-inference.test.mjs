import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTitleFromQuickLog,
  inferFromQuickLog,
} from "../src/lib/utils/task-inference.ts";

describe("task inference", () => {
  it("extracts duration and unplanned done status from past-tense log", () => {
    const result = inferFromQuickLog("Just finished 25min yoga");
    assert.equal(result.status, "done");
    assert.equal(result.isPlanned, false);
    assert.equal(result.durationMinutes, 25);
  });

  it("marks planned future work", () => {
    const result = inferFromQuickLog("Need to plan Q3 content calendar for 2 hours");
    assert.equal(result.status, "todo");
    assert.equal(result.isPlanned, true);
    assert.equal(result.durationMinutes, 120);
  });

  it("builds a short title from the first line", () => {
    assert.equal(
      buildTitleFromQuickLog("Just finished yoga\nMore detail here"),
      "Just finished yoga",
    );
  });
});