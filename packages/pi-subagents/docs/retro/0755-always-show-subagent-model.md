---
issue: 755
issue_title: "pi-subagents: always display model name in subagent stats bar and get_subagent_result report"
---

# Retro: #755 — pi-subagents: always display model name in subagent stats bar and get_subagent_result report

## Stage: Planning (2026-09-30T19:08:54Z)

### Session summary

Planned #755 (third-party, beilo) with #998 (operator's own) folded in at the operator's request, since both rewrite the same `modelName` expression in `resolveSpawnConfig`.
The plan is four steps: a `refactor:` removing dead `modelName` copies, then three `feat:` steps (spawn-time `provider/id` label always shown, live `record.model` stamped in `buildDetails`/`streamUpdate`, and a `Model:` line plus collapsed-row model in `get_subagent_result`).

### Observations

- Operator decisions at the gate: build both issues; source the label from the live `record.model` (matches the #954 widget, reflects failover) with the spawn-resolved model as fallback; put `Model: <provider/id>` on its own line after the `Type: … | Status: …` line.
- Classified non-breaking (display-only `feat:`); no config, default, or `SubagentRecord` change.
- The tidy-first assessor found `presentation.modelName` is also unread (the design summary had named only `AgentInvocation.modelName`), and that `get-result-renderer.ts` has its own private `renderStats`, distinct from `result-renderer.ts`'s.
  Both corrections are in the plan.
- `Co-authored-by: beilo <19225489+beilo@users.noreply.github.com>` is recorded for the `feat:` steps; ship should close both #755 and #998.
- `modelLabel` lands in step 2 with its first caller rather than as a caller-less refactor.

#### Deferred tidyings

- `src/tools/get-result-tool.ts`: `buildReport` and `buildGetResultDetails` duplicate about 8 record-to-stats field mappings; the change widens it by one line each; the shapes diverge deliberately, so it was left alone.

## Stage: Implementation — TDD (2026-09-30T22:12:10Z)

### Session summary

All four plan steps landed as separate commits: the `refactor:` dropping the unread `modelName` copies, then three `feat:` steps (spawn-time `provider/id` label, live `record.model` in `buildDetails`/`streamUpdate`, and the `get_subagent_result` `Model:` line plus collapsed-row model).
The pi-subagents suite went from 1876 to 1889 tests.

### Observations

- Every killing mutation the plan named turned its tests red, with the predicted counts.
- Two tests stayed green during Red, as pins of existing behavior: `buildDetails`' spawn-label fallback and `get_subagent_result`'s "names no model while unknown".
  Each was confirmed against its own class mutation: dropping the `?? base.modelName` fallback, and rendering the `Model:` line unconditionally.
- A minor deviation from the plan: `test/tools/result-renderer.test.ts`'s `"haiku"` fixtures were updated to `anthropic/claude-haiku-4-5`, which the plan listed as optional.
- The pre-commit Biome hook reformatted `test/tools/foreground-runner.test.ts` on the step 3 commit; re-staged and committed with the same message.
- The streaming test uses `objectContaining` on `onUpdate`'s details, with a comment explaining why: the details also carry a spinner frame and a wall-clock duration.
- Pre-completion reviewer: PASS.
  It noted that it did not load the `testing` skill, so the `test/` mock-convention spot-check was not done.
