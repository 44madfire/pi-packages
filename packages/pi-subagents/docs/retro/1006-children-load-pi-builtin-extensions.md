---
issue: 1006
issue_title: "pi-subagents: children never load Pi's built-in codemode, MCP, and tool_search extensions"
---

# Retro: #1006 — pi-subagents: children never load Pi's built-in codemode, MCP, and tool_search extensions

## Stage: Planning (2026-10-02T23:10:38Z)

### Session summary

Planned demand-driven loading of Pi's codemode, tool-search, and MCP built-ins in children, plus `mcp__<server>__*` patterns expanded at spawn against the parent's `pi.getAllTools()`.
The plan raises the Pi peer floor to `>=1.0.0` as a breaking change and folds in the #1004 fixture fix.
Filed #1017 for the pre-0.86 prompt-renderer arms the new floor makes dead.

### Observations

- The issue's premise that "`builtInExtensions` is not exported" was true but incomplete: `createCodemodeExtension`, `createToolSearchExtension`, and `createMcpExtension` have been root exports since 0.99.0 (checked in the published tarballs), so no upstream change is needed.
  The contributor's comment (rharish101) pointed at that SDK route; the plan credits him with a `Co-authored-by:` trailer on the pattern step.
- Spikes against real SDK 1.0.0 established:
  - `builtin: true` factories honor the user's `-builtin:mcp` setting.
  - A named `codemode`/`tool_search` activates in a child.
  - Loading MCP in a `tools: [read]` child still starts the configured server process.
  - That last fact decided demand-driven loading over follow-the-parent.
- The first gate offered a whole-server allow only as "needs upstream", which was wrong.
  The operator answered with a question, and the corrected answer found the parent's `pi.getAllTools()` as an in-package source for expansion.
  The operator then chose patterns in-plan, scoped to `mcp__` entries only.
- The tidy-first assessor recommended the `SubagentSessionDeps` resolver (`listParentToolNames`) over threading the parent's tools through `AssemblerContext`, plus two prep steps: the #1004 type fix and a deps-helper default.
  Both prep steps are in the TDD Order.
- No open improvement phase, so `roadmap-fit` exited at step 1 for #1017.

## Stage: Implementation — TDD (2026-10-02T23:37:37Z)

### Session summary

Implemented all eight plan steps in seven commits:

- the Pi 1.0.0 floor (breaking)
- the name-to-built-in table, then children loading the built-ins their `tools:` names
- `mcp__` pattern expansion, then its wiring through `listParentToolNames`
- the docs

The pi-subagents suite went from 1937 to 1962 tests (+25).

### Observations

- **Deviation:** plan step 1 (the #1004 `ExecuteCtx` cast) could not land ahead of the bump, because at 0.84.4 the cast is redundant and `no-unnecessary-type-assertion` rejects it.
  It was folded into the `feat(pi-subagents)!: require Pi 1.0.0 or later` commit, along with one more cast in `subagent-session.ts` that lint flagged as unnecessary under 1.0.0 types.
  A planning-time check of "type-checks on both SDKs" should also run lint on both.
- Every planned killing mutation went red as predicted.
  The first attempt at step 3's mutations was confounded: the `cp` green-copy ran in the same tool batch as the mutating `Edit`, captured the mutation, and "restored" a mutated file.
  It was caught because a restored file still failed; the rule in `/tdd-plan` (run the `cp` in its own call) is the right one.
- The `debugNote` for an unmatched pattern has no test; `unmatchedPatterns` itself is covered in `mcp-tool-patterns.test.ts`.
- Pre-completion reviewer: WARN, then PASS on the delta.
  The WARN raised three doc nits, all fixed in `docs(pi-subagents): correct the peer scope and MCP details the review flagged`:
  - `comparison-with-upstream.md` still listed the old peer scope
  - MCP starts only *enabled* servers
  - the MCP hash suffix also applies on name collisions
