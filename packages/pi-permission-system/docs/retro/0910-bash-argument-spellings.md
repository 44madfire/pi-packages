---
issue: 910
issue_title: "pi-permission-system: an absolute-path bash rule does not cover the relative spelling of the same path"
---

# Retro: #910 — pi-permission-system: an absolute-path bash rule does not cover the relative spelling of the same path

## Stage: Planning (2026-10-06T05:23:32Z)

### Session summary

The issue was third-party, filed and self-closed within a minute with a close comment claiming a maintainer decision; at the operator's direction it was reopened and planned on [#981]'s `BashCommand.spellings` seam rather than on PR [#917]'s separate `alias-values` intent.
The plan adds a second spelling producer (each resolvable path argument replaced by `AccessPath.value()`), joined to unit words by exact source span, plus a `matchedSpelling` fact through the result, dialog, and review log.
The roadmap disposition ("out of scope for Phase 15") landed as its own commit.

### Observations

- Reproduced on `main` with disposable probes over the real resolver and manager: the defect also fails **open**: an absolute bash `deny` is skipped by `cd /tmp && rm agent-builds/x` and by an in-cwd relative spelling (`allow` via `*`).
  The issue only described the fail-closed half.
- Operator decisions: absolute spelling only (no canonical, no project-relative); include the presentation half in this plan; classify as `fix!` (precedent: [#928]'s MCP last-match-wins change).
- The service advisory (`parseBashCommandsSync`) has no `PathNormalizer`, so without a change it would answer weaker than the gate; the plan replaces it with `BashProgram.parseSync` sharing one builder with `parse`, and deletes `sync-commands.ts`.
- The Tidy-First assessor caught a real hole: `rm $DIR/x` is a rule candidate today, and `path.value()` would invent `/cwd/$DIR/x`, which an absolute `allow` matches.
  The plan guards on `ArgWord.computed` in the enumerator and also excludes glob words.
- Design change from #917: the resolver records spellings per occurrence (before the dedup fold) in an `ArgumentSpeller` the enumerator asks per word node, so `BashPathRuleCandidate` and `CommandWord` stay unchanged.
  `BashCommand.spellings` stays absent when nothing is spelled.
- Expect assertion churn in `program.test.ts` (85 exact `commands()` assertions at planning) at step 6; any diff other than `spellings` there is a finding.
- Measured blast radius (heuristic regex): 310 of 13772 `bash`-surface entries in the local review log are a `cd` followed by a relative slash-bearing argument.
- PR [#917] is still open and conflicting; it is the close target at ship time, and step 6 carries its `Co-authored-by:` trailer.

#### Deferred tidyings

- `token-collection.ts`: the six `role: "operand"` literals share no single factory, because the derived sites have no span; the assessor rejected collapsing them as the wrong abstraction.
- Presentation: the request builders' repeated `executedUnit: null` literals, and the eight test files asserting full request literals; `test/helpers/prompt-details-fixtures.ts` could absorb them.

[#917]: https://github.com/gotgenes/pi-packages/pull/917
[#928]: https://github.com/gotgenes/pi-packages/issues/928
[#981]: https://github.com/gotgenes/pi-packages/issues/981
