---
issue: 1036
issue_title: "Repair prose lines that rumdl's MD018 fix turned into headings"
---

# Retro: #1036 — Repair prose lines that rumdl's MD018 fix turned into headings

## Stage: Planning (2026-10-07T02:52:02Z)

### Session summary

Planned a docs-only repair of 25 prose lines in 12 files that the pre-`magiclink` rumdl MD018 fix turned into headings, plus 98 headings in 10 of those files that the same formatter pass demoted.
The plan holds both repair tables in full; `/build-plan` applies them with a throwaway `/tmp` script and verifies against the tables.

### Observations

- The issue's grep misses four possessive forms (`## 665's`, `## 837's`, `## 917's`, `## 671's`), so the real count is 25 lines, not 21.
- A rumdl 0.2.24 repro with `[MD018]` removed showed the fix also deletes the trailing `.`, inserts blank lines around the line, and demotes later unrelated headings (not as a uniform cascade); the current config leaves the line, including `#3's`, untouched.
- The issue's `git log -S` recovery does not work: `pi-autoformat` and the pre-commit `rumdl fmt` damaged every line before its first commit.
  The originals came from the `Write`/`Edit` arguments in `~/.pi/agent/sessions/` transcripts, which covered all 12 files and every heading in them; every lost character was `.`.
- The operator chose lines plus heading levels, a scripted repair, and no new lint check: `magiclink = true` prevents recurrence and #1037's step 4 re-verifies it under the upgraded rumdl.
- Heading fixes must run before prose fixes (bottom-up), because deleting blank lines shifts line numbers; the script asserts each line's text before editing.
