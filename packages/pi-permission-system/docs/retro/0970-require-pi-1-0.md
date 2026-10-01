---
issue: 970
issue_title: "pi-permission-system: raise the pi-coding-agent peer floor and devDependency pin past 0.86"
---

# Retro: #970 — pi-permission-system: raise the pi-coding-agent peer floor and devDependency pin past 0.86

## Stage: Planning (2026-10-01T22:01:30Z)

### Session summary

Planned the floor and pin raise to `>=1.0.0`/`1.0.0` for both `pi-coding-agent` and `pi-tui`, following the operator's issue comment that moved the target from 0.86 to 1.0.0.
A reverted spike showed the change compiles and passes with no `src/` edit.
The plan is a two-commit `/build-plan`: a `feat(pi-permission-system)!:` dependency commit, then a README `## Upgrading` entry.

### Observations

- Spike (measured): pnpm added 8 `minimumReleaseAgeExclude` entries for the 1.0.0 family by itself, merging five into `'<name>@0.84.4 || 1.0.0'`, and stopped on `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.28.2` (from `@earendil-works/chord@1.0.0`).
  With `esbuild: false`, `tsc` was clean, the suite passed (175 files, 5174 tests), and `verify:public-types` was OK.
  A first suite run under load had 2 failures plus timeouts; two reruns were clean.
- Operator decision: the header-layout deletion moves out of #970 into #999, which already deletes the whole relocation.
  Doing it here would have rewritten about 50 header-shaped tests that #999 then rewrites again.
  The #999 plan (on branch `issue-999`) says "the header layout is gone" as a prerequisite; that is now false, but its Module-Level Changes ("delete whatever header-layout residue #970 left") covers it.
  The #999 session should re-read `tool-surface-prompt.ts` expecting both layouts still present.
- Operator decision: release is deferred so one major carries both the floor and the #999 fix (ad-hoc batch "pi-1.0 prompt options", #999 the tail; #1009 releases first).
- Commit type `feat!:` follows `10683290` (the prior pure floor raise); the two `fix!:` precedents the issue cited carried behavior fixes.
- Rejected: raising `engines.node` to Pi 1.0's `>=22.19.0`, since Pi enforces it upstream.
