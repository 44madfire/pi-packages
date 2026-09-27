---
issue: 979
issue_title: "pi-permission-system: a heredoc hosts the rest of its command line, so commands, arguments, and redirects after `<<EOF` are never gated"
---

# Retro: #979 — pi-permission-system: a heredoc hosts the rest of its command line, so commands, arguments, and redirects after `<<EOF` are never gated

## Stage: Planning (2026-09-27T00:54:48Z)

### Session summary

Planned #979 as a second parser-boundary pass beside #977's: `hoistHeredocTails` (new `heredoc-tails.ts`) moves a heredoc's redirect tail and `|`/`&&` tail out of the `heredoc_redirect`, and `reattachRedirectArguments` learns that a heredoc can carry words, exactly as a `file_redirect` can.
The six-step plan (`docs/plans/0979-heredoc-tail-hoisted.md`) leads with extracting the view primitives into `parse-view.ts` and the parse-tree test helpers into `test/helpers/bash-parse-tree.ts`.
No follow-up issues were filed.

### Observations

- **Operator decisions.**
  The rejoined tail reproduces the grammar's own parse of the `< in` spelling (the walkers are already hardened against its mis-groupings, and it gives a crisp shape oracle), not a bash-exact grouping.
  The correction is a separate pass plus a shared `parse-view.ts`, not a growth of `redirect-arguments.ts`.
- **Re-measured at `f02c1868`** through the real `resolveBashCommandCheck`: the issue's five rows reproduce.
  Two further effects: `xargs grep foo <<EOF > /tmp/o` keeps the `core-reader` exemption its heredoc-free spelling withholds, and the grammar nests `true && cd /tmp` inside the pipe in `cat <<EOF | true && cd /tmp`, while bash runs the `cd` in the current shell (measured with `bash -c` and `pwd`).
- **Census over 8919 review-log commands:** 587 heredocs, 6 clean tails (5 `/tmp` redirect writes, 1 `&& git log`), 0 word or pipe tails.
  The operator's global config allows `/tmp/*` writes, so no real command newly prompts.
- **View contract widened.**
  #977's contract requires non-overlapping siblings, but a heredoc's body is written after the rest of its line, so a truncated heredoc overlaps the siblings after it.
  The plan scopes the widening to a heredoc-bearing sibling and adds two contract items (containment, leaves preserved), each with a killing mutation.
- **#941 is untouched:** the `-` in `git commit -F - <<'EOF'` is in no node of the grammar's tree, and a heredoc with no tail is never rewritten.
- The Tidy-First assessor reported a `foldPipelineFirstStage` gap for a non-`file_redirect` sibling; reading the code, a `herestring_redirect` or `heredoc_redirect` takes the same host-only route there as in `walkCurrentShellSequence`, so it is not a gap and nothing was filed.
- **Session friction:** probes run with `bash -c` and a `cd /Users` prefix triggered permission prompts the operator had to approve, which the agent could not see.
  A probe of real bash semantics can run as a script file under the repo instead.
  The disposable spike files (`.spike979*.mjs`, `test/spike/`) were deleted before handoff.
