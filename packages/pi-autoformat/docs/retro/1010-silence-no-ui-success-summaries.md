---
issue: 1010
issue_title: "[pi-autoformat] console.log fallback paints over fullscreen TUI (in-process subagent sessions) and pollutes stdout in `pi -p`"
---

# Retro: #1010 — [pi-autoformat] console.log fallback paints over fullscreen TUI (in-process subagent sessions) and pollutes stdout in `pi -p`

## Stage: Planning (2026-10-02T23:15:32Z)

### Session summary

Planned a fix for a third-party report (@code-lixm): drop the no-UI `console.log` success summary in `pi-autoformat`, remove the legacy success-message builder it leaves dead, narrow `reportMessage` to warnings, and update README/`configuration.md`.
The operator picked the reporter's patch (option A) and classified it as non-breaking `fix:`.

### Observations

- The `pi -p` stdout half of the report is false: Pi's `takeOverStdout()` reroutes stdout to stderr for every non-interactive mode, measured with a probe extension under the installed Pi 1.0.0 (stdout empty, stderr carried both lines).
- Our own `pi-subagents` binds children with `bindExtensions({})`, so this repo's setup is affected too; a child cannot be told apart from `pi -p` (both `hasUI=false`, `mode="print"`).
- Option B (silence all no-UI output) was rejected because it would drop `pi -p` config-issue warnings that are reported nowhere else; the residual (child failure/config warnings still paint) is accepted in Non-Goals, not filed.
- The Tidy-First assessor found no preparatory tidying; its dead-helper list (`buildLegacySuccessMessage`, `summarizeSuccessPaths`, `summarizeFallbackUsages`, `FlushSummary.fallbackUsages`) was re-verified by grep and folded into the `fix:` step, with the `NotificationType` narrowing as a follow-on `refactor:` step.
- Deleting the new `if (!ctx.hasUI) return;` does not turn the test red, because `setAutoformatStatus` already no-ops without a UI; the plan records this so the implementer doesn't chase it.
- The `fix:` commit carries `Co-authored-by: JoyceWil <42863578+code-lixm@users.noreply.github.com>`.
