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
