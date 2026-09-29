---
issue: 978
issue_title: "pi-permission-system: bash-path-extractor.ts has no production caller; retire the facade or narrow its 1300-line test"
---

# Retro: #978 — pi-permission-system: bash-path-extractor.ts has no production caller; retire the facade or narrow its 1300-line test

## Stage: Planning (2026-09-29T03:06:13Z)

### Session summary

Planned retiring `extractExternalPathsFromBashCommand` and its 133-test file.
Every facade test was classified: 56 have an equivalent elsewhere and 77 migrate to a new `test/access-intent/bash/program-external-accesses.test.ts`.
That file also takes `program.test.ts`'s `externalPaths` describe (81 tests, lines 496–1328), so `externalAccesses()` has one test home.

### Observations

- Operator decisions: retire rather than keep a documented seam, and have the new file own **all** slice-scoped `externalAccesses` tests rather than fold them into the 2916-line `program.test.ts` or add a second home.
- A literal-command match found only 15 of 128 facade commands elsewhere; the ~100 end-to-end shell-syntax cases (quotes, comments, heredocs, `/dev/*`, `//`, `cd` prefix, pattern-first commands) have only unit-layer coverage, so wholesale deletion was not viable.
- The `Explore` audit's totals were wrong: it reported 46 equivalent, but its own table listed 57.
  The recount and three corrections gave 56: lines 414 and 419 become move, because the classifier returns `//` as-is and the normalizer does the collapse, and line 263 becomes equivalent, because it runs the same command as 632.
  Re-derive any count a subagent hands back.
- Describes in `program.test.ts` that assert both slices (`workdir seed`, `effect attribution`, `#875`, `#863`) deliberately stay there.
- The mock headers differ: the facade suite uses a `/mock/home` `homedir` and replaces `node:fs` wholesale, while the new file uses the real `homedir()` and a pass-through `node:fs`.
  Migrated `~` cases become `join(homedir(), …)`.
- Tidy-First assessor: no preparatory tidying warranted.

#### Deferred tidyings

- `test/**/*.test.ts` — 18 files inline the same `vi.hoisted` `realpathSync` pass-through `node:fs` mock; the assessor judged a shared helper the wrong abstraction for this change.
