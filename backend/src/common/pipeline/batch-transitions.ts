import { BatchStatus } from "../enums";

/**
 * Declarative state machine for ImportBatch (SPEC §5.2).
 * Legality of a stage transition is a table lookup — there are intentionally no
 * `if (status === ...)` chains. Worker-driven transitions run the pipeline;
 * operator-driven ones are exposed via the HTTP transition endpoint.
 */
export type BatchAction =
  | "start_parse"
  | "parse_ok"
  | "parse_fail"
  | "start_normalize"
  | "to_review"
  | "auto_complete"
  | "normalize_fail"
  | "finish_review"
  | "retry";

export type Actor = "worker" | "operator";

export interface BatchTransition {
  action: BatchAction;
  from: BatchStatus;
  to: BatchStatus;
  actor: Actor;
}

const S = BatchStatus;

const ALL_TRANSITIONS: BatchTransition[] = [
  { action: "start_parse", from: S.Uploaded, to: S.Parsing, actor: "worker" },
  { action: "parse_ok", from: S.Parsing, to: S.Parsed, actor: "worker" },
  { action: "parse_fail", from: S.Parsing, to: S.Failed, actor: "worker" },
  { action: "start_normalize", from: S.Parsed, to: S.Normalizing, actor: "worker" },
  { action: "to_review", from: S.Normalizing, to: S.NeedsReview, actor: "worker" },
  { action: "auto_complete", from: S.Normalizing, to: S.Completed, actor: "worker" },
  { action: "normalize_fail", from: S.Normalizing, to: S.Failed, actor: "worker" },
  { action: "finish_review", from: S.NeedsReview, to: S.Completed, actor: "operator" },
  { action: "retry", from: S.Failed, to: S.Uploaded, actor: "operator" },
];

const key = (from: BatchStatus, action: string): string => `${from}:${action}`;

const TABLE = new Map<string, BatchTransition>(
  ALL_TRANSITIONS.map((t) => [key(t.from, t.action), t]),
);

export function getTransition(
  from: BatchStatus,
  action: string,
): BatchTransition | undefined {
  return TABLE.get(key(from, action));
}

export function allowedActions(from: BatchStatus): BatchAction[] {
  return ALL_TRANSITIONS.filter((t) => t.from === from).map((t) => t.action);
}

// Terminal states have no outgoing transitions (derived, not hard-coded).
export const TERMINAL_STATES: ReadonlySet<BatchStatus> = new Set(
  Object.values(S).filter((s) => !ALL_TRANSITIONS.some((t) => t.from === s)),
);
