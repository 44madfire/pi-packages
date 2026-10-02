---
issue: 1009
issue_title: "pi-subagents: drop the parent's <tools> and <rules> sections from the inherited identity"
---

# Retro: #1009 — pi-subagents: drop the parent's `<tools>` and `<rules>` sections from the inherited identity

## Stage: Planning (2026-10-02T00:15:49Z)

### Session summary

Planned a section-shape-only excision of Pi's `<tools>`/`<rules>` from `inheritedIdentity`, preceded by a Tidy-First refactor that makes `cwdAnchoredTailStart` report which prompt shape anchored the tail.
The mechanism was read from Pi 1.0.0's `buildSystemPromptSections` in the `../../pi` checkout; the preamble measured 169 characters, so `<tools>` opens at offset 171, matching #890's figure.
The plan is three steps: refactor, fix, docs (new ADR 0011 amending ADR 0006 and ADR 0008).

### Observations

- Operator decisions at the gate: keep #901 open, with its residual restated as "no tool list or rules in prose" instead of the parent's list; record the excision as a new ADR 0011 rather than amending ADR 0008 in place.
- ADR 0006 explicitly rejected excising an interior span, and ADR 0010 restates it; ADR 0011 must say why the rejection does not reach `<tools>`/`<rules>` (session-resolved, replaced by the child's own after `<cwd>`, cost accepted on #999).
- Design strengthening beyond the issue's bound: the pair must be adjacent (`</tools>`, blank, `<rules>`) and the trailing blank separator is consumed, so the child of a Pi-authored parent gets exactly the identity a relocated parent produces (`preamble\n\n<docs>…`); the plan pins that with a `toBe` equality test.
- Classified `fix:`, not breaking.
- Without pi-permission-system a child also loses the generic rules; accepted with #901 open.
- Release ordering: ship before pi-permission-system's #999 release.
- At ship, comment on #901.
- No open pi-subagents improvement phase; no follow-up issues filed.

#### Deferred tidyings

- `packages/pi-subagents/test/session/prompts.test.ts`: ~1341 lines; splitting it was declined as out of scope for this change.
