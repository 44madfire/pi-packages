---
issue: 992
issue_title: "pi-permission-system: a computed argument can spell a find/fd/sort withdrawing option the retraction guard never sees"
---

# Retro: #992 — a computed argument can spell a find/fd/sort withdrawing option the retraction guard never sees

## Stage: Planning (2026-09-29T19:41:37Z)

### Session summary

Planned a leading-dash rule: a computed argument withdraws `find`/`fd`/`sort`'s read claim only when it may reach the program as a word beginning with `-`, carried as a new required `ArgWord.mayLeadWithDash`.
A preparatory fix makes a `tree-sitter-bash` `number` node spelled exactly.
Filed [#995] (reassigned `$HOME`/`$PWD`) and placed it as the Phase 15 step after #992.

### Observations

- A corpus spike (70,961 unique bash commands from 1,867 session transcripts plus the review log, real `getParser()` and `proveCommandEffect`) measured newly withdrawn `find` units: 625 under the issue's any-computed rule, 165 once digits are exact, and 96 under the adopted rule.
  Of these, the number with external-looking operands was 17 under the middle rule and 3 under the adopted one.
- The unexpected finding: `isSpelledExactly` answers `false` for a `number` node, so `-maxdepth 2` is "computed" and alone caused 460 of the 625.
  This is latent in `sed`/`awk` already (1 `awk` unit in the corpus).
- Operator decisions: the leading-dash rule (not any-computed, not per-guard option-value grammar); fold the digit fix as a leading step; `fix!:` with a `BREAKING CHANGE:` footer (the roadmap said `fix:`), on [#609]'s newly-prompts precedent.
- The operator asked what an end user would notice before deciding: the answer was new prompts on benign reads (`find "$dir" -name x` against an external `$dir` under a split read/write config), since none of the 96 withdrawn units in the corpus actually wrote.
- Found while checking the rule's inputs: `resolvePlainVariableExpansion` resolves `$HOME` to `os.homedir()` even after `HOME=-delete;`, confirmed through `BashProgram.parse` (`find "$HOME"` projects a core read of the home directory).
  Filed as [#995]; the tilde form was not confirmed on macOS bash.
- The Tidy-First assessor's recommendation to switch `node-text.test.ts`'s exact table from `toEqual` to `toMatchObject` was declined (it weakens the assertion); the plan adds the new field to the expected objects instead.
  Its shared `literalArgWords` builder became TDD step 1.
- The prototype predicate's outcomes over 24 argument shapes are recorded in the plan's Design Overview, so the TDD step's cases and killing mutations are observed, not predicted.

## Stage: Implementation — TDD (2026-09-29T21:13:01Z)

### Session summary

All five planned steps landed (shared `literalArgWords` builder, the digit fix, `ArgWord.mayLeadWithDash`, the `fix!:` guard change, docs), followed by three reviewer-driven fixes for words that split inside double quotes, each with its own docs commit.
The `pi-permission-system` suite went from 4992 to 5045 tests (+53).
Mid-session, at the operator's request, the three subagent definitions and two Explore-dispatch instructions moved to `claude-sonnet-5-5` (`chore:` commit), and the stale `anthropic/claude-sonnet-5` entry left `~/.pi/agent/settings.json`'s `enabledModels`.

### Observations

- Deviation, step 2: a bare digit is not a collected path token (`sed -n 1p 2` collects nothing), so the observable test became `sed -n 1p 2 /etc/hosts`, where the digit withdrew `sed`'s claim over `/etc/hosts`.
- Deviation, step 3: the planned `sed` invariant pin (`"x$range"`, `mayLeadWithDash: false`) survived its mutation, because the script grammar withdraws a value spelled that way anyway; the pin now uses `p`, a script the grammar proves, so only the computed flag can withdraw it.
- Several step-3 killing mutations killed fewer rows than the plan named: the splitting check and the leading-character check overlap on `""$x`, `$A`, `$(…)`, and backticks, so each mutation removes only one of two independent reasons.
- Step 4's real-parse expectations had to list every collected token: `find` and `sort` collect their option words and computed operands too, not just the path.
- Pre-completion reviewer, round 1 (WARN): a quoted `"x$@"` / `"x${arr[@]}"` splits per element and only the first word carries the literal prefix.
  Fixed in `fix(pi-permission-system): a quoted "$@" after a literal withdraws find's, fd's, and sort's read claim`.
- Round 2 (WARN): an indirect `"x${!a}"` with `a='arr[@]'` splits with no `@` in its text.
  Fixed in `fix(pi-permission-system): a quoted indirect expansion after a literal withdraws find's, fd's, and sort's read claim`.
- Round 3 (WARN): any quoted variable may be a nameref (`declare -n s='arr[@]'`), so `"x$s"` splits on bash 5.3.
  The operator chose to close it rather than document it; measured over the planning corpus it withdraws 3 more `find` units of 2,025, and no command in the corpus declares a nameref.
  Fixed in `fix(pi-permission-system): a quoted variable after a literal withdraws find's, fd's, and sort's read claim`, which reverses the plan's headline example: `find /src -name "x$y"` now withdraws.
- Round 4 (WARN, non-blocking): stale `"x$y"` claims in the plan, answered with an implementation note in the plan; and `~` follows the inherited `HOME` (`HOME=-h bash -c 'printf ~'` prints `-h`), recorded on [#995] as part of its trust boundary rather than widened here.
- The quoted-splitting gap recurred three times because the plan's predicate enumerated splitting by node shape; each round found a bash feature (`$@`, indirection, namerefs) where the shape does not reveal the word count.
  A rule stated as "every quoted parameter expansion may split" from the start would have been one round.

[#609]: https://github.com/gotgenes/pi-packages/issues/609
[#995]: https://github.com/gotgenes/pi-packages/issues/995
