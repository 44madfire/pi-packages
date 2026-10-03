---
issue: 955
issue_title: "pi-permission-system: piInfrastructureDirs includes bare agentDir, so auth.json and mcp-oauth/ are auto-allowed reads that an explicit deny cannot stop"
---

# Retro: #955 — piInfrastructureDirs includes bare agentDir

## Stage: Planning (2026-10-02T23:12:23Z)

### Session summary

I reproduced the bypass through the real extension factory (`makeFakePi` with a real global config).
I priced the change against the operator's review log, which has 486 `infrastructure_auto_allowed` entries.
The resulting six-step plan has two preparatory refactors, three breaking `fix!:` steps (targeted-deny yield, logs carve-out, list narrowing), and a docs step.
I filed #1018 (infra list never canonicalized) and dispositioned it as out of scope for Phase 15.

### Observations

- Two claims in the issue were corrected by measurement.
  - A `path` / `path_read` / `read` deny on `auth.json` already blocks today; only the `external_directory` family is skipped.
  - `flavor.isWithin` returns `true` on equality, so a file entry (`settings.json`) needs no new matching.
- Operator decisions:
  - The list is the issue's list plus Pi's resource-loader roots (`prompts/`, `themes/`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `AGENTS.md`).
  - Carve out the package's own `globalLogsDir`.
    The review log was read twice through the bypass, which contradicts ADR 0010's table row.
  - Only a **targeted** deny overrides the bypass.
    A bare `"*"` (`matchedPattern: "*"`) and the universal fallback (`matchedPattern: undefined`) do not, both measured via the manager.
- Spike trap: on macOS a `mkdtemp` agentDir sits under `/var` → `/private/var`.
  The un-canonicalized infra list then never matches, so the bypass silently does not fire.
  The composition-root tests must `realpathSync` the agentDir.
  This is the origin of #1018.
- The Tidy-First assessor recommended the `InfrastructureReadScope` rename as a leading pure refactor and hoisting `preCheck` above the bypass.
  It also recommended keeping the leaf `isPiInfrastructureRead` array signature with a trailing `excludedDirs = []`, so its ~26 test calls stay unchanged.
- Measured cost of the final design on the operator's log: 6 of 486 entries lose the bypass (4 `sessions/`, 2 review-log reads).

#### Deferred tidyings

- None.
  The assessor's rejections (normalizer-held scope, merging `piInfrastructureReadPaths` into `ExtensionPaths`, and a shared within-any helper) are not worth a separate pass.

## Stage: Implementation — TDD (2026-10-02T23:40:03Z)

### Session summary

All six planned steps landed: two preparatory refactors (`InfrastructureReadScope`, preCheck hoist), three breaking `fix!:` steps (targeted-deny yield, logs exclusion, harness-entry list), and the docs.
The package suite went from 5312 to 5334 tests, all green, and every named killing mutation turned exactly its predicted tests red.

### Observations

- Deviation: `describeExternalDirectoryGate` had 6 direct test calls across the two acceptance files, not the 5 the plan estimated.
- Deviation: `extension-paths.test.ts` lost four per-entry `toContain` tests, subsumed by a full-list `toEqual`, rather than having them rewritten one by one.
- Pre-completion reviewer: WARN on the first round, PASS on the delta.
  - It found that `isTargetedDeny` compared `matchedPattern !== "*"` literally, so a `"**"` catch-all (which compiles identically) counted as targeted.
    It now uses `/^\*+$/`, and a unit test plus two mutations pin it.
  - It noted no prefix-collision pins existed, so `settings.json.bak` and `skills-old/` were added to the composition-root `it.each`.
    A prefix-glob mutation of the entry list kills exactly those two.
  - It found that a symlinked `agentDir` plus a user glob leaves the logs exclusion unmatched: the same un-canonicalized derivation as #1018, recorded as a comment there.
  - Both code fixes were autosquashed into their step commits before push.
    The tree was verified identical across the rebase.
- Scripting trap, twice: an `Edit` body typed `\u2500`/`\u2026` as literal escapes in a comment and a JSDoc.
  Both were caught by grep and rewritten with the real character or plain words.
- A placement slip: inserting the `AGENT_DIR_INFRASTRUCTURE_ENTRIES` constant before `export function` split the function's JSDoc from its declaration, and a scripted move fixed it.

## Stage: Sync (worktree) (2026-10-03T01:44:48Z)

### Session summary

`pnpm run lint` and `pnpm fallow dead-code` pass on the branch.
The plan's marker is `**Release:** ship independently`; all three behavior commits are breaking, so the release is a major.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-955--/2026-10-02T22-41-22-018Z_01a0fec7-7e61-7011-96e4-701e4a6dc9fe.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

- Follow-ups already filed: #1018 (infra list not canonicalized; carries the review's logs-exclusion comment).
- #956 (the bash bypass) stays unblocked by this change but is untouched.
