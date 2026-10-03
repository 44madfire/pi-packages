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

[#604]: https://github.com/gotgenes/pi-packages/issues/604
