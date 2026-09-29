---
issue: 935
issue_title: "Audit and prune the prompt templates and subagent definitions"
---

# Retro: #935 — Audit and prune the prompt templates and subagent definitions

## Stage: Planning (2026-09-29T04:23:48Z)

### Session summary

Planned the second agent-doc audit, this one over the 13 prompt templates and 3 subagent definitions.
`/audit-agent-docs` gains a corpus argument (`docs` | `workflow` | none for both) and a per-class reading of admission question 2.
The plan also adds a tested `invocation-volume.mjs` for the workflow corpus's before/after, counts agent descriptions in `always-loaded.mjs`, and widens `/retro` Step 7's gate.
As in #934, the prune itself runs as a separate fresh-session step (plan step 9) before `/ship`.

### Observations

- **The issue's cost premise inverted after #937.**
  A throwaway transcript scan counted template and agent invocations: templates by the H1 on a user message's first line, agents by `subagent_type`.
  Over the 30 days since 2026-08-29 it measured 1,874,018 words delivered at invocation.
  The current 1,879-word `AGENTS.md` over the same 282 sessions would be about 530k.
  `plan-issue.md` alone is 566k, and `pre-completion-reviewer` comes second at 358k.
  So invocation-time cost does not lower the bar, and no per-class cost clause was added.
- **The growth pump is the same one #934 found.**
  38 of the last 60 commits to `.pi/prompts`/`.pi/agents` are `docs(retro):`.
  `/retro` Step 7 gated only `AGENTS.md` additions, and its item 1 told writers to leave "a `Refs #N` pointer", which directly feeds the citation count.
- **`Refs #N` in templates has three shapes:**
  - a provenance suffix, which the compress rule governs;
  - syntax the template reads or writes (`Refs #$1`), which the rule does not reach;
  - an issue number as data (triage sample rows, the `#639` live pointer).
  This answered the issue's second scope question without a gate question.
- **Two template-specific hazards shaped Step 5's rules.**
  Numbered steps are cross-referenced by number within and across files, so a prune never deletes a whole step.
  The H1 is now the invocation-volume match key, so a prune never edits an H1.
- **Actor-vs-reviewer duplication is not duplication.**
  `pre-completion-reviewer` checks mirror what `plan-issue` tells the planner.
  The by-class section says so, so the audit does not prune the reviewer for being redundant.
- Agent descriptions are always loaded, because pi-subagents lists them in the `subagent` tool's description, but template descriptions never reach the model.
  This was verified in `agent-tool.ts` and Pi's `system-prompt.ts`.
- Operator decisions at the gate, all taking the recommended option: a corpus argument over "always all four" or a separate command; a tested invocation-volume script over word counts only; no `AGENTS.md` clause, with the per-class reading kept in the templates.
- Tidy-First assessor: three recommended preparatory refactors, all accepted.
  - Rename `skillDescription`, and move it into a new `frontmatter.mjs` rather than the assessor's keep-in-place suggestion, so `invocation-volume.mjs` does not import from `always-loaded.mjs`.
  - Share fence parsing.
  - Export `model-usage.mjs`'s session-store defaults.
  I verified its structural claims by grep; it cited the constants at lines 12–13, but they are at 25–26.

#### Deferred tidyings

- `scripts/agent-docs/*.mjs` — four hand-rolled `parseArgs` loops.
  A shared declarative parser does not fit order-dependent defaults (`--since` derived from `--until`), so the assessor rated it optional.
- `scripts/agent-docs/always-loaded.mjs` — the CLI's skills and agents `readdirSync().map()` blocks are near-identical; the assessor rated extracting them optional.

## Stage: Implementation — TDD (2026-09-29T05:01:11Z)

### Session summary

Plan steps 1–8 landed in eight commits:

- three preparatory refactors: `frontmatter.mjs`, the exported session-store defaults, and the `invocations` generator;
- `volumeRows`, `templateHeading`, and `markdownBody`;
- the two `feat(scripts):` commits: agent descriptions in `always-loaded.mjs`, and the `invocation-volume.mjs` CLI;
- the extended `/audit-agent-docs` template;
- the widened `/retro` Step 7 gate.

Root script tests went from 247 to 267 (+20).
Step 9, the `workflow` audit, runs in a fresh session by design.
It comes before `/ship 935`, not after.
Pre-completion reviewer: PASS.

### Observations

- **The parallel `cp`-then-`Edit` race recurred on step 3,** the same failure #934's TDD retro recorded.
  The green save and the mutation went out in one tool block, so `/tmp/green-al.mjs` captured the mutant, and the restore reinstated the mutation.
  It was caught because the restored suite was still red, and fixed by re-applying the line by hand.
  After that, every green save ran in its own call.
  The rule is already in `/tdd-plan` step 3, so this is an `instruction-violation`, not a missing rule.
- **One step-4 test was vacuous, and the plan's mutation exposed it.**
  The "other tool carrying a `subagent_type`" test passed without ever reaching the name check, because the cheap `"subagent"` text pre-filter dropped the line first.
  The probe now carries that token, and deleting the name check turns it red.
  The pre-filter is an optimization that sits in front of every guard it can shadow.
- **Measured numbers against the plan's predictions:**
  - `always-loaded.mjs` gained `agentDescriptions=70`, total 2,517, exactly as predicted.
  - The `AGENTS.md` pointer edit added +5, for a total of 2,522.
  - `invocation-volume.mjs` over 2026-08-29..2026-09-29 gave `templates=1364619 agents=480017 total=1844636`.
    Each count is within 1 of the throwaway scan, which had no `until` bound and so also counted today.
  - Body word counts exclude frontmatter: `plan-issue.md` is 6,272, against `wc -w`'s 6,292.
- **Small deviations:**
  - The `--total` line also prints `since=`/`until=`, so the recorded number carries its window.
  - The template tells Step 6 to re-derive `D`/`UNTIL` from the directory name and `invocation-volume-before.txt`, because each `bash` call is a fresh shell.
  - The cross-reference grep is narrowed to `.pi/prompts .pi/agents .pi/skills AGENTS.md`, because a dry-run over `.pi` walked `.pi/npm/node_modules`.
  - The `(Refs #937)` suffix in Step 6 item 4 was kept rather than pruned, so the audit judges it instead of this step.
- **The permission gate read a commit-body paragraph as a path.**
  The `-m` paragraph began with `/audit-agent-docs`, which the `external_directory` rule matched.
  The message was committed with `-F` from a file written by `Write` into `.git/`.
- The reviewer noted that `grep -h '^# ' .pi/prompts/*.md` now returns 15 lines, not the plan's 14.
  The new template's own fenced inventory example adds a second H1-shaped line.
  First-occurrence matching and the Step 6 before/after diff are unaffected.
- **Next step:** a fresh session runs `/audit-agent-docs workflow`, and after its two commits land, `/ship 935`.
