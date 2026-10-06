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

## Stage: Implementation — TDD (2026-10-06T06:28:52Z)

### Session summary

All five TDD steps landed, plus a separate docs commit.
`subagents:record` entries now carry `outputFile` and `toolUses`, and `/subagents:sessions` lists the persisted runs the manager no longer holds as transcript snapshots.
The pi-subagents suite went from 2050 to 2065 tests.

### Observations

- Every killing mutation reddened exactly the tests the plan predicted.
  Dropping `outputFile` from `toPersistedRecord` reddens only the builder test: the observer fixtures carry no session, so `outputFile: undefined` matches an absent key under `toHaveBeenCalledExactlyOnceWith`.
- Process slip, twice: I issued the green-file `cp` backup in the same tool batch as the mutating `Edit`, so the backup captured the mutation.
  Both times I caught it and restored the code by hand before committing.
  The template's rule (separate turn for the `cp`) is correct as written; I just didn't follow it.
- Deviation: `toPersistedRecord` takes `PersistedSubagentRecord` itself instead of a separate `PersistedRecordSource` alias, because the alias would have been identical.
- Deviation: the README, `architecture.md` and package-skill updates landed as their own `docs(pi-subagents):` commit, per the template, instead of inside the `fix:` commit.
- Not done: the live `/reload` check (and whether a run aborted at reload gets its entry recorded) could not run in this non-interactive session.
  The `src/index.ts` relay `sessionEntries: ctx.sessionManager.getEntries()` is typechecked but has no test pinning it.
- Pre-completion reviewer: WARN.
  Its two findings are the `PersistedRecordSource` deviation (accepted) and the unpinned `index.ts` relay, which needs a manual `/reload` then `/subagents:sessions` check before or at ship.
