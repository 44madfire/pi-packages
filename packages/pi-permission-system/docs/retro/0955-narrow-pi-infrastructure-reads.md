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
