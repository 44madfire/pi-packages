---
issue: 1029
issue_title: "pi-permission-system: a forwarded bash ask loses the wrapper floor and auto-approves under a permissive catch-all"
---

# Retro: #1029 — a forwarded bash ask loses the wrapper floor and auto-approves under a permissive catch-all

## Stage: Planning (2026-10-06T00:56:15Z)

### Session summary

I reproduced the bypass through the real parser, `resolveBashCommandCheck`, and the serving node's `buildResolvedIntentFromMatchValues` + `PermissionResolver.resolve`, and measured it in the local review log.
All 74 of 74 forwarded bash auto-approvals were floored asks.
The plan carries a chain-level `floor` fact from the child's `PermissionCheckResult` onto `ForwardedAccessFacts`, and a new `ResolverServingPolicy` (`src/policy/serving-policy.ts`) clamps a serving `allow` to `ask` with it.
I filed two follow-ups, [#1030] (a new Phase 15 step) and [#1031] (out of scope), and recorded both in the roadmap.

### Observations

- Operator decisions:
  - Scope B: the floor travels when any asking unit was floored, not only the winner.
  - A serving node in yolo still approves a floored forwarded ask, which is today's "yolo approves everything".
  - Commit type `fix:`, not `fix!:`, despite the #992/#609 "newly prompts" precedent.
- The spike found a wider bypass: the serving node judges only the chain's winning unit (`ls && rm -rf /tmp/x` under a parent `ls*: allow`).
  I filed it as [#1030] and placed it directly after this step; it and [#1019] likely share one per-unit wire shape.
- A serving session grant must stay exempt from the floor (local parity: the runner's session fast path tests `source` before `state`), or whole-serving-session grants stop sticking for floored commands.
- Zone constraint: `authority/` may not import `policy/`, so the serving policy class lives in `policy/` with a type-only import of `ServingPolicy`.
  `ForwardedRequestServer`'s deps bag does not grow; yolo enters through the policy.
- `test/authority/forwarded-request-server.test.ts`'s `ServingPolicy resolves…` block hand-rebuilds the `index.ts` lambda.
  Step 3 moves it onto the extracted class, which closes that drift.
- The Tidy-First assessor claimed the composition-root `approveForwardedRequest` drives the parent's server end to end.
  It does not: it writes the response by hand.
  So the serving wiring is pinned through the class tests, not the composition root.
- Unverified lead, not filed: locally, a session-sourced floored unit that wins a tie fast-paths the whole chain through `GateRunner`'s session branch, approving sibling asking units.

#### Deferred tidyings

- None.
  The assessor rejected widening `accessFactsFromValue` with a `floor` parameter (its skill callers never floor) and moving the `ServingPolicy` interface; neither is debt.

[#1019]: https://github.com/gotgenes/pi-packages/issues/1019
[#1030]: https://github.com/gotgenes/pi-packages/issues/1030
[#1031]: https://github.com/gotgenes/pi-packages/issues/1031
