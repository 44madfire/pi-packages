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

[#846]: https://github.com/gotgenes/pi-packages/issues/846
