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

[#609]: https://github.com/gotgenes/pi-packages/issues/609
[#995]: https://github.com/gotgenes/pi-packages/issues/995
