---
issue: 963
issue_title: "pi-permission-system: execution-modifier wrappers (time/timeout/nice/stdbuf/setsid) inherit the inner command's verdict"
---

# Retro: #963 — pi-permission-system: execution-modifier wrappers (time/timeout/nice/stdbuf/setsid) inherit the inner command's verdict

## Stage: Planning (2026-10-05T04:18:15Z)

### Session summary

Planned a second ADR 0013 §11 clause, `execution-modifier`, as six steps: two preparatory refactors (`isTransparentWrapper` → `floorExemptionOf` returning the reason; `UnwrapResult.layers` → `peeled`), the mechanism, the verified flag rows, the measurement instrument, and docs.
Filed [#1027] (`time ( … )` subshells are not enumerated) and recorded it as a new Phase 15 step directly after #963.
The operator chose a non-breaking `feat:`, accepted three safety guards in place of the issue's clean-peel admission, and placed #1027 after #963 rather than after [#880] so it does not split the "declared-effects" batch.

### Observations

- The issue's proposed admission ("outermost wrapper in the set, peel clean") was unsound in three reproduced ways, all measured through the real `BashProgram.parse`:
  - `unwrapIndirection` peels through `sudo`, so `time sudo rm -rf x` → `executedUnit: "rm -rf x"`;
  - GNU tools accept long-option abbreviations that `innerCommandIndex` does not know, so `timeout --sig KILL 5 rm -rf /` → `executedUnit: "5 rm -rf /"`, which a `*: allow` would allow past an `rm *` deny;
  - `tree-sitter-bash` has no `time` keyword, so `time { rm …; }` has head `{` and `time (rm …)` emits one unit with the subshell unenumerated.
- The redirect refusal is safe to drop for this class: `BashPathResolver` projects `timeout 5 pnpm test > /tmp/x` as a syntax-proven write independently of the floor.
- Measured relief: 73 of 84 modifier-led floored winning units in the local review log (226 floored asks, 2026-07 to 2026-10-04), from a prototype patched into `wrapper-analysis.ts` and reverted; 10 of the remaining 11 are `time ( … )`.
- Upstream check: `tree-sitter-bash` 0.25.1 is the latest release with no commits since; open upstream PRs (#331, #333 redirect greed; #332 standalone heredoc) overlap workarounds this package already carries.
- Flag rows are admitted only when verified against a local binary (`timeout --help`, `man 1 time`); `setsid` (util-linux) is not installed locally, so it admits no flags.
- The tidy-first assessor recommended both preparatory refactors and the derived value-taking admission (no second table to drift); it also flagged the roadmap step's stale "outermost wrapper" / "stops the peel at `sudo`" text, which Step 6 corrects.

#### Phase handoff

The operator asked whether a larger architectural change would make this kind of work easier.
Since 2026-08-01, `src/access-intent/bash/` took 103 commits (53 `fix:`, 44 `refactor:`, 1 `feat:`) across 24 files and 6,706 lines, and most fixes are one class: two components reading the same command-line word differently (#977, #992, #995, #979, #985, #923, and the three bypasses above).
At least seven per-command option grammars exist side by side (`VALUE_TAKING_FLAGS`, `LEADING_OPERAND_WRAPPERS`, `GREP_FLAGS`, `RETRACTION_GUARDS`, the `sed` and `awk` allowlists, `bash-arity.ts`); #963 adds an eighth and [#880]'s `unlessOption` would add a ninth.
Candidate cause for a future phase: one structured command description per simple command (options with arity, operands, exec'd tail, parsed once getopt-faithfully) consumed by wrapper analysis, effect proofs, path projection, and matching — ADR 0013 §10's "structured command description" and [#804] converging.
Sequencing call: the operator chose to continue #963 as designed; weigh this candidate in `/plan-improvements` before [#880] lands, since [#880] is the natural first consumer of a shared layer.

#### Deferred tidyings

- `src/access-intent/bash/wrapper-analysis.ts` — `inlineShellPayloadIndex` runs its own peel loop beside `unwrapIndirection`; declined as settled by #923.
- `src/access-intent/bash/command-enumeration.ts` — the `makeUnit` optional-field spread chain; untouched by this change.

[#804]: https://github.com/gotgenes/pi-packages/issues/804
[#880]: https://github.com/gotgenes/pi-packages/issues/880
[#1027]: https://github.com/gotgenes/pi-packages/issues/1027
