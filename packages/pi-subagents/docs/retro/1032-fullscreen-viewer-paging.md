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

[earendil-works/pi#7574]: https://github.com/earendil-works/pi/issues/7574
[earendil-works/pi#7894]: https://github.com/earendil-works/pi/issues/7894
