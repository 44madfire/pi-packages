---
issue: 1035
issue_title: "pi-subagents: measure the agents widget's render cost to settle its spinner cadence"
---

# Retro: #1035 — pi-subagents: measure the agents widget's render cost to settle its spinner cadence

## Stage: Planning (2026-10-06T05:11:02Z)

### Session summary

Ran the measurement the issue asks for at planning time, with a throwaway Vitest probe (deleted, not committed) that drove Pi's real `TuiAltScreen` and `TuiMainScreen` with the real `AgentWidget` over real session JSONLs mapped onto Pi's per-entry components.
Fullscreen frames cost 0.06–0.80 ms across transcripts up to 17,998 lines; regular-mode frames cost up to ~8.7 ms and scale with document length.
The operator chose a mode-adaptive cadence (80 ms fullscreen, 250 ms regular/unknown) and to implement it here crediting ReStranger, closing PR #1024 at ship.

### Observations

- The issue's synthetic probe was right that the whole-tree walk persists in fullscreen, but its cost is negligible: Pi's components cache their own lines and the alt-screen diff touches only visible rows.
  The decisive fact is the ~10× fullscreen/regular ratio, which is structural (visible-row diff versus whole-document diff), not machine-dependent.
- `tui.mode` is readable at tick time and follows `/fullscreen` switches because Pi hands widget factories `this.ui`, a renderer-following proxy (`createInteractiveTuiReference`); `session-navigator.ts` already reads `tui.mode`, so the precedent exists.
- Mechanism: `setInterval` fixes its period at arm time, so the plan switches to a self-rescheduling `setTimeout` chain that re-reads the mode on each arm, and moves widget registration ahead of `setTimerRunning` so the first arm sees the captured `tui`.
- Rejected options: flat 80 ms (PR #1024 as-is; ~11% of a core in regular mode on a long transcript, measured), flat 125 ms, keep 250 ms, and a user-facing setting.
- Probe limits recorded in the plan: no custom messages, extension-tool renderers, or images; editor/footer stubbed.
- Tidy-first assessor recommended the timer-chain refactor (already step 1) and a `stubTui` mode tweak (step 2); it verified that every `vi.getTimerCount()` assertion survives the `setInterval` → `setTimeout` switch, and that exactly two tui literals need `mode`.
  Counts re-verified by grep.

#### Deferred tidyings

- `packages/pi-subagents/test/ui/widget-viewport.test.ts`: extracting `fakeTerminal` to `test/helpers` was declined; the real-renderer cadence test lives in the same file, so there is no second consumer.
