---
issue: 981
issue_title: "bash surface pattern matching is asymmetric: patterns get ~ expanded, command values do not"
---

# Retro: #981 — bash surface pattern matching is asymmetric: patterns get ~ expanded, command values do not

## Stage: Planning (2026-10-03T06:37:55Z)

### Session summary

Planned the fix for a third-party report (`wlnpu`) after confirming it through the real gate fold: a disposable spike drove the gate's resolution path over a real manager and resolver, with a synthetic in-process config.
The operator chose the general design (direction B): a bash command unit carries *spellings*, evaluated as aliases through `evaluateAnyValue`, with the home-expanded spelling as the first producer.
Filed #1019 and #1020 as follow-ups, both recorded out of scope against Phase 15.

### Observations

- The report understated the defect.
  The same asymmetry is a **deny bypass** (`~/bin/danger --now` resolves `allow via *` under a `~/bin/danger *` deny) and a **dead session grant**, both measured.
  The backlog triage had classed it "dead rule (fail-closed)".
- The issue's proposed fix (expand the value in the matcher) is unsafe twice over.
  First, the matcher cannot see a program rebinding `HOME`.
  Second, `expandHomePath`'s `path.join` normalizes `..` across a whole command string: `~/evil /x/../../safe` spells `/Users/chris/safe`, measured.
  The plan requires pure substitution (`homedir() + rest`) inside `ShellVariables`, guarded by the existing rebinding scan.
- Open PR #917 (`ilkerulusoy`) found the same missing concept from the relative/absolute side, with an `alias-values` intent.
  The plan adopts the mechanism as a dedicated `bash-command` intent and credits it with `Co-authored-by: Ilker Ulusoy <ilker@ilkerulusoy.com.tr>` on TDD steps 3 and 5.
  Argument spellings stay #917's scope, now as a second producer on this seam; consider commenting on #917 at ship time.
- Tidy-First assessor: recommended a `bashCommandOf` fixture reader plus exhaustive `switch`es in the two fixture adapters (TDD step 1).
  It also recommended emitting `bash-command` for every unit rather than only when spellings exist.
  It found no structural contradiction.
  `ResolverForService` is module-private, so widening `AccessIntent` reaches no published type.
- Scope split, flagged to the operator in the summary: the forwarded-serving wire (#1019) is left as before #981 because it needs a `command`/spellings pairing on `PermissionCheckResult`.
- Windows: the pattern side's `join` turns `/` into `\`, so the fix does not reach `~` bash rules on win32 (#1020).
  This is measured with `path.win32.join` on macOS, not on a Windows host.
- Local review log: 0 of 975 `bash`-surface entries open with a home prefix, so this operator's own traffic sees no change.

#### Deferred tidyings

- `src/access-intent/bash/command-enumeration.ts` — `makeUnit` chains one `{ ...x, key }` spread per optional field (6 after this change); the assessor rated it optional.
