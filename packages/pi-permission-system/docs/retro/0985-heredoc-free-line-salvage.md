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
