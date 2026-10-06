---
issue: 1032
issue_title: "pi-subagents: PgUp/PgDn scroll the parent instead of the session viewer in fullscreen mode"
---

# Retro: #1032 — pi-subagents: PgUp/PgDn scroll the parent instead of the session viewer in fullscreen mode

## Stage: Planning (2026-10-06T03:48:31Z)

### Session summary

Verified the issue's root cause against the compiled `pi-tui@1.0.0` and `pi-coding-agent@1.0.0`, and planned the operator's chosen direction.
In fullscreen the viewer mounts as a bottom-anchored overlay, so Pi's focused-overlay deferral delivers PgUp/PgDn/Home/End to it; regular mode stays docked per ADR 0007.
The plan has 8 steps: three Tidy-First preparations, keybinding-driven keys and footer hint, wheel scrolling, the probe-and-mount fix, and ADR 0012.

### Observations

- The issue said Home/End reach the pane in fullscreen; they do not, because `tui.altScreen.top`/`bottom` default to `home`/`end` and are consumed by the same listener.
- Upstream posture: [earendil-works/pi#7574] made bare PgUp/Home/End belong to the fullscreen transcript (Ctrl+ variants to the editor), and [earendil-works/pi#7894] added the focused-overlay deferral.
  This retired the issue's "ask upstream" option.
- `TUI.mode` is public, but `showExtensionCustom` reads `options.overlay` before calling the factory.
  Mode detection is therefore a probe `ui.custom` whose factory calls `done(tui.mode)` synchronously.
  Reading the `tuiMode` setting was rejected because it misses `--tui-mode`.
- The operator ran a live subagent to experiment.
  They observed that the footer hint is wrong in fullscreen, and that today's docked pane covers the editor but leaves Pi's footer visible.
  The second point led to the fixed 3-row bottom margin (Pi's footer is 2 rows, plus 1 when an extension status is set).
- Rejected: temporarily rebinding `tui.altScreen.*` on the global `KeybindingsManager`, and the docked Ctrl+PgUp convention (no native bare keys).
- Chose `tui.altScreen.*` over the issue's `tui.select.pageUp` as the pane's binding ids, because they are the viewport-scroll concept and include top/bottom.
- The tidy-first assessor recommended three preparations, all folded in as Steps 2–4: one scroll clamp, one mounted-pane test helper, and a named `footerHint()`.
  It confirmed `src/index.ts` is unchanged.
- The overlay placement and wheel routing come from reading code, not live observation; Step 8 carries a manual check.

## Stage: Implementation — TDD (2026-10-06T04:06:05Z)

### Session summary

All 8 TDD Order steps landed as separate commits: three Tidy-First preparations, characterization pins, keybinding-driven keys and footer hint, wheel scrolling, the fullscreen overlay mount with the mode probe, and ADR 0012.
The `pi-subagents` suite went from 2030 to 2044 tests (+14, all in `test/ui/session-navigator.test.ts`, which went from 32 to 46).

### Observations

- Step 1 found that a pane receiving a key before its first render scrolls from offset 0, not from the bottom: `scrollOffset` is only snapped to `maxScroll` inside `render`.
  The host always paints first, so the pins render once before sending keys; this is not a defect a user can reach.
- Step 1's plan wording ("PgUp moves the last visible row up a viewport") was off by one because the transcript ends in a padding line; the pin asserts the first visible row shifts by exactly one viewport instead.
- Step 2's `scrollTo` takes an explicit `follow: false` for PgUp and Home, preserving the old behavior on a transcript that fits (where the at-bottom rule would otherwise keep following).
- Step 3: `ui.custom.mock.calls[0]` is typed non-optional, so the guard tripped `no-unnecessary-condition`; `.at(0)` (later `.at(-1)`) fixed it.
- Step 6: the return-to-bottom wheel test survived the plan's `Math.abs` mutation, as it should, since it pins a different class; its own mutation (wheel never follows) killed it.
- Step 7: the "docks when the UI reports no mode" test was green at Red (current behavior), and the `mode === "regular" ? "regular" : "fullscreen"` mutation confirmed it discriminates.
  The plan's separate "probe calls `done` before returning" test was not written as its own case: the fake UI resolves with `done`'s value only when it is called synchronously, so the fullscreen-options test already dies under a `queueMicrotask(() => done(...))` mutation (verified).
  A "mounts once, after a probe that mounts nothing" test pins that the probe passes no mount options instead.
- Three edits failed because `\u` escapes were emitted in `oldText`, and one literal `\u2014` landed in a doc comment and was fixed before commit; anchor non-ASCII edits on ASCII lines.
- Pre-completion reviewer: WARN.
  The finding is that the Step 8 manual check (fullscreen and regular mode against a long transcript) was not run or recorded.
  It needs a fresh Pi session (this session runs the pre-change extension), so it is pending operator verification before `/ship`.
  Check that PgUp/PgDn/Home/End and the wheel move the pane in fullscreen, Pi's footer stays visible, and regular mode is unchanged with no chrome in scrollback.

[earendil-works/pi#7574]: https://github.com/earendil-works/pi/issues/7574
[earendil-works/pi#7894]: https://github.com/earendil-works/pi/issues/7894
