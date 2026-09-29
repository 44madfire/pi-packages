---
issue: 924
issue_title: "pi-permission-system: sed/awk are unconditionally excluded from the pure-reader core, so print-only invocations still consult external_directory_write"
---

# Retro: #924 — sed/awk are unconditionally excluded from the pure-reader core

## Stage: Planning (2026-09-29T06:33:38Z)

### Session summary

Planned `sed` and `awk` as presumed pure readers whose claim an allowlist prover withdraws (option walk, a fail-closed `sed` script grammar, an `awk` program-text scan, any computed word).
A corpus spike over 981 review-log commands measured 913/1013 `sed` and 134/218 `awk` units proven read-only.
Filed [#992] (computed words in `find`/`fd`/`sort`) and recorded it as a new Phase 15 step after #924.

### Observations

- The issue's flag-only framing (`RETRACTION_GUARDS`-style) is insufficient: a `sed` `w` or `awk` `print > FILENAME` can write an operand, so the guard must prove the script, not just the options.
- A computed argument can spell `-i` (GNU `sed` permutes options), so any computed word withdraws; `commandArgumentWords` did not carry that fact, hence the new `ArgWord { value, computed }` in `node-text.ts`.
- Found a pre-existing bypass: `isTransparentWrapper` passes raw quoted `CommandWord.text`, so `xargs find . '-delete'` and `xargs sort '-o' /tmp/x` get `floorExemption: "core-reader"` (measured via `BashProgram.parse`).
  The operator chose to fix it here as a leading `fix:` step.
- Operator decisions: `sed` + `awk` only (not `gawk`/`nawk`); fold the quoted bypass; file the `find`/`fd`/`sort` computed-word gap separately (#992, new step after #924).
- A GNU-vs-BSD divergence (`[/]` is a bracket on BSD, a delimiter on GNU) is handled by withdrawing whenever a delimiter sits inside a bracket expression in a regex section; the prototype wrongly applied the rule to replacements too.
- A full-suite spike with `sed`/`awk` added to the roster failed only the roster/parity tests, two "outside the core" rows, and one `token-collection.test.ts` attribution test.
- The plan adds an ADR 0013 §7 amendment (script/program-content proofs), which the roadmap's `Target:` did not name.
- The `[#880]` roadmap constraint cites `xargs sed -n` as floored; it goes stale once `sed -n` is core, so the docs step updates the example.

#### Deferred tidyings

- `scripts/measure-core-coverage.mjs`: its header claims a drift check in `command-effects.test.ts` that does not exist.

[#992]: https://github.com/gotgenes/pi-packages/issues/992
