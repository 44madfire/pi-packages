---
issue: 987
issue_title: "pi-subagents: `resume` ignores `run_in_background`, so resuming a background agent blocks the parent until the resumed run finishes"
---

# Retro: #987 — pi-subagents: `resume` ignores `run_in_background`, so resuming a background agent blocks the parent until the resumed run finishes

## Stage: Planning (2026-10-02T19:14:27Z)

### Session summary

Planned a fix for a third-party report that the `subagent` tool's `resume` path ignores `run_in_background`.
The reporter's code trace held; planning also found that a carrier claim is never released after delivery, so a naive background resume would never be announced.
The plan has six steps: extract a shared launch renderer (folding in #988), split `SubagentManager.resume` into a synchronous `startResume`, release stale claims per resume, widen the tool's manager seam, add the background branch, and update the docs.

### Observations

- The stale-claim hazard was confirmed with a throwaway Vitest spike against the real `SubagentManager` (since removed).
  After `spawnAndWait` followed by an unclaimed `resume`, and after a claimed resume followed by an unclaimed one, `record.claimed` stayed `true` in both cases.
  The service's unclaimed `resume` has the same latent defect, and the README contract already promises an announcement.
- Operator decisions at the gate:
  - A resume runs in the background only on an explicit `run_in_background: true`.
    Frontmatter defaults and `locked:` are not consulted.
  - It starts immediately, with no `maxConcurrent` admission; that is filed as #1013.
  - #988 is folded in as a tidy-first renderer extraction.
- Follow-ups filed: #1012 (no widget row when a foreground-spawned agent is resumed in the background) and #1013 (limiter admission).
  `roadmap-fit` exited at step 1 because the package has no open improvement phase.
- The Tidy-First assessor recommended the renderer extraction, the `startResume` split, and the fixture/seam step.
  It rejected merging `resumeExisting` with the background branch.
  It found no existing test that asserts a claim survives an unclaimed resume.
- #988's body cites a reporter-side commit (`a2712e2`) that exists in neither this repo nor the reporter's public forks, so it could not be read.
  The design does not depend on it.
- The `Co-authored-by: Sungbin Jo <goranmoomin@daum.net>` trailer is recorded on step 5, using the address from an earlier credited commit.
