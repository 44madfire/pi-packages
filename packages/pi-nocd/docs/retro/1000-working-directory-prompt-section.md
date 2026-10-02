---
issue: 1000
issue_title: "pi-nocd: returning a forced `systemPrompt` drops Pi 0.99.2's `<mcp_servers>` section"
---

# Retro: #1000 — pi-nocd: returning a forced `systemPrompt` drops Pi 0.99.2's `<mcp_servers>` section

## Stage: Planning (2026-10-02T05:37:53Z)

### Session summary

Reproduced the defect on Pi 1.0.0 through the real CLI: `<mcp_servers>` was present without pi-nocd and missing with it, and a spike that assigns `sections.working_directory` restored it.
Planned the fix as a breaking change: the handler only assigns `event.systemPromptOptions.sections.working_directory`, the string path and its safeguards are deleted, and the peer floor moves to `>=1.0.0`.
The plan is in `packages/pi-nocd/docs/plans/1000-working-directory-prompt-section.md`.

### Observations

- The issue proposed keeping the string return as a fallback for hosts older than 0.86.
  The operator chose instead to raise the floor to 1.0.0 and drop the string path entirely.
  That removes `ensureWorkingDirectoryPrompt`, `findOurBlock`, the idempotency check, and the foreign-heading suppression.
- The string path also covered a second case that a floor raise does not touch: an earlier handler that forces the prompt.
  The operator accepted losing the block there, as ADR 0015 did for pi-permission-system.
  Measured with pi-ask 1.2.0: when it loads ahead of the spike, the sentence count is 0; when it loads after, the count is 1.
- The operator's main concern was pi-subagents.
  The #640 guarantee is now held by pi-subagents' `inheritedIdentity` cut, which drops everything from `<cwd>` onward, plus each child's own pi-nocd.
  No section-shape test pinned an extension section after `<cwd>`, so plan step 1 adds one to pi-subagents.
  At planning time it passed on current source and was killed by an early `return prompt;`.
- The plan stays in the pi-nocd directory even though step 1 adds a pi-subagents test: that test is the only pi-subagents change, and pi-nocd is the only package released.
- The `# Working Directory` heading is dropped (operator's call): the section content is the sentence only, the same way Pi writes its own sections.
- [#846] becomes moot because the rewrite branch it asks about is deleted; close it at `/ship`.
- The tidy-first assessor recommended no preparatory commits.
  It found `.pi/skills/package-pi-nocd/SKILL.md`'s `findOurBlock` row, which the plan's docs step now updates.
- Run the end-to-end check (plan step 5) before `/ship`; #999's check was skipped and caught this issue only afterwards.
  The probe lives at `/tmp/nocd-e2e/probe.ts`.

## Stage: Implementation — TDD (2026-10-02T05:50:11Z)

### Session summary

Completed all five plan steps: the pi-subagents pin, the devDependency bump to Pi 1.0.0, the breaking fix, the README and skill update, and the end-to-end check. pi-nocd's suite went from 11 tests to 7: the 7-test `ensureWorkingDirectoryPrompt` suite and the heading test were removed, and 3 handler tests plus 1 exact-sentence test were added. pi-subagents' `prompts.test.ts` gained 1 test, 81 in total.

### Observations

- Every killing mutation hit exactly the tests the plan predicted:
  - restoring a `systemPrompt` return reddened 1 test (the `undefined`-return test);
  - deleting the assignment reddened 2 (both section tests);
  - replacing `sections` wholesale reddened 1 (the preserve-existing test);
  - prepending the heading reddened 1 (the exact-sentence test);
  - an early `return prompt;` in `inheritedIdentity` reddened the pi-subagents pin.
- The handler tests' Red step proved nothing about their assertions: they all crashed on the missing `event.systemPrompt`.
  The mutations above are what shows each assertion discriminates.
- End-to-end on Pi 1.0.0 (fresh `pi -p`, `builtin:mcp`, one configured server): without pi-nocd, `<mcp_servers>` 1 and `<working_directory>` 0.
  With the working tree's pi-nocd, `<mcp_servers>` 1, `<working_directory>` 1, and `# Working Directory` 0.
- Deviation: I amended the fix commit's message to put `BREAKING CHANGE:` in the final paragraph, below `Refs #1000`, matching the precedent of pi-permission-system's floor raise.
- Pre-completion reviewer: WARN.
  - `packages/pi-subagents/docs/decisions/0006-inherited-prompt-is-identity-only.md` (line 91) still cites [#846] as tracking pi-nocd's rewrite path.
    This is ADR history, so the fix is to close [#846] at `/ship`, not to edit the ADR.
  - pi-subagents' `unanchored` no-skills path returns a parent's prompt unchanged when its `<cwd>` body does not match `toPromptPath(inherited.cwd)`.
    The reviewer found no way to reach it.

[#846]: https://github.com/gotgenes/pi-packages/issues/846
