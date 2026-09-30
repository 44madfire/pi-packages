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
