---
issue: 1005
issue_title: "pi-permission-model-judge: assistant-message test fixture fails to typecheck against Pi 0.99.2 (`JsonObject` arguments)"
---

# Retro: #1005 — pi-permission-model-judge: assistant-message test fixture fails to typecheck against Pi 0.99.2 (`JsonObject` arguments)

## Stage: Planning (2026-10-03T02:34:54Z)

### Session summary

Planned a one-step, test-only fix: annotate `assistantToolCall`'s and `completeReporting`'s `args` as `ToolCall["arguments"]`.
A reverted spike (scratch bump to Pi 1.0.0) measured the result: `tsc` is clean and 69/69 tests pass at both 0.84.4 and 1.0.0.

### Observations

- The issue's suggested fix is incomplete: changing only the fixture moves the error to `test/model-review.test.ts(29,46)` (`TS2345`), because `completeReporting` forwards a `Record<string, unknown>`.
  The plan changes both in one commit.
- The pinned 0.84.4 types `arguments` as `Record<string, any>`, so the red/green signal exists only under a scratch bump, and the plan's TDD step spells out that bump and how to restore it.
- No `ask_user` gate: the issue is the operator's own, and the only deviation is a strict superset needed to meet the issue's stated goal.
- The Tidy-First assessor recommended no preparatory commits.
  It rejected `Parameters<typeof assistantToolCall>[0]` and a shared alias as indirection over two uses.
- Test-only `test:` commit, so `next-version.sh` should print nothing for this package at ship time.
