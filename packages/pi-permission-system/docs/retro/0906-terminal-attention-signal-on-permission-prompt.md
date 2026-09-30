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

## Stage: Planning (2026-09-30T03:16:44Z)

### Session summary

Planned an opt-in `promptNotifications` field (`bell` / `osc9` / `osc777`, default off, `feat:`), written through `tui.terminal.write` inside the `presentInlinePermissionPrompt` custom factory, so it fires once when a queued ask's dialog actually opens.
Integrations that need an external program or another tool's protocol (Herdr, `cmux notify`) get a docs recipe on the existing `permissions:ui_prompt` / `permissions:decision` pair instead of a `command` channel.
The plan has five steps: a test-double tidying, the config field, a pure renderer, the wiring, and docs.

### Observations

- Operator decisions at the gate: off by default (a `["bell"]` default would be a changed default, so `feat!:`), a flat array rather than pi-ask's `{ enabled, channels }`, and no `command` channel.
- The `command` question turned on the broadcasts: `ui_prompt` plus the same-`requestId` `decision` already give a downstream glue extension both the start and the end of a prompt, which a start-only `command` hook cannot give, and a project-scope config would otherwise be able to run a shell command on every prompt.
- The seam is `tui.terminal.write` in the `ui.custom` factory, not `process.stdout.write`: it is public in pinned pi-tui 0.79.1, it runs exactly at mount under the dialog queue, and tests can fake it.
  Non-TUI modes stay silent because Pi's `takeOverStdout` reroutes stdout to stderr outside interactive mode.
- The Tidy-First assessor recommended one tidying (named options for `makeFakeView` / `makeView`, plus `terminal` on the fake `tui`), which is step 1.
  It also flagged that `mergeUnifiedConfigs`' array loop cannot take an enum-array key beside two `string[]` keys under a union-keyed write, so the field gets its own block.
- A mistyped channel fails the config closed like every strict field; `resolveDialogKeys`-style tolerance was considered and declined, since its IME rationale does not transfer to an opt-in bell.
- Related but out of scope: Issue #658 and PR #693 (`herdr:blocked`, the declined outbound bridge), and Issue #936 (confirming the broadcasts as a contract).

#### Deferred tidyings

- `test/composition-root.test.ts` `makeTuiCtx`: its fake `tui` is typed `{ requestRender }` inline; step 4 adds `terminal` as needed, but a shared fake-TUI helper with the component test was declined as scope creep.

## Stage: Implementation — TDD (2026-09-30T03:32:39Z)

### Session summary

All five TDD Order steps landed as five commits: the dialog test-double tidying, the `promptNotifications` config field, the pure `renderPromptNotification`, the wiring in the `presentInlinePermissionPrompt` factory plus the `index.ts` thunk, and the docs.
The `pi-permission-system` suite went from 5045 to 5064 tests (+19), and check, lint, and `fallow dead-code` stayed green throughout.

### Observations

- Every killing mutation the plan named was applied and went red, with one planned mutation corrected.
  The plan's step-4 mutation "move the write into `render()`" (applied as moving it into the `requestRender` closure) reddened the before-any-keystroke case and the composition case, but not the once-only case, because a moved write still happens once.
  The once-only case is killed by a duplicated write (mount plus re-render), which was run and went red.
- The Tidy-First assessor's merge-loop warning was confirmed by `tsc`: adding `promptNotifications` to the `["piInfrastructureReadPaths", "authorizerChain"]` loop fails with `Type 'string[]' is not assignable to type '("bell" | "osc9" | "osc777")[] & string[]'`, so the field has its own block, with a comment saying why.
- ESLint's `@typescript-eslint/no-misused-spread` rejected `[...value]` in the control-character filter; `Array.from(value)` iterates the same code points without the flag.
- The composition-root suite "configured permission-dialog hotkeys reach the inline dialog" was renamed to "configured prompt preferences reach the inline dialog", since `makeTuiCtx` is local to it and the notification case belongs beside the hotkey cases.
- The docs' channel table first listed which terminals support OSC 9 and OSC 777; that went unverified, so it now names the bytes each channel writes and defers terminal support to the terminal's own docs.
  The operator's own WezTerm setup (pi-ask with `osc777`) is the only support observed.
- Pre-completion reviewer: PASS.
  Its one note (whether the recipe's `@gotgenes/pi-permission-system` type import resolves) was checked afterward: the package root is `src/service.ts`, which re-exports `PermissionDecisionEvent` and `PermissionUiPromptEvent`, and the doc's existing `ui_prompt` example already uses that path.
