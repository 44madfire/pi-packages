---
issue: 994
issue_title: "Pi throws warnings about typebox dependency"
---

# Retro: #994 — Pi throws warnings about typebox dependency

## Stage: Planning (2026-09-29T23:10:14Z)

### Session summary

Planned a fix for the startup warning a third-party reporter raised: Pi 0.99's `collectExtensionPackageWarnings` flags host-provided packages in `dependencies`.
In `pi-subagents` the flagged dependency is `@sinclair/typebox`.
The plan migrates `pi-subagents` to `typebox` imports with a `"*"` peer and a devDependency.
Per the operator's call, the plan also folds in `"*"` peers for `pi-colgrep` and `pi-github-tools`, so it is cross-package and the three packages release together.

### Observations

- The first gate got a question instead of a selection: "In pi-permission-system we migrated to zod."
  Zod there validates config only; tool `parameters` must be TypeBox (`ToolDefinition` is typed against `TSchema` from `typebox`), so the zod option was ruled out.
- The operator reported that a pre-`ask_user` context message did not reach them twice.
  The second time, the substance was re-sent as plain text and the turn ended there.
- Spike, measured and reverted: swapping the 5 imports and the manifest left `tsc` clean and all 1876 tests in 81 files passing.
  `dist/*.d.ts` has no typebox references, so the public types are unaffected.
- Pi has aliased `@sinclair/typebox` to its bundled `typebox` 1.x since 0.69.0, so the published runtime behavior does not change; the change is not breaking.
- The `Co-authored-by` trailer for the reporter (`rharish101`) is recorded in step 1 of the plan's TDD Order.
- Tidy-First assessor: no preparatory tidyings.
  It flagged ADR 0003 line 45 and `docs/comparison-with-upstream.md` line 19 as current-behavior prose to update, and both are in the plan.
- Left out of scope: changing the `>=x` ranges on the `@earendil-works/pi-*` peers to `"*"` as Pi's docs recommend, because Pi does not warn on them.
