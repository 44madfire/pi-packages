---
issue: 995
issue_title: "pi-permission-system: `$HOME` and `$PWD` resolve to their startup values after the command reassigns them"
---

# Retro: #995 — `$HOME` and `$PWD` resolve to their startup values after the command reassigns them

## Stage: Planning (2026-09-30T17:42:45Z)

### Session summary

Planned making a rebound `HOME`/`PWD` computed, using a structural rebinding scan over the program's parse roots and a leading-tilde rule, delivered through two new collaborators: `ShellVariables` (the closed rebinding set) and `WordReader` (node-text reads bound to it).
The operator chose the recommended option on every gate question: detection covers structural bindings, bare-word names, and `eval`/`source`/`.`; the tilde rule covers both the rebound case and the inherited-`HOME` dash lead; the commit type is `fix:`.
The plan has 9 steps: 3 preparatory refactors, 1 test migration, 4 fixes (mechanism, then data, then two tilde steps), and 1 docs step.

### Observations

- Measured, not assumed: Pi runs `/bin/bash`, which on macOS is bash 3.2, and there `~` follows a reassigned `HOME`.
  Homebrew bash 5.3 does not, so the issue comment's bash 5.3 observation understates the tilde defect in Pi's real shell.
- `os.homedir()` returns the inherited `HOME` verbatim (`HOME=-h node` prints `-h`), so an unrebound `$HOME` is already exact; only a literal `~` word needed its dash lead fixed.
- A text scan for `\bHOME\b` would over-mark 27 of the 53 `$HOME`-bearing logged commands (all `env -i HOME="$HOME"`).
  Over-marking drops correct projections, so it is not the safe direction; the rule is structural (`variable_name` outside a plain reference).
- Review-log measurement (10,153 distinct commands, spike discarded): 2 structural bindings, 0 bare-word names, 9 `eval`/`source`/`.`, 1 of them referencing `$HOME`/`$PWD`/`~`.
- The architectural question the operator raised: node-text reads were per-node pure functions, so program context has to be handed in.
  A node cannot find its root: `TSNode` has no parent pointer, `parse-view.ts` re-parents nodes, and salvaged roots are separate trees.
  The operator agreed to explicit threading behind a `WordReader` collaborator (it threads the finished reader rather than the raw vocabulary).
- A flooring alternative (a program that rebinds `HOME` asks) was rejected in the design: `X=/etc` sits under the same accepted residual, so it buys nothing.
- `ShellVariables` must stay a set of rebound names, never values; ADR 0009 declined same-program assignment dataflow, and this seam makes it cheaper to reopen.

#### Deferred tidyings

- `packages/pi-permission-system/src/access-intent/bash/token-collection.ts`: its free functions only relay the `WordReader` (5 functions pass it through with no read of their own, per the Tidy-First assessor).
  Turning them into methods on a collector object that holds the reader would remove the relay, but it restructures a 1006-line file and was rejected as scope creep for this issue.
  The operator asked that the next `/plan-improvements pi-permission-system` consider it.
