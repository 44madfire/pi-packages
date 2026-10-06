---
issue: 1034
issue_title: "pi-subagents: /subagents:sessions is empty after /reload"
---

# Retro: #1034 — pi-subagents: /subagents:sessions is empty after /reload

## Stage: Planning (2026-10-06T06:01:00Z)

### Session summary

Confirmed the cause in Pi's `AgentSession.reload()`: it emits `session_shutdown` to the old runner, then re-runs the factory, which builds a fresh empty `SubagentManager`.
The operator chose to rebuild the picker from the parent session's existing `subagents:record` entries, read from the whole session file via `getEntries()`.
The plan has five steps: a test helper, an entry-contract module, new `outputFile`/`toolUses` entry fields, a tolerant reader, and the picker wiring as the `fix:` step.

### Observations

- `subagents:record` had a writer and no reader anywhere in the repo, so the entry contract is free to grow; it lacked `outputFile` and `toolUses`, which the snapshot entry needs.
- Rejected: a `globalThis` manager handoff (new mechanism, reload-only) and a `tasks/` directory scan (child files carry no agent id, type, or description to label with).
- Fallow zones forbid `ui` → `observation`, so the contract lives at the package root (`src/persisted-record.ts`, zone `core`).
- Side effect, accepted: `/resume` and forked sessions now list their earlier subagents too.
- One-time gap: entries written before upgrade carry no `outputFile` and stay unlisted.
- Unverified: whether a run aborted by the reload's shutdown gets its terminal entry appended before Pi invalidates the old runner.
  Step 5's live check records the answer.
- The Tidy-First assessor recommended one preparatory step, a `handleWith` helper in `test/ui/session-navigator.test.ts`, which is in the plan as Step 1.
  It also confirmed that `composition-root.test.ts` does not drive the command.
