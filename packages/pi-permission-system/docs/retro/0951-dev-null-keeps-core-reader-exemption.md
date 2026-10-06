---
issue: 951
issue_title: "pi-permission-system: a `2>/dev/null` redirect withholds the core-reader wrapper exemption"
---

# Retro: #951 — pi-permission-system: a `2>/dev/null` redirect withholds the core-reader wrapper exemption

## Stage: Planning (2026-10-06T14:51:24Z)

### Session summary

Reproduced the defect through the real `BashProgram.parse(...).commands()`: `rg -l x | xargs ls -1t 2>/dev/null` loses `core-reader`, as do the hosted (`2>/dev/null xargs …`) and `>/dev/null 2>&1` forms.
Planned a three-step fix: an `isDiscardDevice` predicate in `src/path/safe-system-paths.ts`, a guard in `redirectMayWriteFile`'s loop, and an architecture-doc update.
Classified as a non-breaking `fix:` that implements ADR 0013 §11's "no real output redirect" wording; ships independently.

### Observations

- Operator decisions: only `/dev/null` clears the refusal; `/dev/std{in,out,err}` stay write-proving.
  On Linux, opening one for write reopens the descriptor's file with `O_TRUNC`, so `xargs cat < f > /dev/stdin` would truncate `f` under the exemption (Linux procfs semantics, not measured on this macOS host).
- The token collector (`redirectEffectForDestination`) is deliberately unchanged, so `path_write` keeps seeing `/dev/null` as a write token; tests already pin that.
- The guard compares the raw `child.text`, with no node-type check and no target-index check.
  Quoting changes the raw text, so a type check would be unkillable, and `getParser` reattaches trailing words ([#977]), so the target is the only non-descriptor child in production.
- Measured with `getGrammarParser`: `cat <> /dev/null` parses as `[<, ERROR, word]`, unresolved, so it refuses twice over.
  A first draft named it as a killer for a guard-ordering mutation; it isn't one, and the plan now says so.
- The Tidy-First assessor recommended nothing; its optional `DISCARD_DEVICE` constant is folded into step 1.
- Open PR #971 touches the wrapper floor in other files; it does not overlap and is not a close target.

## Stage: Implementation — TDD (2026-10-06T16:47:44Z)

### Session summary

Completed all three plan steps, each its own commit: the `isDiscardDevice` predicate, the `redirectMayWriteFile` guard with unit and program-level rows, and the architecture-doc update.
Added 30 tests: 8 in `safe-system-paths.test.ts`, 15 in `redirect-analysis.test.ts`, and 7 in `program.test.ts`.
The full suite, `check`, root `lint`, and `fallow dead-code` are green.

### Observations

- No deviations from the plan.
  Every named killing mutation killed exactly the predicted rows.
  Deleting the guard killed 10, swapping in `isSafeSystemPath` killed 3, and `includes("/dev/null")` killed 5.
  The step 1 mutation (`SAFE_SYSTEM_PATHS.has`) killed the 3 stream-device rows.
- Process slip in step 1: the Red run and the implementing `Write` went out in the same tool batch and ran concurrently, so the "red" run saw green.
  Red was re-derived by temporarily restoring the HEAD source: 8 new tests failed.
  Keep Red runs in their own batch.
- Pre-completion reviewer: PASS.
  Its re-derivation spike put 90 of its own inputs through `BashProgram.parse`, including near-miss spellings, brace and glob expansions, `/dev/fd/1`, sibling real redirects, and compound and heredoc hosts.
  It found no input that clears the refusal while a real file is written.

[#977]: https://github.com/gotgenes/pi-packages/issues/977
