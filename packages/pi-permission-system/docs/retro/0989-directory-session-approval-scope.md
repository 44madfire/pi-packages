---
issue: 989
issue_title: "pi-permission-system: approving an external directory for the session also approves sibling directories"
---

# Retro: #989 — pi-permission-system: approving an external directory for the session also approves sibling directories

## Stage: Planning (2026-10-03T02:12:10Z)

### Session summary

Planned the fix for a third-party report (`aisensiy`).
A session approval for a directory path records the parent glob, so sibling directories pass without a prompt.
A spike through the real `PathNormalizer` confirmed the defect for built-in `ls`/`find`, a trailing-slash spelling, and an extension tool, not only the reporter's `add_directory`.
The plan has six steps: a refactor, a grant-target fold, a plural pattern carrier, the directory fix, a fallback label, and docs.

### Observations

- The operator confirmed three choices at the gate:
  - Narrow directory grants **and** label the scope.
  - Render the `{D, D/*}` pair as `"D/*"`.
  - Classify the change as a non-breaking `fix:`.
- A directory needs two grants (`D` and `D/*`).
  `*` cannot say "D and its contents" in one pattern: `D/*` misses `D` itself, and `D*` matches `D-evil`.
- The display fold `grantTargets` goes in `session/approval-grant.ts`, not `pattern-suggest.ts`.
  The architecture entry for the latter forbids path semantics.
- The wire shape stays unchanged.
  The serving node recomputes the fold from the grants.
- The directory probe is `statSync` on `value()`.
  It is skipped for a literal-only `AccessPath`, whose `boundaryValue()` is empty.
  An error or a missing path falls back to today's parent glob.
- The fallback label is limited to path-family grants.
  `bash` grants that arrive with no label keep `undefined` options, which tests in `forwarded-request-server.test.ts` assert.
- Tidy-First assessor:
  - Recommended extracting `parentScopePattern`; that is now step 1.
  - Recommended a `tool.test.ts` helper commit; skipped, because `tool.test.ts:60` is already the single construction site.
- Related, and out of scope: [#604], a request to widen the session grant.

## Stage: Implementation — TDD (2026-10-03T02:50:20Z)

### Session summary

I completed all six plan steps, with one commit per step.
Two were refactors, three were fixes, and the last was docs.
A directory's session approval now records `D` and `D/*` instead of the parent glob.
Path asks that prove no direction now name their scope in the session label.
The pi-permission-system test count went from 5334 to 5362 (+28).

### Observations

- Every killing mutation the plan named turned the predicted tests red.
  Mutation 2 in step 4 also killed the pure and round-trip directory cases, more than the plan listed.
- Deviation in step 4: the end-to-end tests first failed with "`ls` is not registered".
  `makeDedupWiring`'s tool registry listed only `read`, `write`, `edit`, and `bash`.
  I added `ls` and `add_directory` to the registry in `test/helpers/external-directory-fixtures.ts`.
- Deviation in step 5: the plan predicted that only the forwarded "names every path" test was affected, and that it would stay green through `objectContaining`.
  It missed the non-forwarded "offers no width option when the grants prove different directions" case in `local-user-authorizer.test.ts`.
  That case now expects `{ sessionLabel: "Yes, allow access to 2 paths for this session" }` instead of `undefined`.
  The change is intended: a mixed-direction path ask now names its scope too.
- In step 3, `describeToolGate` gained private `pathSessionOption` and `valueSessionOption` helpers that return `{ approval, label }`.
  The value-surface `SessionApprovalSuggestion` is unchanged, and a new `PathSessionSuggestion` carries `patterns`.
- Pre-completion reviewer: WARN.
  Its re-derivation confirmed that no input yields a grant wider than the pre-change parent glob.
- Reviewer warnings:
  - A directory whose name contains a glob metacharacter (`a*`) records an exact grant `/r/a*`, which also matches `/r/abc`.
    The folded label `"/r/a*/*"` therefore understates that grant.
    It is still no wider than the old `/r/*`, and the same class already applies to files today.
  - The joined multi-target label in `suggestPathSessionPattern` is unreachable today.

[#604]: https://github.com/gotgenes/pi-packages/issues/604
