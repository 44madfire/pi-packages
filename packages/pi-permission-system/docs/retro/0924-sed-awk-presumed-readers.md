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

## Stage: Implementation — TDD (2026-09-29T13:46:04Z)

### Session summary

All seven planned TDD steps landed, plus one reviewer-driven fix and its docs commit: the guard-predicate reshape, the `prove()` test helper, the quoted-option wrapper bypass fix, `sed` in two steps (option walk and minimal grammar, then the full grammar), `awk`, and the docs (configuration, ADR 0013 §7 amendment, architecture `✅`).
The `pi-permission-system` suite went from 4824 to 4992 tests (+168).

### Observations

- Deviation, step 4: the `computed` rule needed two additions to be sound.
  `readArgWord` also marks a word computed when the shell rewrites its spelling (an escape, a glob, an ANSI-C string), and `commandArgumentWords` now reads every named non-prefix, non-redirect child, not only `ARG_NODE_TYPES`.
  Without the second, a bare `$opt` vanished from the argument list, so `sed -n 1p $opt ~/x/f` proved read-only while `$opt` could be `-i`.
- Deviation, step 5: the corpus re-run measured 901/1013 `sed` units proven, not the plan's "913 or more"; the gap is bare `$f` operands the widened argument list now sees.
- Three test cases in the plan were wrong about the dialect rule: `s/[]/]x/y/` and `s,[^,]*,x,` put the delimiter inside a bracket, so they withdraw.
  A label swallows a `}` (`:done}`), so the proven block form needs a newline before `}`.
- Killing mutations that did not kill as planned: adding `w` to the read-only command set left every test green, because the trailing-text rule already refuses `w out`.
  The load-bearing mutations were deleting the allowlist check (kills `v`, `}`) and relaxing the trailing rule, which needed a new fidelity pin (`pd`).
  Likewise, accepting `w` as an `s` flag survives through the trailing rule, while accepting `e` kills.
- The plan's step-5 bracket mutation needed a new case where only GNU's reading writes: `s/[/]/w out/`.
- Pre-completion reviewer, round 1: WARN, because comma-form brace expansion (`{-i,-n}`, `-n{,i}`) was not marked computed.
  Fixed in `fix(pi-permission-system): a brace-expanded argument withdraws sed's and awk's read claim`.
  `tree-sitter-bash` splits a comma brace into a `concatenation` of plain words, so the check reads the concatenation's text; a first attempt on `word` nodes also flagged `find -exec … {} +`'s empty placeholder, which bash does not expand.
- Pre-completion reviewer, delta round: PASS.
- A full-suite run once failed two `test/authority/` forwarding tests at about 87 s each; a clean re-run passed, which matches the package skill's host-load note.
- Issue [#880]'s body still cites `xargs sed -n` as floored; the roadmap entry was updated, the issue body was not.

[#880]: https://github.com/gotgenes/pi-packages/issues/880

[#992]: https://github.com/gotgenes/pi-packages/issues/992
