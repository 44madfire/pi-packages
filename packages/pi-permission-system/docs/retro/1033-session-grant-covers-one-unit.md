---
issue: 1033
issue_title: "pi-permission-system: a session grant on one unit of a bash chain approves its sibling asking units"
---

# Retro: #1033 — pi-permission-system: a session grant on one unit of a bash chain approves its sibling asking units

## Stage: Planning (2026-10-06T22:29:11Z)

### Session summary

Reproduced the bypass through the real parser, resolver, and session ruleset in a disposable spike, and found a second shape the issue did not name (`sudo rm y && sudo rm z` with only `y` granted runs `z` unprompted, no rule needed).
Spiked the fix, the dead-filter removal, and the runner hardening against the full suite, then wrote a three-step plan: the floors skip a session grant, the runner's fast path requires a session `allow`, and the architecture doc updates.

### Observations

- The operator chose option A (a session-granted unit is never floored) over option B (a non-session tie-break in `pickMostRestrictive`, which the roadmap step's `Target:` bullet named), and chose to harden `GateRunner` as well.
  The roadmap `Target:` bullet is reworded in the doc step to match.
- The operator asked whether either option violates design principle 3 ("session approvals are just more rules") and where "the roadmap's named target" came from; the answer was that the principle governs matching, and both options read `source` after resolution as the code already does in several places.
  They also asked for a component/responsibility diagram before deciding; an ASCII flow placing each option at its step settled it.
- `floorToAsk`'s spread is the only producer of an `ask`/`session` check (`SessionRules` records only `allow`), so removing it at the floors makes the `source !== "session"` filters in `withChainFloor`/`withAskingUnits` dead; they are removed.
- Hardening the runner makes `isUnconditionalDeny`'s session clause rest on a false premise, so Step 2 drops it and flips its descriptor test; that part was not spiked.
- Observable side effects: a `session_approved` entry for a floored unit now names the grant's pattern instead of the sentinel (113 such entries in the local review log, measured), and a mixed rule-allow/session-allow chain may log a rule allow instead of `session_approved`.
- The Tidy-First assessor recommended no preparatory commits; it corrected the design's "one guard vs two" question: the wrapper guard reads `base` while `floorUnparsedUnit` reads the possibly exempt inner result, so the two guards stay separate.

## Stage: Implementation — TDD (2026-10-06T22:42:29Z)

### Session summary

Completed all three plan steps: the floors skip a session grant (`fix:`), the runner's fast path requires a session `allow` with `isUnconditionalDeny` matching (`refactor:`), and the architecture-doc update with the `✅` step marks and `Landed:` note (`docs:`).
The package suite went from 5664 to 5668 tests (four new chain tests; three existing tests rewritten).

### Observations

- No deviations from the plan; every killing mutation reddened exactly the predicted tests.
  Dropping the wrapper guard also reddened the two existing `#1029`/`#1030` "leaves out … the session already granted" tests, which confirms they now pin the outcome through the unit's state.
- The Step 2 mutations were applied together; each kills a test in a different file that exercises only its own function, so the pairing is unambiguous.
- An `Edit` of a runner comment emitted a literal `\u2014` escape into TypeScript source; caught on read-back and replaced with a colon before commit (the markdown gates do not cover `.ts` comments).
- Pre-completion reviewer: PASS.
  It re-derived that `deriveSource` (session layer) and `SessionRules.approve` (allow only) are the sole producers of a session-sourced check, so no session `ask` can reach the combiner.

## Stage: Sync (worktree) (2026-10-06T22:45:09Z)

### Session summary

Pre-push `pnpm run lint` and `pnpm fallow dead-code` passed from the worktree root.
The plan's marker is `**Release:** ship independently`; the `fix:` commit is the only one that reaches the changelog.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1033--/2026-10-06T21-21-39-169Z_01a11317-f360-76b6-b040-2037a93c752d.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

No follow-ups filed and nothing deferred.
