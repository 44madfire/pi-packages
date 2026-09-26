---
issue: 980
issue_title: "pi-permission-system: do not synthesize <tools> and <rules> when Pi uses a custom system prompt"
---

# Retro: #980 — pi-permission-system: do not synthesize <tools> and <rules> when Pi uses a custom system prompt

## Stage: Planning (2026-09-26T03:18:54Z)

### Session summary

Planned a root-only stand-aside: when Pi builds the prompt from `customPrompt` and the node is not a detected subagent child, `AgentPrepHandler` skips `renderToolSurface` and hands `event.systemPrompt` to the skill filter unchanged.
Children and Pi-default sessions keep today's behavior; the change is breaking (`feat(pi-permission-system)!:`) because `docs/configuration.md` documents the appended block.
Plan committed at `packages/pi-permission-system/docs/plans/0980-custom-prompt-without-tool-surface.md` (two steps: one `feat!` cycle, one docs commit).

### Observations

- **Third-party issue; the proposed one-liner is the same one #919 rejected.**
  Every `@gotgenes/pi-subagents` child is a `customPrompt` session (re-verified: `create-subagent-session.ts:251` → pinned `resource-loader.js:329` → `agent-session.js:645`; Pi `main` `agent-session.ts:1389`), so branching on `customPrompt` alone strips every child's tool prose. #919's Non-Goals had named "reported again as a problem in its own right" as the reopen condition; this issue met it.
- **The discriminator already existed.**
  `SubagentDetector.isSubagent(ctx)` (registry → env hints → session dir) is the package's single node-role owner; both of its error directions land on an existing behavior (a misread root keeps today's block; an undetected child gets Pi-native no-list), so the predicate carries a low burden.
- **Gate decisions.**
  Direction: stand aside at the root, keep the block in children (recommended option taken).
  No opt-in setting to restore the block.
  The operator asked whether a user could suppress the block in children too; the answer was that a child cannot see its root's `customPrompt`, so it needs a cross-node signal or a config switch.
  The operator chose to wait for user feedback and **not** file an issue.
- **Tidy-First's one Recommended step was folded, not sequenced.**
  The `makeSetup` detector seam cannot precede the constructor parameter it feeds, and an injected-but-unread dependency risks Biome's unused-private-member rule, so it lands inside the `feat!` step.
  The assessor declined reshaping the constructor into a deps object, since siblings (`SessionLifecycleHandler`, seven params) are positional.
- **Credit.**
  The plan's step 1 carries `Co-authored-by:` for both tonybro233 (#980) and yofriadi (#919), whose `customPrompt` branch is the mechanism adopted with a child guard.
- **Open PR #908** (OMP prompt arrays) touches the same two files; not a close target, will need a rebase.

#### Deferred tidyings

- `src/handlers/before-agent-start.ts` — reshaping `AgentPrepHandler`'s positional constructor into a deps object; declined as inconsistent with its positional siblings.
