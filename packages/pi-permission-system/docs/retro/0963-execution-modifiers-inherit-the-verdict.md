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

## Stage: Implementation — TDD (2026-10-05T05:14:07Z)

### Session summary

All six planned steps landed (two refactors, the `execution-modifier` clause, the verified flag rows, the instrument, docs), plus a `fix:` and three `docs:` commits from the pre-completion review.
The `pi-permission-system` suite went from 5418 to 5530 tests (+112).
The instrument reports 73 floored asks relieved by the new clause alone (298 floored since 2026-07, 159 relieved in total).

### Observations

- Plan deviations in Step 3: `WRITING_OPTIONS` became per-wrapper, because `stdbuf -o` sets a buffering mode and a global `-o` refusal turned two `stdbuf` rows red; and `LITERAL_COMMAND_NAME` may not lead with `-` (`time -- -x` would be exempt while `executedUnitOf` declines to name it).
- Mutation findings: the five-deep `time` row is killed by the reserved-word guard as well as the peel-end check, and `time { …` by the reserved-word set as well as the charset, so the plan's per-mutation red counts were one row high for those two mutations; both rows are double-covered.
- Two metamorphic rows the fix step first wrote (`timeout $D sudo rm x`) were green before the fix, because the visible `sudo` already refuses; replaced with `timeout $D pnpm test`, the shape where the split word is the hidden wrapper.
- `—`/`\u2026` written in `Edit` bodies landed as literal escapes in source and as tabs or space runs in markdown, several times; each was repaired by a scripted substitution and checked with `rg`.
- Pre-completion reviewer, round 1: **FAIL** on two bypasses, both reproduced: `timeout -- 5 sudo rm x` (`innerCommandIndex` returned at `--` without consuming the pending duration, so the gate resolved a command named `5`) and `timeout {5,sudo} rm x` / `timeout $D pnpm test` (computed prefix words the shell splits into extra words).
  Fixed in the `feat:` commit itself, squashed in at sync time so the changelog shows one feature; the literal-word rule costs no logged asks.
  The round-1 reviewer also ran `time find . -delete` as real shell inside the package while probing; it restored the tree, and the suite and `git status` were verified clean afterwards.
  The round-2 dispatch told the reviewer to probe only through parse/resolve.
- Round 2: **WARN**, with both bypasses closed.
  Doc prose overstated the literal rule (assignments are exempt), fixed in a `docs:` commit.
  `timeout -- -- 5 rm x` / `timeout -- 5 5 rm x` still resolve a misread command, but real `timeout` cannot run `rm` from either, so they were left as-is.
- Round 3: **PASS**.
- Reviewer warnings left open: path-qualified wrapper names match by basename (`./time rm x`), not weaker than the same rule's allow of the bare `./time`; `timeout -s KILL rm x` (no duration) misaligns the derivation, but GNU `timeout` errors without running anything.

## Stage: Sync (worktree) (2026-10-05T14:00:40Z)

### Session summary

Pre-push gates passed (`pnpm run lint`, `pnpm fallow dead-code`, `pnpm run check`, and the 5530-test package suite).
The plan's marker is `**Release:** ship independently`; the `feat:` commit is the release vehicle.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-963--/2026-10-04T20-39-58-367Z_01a108a5-129f-7439-beef-4b01a6933308.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

- On the operator's decision, the review-round `fix:` commit was squashed into the `time, timeout, nice, stdbuf, and setsid resolve by the command they run` `feat:` commit (a `fixup` rebase; the tree was byte-identical before and after), so the changelog shows one feature rather than a fix for something never released.
  The architecture `Landed:` note and the TDD stage note were updated to match.
- The operator chose to ship with the two open reviewer WARNs (`timeout -- -- 5 rm x` misread, path-qualified wrapper names matched by basename).
- Follow-up for the root: [#1027] is the next Phase 15 step; the retro's `#### Phase handoff` records the command-description-layer phase candidate.

[#804]: https://github.com/gotgenes/pi-packages/issues/804
[#880]: https://github.com/gotgenes/pi-packages/issues/880
[#1027]: https://github.com/gotgenes/pi-packages/issues/1027
