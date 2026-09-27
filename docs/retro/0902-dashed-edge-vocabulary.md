---
issue: 902
issue_title: "Improvement roadmap: standardize the dependency diagram's dashed-edge vocabulary"
---

# Retro: #902 — Improvement roadmap: standardize the dependency diagram's dashed-edge vocabulary

## Stage: Planning (2026-09-27T00:44:21Z)

### Session summary

Planned an eight-step change: two Tidy-First refactors (a field-driven ordinal remap in `parseSteps`, a relation-parameterized `checkDependencyClaim`), then parser, validator, live-document, and skill/prompt steps.
The operator settled the vocabulary as two kinds (`-->` hard, `-.soft.->` soft), a both-directions soft check at warning severity, and soft bullets on Phase 15's five open steps only.

### Observations

- The issue's "two live roadmaps" premise had moved: pi-subagents Phase 22 is archived, so pi-permission-system Phase 15 (13 steps, 11 bare `-.->` edges, one `**Soft dependency:**` bullet) is the only live input.
- The corpus had a fourth spelling the issue did not list: archived pi-permission-system Phase 10 uses a pipe-labelled `-.->|"soft ordering — …"|`, which the current `EDGE` regex silently drops.
  The candidate regex was run over every roadmap diagram in the repo and caught it (old 1, new 2) without adding anything else.
- The landed-step rule (`improvement-discovery`: a landed step's field block stays as written) is why five soft warnings will stand on Phase 15's `✅` steps until it archives; this was put to the operator as a priced option rather than resolved silently.
- Each draft soft bullet's reason is taken from the roadmap's own prose or sweep dispositions, and every draft was run through `parseStepReferenceRun`. `#978`'s edge from `#979` carries only an operator placement decision, so its bullet says exactly that.
- Phase 15 already has 3 errors and 1 warning unrelated to this issue; the plan's per-step predicted-output table counts around them rather than fixing them.
- The `tidy-first-assessor` recommended the two refactors adopted as steps 1 and 2; `classifyLink` stays inside step 4 as new logic.

#### Deferred tidyings

- `scripts/roadmap/parse-roadmap.mjs`: `EDGE` does not read chained links (`A --> B --> C`) or `&` fan-out; no roadmap uses either today.

## Stage: Implementation — TDD (2026-09-27T01:00:16Z)

### Session summary

All eight planned steps landed as separate commits: two Tidy-First refactors, the soft-bullet parse, edge classification, the soft-claim warning, the unrecognized-edge error, the Phase 15 respell with five soft bullets, and the skill/prompt vocabulary.
Root tests went from 221 to 247; `check`, `lint`, and `fallow dead-code` are clean.

### Observations

- Every live-check prediction in the plan's table held exactly: 3 errors and 2 warnings after the soft check, 14 errors and 2 warnings after the spelling check, and 3 errors and 6 warnings after the Phase 15 respell.
- Deviation: `EDGE` also matches Mermaid's text-on-arrow forms (`-- x -->`, `== x ==>`), so they surface as unrecognized instead of being dropped; two extra table rows and a mutation pin it.
  The corpus re-run still shows only the Phase 10 pipe edge as a difference from the old pattern.
- Deviation: the acyclicity test `ignores soft edges` drew a soft back-edge with no bullet, which the new soft check warned on; its fixture gained the explaining `softDependency`, noted in the `feat:` commit body.
- The step 1 and step 3 killing mutations each reddened one more test than predicted (the bracketed-claim tests also depend on the remap converting reference objects to numbers); step 2's reddened all four hard-message tests, not three.
  All extra reds are discriminating, not noise.
- The step 4 commit used a heredoc `git commit -F -`, which `AGENTS.md` names as a deny-rule tripwire; the gate did not fire, and later commits used repeated `-m`.
- Pre-completion reviewer: WARN.
  Its two decision-surface findings ask whether `roadmap-check.mjs`, the only outside importer of `parseRoadmap`/`validateRoadmap`, still gets what it expects; it reads only finding fields, its unmodified test passes, and the reviewer's own live run matched the prediction.
  It independently confirmed byte-identical hard messages, a strict-superset edge capture over the whole corpus, and no edit to a landed Phase 15 step block.
