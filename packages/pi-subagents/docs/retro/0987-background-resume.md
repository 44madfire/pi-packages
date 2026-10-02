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

## Stage: Implementation — TDD (2026-10-02T19:39:42Z)

### Session summary

I implemented all six plan steps, plus one extra characterization commit, with every step's named killing mutation applied and observed red.
The `subagent` tool now resumes in the background on an explicit `run_in_background: true`, and a resume nobody claims clears a stale carrier claim, so it is announced.
The pi-subagents suite went from 1898 to 1915 tests (+17).

### Observations

- Deviation: I added an extra `test:` commit ("pin the background spawn launch message verbatim") before the renderer extraction.
  The existing `spawnBackground` tests used `toContain`, so they could not hold the text byte-identical as the plan claimed.
- Deviation: `mockResumeStart`/`mockResumeStartRefusal` moved from step 4 into step 5's commit.
  With no consumer yet, `fallow dead-code` flagged them in step 4.
- The background-resume tool test expects `Type: Agent`, which is the display name the test registry resolves for `general-purpose`, not the type name the plan's sketch implied.
- The "leaves the resumed outcome uncollected" and "ignores an agent file's default" tests were green during Red, as deliberate pins.
  Mutations (d) and (b) each killed exactly the pin they target.
- Mutation (a) killed four tests, not just the one the plan named, because every background-resume assertion depends on the branch existing.
- Mid-step, a Python block move misplaced a test across `describe` blocks.
  I recovered with `git checkout` of the test file and a single anchored `Edit`; per the `edit-tool` skill, prefer `Edit` for block insertion over scripted moves.
- Pre-completion reviewer: PASS.
  It re-derived all three claim producers (`spawnAndWait`, a claimed resume, the `get_subagent_result` wait) and confirmed each is stale by the time a resume can start.
  It noted one pre-existing race, which this change does not make worse.
  A `get_subagent_result(wait: true)` waiter that wakes after a resume has begun calls `release()` unconditionally and could clear a foreground resume's claim.
  That needs two concurrent parent tool calls on one agent; I have not filed it.
