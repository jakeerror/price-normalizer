import { BatchStatus } from "../enums";
import {
  BatchAction,
  TERMINAL_STATES,
  allowedActions,
  getTransition,
} from "./batch-transitions";

describe("batch transition table", () => {
  const expected: Array<[BatchStatus, BatchAction, BatchStatus]> = [
    [BatchStatus.Uploaded, "start_parse", BatchStatus.Parsing],
    [BatchStatus.Parsing, "parse_ok", BatchStatus.Parsed],
    [BatchStatus.Parsing, "parse_fail", BatchStatus.Failed],
    [BatchStatus.Parsed, "start_normalize", BatchStatus.Normalizing],
    [BatchStatus.Normalizing, "to_review", BatchStatus.NeedsReview],
    [BatchStatus.Normalizing, "auto_complete", BatchStatus.Completed],
    [BatchStatus.Normalizing, "normalize_fail", BatchStatus.Failed],
    [BatchStatus.NeedsReview, "finish_review", BatchStatus.Completed],
    [BatchStatus.Failed, "retry", BatchStatus.Uploaded],
  ];

  it.each(expected)("%s --%s--> %s is allowed", (from, action, to) => {
    expect(getTransition(from, action)?.to).toBe(to);
  });

  const illegal: Array<[BatchStatus, string]> = [
    [BatchStatus.Uploaded, "finish_review"], // skipping the pipeline
    [BatchStatus.Uploaded, "auto_complete"], // jumping to the end
    [BatchStatus.Completed, "retry"], // out of a terminal state
    [BatchStatus.Failed, "start_parse"], // wrong action from failed
    [BatchStatus.Parsed, "to_review"], // must normalize first
    [BatchStatus.NeedsReview, "start_parse"],
    [BatchStatus.Uploaded, "nonexistent"],
  ];

  it.each(illegal)("%s --%s--> is NOT allowed", (from, action) => {
    expect(getTransition(from, action)).toBeUndefined();
  });

  it("derives terminal states (only completed; failed is recoverable via retry)", () => {
    expect(TERMINAL_STATES).toEqual(new Set([BatchStatus.Completed]));
  });

  it("lists outgoing actions for needs_review", () => {
    expect(allowedActions(BatchStatus.NeedsReview)).toEqual(["finish_review"]);
  });

  it("completed has no outgoing transitions; failed can only retry", () => {
    expect(allowedActions(BatchStatus.Completed)).toEqual([]);
    expect(allowedActions(BatchStatus.Failed)).toEqual(["retry"]);
  });

  it("finish_review / retry are operator-driven; the rest worker-driven", () => {
    expect(getTransition(BatchStatus.NeedsReview, "finish_review")?.actor).toBe(
      "operator",
    );
    expect(getTransition(BatchStatus.Failed, "retry")?.actor).toBe("operator");
    expect(getTransition(BatchStatus.Uploaded, "start_parse")?.actor).toBe(
      "worker",
    );
  });
});
