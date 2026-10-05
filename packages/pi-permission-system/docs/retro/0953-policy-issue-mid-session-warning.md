---
issue: 953
issue_title: "pi-permission-system: a policy-file issue that appears mid-session is never shown"
---

# Retro: #953 — pi-permission-system: a policy-file issue that appears mid-session is never shown

## Stage: Planning (2026-10-05T04:36:30Z)

### Session summary

Reproduced the defect through the real composition root before designing, and the spike found a second defect the issue did not name: a schema error present at `session_start` is notified twice, once by `ConfigStore`'s reporter and once by the policy loop.
That regression arrived with [#933].
The operator chose to dedupe at the source (the policy side reports only its derived notices), to have `AgentPrepHandler` supply the agent name, and to rename both resolver and manager to `getPolicyIssues`.
Plan committed as `packages/pi-permission-system/docs/plans/0953-policy-issue-mid-session-warning.md`, four TDD steps; follow-up [#1028] filed and dispositioned out of scope for Phase 15.

### Observations

- **The spike reframed the issue.**
  Measured: mid-session break → fail-closed notice 0 times; broken at start → `Unrecognized config key` 2 times.
  The issue's "natural fold is a second source over the resolver" would have latched the duplicate in place.
  The cause is that `FilePolicyLoader` and `ConfigStore` both run `loadUnifiedConfig` over the same two `config.json` files, so the loader's accumulated issues are a strict duplicate.
  Only the fail-closed and MCP port notices are unique to the policy side.
- **The first spike timed out (5 s).**
  A `tool_call` against the floored `allow` → `ask` opened a dialog; `before_agent_start` alone re-resolves policy through `isToolFullyDenied`, which was enough.
- **The first gate bounced on a term:** "What is ConfigStore?
  Is that something in Pi?"
  The substance named `ConfigStore` without saying it is this package's settings holder or that the package reads each `config.json` twice.
  Define package-internal class names in a gate's substance, not only SDK terms.
- **The operator's reaction to the duplication ("I'm not thrilled") is now [#1028]:** the duplicated *parsing* is out of scope here; only the duplicated *reporting* is removed.
- **Agent-name timing:** a pi-subagents child is named only by the `<active_agent>` prompt tag, which `AgentPrepHandler` reads after turn prep, so a turn-prep-driven report would lag a turn.
  The report goes in `AgentPrepHandler`; `SessionLifecycleHandler` swaps its now-single-use `resolver` dep for the reporter.
- **Accumulation removal also fixes a latent latch bug:** the loader never forgot an issue, so a fixed-then-rebroken file could not be re-announced; the derived notices are recomputed per resolve.

#### Deferred tidyings

The Tidy-First assessor recommended one preparatory commit, the `getPolicyIssues` rename (step 1), and declined:

- `src/config/config-issue-reporter.ts` + new `policy-issue-reporter.ts`: a shared replace-set latch (e.g. `ReportedIssueSet.unreported(current)`); two callers, and the policy source is agent-keyed.
  Revisit at a third.
- `src/handlers/before-agent-start.ts`: converting `AgentPrepHandler`'s positional deps (now seven) to a deps object; the `src/handlers/` convention is positional.
- Folding both reporters into one class over a `Map` of sources: wrong abstraction given the agent-name parameter.

[#933]: https://github.com/gotgenes/pi-packages/issues/933
[#1028]: https://github.com/gotgenes/pi-packages/issues/1028
