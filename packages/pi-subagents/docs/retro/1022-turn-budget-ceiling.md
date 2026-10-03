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

## Stage: Implementation — TDD (2026-10-03T22:54:00Z)

### Session summary

All 10 plan steps landed as separate commits: two Tidy-First preparations (`resumeTurnLoop` returning a `TurnLoopResult`, realistic turn-event fixtures), the `TurnBudgetTracker`, the breaking ceiling plus `graceTurns` → `wrapUpTurns`, the wording, the live budget, the fresh resume budget, the removal of `turnCount`/`maxTurns`, the minimum of 2 with warnings, and docs.
The pi-subagents suite went from 2003 to 2030 tests; `check`, root `lint`, `fallow dead-code`, and `verify:public-types` are green.

### Observations

- Deviation (step 9): no load-time `console.warn` for agent-frontmatter `max_turns: 1`.
  `AgentTypeRegistry.reload()` re-runs `loadCustomAgents` on every spawn (`agent-tool.ts`), so a loader warning would repeat on every spawn of any agent; the spawn note (`buildMinimumTurnsNote`) reads the resolved value, so it covers a frontmatter-sourced 1 on the tool path.
- Deviation (step 7): `completeResume` tears the workspace down for an exhausted resume even when the child asked another question, mirroring `completeRun`'s `aborted` handling; pinned by a test added beyond the plan.
- Deviation (step 5): the aborted detail reads "turn limit reached, output may be incomplete" (matching the tool result's "Aborted (turn limit reached)") instead of the plan's "stopped at its turn limit".
- Deviation (step 9): the `SpawnOptions.maxTurns` JSDoc first said 0 falls back to the agent's limit; `runTurnLoop` uses `??`, so 0 means unlimited, and the JSDoc was corrected before commit.
- Step 5's wording mutation killed 3 tests, not one per carrier: the wording is pinned at the shared renderer (`outcome-delivery.test.ts`, both presentations) and the pull carrier; the nudge and foreground carriers call the same renderer.
- Mutations beyond the plan, each killed: the `turnOutcome` `failed`/`ranTools` mappings (step 4), the relocated foreground `turnBudget` read (step 8, new test), the resume's stored limits (step 7), and the two state tests whose red came only from the missing `setTurnBudget` (step 6).
- One test expectation I wrote was wrong (step 7): a resume whose second turn answered without tools stays `within`, because the tracker defers the warning past a no-tools turn; the code was right.
- The `config/` fallow zone may not import `lifecycle/`, which also ruled out sharing `MIN_MAX_TURNS` with the frontmatter loader.
- Pre-completion reviewer: WARN.
  Reviewer warnings: a service-spawned agent whose frontmatter sets `max_turns: 1` is raised to 2 with no signal (the spawn note is tool-path only), short of the plan's "warning at every source" goal; also noted, harmless: a warned, completed resume with a question holds its workspace, where `completeRun` would tear a warned run down.

[#1021]: https://github.com/gotgenes/pi-packages/issues/1021
[#1025]: https://github.com/gotgenes/pi-packages/issues/1025
