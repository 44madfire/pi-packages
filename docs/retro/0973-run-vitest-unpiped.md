---
issue: 973
issue_title: "Add a purpose-built test-running tool so TDD cycles stop hand-assembling vitest shell chains"
---

# Retro: #973 — Add a purpose-built test-running tool so TDD cycles stop hand-assembling vitest shell chains

## Stage: Planning (2026-09-29T05:59:29Z)

### Session summary

Measured Vitest's real output under Pi's bash tool before choosing a form: a passing run is already 9 lines, even for `pi-permission-system`'s 4824-test suite, so the hand-built filter chains compensate for nothing.
The operator chose docs-only at the gate over a project-local extension, a private workspace package, and a published package.
The plan (`docs/plans/0973-run-vitest-unpiped.md`) rewrites the `testing` skill's `## Running tests` and the `/tdd-plan` Red step to prescribe an unpiped run, `-t` narrowing, and `&&` pairing with `check`.

### Observations

- Transcript survey (994 root-cwd sessions): 3306 `vitest run` commands, 2356 piped to `| tail` (exit status masked), 774 to `| grep`, 181 redirected to `/tmp`, 72 with a mutation backup/restore.
- The compact output comes from non-TTY stdout, not only Vitest's `agent` reporter: output was identical with `AI_AGENT`/`PI_CODING_AGENT` unset.
- A failing run is about 20 lines per failure (131 lines for 6 failures, measured); that is the one real verbosity the docs-only route accepts.
- The #962 backup race is already covered: the `cp`-in-its-own-tool-call rule landed in `tdd-plan.md` on 2026-09-24 (`299b2925`), after #962.
- Rejected the tool options under principle 5; the strongest candidate, recorded in the plan's Open Questions, is a private workspace package with a built-in `mutation` parameter (apply, run, restore in `finally`).
  Also noted: `.pi/**` is excluded from ESLint and has no tsc or Vitest coverage, so a project-local extension would ship untested.
- The `git-workflow` and `ship.md` redirect-then-`tail` idiom is predicted unchanged; it is correct for long-output gates and plausibly what agents over-generalize to Vitest.
- No follow-up issue filed; the trigger to revisit is a recurrence in later retros.
