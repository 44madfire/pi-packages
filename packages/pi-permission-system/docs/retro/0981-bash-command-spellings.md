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

## Stage: Implementation (TDD) (2026-10-03T07:01:39Z)

### Session summary

All six TDD steps landed as planned: fixture prep, `normalizeBashCommand`, the `bash-command` intent, the `ShellVariables.spellHomeAtStart` producer, the gate wiring (the one `fix:`), and docs.
The docs cover `configuration.md`, the architecture entries, an ADR 0009 amendment, and the package skill.
The `pi-permission-system` suite went from 5370 to 5418 tests; `check`, root `lint`, and `fallow dead-code` are clean.

### Observations

- Deviations from the plan:
  - `BashCommandAccessIntent.surface` is typed `string`, not `"bash"`: the resolver's family-fold spread failed `tsc` exactly as the plan's risk predicted, and the plan's fallback was taken.
    `permission-resolver.ts` is unchanged.
  - `makeUnit`'s `WrapperFacts` bag was renamed `UnitFacts`, as the plan allowed.
  - A third cast-based bash reader (`resolverByCommand` in `bash-command.test.ts`) escaped step 1's grep because it destructured `.input`; step 5 migrated it to `bashCommandOf`.
  - Step 5's commit was amended once, for a Biome `noTemplateCurlyInString` warning on a `"${HOME}/..."` literal.
- The plan's whole-string mutation (pass the first unit's spellings) **survived** the named tests: every migrated whole-string assertion has zero units, so there was nothing to leak.
  A salvaged-only pin (`resolves the whole command of a salvaged-only parse with no spellings`) was added, and it kills that mutation.
- Every other named mutation killed what the plan predicted.
  The "does not spell" pins (`echo ~/x`, quoted, `sudo ~/bin/x`) and the rebound-`HOME` row stay green under all of them, by design: they pin the leading-prefix boundary.
- Literal `\u2014` escapes typed into `Edit` bodies landed as escape text three times (two test `describe` names, one comment), and each was caught by re-reading and replaced.

#### Reviewer warnings

- Pre-completion reviewer: **WARN**.
- **Indirect rebinding.**
  ADR 0009 declares a residual: a name the program builds at run time.
  It now also opens on the command surface.
  The scan misses `n=HOME; read $n`, `printf -v $n`, `declare $n=…`, and a builtin reached through `builtin`/`command`/`time`, so the later `~/bin/tool` unit still gets the startup-home spelling.
  Verified with a disposable spike (real parse, manager, and resolver) using `{"*": "ask", "n=*": "allow", "read *": "allow", "~/bin/tool": "allow"}`: `n=HOME; read $n <<< /tmp/x; ~/bin/tool` resolves `allow`; before this change it asked.
  The literal and operator forms (`printf -v HOME`, `read ${x:-HOME}`) are caught by the scan and still ask.
  The exposure needs the rebinding statement's own units to be allowed by explicit rules under a non-`allow` catch-all.
  The operator decides between recording it as an accepted residual and adding a conservative guard before `/ship`.
