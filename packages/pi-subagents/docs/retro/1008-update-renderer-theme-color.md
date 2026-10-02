---
issue: 1008
issue_title: "pi-subagents: the mid-run update renderer calls `theme.fg(\"info\")`, which throws, so updates render as plain custom messages"
---

# Retro: #1008 — pi-subagents: the mid-run update renderer calls `theme.fg("info")`, which throws, so updates render as plain custom messages

## Stage: Planning (2026-10-02T16:00:02Z)

### Session summary

Reproduced the defect through the real code path: a disposable vitest spike passed Pi 0.84.4's real `dark` `Theme` to `createUpdateRenderer()`, and it threw `Unknown theme color: info` while `accent` rendered.
Planned a two-step fix: `"info"` → `"accent"` with `RendererTheme.fg` typed as Pi's `ThemeColor` (`fix:`), then the same tightening on `src/ui/display.ts`'s `Theme` (`refactor:`), each pinned by an `expectTypeOf` check that `tsc` enforces.

### Observations

- The existing test asserted `[info:●]` against a stub theme that accepts any string, so it pinned the bug; the stub cannot catch an unknown color at runtime, so the type pin carries the guard.
- Spike measurement: tightening `RendererTheme` yields exactly 2 `tsc` errors (`"info"`, `StatusPresentation.iconStyle: string`); tightening `display.ts` `Theme` yields 0 more.
- Operator chose "renderer + `display.ts` Theme" over renderer-only and over deduping the two interfaces.
- No runtime test against a real `Theme`: the package root exports neither `getThemeByName` nor the `theme` singleton (only `Theme`, `initTheme`, `ThemeColor`); the spike deep-imported `dist/` instead, which is too brittle for the suite.
- The Tidy-First assessor recommended no preparatory commits; it noted that the unexported `RendererTheme` can be pinned via `Parameters<ReturnType<typeof createUpdateRenderer>>[2]["fg"]`.

## Stage: Implementation — TDD (2026-10-02T16:59:27Z)

### Session summary

Completed both TDD cycles: the `fix:` commit switches the update renderer to `accent` and types `RendererTheme.fg` as `ThemeColor`, and the `refactor:` commit types `display.ts`'s `Theme.fg` the same way.
Added two `expectTypeOf` pins (one per interface), which `tsc` enforces; the vitest count rose by 2 (the pins are runtime no-ops).
Every named killing mutation went red: `"accent"` → `"dim"` failed the vitest assertion, and reverting either `fg` parameter to `string` failed `run check`.

### Observations

- Deviation: the plan's "0 new `tsc` errors" for the `display.ts` tightening was never actually measured.
  The planning spike's `perl` regex expected `};` right after the `fg` line, but `bold` sits between them, so the substitution matched nothing.
  The real fallout was one private helper, `subLine` in `src/tools/get-result-renderer.ts`, whose `color: string` parameter now reads `Parameters<Theme["fg"]>[0]` (all three callers pass literals).
  A direct `ThemeColor` import there was avoided because the module header says "No SDK types".
  Lesson: after a scripted spike, confirm the substitution applied (`git diff --stat`) before reading its result, as the `testing` skill already says for mutations.
- `display.ts`'s header ("no SDK") was reworded to "no SDK runtime imports", since the new import is type-only.
- The operator asked whether this raises the Pi floor to 1.0.0.
  It does not: the published 0.81.0 tarball (the current `>=0.81.0` floor) already exports `type ThemeColor` with `accent`, and the import is type-only.
- Pre-completion reviewer: WARN.
  The only finding was that it did not capture `fallow decision-surface` output.
  Re-run here: it surfaced 3 `public-api-contract` decisions, for `display.ts`, `renderer.ts`, and `get-result-renderer.ts`.
  All their consumers are inside the package and compile under `tsc`, and none of the three modules is in a public entry.
