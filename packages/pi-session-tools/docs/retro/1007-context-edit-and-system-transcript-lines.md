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

## Stage: Implementation — TDD (2026-10-03T04:45:41Z)

### Session summary

I executed all five plan steps as five commits: two refactors, two `fix(pi-session-tools):` steps, and one docs step.
The `pi-session-tools` suite went from 228 to 251 tests (+8 `TurnLedger` unit tests, +6 context-edit tests, +9 system-message tests).
All gates are green: test, check, root lint, and `fallow dead-code`.

### Observations

- No deviations from the plan.
  `src/index.ts` stayed unchanged, as predicted.
- Every planned killing mutation killed its predicted tests.
  Flipping `replacement === null` killed all five context-edit label tests, not just the omitted/replaced pair, because every test asserts the verb.
  I added one mutation the plan didn't name: dropping the `custom_message` recording killed exactly the custom-message test.
- The `usage` test stayed green during Red, as a deliberate pin.
  Its mutation (`case "usage": return "[usage]"`) confirmed that it discriminates.
- Process slip: a `cp` restore batched in the same tool call as a mutating `Edit` raced it, so the mutation didn't stick and the run read as "survived".
  Running the restore in its own call fixed it; the `/tdd-plan` rule about separate calls applies to restores too, not just backups.
- Adding the upstream rows to the skill's padded table tripped MD060, and `rumdl fmt` realigned it.
- Pre-completion reviewer: PASS.
  It reported 267 tests in 12 files for the package, but my own run shows 251 in 14.
  The reviewer's count does not match and I did not reconcile it.

## Stage: Sync (worktree) (2026-10-03T04:50:29Z)

### Session summary

Root `pnpm run lint` and `pnpm fallow dead-code` both passed on the branch before the rebase.
The plan's marker is `**Release:** ship independently`, and no follow-up issues were filed.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1007--/2026-10-03T03-52-04-515Z_01a0ffe3-f4a2-739d-b317-dd0e8eb6248f.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

The pre-completion reviewer's package test count (267 in 12 files) did not match the 251 in 14 files from this session's own run; it was never reconciled, so the root's `/ship` run is the tiebreaker.
