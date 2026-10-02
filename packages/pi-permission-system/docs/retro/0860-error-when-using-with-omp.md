---
issue: 860
issue_title: "pi-permission-system: error when using with omp"
pr: 908
---

# Retro: #860 — pi-permission-system: error when using with omp

## Stage: PR Review (2026-10-02T21:08:50Z)

### Session summary

PR [#908] by @JasonLandbridge makes the `before_agent_start` handler tolerate the payload Oh My Pi sends: `systemPrompt` as a `string[]` and no `systemPromptOptions` field.
It was narrowed over two revisions to the "harden against a contract violation" half of the host non-goal in `README.md` § Scope and non-goals, after its hashline-envelope half was declined as [#922].
The operator chose to adopt it as-is, with the commit subject reworded on the contributor's branch before a rebase-merge.

### Evaluation

The defect reproduces on current `main` (`266896aa`), in a different form from the report.
The `.replace` crash from #860 is gone: `normalizePrompt` was removed by the #999 rework.
Running the PR's two new tests against `main`'s source fails both, for distinct reasons:

- Array prompt with no options — `TypeError: Cannot read properties of undefined (reading 'customPrompt')` in `hasCustomPrompt`.
  This is what real Oh My Pi sends: its live `BeforeAgentStartEvent` (v18.4.12, read 2026-10-02) declares `systemPrompt: string[]` and no `systemPromptOptions`.
- Array prompt with options — no crash, but `resolveAgentName` silently returns `null`, so per-agent policy is not applied.
  No host is known to send this shape; it is the quieter and worse failure.

The diff is minimal and touches only `src/handlers/before-agent-start.ts` and its test.
It normalizes the prompt once at the boundary (`typeof … === "string" ? … : .join("\n")`), which is the sole reader of `event.systemPrompt`, makes `systemPromptOptions` optional, guards `isSubagentUnderCustomPrompt` with `options &&`, and returns `{}` after `setActiveSkillEntries` when options are absent.
Both halves are required for the real Oh My Pi payload, and both are normalization of a field the package already reads, so the change stays inside the non-goal.

Regression risk for Pi is nil: a string passes through the ternary unchanged and Pi always supplies options, so neither guard fires.
Enforcement is unaffected: `setActive` tool filtering and `setActiveSkillEntries` run before the early return, and the skill and tool-call gates fire on their own events.
The only thing skipped without options is narrowing the prompt's `<skills>` catalogue, which is presentation.
Oh My Pi's runner wraps a string `systemPrompt` result itself, and the handler on `main` returns no `systemPrompt` anyway, so the earlier output-shape divergence is moot.

Checks, run on the branch rebased locally onto `main`: `pnpm run check` passes, `pnpm run lint` passes with no Biome warnings, and the package suite passes 175 files / 5206 tests.
The PR head's own CI run succeeded.

Two test nits, not worth a round trip: the fixture splits the `<active_agent>` tag across fragments, which no real host does, and the cases sit in a flat `it.each` rather than a nested `describe`.

### Decision and attribution

Adopt as-is.
Before merging, reword the single commit on the contributor's branch (`maintainerCanModify` is `true`) to `fix(pi-permission-system): tolerate a non-Pi before_agent_start payload (#860)`, since git-cliff reads the changelog line from the subject and "support OMP prompt arrays" contradicts the published host non-goal.
Edit the stale PR body, which still describes the dropped renderer changes, and replace its `Fixes #860` with `Refs #860` so the issue gets a curated close comment.
Then rebase-merge, which keeps @JasonLandbridge as the commit author.

The change is a `fix:`, not breaking.
Out of scope: anything modeling Oh My Pi's own semantics, per the host non-goal and [#922].

Credit: the commit's author is `JasonLandbridge <jasonlandbridge@protonmail.com>`, so no `Co-authored-by:` trailer is needed on it; any follow-up commit carrying his design gets `Co-authored-by: JasonLandbridge <jasonlandbridge@protonmail.com>`.
The #860 close comment and the PR close comment thank @JasonLandbridge and link the merged SHA.

[#908]: https://github.com/gotgenes/pi-packages/pull/908
[#922]: https://github.com/gotgenes/pi-packages/pull/922
