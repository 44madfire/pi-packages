---
issue: 999
issue_title: "mcp_servers prompt section missing when pi-permission-system is enabled"
---

# Retro: #999 — mcp_servers prompt section missing when pi-permission-system is enabled

## Stage: Planning (2026-10-01T21:43:08Z)

### Session summary

Confirmed the cause the operator traced in the issue's comments: `AgentPrepHandler.handle` returns `{ systemPrompt }`, Pi stores it as `forceSystemPrompt`, and builtin:mcp's later `sections` edit never lands.
That cause collides with ADR 0014's relocation, and that ADR's #962 amendment had already rejected the `systemPromptOptions` route.
The operator chose in-place narrowing through the options, which retires the inherited-prefix invariant, and sequenced two prerequisites first: #970 (peer floor raised to `>=1.0.0`, not 0.86) and the newly filed #1009 (pi-subagents cuts `<tools>`/`<rules>` from the inherited identity).

### Observations

- The issue was filed by a third party (`graelo`), but the operator had already commented with a proposed fix; the gate confirmed the direction rather than skipping it.
- In Pi 1.0, mutable options, `sections`, `toolGuidelines`, and the reconciliation that sets an unedited `selectedTools` to `getActiveToolNames()` all arrived in one commit (`9e05370b2`, tagged into `v0.86.0`).
  So on 1.0 a Pi-authored root needs no tool-surface work at all beyond `setActiveTools`.
- Alternatives the operator considered and rejected: "pointer" (override Pi's head `<tools>`/`<rules>` in place with constant text and put the real surface in new tail sections; keeps the prefix but adds mechanism) and "keep forced" (decline).
  A `customPrompt` trick that suppresses Pi's built-ins was rejected without being offered, because other extensions read `customPrompt` (pi-subagents' `portablePrompt`, this package's #980 branch).
- The first `ask_user` bounced on the tool-surface question for lack of context; before/after prompt diagrams for root and child under each option settled it.
  Lead with diagrams when an option's effect is a prompt layout.
- A new residual: a denied skill in a catalogue Pi did not render (an operator's `SYSTEM.md`) is no longer filtered.
  This was decided inline on the #919/#932 precedent and recorded in the plan's Non-Goals; worth confirming at review.
- Breaking classification: `fix:`, not breaking, because ADR 0014 itself says the block's position is not a contract.
  The floor raise is #970's breaking change.
- Release ordering: #1009 (pi-subagents) must be released before this package, or children double-list their tools.
- `pi-subagents` has no open improvement phase, so roadmap-fit exited for #1009.
- Commented on #970 to record the operator's `>=1.0.0` floor decision.
