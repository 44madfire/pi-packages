---
issue: 1015
issue_title: "pi-subagents: a get_subagent_result wait that wakes after a resume starts clears the resume's claim"
---

# Retro: #1015 — pi-subagents: a get_subagent_result wait that wakes after a resume starts clears the resume's claim

## Stage: Planning (2026-10-02T21:42:24Z)

### Session summary

Reproduced the race with a disposable Vitest spike against the real `SubagentManager`, `GetResultTool`, and `NotificationManager`, then planned a five-step fix.
The claim becomes a per-holder handle (`claim(): CarrierClaim`), and `waitUntilSettled` reports `settled`/`unsettled`/`superseded` from a run ordinal plus an outcome retained in `resetForResume`.
The waiter can then report the run it waited for.

### Observations

- The spike found a second symptom in the same window: the waiter reports the resumed run (`running`, no result), and run 1's outcome reaches the parent through no channel, because its nudge was suppressed by the waiter's claim at settle.
  The operator chose to fix both in this issue.
- The issue's stated trigger (two parallel parent tool calls) is unreachable.
  The window is pure microtasks: measured as sync through 6 hops on the background path, with 8+ hops safe.
  The reachable trigger is a cross-extension consumer resuming synchronously from a `subagents:completed` handler (Pi's `EventBus` calls handlers synchronously).
  No in-repo consumer does this.
- The operator chose a holder set over a run-generation check, because the holder set also covers an abandoned waiter clearing a concurrent foreground carrier's claim.
- The operator chose the superseded report shape: run 1's outcome, with the question affordance dropped and a closing "resumed … running again" line.
  The superseded waiter must not `markConsumed`, since consumption is record-wide and would suppress a background resume's nudge.
- The Tidy-First assessor recommended a standalone `release` → `releaseClaims` rename and a `liveOutcome(record)` seam in `get-result-tool.ts`; both are folded in as steps 1–2.

#### Deferred tidyings

- `test/lifecycle/subagent.test.ts`: the `waitUntilSettled` tests inline the "agent plus controllable run promise" setup; a fixture helper is optional if the grid grows.
