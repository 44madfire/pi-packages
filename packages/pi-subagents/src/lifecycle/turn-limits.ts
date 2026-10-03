/**
 * turn-limits.ts — Pure turn-limit normalization for subagent execution.
 *
 * Extracted from agent-runner.ts (issue #265) so the turn-counting policy has a
 * focused home independent of session assembly. Consumed by the subagent tool's
 * spawn-config resolution and by the turn loop in SubagentSession.
 */

/** What the harness has done about a run's turn limit, in the order it happens. */
export type TurnBudgetPhase = "within" | "warned" | "exhausted";

/**
 * A run's turn limit and its use. Present only when a limit exists.
 *
 * `phase` is recorded rather than derived from the counts: whether the harness
 * warned or stopped the run is an event, and an agent that answered on its last
 * permitted turn has the same counts as one the harness cut off.
 */
export interface TurnBudget {
  maxTurns: number;
  /** Completed turns. Can exceed `maxTurns` by up to the grace turns. */
  used: number;
  phase: TurnBudgetPhase;
}

/** Normalize max turns. undefined or 0 = unlimited, otherwise minimum 1. */
export function normalizeMaxTurns(n: number | undefined): number | undefined {
  if (n == null || n === 0) return undefined;
  return Math.max(1, n);
}
