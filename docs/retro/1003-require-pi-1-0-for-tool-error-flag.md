---
issue: 1003
issue_title: "pi-github-tools, pi-colgrep: `isError: true` results read as success on Pi < 0.99.0"
---

# Retro: #1003 — pi-github-tools, pi-colgrep: `isError: true` results read as success on Pi < 0.99.0

## Stage: Planning (2026-10-04T02:42:57Z)

### Session summary

Verified the diagnosis against the published `pi-agent-core` 0.75.0 tarball and the pinned 0.79.1 `dist/agent-loop.js`: a returned `isError` is discarded, and a thrown error becomes `isError: true`.
Following the operator's decision, the plan raises both packages' peer floor and devDependency pins to Pi 1.0.0 as two `feat!:` steps, and folds in a `fix(pi-colgrep):` so the collapsed renderer shows `✗` for an error.
The plan is at `docs/plans/1003-require-pi-1-0-for-tool-error-flag.md`.

### Observations

- The gate offered three options: throw from `execute`, docs-only, or raise the floor.
  I recommended throwing, since it is Pi's documented convention and works on every host from 0.75.0.
  The operator chose the floor and set it at `1.0.0`, matching `pi-nocd`, `pi-subagents`, and `pi-permission-system`.
- The issue's claim that throwing costs the structured `details` turned out not to apply: both `err()` builders already return `details: undefined`.
- Keeping `err()` avoids a collision with third-party PR #993, whose new test imports `err`.
- I spiked the devDependency bump to `1.0.0` and reverted it. `tsc`, lint, and the tests were green for both packages (93 and 116 tests), so no source change is needed for the floor steps.
- The colgrep renderer defect, which drew `✓ no matches` for any error, was found during planning, and the operator chose to fold it in. `context.isError` exists from 0.75.0.
- The Tidy-First assessor recommended no preparatory commits.
  It suggested an optional local `captureTool()` test helper, which is folded into step 3's Red.
- The watchlist rows in both package skills already said "from 0.99.0" (commit `3264a775`).
  The plan rewords them for the new floor.
