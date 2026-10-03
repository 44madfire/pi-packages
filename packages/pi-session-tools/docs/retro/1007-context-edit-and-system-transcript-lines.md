---
issue: 1007
issue_title: "pi-session-tools: transcripts drop `context_edit` entries, so omitted messages read as live context"
---

# Retro: #1007 — pi-session-tools: transcripts drop `context_edit` entries, so omitted messages read as live context

## Stage: Planning (2026-10-03T04:31:37Z)

### Session summary

I planned a five-step change: two preparatory refactors (`messageOf`/`toolCallIdsOf` helpers, then a `TurnLedger` that owns turn numbering and id → label facts), a `fix` adding `[context edit]` lines, a `fix` adding `[system]` lines, and a docs step for the README and package skill.
Pi's `ContextEditEntry` and `SystemMessage` shapes were read in the `../pi` checkout at `9fba660cf`.
Real-world frequencies were measured over the 400 newest local session files.

### Observations

- The operator's own issue.
  At the gate they chose option A: name the target in transcript terms (`turn N (role)`, `<tool> result from turn N`, with an id fallback outside the window), not Pi's raw `targetId` and not a forward tag on the target's header.
- The operator pulled the `role: "system"` gap into scope instead of filing a follow-up.
  For the line shape, they chose counts on the first system message (`[system] prompt: 8 sections, 21 tools`, ~40 chars) and names on updates.
  The all-names form measured 385 chars.
- Measured: 117/400 session files have system messages (114 have only the leading one, 3 have one update).
  All 26 `context_edit` entries are `replacement: null` on assistant targets, written by Pi's `_omitRecoveryAttempt`.
- Classified non-breaking (additive lines only) and committed as `fix(pi-session-tools):` without `!`.
- The tidy-first assessor recommended the helper extraction (accepted as step 1).
  It also recommended splitting the loop's role dispatch.
  I replaced that with moving `turnNum` onto `TurnLedger`, which gives the new collaborator state to own.
- Known residual: "prompt" form is decided by window position, so a tail window can render a mid-session update in counts form.
  It is recorded in the plan's Risks.
- No SDK round-trip test is possible at the `0.79.1` devDependency pin (no `appendContextEdit`), so fixtures are shaped from Pi source and the measured entries.
