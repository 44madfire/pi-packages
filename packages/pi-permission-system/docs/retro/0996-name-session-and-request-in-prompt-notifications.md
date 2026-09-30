---
issue: 996
issue_title: "pi-permission-system: name the session and the request in prompt notifications"
---

# Retro: #996 — pi-permission-system: name the session and the request in prompt notifications

## Stage: Planning (2026-09-30T05:08:16Z)

### Session summary

Planned a five-step change that makes `promptNotifications` name the session (`osc777` title) and the requested tool and agent (body), never the request's `value`.
A pure `describePromptNotice` in `presentation/prompt-notification.ts` decides the text, `selectAuthorizer` supplies the session facts from `ctx`, and `LocalUserAuthorizer.present` threads a `notice` on the dialog view.
Classified as a non-breaking `feat:`, shipped independently.

### Observations

- Operator decisions at the gate: the title falls back to `pi — <cwd basename>` for an unnamed session (following Pi's own `updateTerminalTitle`), and `osc9` carries `<title>: <body>` because its single field would otherwise lose the session name.
- The `osc9` question bounced twice for context: first for what OSC 9 is, then for which terminals read it and how they present it.
  Verified from ghostty.org and wezterm.org: Ghostty shows OSC 9's one field as the notification title; WezTerm supports both OSC forms; kitty's own protocol is OSC 99 and plain OSC 9 support was not found.
  A gate offering a protocol-level choice needs the protocol briefing up front.
- The session name comes from `ctx.sessionManager.getSessionName()` rather than the issue's `pi.getSessionName()`: `selectAuthorizer` already holds `ctx`, so no `index.ts` wiring is needed; both assert the runner active.
- The issue said 0.79.1 is the peer floor; `package.json` says `>=0.79.0`, and `getSessionName` long predates both.
- The Tidy-First assessor corrected the design's fake-context scope: the notice is built before the mode dispatch, so `makeBaseCtx` (not only `makeTuiCtx`) and `handler-fixtures` `makeCtx` need `getSessionName`; that became step 1.
- Em-dash risk: tests spell the title's `—` as `\u2014` so a mis-emitted glyph in `src/` fails.
- Declined: length-capping the text (pi-ask caps at 120), and naming the shell alias's invoked tool.
