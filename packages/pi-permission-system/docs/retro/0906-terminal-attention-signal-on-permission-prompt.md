---
issue: 906
issue_title: "Emit a terminal attention signal (BEL) when a permission prompt opens"
pr: 921
---

# Retro: #906 — Emit a terminal attention signal (BEL) when a permission prompt opens

## Stage: PR Review (2026-09-30T02:56:21Z)

### Session summary

PR #921 (@jdtzmn) adds `process.stdout.write("\x07")` before `ui.select` in `requestPermissionDecisionFromUi` so a multiplexer or terminal flags a pane blocked on a permission prompt.
The underlying gap in Issue #906 is real: no permission-prompt path in this package emits any out-of-band signal.
The operator chose to decline the PR's code entirely and implement Issue #906 ourselves, with a notification design modeled on `@eko24ive/pi-ask`.

### Evaluation

The defect is confirmed on current `main` by reading the code paths.
A grep of `src/` finds no BEL, OSC, or external notifier on any prompt path.
The operator's WezTerm sounds come from `@eko24ive/pi-ask`, not from this package: `~/.pi/agent/extensions/eko24ive-pi-ask.json` sets `notifications.channels: ["bell", "osc777"]`, and `pi-ask/src/notifications.ts` writes `\x07` and `\x1b]777;notify;…\x07`, but only when an `ask_user` form is waiting.
The operator's `~/.config/wezterm/` has no bell or notification config, and Pi core emits no bell (the only `\x07` in `pi/packages/tui` terminates the opt-in OSC 9;4 progress sequence).

The PR puts the signal on the wrong path.
`requestPermissionDecision` (`src/authority/permission-prompt-component.ts`) routes `mode === "tui"` to `presentInlinePermissionPrompt` (the `ctx.ui.custom` inline dialog, which is the `(y)/(s)/(n)/(r)` prompt quoted in Issue #906).
Only non-TUI modes (`rpc` / `json` / `print`) reach `requestPermissionDecisionFromUi`.
So the PR leaves the reported case silent, and its test passes by exercising only the fallback.
In RPC mode, Pi's `takeOverStdout` (`pi/packages/coding-agent/src/core/output-guard.ts`) reroutes `process.stdout.write` to stderr, so the bell there neither corrupts the JSONL protocol nor reaches any terminal.

The issue's alternatives section claims there is no public "permission requested" event.
That claim is false: `LocalUserAuthorizer.present` (`src/authority/local-user-authorizer.ts`) emits `permissions:ui_prompt` immediately before invoking the dialog, in every mode, forwarded subagent asks included.
That emit site is the right seam for a signal, whether this package owns the notifier or a companion extension subscribes.

What is valuable, and came from the Issue #906 body rather than the PR: the signal fires when the prompt opens (mid-turn, where `agent_end`-driven notifiers never fire), BEL is the universal mechanism, and a config toggle lets a user opt out.
The PR's diff was not checked out or run, because none of its code is adopted.

### Decision and attribution

Direction: decline PR #921 and implement Issue #906 with our own design, planned via `/plan-issue #906`.
Scope for the plan: a configurable notification setting modeled on `pi-ask`'s `notifications.channels` (at least `bell` and `osc777`; weigh `osc9` and `command`), fired at the `permissions:ui_prompt` emit site so it covers the TUI inline dialog and forwarded asks.
The plan settles the default (on or off, and with which channels) and how the signal behaves in non-TUI modes, where stdout is taken over.
Cite `@eko24ive/pi-ask` as prior art in the plan, the docs, and the commit body; it gets no trailer, since its author did not contribute here.

Attribution: @jdtzmn authored Issue #906, whose design (fire at prompt open, BEL mechanism, opt-out toggle) the implementation adopts.
Per the `git-workflow` skill's accepted-design rule, every implementation/docs commit carries `Co-authored-by: Jacob Daitzman <jdtzmn@gmail.com>` in its final paragraph.
If the plan drops that design (for example, only documenting the `permissions:ui_prompt` hook), omit the trailer and credit him in the close comment only.
Close PR #921 with a comment thanking @jdtzmn and explaining the TUI-path miss.
The operator decides whether to close it now as superseded by Issue #906 or at ship with the implementing SHA.
Reference the PR as `Refs #921`, never `Closes #921`.
