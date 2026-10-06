---
issue: 1030
issue_title: "pi-permission-system: a forwarded bash ask carries only the chain's winning unit, so the serving node approves commands it never judged"
---

# Retro: #1030 — a forwarded bash ask carries only the chain's winning unit, so the serving node approves commands it never judged

## Stage: Planning (2026-10-06T04:04:45Z)

### Session summary

I reproduced the issue's table and its comment's session-grant case through the real parser, `resolveBashCommandCheck`, and the real `ResolverServingPolicy`.
The plan adds a per-unit fact: the child stamps `askingUnits` (`{command, floor?}` for each asking unit that is not session-granted) on its check result, and that list rides `ForwardedAccessFacts`.
The serving node resolves each unit as a `bash-command` intent, honors that unit's floor, and lets the most restrictive answer win.
I filed [#1033] for a local bypass the spike found and recorded it as a new Phase 15 step after this one.

### Observations

- Operator decisions:
  - Only asking units travel (not child-allowed ones).
  - The local session-tie bypass is a separate issue ([#1033]), placed as a new step directly after this issue.
- The spike's sharpest row: a parent's explicit `rm *` deny never saw `rm` in `ls && rm -rf /tmp/x`, so the line auto-approved on `ls*`.
- Review log (measured): 74 forwarded bash auto-approvals, all floored, and 0 plain-rule chains, so the fix adds no prompts on this operator's log.
- [#1033]: a session-granted wrapper unit floors to an `ask` that keeps `source: "session"`, wins `pickMostRestrictive`'s first-wins tie, and `GateRunner`'s session fast path approves the whole chain locally (reproduced).
- Naming: I rejected `unresolvedUnits`, because `parseUnresolved` already means a parse failure; the field is `askingUnits`, and the per-unit object uses `command` so [#1019] can add `spellings`.
- The chain-level `floor` and `matchValues` stay as the summary that older serving nodes read; with units present, the serving node ignores them.
- The empty-array and malformed `askingUnits` cases are rejected in the reader, which escalates.

#### Deferred tidyings

- `src/handlers/gates/bash-command.ts` and `src/policy/serving-policy.ts` each build the same `bash-command` intent literal; sharing it would need a cross-zone edge, so the assessor rejected it.
- `src/authority/forwarding-io.ts`: `asForwardedAccessIntent` could be split into per-field validators; that is unrelated cleanup.

[#1019]: https://github.com/gotgenes/pi-packages/issues/1019
[#1033]: https://github.com/gotgenes/pi-packages/issues/1033
