/**
 * turn-limits.test.ts
 *
 * Tests for normalizeMaxTurns — the pure turn-limit helper extracted from
 * agent-runner.ts into its own focused home (issue #265).
 *
 * The setter/getter behaviour (clamping, unlimited-marker) is also exercised by:
 *   - test/runtime.test.ts — instance isolation and defaults
 *   - test/lifecycle/subagent-session.test.ts — turn-loop limit integration
 */
import { describe, expect, it } from "vitest";
import { normalizeMaxTurns, type TurnBudgetPhase, wrappedUpAtTurnLimit } from "#src/lifecycle/turn-limits";

describe("normalizeMaxTurns", () => {
  it("treats undefined as unlimited", () => {
    expect(normalizeMaxTurns(undefined)).toBeUndefined();
  });

  it("treats 0 as unlimited", () => {
    expect(normalizeMaxTurns(0)).toBeUndefined();
  });

  it("keeps positive values", () => {
    expect(normalizeMaxTurns(7)).toBe(7);
  });

  it("clamps negative values to 1", () => {
    expect(normalizeMaxTurns(-3)).toBe(1);
  });

  it("accepts boundary value 1", () => {
    expect(normalizeMaxTurns(1)).toBe(1);
  });

  it("handles large values unchanged", () => {
    expect(normalizeMaxTurns(10_000)).toBe(10_000);
  });
});

describe("wrappedUpAtTurnLimit", () => {
  const statuses = ["queued", "running", "completed", "aborted", "stopped", "error"] as const;
  const phases: TurnBudgetPhase[] = ["within", "warned", "exhausted"];

  for (const status of statuses) {
    for (const phase of phases) {
      const expected = status === "completed" && phase === "warned";
      it(`is ${expected} for ${status} with phase ${phase}`, () => {
        expect(wrappedUpAtTurnLimit({ status, turnBudget: { maxTurns: 2, used: 3, phase } })).toBe(expected);
      });
    }

    it(`is false for ${status} with no budget`, () => {
      expect(wrappedUpAtTurnLimit({ status })).toBe(false);
    });
  }
});
