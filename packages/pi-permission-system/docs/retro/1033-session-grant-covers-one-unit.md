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
