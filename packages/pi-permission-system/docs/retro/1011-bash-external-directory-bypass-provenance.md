---
issue: 1011
issue_title: 'pi-permission-system: review log labels config/default-covered external_directory bypasses as "session_approved"'
---

# Retro: #1011 — pi-permission-system: review log labels config/default-covered external_directory bypasses as "session_approved"

## Stage: Planning (2026-10-03T04:10:13Z)

### Session summary

Reproduced the third-party report through the real `PermissionManager` + `PermissionResolver` with the reporter's literal `head -1 /etc/hostname`: both `{"*": "allow"}` and a config `external_directory` allow produce a `session_approval` bypass.
The operator chose to match `GateRunner` (a policy allow writes no review entry) and to keep `session_approved` when at least one path is session-covered, listing only those paths.
The plan has three steps: a type rename, the `fix:` with tests, and docs.

### Observations

- `GateRunner` writes no review entry for any config/default allow, and `bash-path.ts`'s sibling bypass already requires `allSessionCovered`, so this gate was the outlier.
  That is why the issue's alternative (a new `policy_allowed` event / `kind: "rule"` bypass) was rejected: it would have made this the only gate that logs a policy allow.
- Measured in the operator's review log: 10472 bash-bypass `session_approved` entries against 169 `approved_for_session` external-directory grants.
  Most of the 10472 are probably mislabeled config coverage (an estimate: one grant can cover many calls).
- Classified as non-breaking: the bypass never emitted a `permissions:decision` event, so only review-log lines change.
- `Co-authored-by:` for the reporter (`alkrusz`, id 10740345) is recorded in the plan's step 2.
  The session branch adopts their "stamp only when a session-layer rule matched" mechanism.
- The Tidy-First assessor recommended one preparatory rename (`UncoveredExternalPaths` → `ExternalPathCoverage`) and confirmed `selectUncoveredExternalPaths` has a single `src/` consumer.

#### Deferred tidyings

- `test/handlers/gates/bash-external-directory.test.ts` / `external-directory-policy.test.ts`: duplicated local `makeCheckResult` helpers could lift into `test/helpers/gate-fixtures.ts`.
