---
issue: 1022
issue_title: "pi-subagents: make maxTurns a true ceiling with a budget warning tracked as running state"
---

# Retro: #1022 — pi-subagents: make maxTurns a true ceiling with a budget warning tracked as running state

## Stage: Planning (2026-10-03T22:17:56Z)

### Session summary

Planned the tail of release batch "turn-budget" (after [#1021]): `maxTurns` becomes the ceiling, `graceTurns` is replaced by `wrapUpTurns` (default 2), a `TurnBudgetTracker` owns counting and the warn/stop decisions, and `turnBudget` becomes live running state replacing the top-level `turnCount`/`maxTurns`.
The plan has 10 steps (two Tidy-First preparations, the tracker, the breaking ceiling, wording, live state, fresh resume budget, field removal, the minimum of 2 with warnings, docs).
Filed [#1025] for event/channel consolidation.

### Observations

- Pi facts read from the pinned 1.0.0 compiled sources (not run): a steer queued at `turn_end` forces another turn even after a no-tools final answer; `sendCustomMessage(…, { triggerTurn: false })` during a run is flushed at `turn_end` (Pi `240eb29c4`, v0.84.4) and never forces a turn; errored responses emit `turn_end`; `turn_start` follows `prepareNextTurn` and the steering poll.
  This made the custom message the warning channel, which resolved the issue's open question about a warning forcing an extra turn; the operator asked whether it is a modern Pi mechanism (yes) and wants the package modernized against the current SDK generally.
- Operator decisions: custom-message delivery; fresh budget per resume; `wrapUpTurns` default 2; a `max_turns`/`defaultMaxTurns` below 2 runs with 2 **with a warning** (the operator rejected silent clamping after first accepting it); a persisted `graceTurns` warns to migrate.
- The phase-transition event was dropped from this issue: the operator judged the package's channel-per-event design wrong for an event bus (`pi.events` is exact-match, no wildcard), so consolidation plus the budget-warned event moved to [#1025].
  I also raised ADR 0005's "no vacant hooks" stance as a reason not to add a channel without a named consumer.
- Design choices not gated: warn only on a tool-running turn at or past `warnAt` (so no dangling warning after a final answer); stop at `turn_end` of the ceiling turn only when tools ran, plus a `turn_start` backstop for steer-forced turns; `turnBudget` present on unlimited runs with `maxTurns` absent; displays show turns used (0-based), shifting the widget number by one from today's 1-based current turn.
- Tidy-First assessor (sonnet): accepted the realistic `turn_end`/`turn_start` fixture prep (step 2) and the `resumeTurnLoop` → `TurnLoopResult` prep (step 1); declined a shared details fixture (five distinct per-file builders); flagged the 4 tests using `maxTurns: 1` (re-derived: 4 lines).
  The `graceTurns` rename was folded into the ceiling step rather than pre-landed, since a pure key rename is user-observable; 87 test lines (measured).
- No open improvement phase, so `roadmap-fit` exited for [#1025].
- Third-party PR #1024 edits the widget files this plan touches; whichever lands second rebases.

[#1021]: https://github.com/gotgenes/pi-packages/issues/1021
[#1025]: https://github.com/gotgenes/pi-packages/issues/1025
