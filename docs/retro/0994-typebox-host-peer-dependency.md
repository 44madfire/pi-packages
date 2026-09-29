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

## Stage: Implementation — Build (2026-09-29T23:20:32Z)

### Session summary

All three plan steps were implemented as separate `fix:` commits: `pi-subagents` (imports, manifest, lockfile, rollup `external`, and two docs), then `pi-colgrep` and `pi-github-tools` (one `typebox: "*"` peer line each).
Step 4 is confirmed: `next-version.sh` prints `pi-subagents-v21.8.1`, `pi-colgrep-v1.5.4`, and `pi-github-tools-v5.0.1`, as the plan predicted.

### Observations

- There were no deviations from the plan.
  `pnpm install` did not change `pnpm-lock.yaml` for the sibling peers, because the existing `typebox` devDependency satisfies them.
- `verify:public-types` passed, and `dist/*.d.ts` still has no typebox references.
- Pre-completion reviewer: PASS.
  It noted that the plan's manifest scan omitted the `@mariozechner/pi-*` names from Pi's `HOST_PROVIDED_EXTENSION_PACKAGES`; it re-ran the scan with all 10 names and found no host-provided dependencies.

## Stage: Sync (worktree) (2026-09-29T23:25:02Z)

### Session summary

Pre-push checks passed: `pnpm run lint` and `pnpm fallow dead-code` are both clean.
The plan's marker is `**Release:** ship independently`; the root should dispatch `pi-subagents`, `pi-colgrep`, and `pi-github-tools` in one release run.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-994--/2026-09-29T22-59-24-028Z_01a0ef64-ecfb-7281-a4f9-847675f5c2f5.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

No follow-ups were filed and nothing was deferred.
The reporter is credited by `Co-authored-by` on the `fix(pi-subagents)` commit; name them in the close comment as well.
