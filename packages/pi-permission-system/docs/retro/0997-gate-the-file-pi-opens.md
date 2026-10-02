---
issue: 997
issue_title: "pi-permission-system: path policy and native read can disagree on the effective file target"
---

# Retro: #997 — pi-permission-system: path policy and native read can disagree on the effective file target

## Stage: Planning (2026-10-02T21:57:22Z)

### Session summary

Reproduced the third-party report through the real `PermissionManager` + `PermissionResolver` + `describePathGate`, with Pi 1.0.0's real `resolveReadPath`/`resolveToCwd` imported from the pinned `dist/`.
Measured bypasses: `file://` URLs (percent-encoded too), Unicode spaces, the curly-quote and AM/PM `read` fallbacks, plus filesystem-level case/NFC aliases on APFS.
The operator chose to mirror Pi's resolution for the six built-in tools and split the filesystem-alias class into #1016 (recorded out of scope for Phase 15).
The plan has 11 steps: six preparatory `refactor:`/`test:` steps, four `fix:` steps, and a docs step.

### Observations

- Pi's resolvers are not reachable at runtime, because the package `exports` map publishes only `.`.
  Tests can still import them by relative `node_modules/…/dist` path, and `tsc` resolves the sibling `.d.ts`.
  That makes a parity oracle against the real upstream functions cheap, so it is the plan's drift guard.
- The trigger was the input spelling alone.
  Pi rewrites it in `normalizePath` (all six tools) and `resolveReadPath` (`read` only) after our gate has already matched the typed spelling.
- A second defect turned up in the same mechanism.
  `describeExternalDirectoryGate` decides "outside cwd" from the raw string, so `file:///outside/x` is judged inside cwd and never asks.
  The plan fixes it as its own step (8), moving the decision onto the `AccessPath` boundary value.
- Mirroring is exact, not a union.
  The typed spelling is dropped as an alias when Pi rewrites it, because under last-match-wins a later allow on the typed spelling could beat a deny on the target.
  One consequence: `$HOME/…`, quoted, and whitespace-padded tool paths now match the literal path Pi opens rather than our expanded form.
  This is noted under Risks.
- The `existsSync` probe intentionally differs from `entryExists` (`lstat`).
  Pi's `access F_OK` follows symlinks, so a dangling symlink at the typed spelling makes Pi try the variants.
- The tidy-first assessor recommended exporting the cwd-relative alias helper and porting the `isOutsideWorkingDirectory` tests ahead of the method's removal.
  Both became steps 1–2.
- Considered and rejected: floor-to-ask on divergence (it would prompt on legitimate macOS screenshot reads), and union aliases (they reopen the bypass in the other direction).

#### Deferred tidyings

- `src/presentation/tool-ask-payload.ts`: the per-tool ask payload discloses no resolved target.
  Left as an Open Question rather than a tidying.

## Stage: Implementation — TDD (2026-10-02T22:27:02Z)

### Session summary

All 11 plan steps ran as separate commits, plus two fixups from the pre-completion review.
Built-in file tool paths are now gated as the file Pi opens, in four places: the `path` gate, the per-tool gate, the `external_directory` gate (its boundary decision included), and the service query; a rewritten spelling is also shown under "resolves to" in the ask.
`pi-permission-system` tests went from 5206 to 5311 (+105).

### Observations

- The new `existsSync` probe broke four test files whose `vi.mock("node:fs")` factory returned only `realpathSync`: `path.test.ts`, `tool-call-gate-pipeline.test.ts`, `input-normalizer.test.ts`, and `permissions-service.test.ts`.
  Each now spreads `vi.importActual("node:fs")`, following the `testing` skill rule; the fix went into the step whose call-site change first broke each file.
- Deviation: the six `AccessPath.forPath(…)` expectations in `path.test.ts` were left unchanged.
  They still pass, which makes them a stronger parity pin than switching to `forToolPath`.
  For the same reason the plan's `tool.test.ts` helper switch and the `external-directory.test.ts` edits were not needed.
- Pi's real functions are imported into the parity tests by relative path into `node_modules/.../dist`.
  That trips `local-rules/no-parent-relative-imports`, which is now disabled with a reason at both import sites; a multi-line import needs a block `eslint-disable`/`eslint-enable` pair, not `disable-next-line`.
- `match[2]` from an optional regex group is typed `string`, so `@typescript-eslint/no-unnecessary-condition` rejected `?.`/`??` on it; `match.at(2)` is typed `string | undefined` and passes.
- Behavior widened beyond the plan: the `path` ask now also shows a symlink target, because `buildPathAskPayload` reads `resolvedAlias()`, the same accessor the `external_directory` ask already used.
- Pre-completion reviewer: the first round returned WARN with two findings.
  `docs/configuration.md` still claimed a `read` of `$HOME/…` matches a `~/` deny.
  The `forNativeTarget` docstring overstated parity with `forPath`: an absolute spelling containing `..` or a doubled separator no longer keeps its as-typed alias.
  That is the safe direction, and a test now pins it.
  The second round, scoped to the fixes only, returned PASS.

## Stage: Sync (worktree) (2026-10-02T22:29:27Z)

### Session summary

Pre-push checks passed on the branch: `pnpm run lint` and `pnpm fallow dead-code`, both from the worktree root.
The plan's marker is `**Release:** ship independently`; the follow-up filed during planning is #1016, already dispositioned out of scope for Phase 15.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-997--/2026-10-02T21-28-16-448Z_01a0fe84-9340-7055-ae41-739cd771824c.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

The one behavior change worth a line in the close comment is that built-in file tools no longer match a `$HOME/…` spelling as the expanded home path, because Pi does not expand it.
