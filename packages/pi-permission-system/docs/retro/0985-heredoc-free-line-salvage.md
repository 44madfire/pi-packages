---
issue: 985
issue_title: "pi-permission-system: a heredoc tail the grammar cannot parse floors to `ask`, so a `deny` on the command after it never fires"
---

# Retro: #985 — pi-permission-system: a heredoc tail the grammar cannot parse floors to `ask`, so a `deny` on the command after it never fires

## Stage: Planning (2026-09-28T03:09:26Z)

### Session summary

Planned #985 as a second kind of #875 salvage candidate: the heredoc-free spelling of each line whose heredoc sits in an unresolved host statement, re-parsed through the same clean-re-parse guard and appended after the region candidates.
The five-step plan (`docs/plans/0985-heredoc-free-line-salvage.md`) leads with a text-based candidate loop and a word-level anti-invention property, adds the unwired `heredoc-free-lines.ts`, wires it, and lands the docs and an ADR 0013 amendment.

### Observations

- **Operator decisions.**
  The mechanism is the heredoc-free line candidate (not a tail-only re-parse, not a primary pre-pass), and duplicate units are accepted, with no dedupe mechanism.
- **Diagnosis, from real grammar trees at `c090d185`.**
  For `;`, `&`, and words-then-redirect tails the `ERROR` sits directly under `heredoc_redirect`, so the innermost region is the redirect, whose own text re-fails.
  `cat 0<<EOF | …` lexes `0<<EOF` as one `heredoc_start` inside a top-level `ERROR`, which is never a candidate.
- **Prototype (a patched `withSalvagedRoots`, reverted).**
  All four fail-open rows deny, and `cat <<EOF arg > /tmp/o` projects `/tmp/o` as a `write`.
  Over 9084 distinct intact review-log commands, 7 change (all `git commit -F - <<'MSG' 2>&1 | tail`), and only by duplicated units; 0 verdicts change. 11 existing tests fail, all exact-list assertions over salvage output.
- **Anchor choice.**
  Anchoring on the host `redirected_statement` rather than the source line is what recovers `if true; then cat <<EOF ; rm x`; an `ERROR` host falls back to the line start.
- **Cut, not blank.**
  Blanking the operator produced the unit `cat       arg`; cutting it together with the whitespace before it yields `cat arg`, the heredoc-free spelling a rule is written against.
- **Invariant caught at planning.**
  The metamorphic anti-invention property is a substring check, and `cat arg` is not a substring of `cat <<EOF arg`; the plan restates it at word level as a preparatory `test:` step.
- **Constraint honored.**
  `parse-health.ts` is the only reader of `previousSibling`/`hasError`, so the new walk reaches the `<<` token and `file_descriptor` by sibling index through `childrenOf`.
- The Tidy-First assessor recommended one preparatory refactor (iterate candidate texts rather than nodes), folded in as step 1; it noted `fallow guard` errored on a pre-existing `pi-subagents` boundary-config error.

## Stage: Implementation — TDD (2026-09-28T15:54:10Z)

### Session summary

All five planned steps landed as five commits: the text-based candidate loop, the word-level anti-invention property, the unwired `heredoc-free-lines.ts`, the wiring `fix:`, and the docs (architecture entries, Phase 15 `✅` marks with a `Landed:` note, and an ADR 0013 amendment).
The `pi-permission-system` suite went from 4832 to 4879 tests (+47).
Every planned killing mutation reddened exactly its predicted class: 6 for the new module and 3 for the wiring.

### Observations

- **Step 2 deviation.**
  A word-subsequence over whitespace-split command words failed 5 existing rows where an operator abuts a word (`rm $f;`, `(cat`, `x=$(cat`); each unit word is instead found as a substring of the command, in order.
  The `INVENTED` mutation still reddened all 21 rows.
- **Step 4 deviations.**
  "keeps a relative operand literal" passed unchanged (the plan predicted a rewrite), because region candidates stay ahead of heredoc-free ones and `.find` meets the region's literal first.
  The planned "dropped when its re-parse errs" case (`cat <<A <<B ; rm -rf x`) salvages the region text `<B ; rm -rf x`, not the `; rm -rf x` first written; the expectation was corrected to the measured value.
- **Corpus re-measured** against the pre-wiring salvage: 9156 distinct intact commands, 7 changed (duplicate units only, two with an extra literal-only rule candidate), 0 external-access or verdict changes.
- Pre-completion reviewer: **PASS**, with one design-note WARN: the word-level anti-invention check is weaker than a substring check by construction (per-word substring matching could draw words from unrelated positions); it found no real construction it misses.
  The reviewer also probed 12 further inputs (substitutions, arithmetic `<<`, CRLF, abutting operators, multi-line statements) through the real parser; all matched bash or were dropped by the clean-re-parse guard.

## Stage: Sync (worktree) (2026-09-28T16:11:54Z)

### Session summary

Pre-push checks (`pnpm run lint`, `pnpm fallow dead-code`) pass on the branch as landed by the TDD stage.
The plan's `**Release:** ship independently` marker holds; the only release-bearing commit is the `fix:` "deny a command written after a heredoc the grammar cannot parse".
No follow-up issues were filed.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-985--/2026-09-28T02-48-19-074Z_01a0e5e9-c982-7511-bc7f-2ad60a46b80b.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

Planning, TDD, and sync all ran in this one peer session; the TDD stage entry above carries the deviations and the reviewer's PASS.
