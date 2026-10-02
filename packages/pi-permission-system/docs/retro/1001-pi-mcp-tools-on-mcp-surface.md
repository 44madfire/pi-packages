---
issue: 1001
issue_title: "pi-permission-system: Pi's native MCP tools (`mcp__<server>__<tool>`) bypass the `mcp` surface"
---

# Retro: #1001 — pi-permission-system: Pi's native MCP tools (`mcp__<server>__<tool>`) bypass the `mcp` surface

## Stage: Planning (2026-10-02T19:26:39Z)

### Session summary

Planned a narrow fix routing Pi's built-in MCP tools (`mcp__<server>__<tool>`) to the `mcp` surface: a new `mcp-tool` tool kind, Pi-name candidate derivation emitting both the `mcp.json` and sanitized server spellings, project `.pi/mcp.json` server names, exposure agreement, relocation of legacy top-level `mcp__…` keys with a port notice and migration guide, and a fix for forwarded `mcp` values resolving as `mcp_status`.
Filed #1014 for the MCP permission model as a whole and dispositioned it against Phase 15 as deferred to a later phase.

### Observations

- The operator asked first whether this was long-standing and why the `mcp` kind is shaped differently.
  Answer: the gap opened with Pi 0.99.0's built-in MCP (2026-09-29); the `mcp` kind dates to the fork's bootstrap (2026-03-02) and models pi-mcp-adapter's proxy input `{ tool, server, args }`.
- Classifying Pi MCP tools as the existing `mcp` kind was rejected: `getToolInputPath` reads `input.arguments.path` for `mcp`, so it would have dropped `path` gating on Pi tools, whose arguments are top-level; the preview formatter would also have hidden their arguments.
- `-`/`_`: the operator objected to collapsing to `_` only.
  Pi's `b29db895c` (closes earendil-works/pi#10239) sanitizes tool names and rejects servers differing only in `-`/`_`, which is what makes emitting both spellings safe; folding in the matcher was rejected because it would also widen proxied matching.
- Top-level `mcp__…` keys: the operator chose relocation plus a notice to port, with a migration guide; rule stated: "we must always fail loudly".
- Dropping proxy support was considered and declined: pi-mcp-adapter had 483,466 downloads in the week ending 2026-09-30 versus 16,634 for this package (npm API, measured), and adapter 5.0.0 disables Pi's built-in MCP, so its users depend only on proxy semantics.
  Dropping it would silently turn a per-server `mcp` deny into the `mcp` catch-all and lose `arguments.path` gating.
- Earendil's "You Said No MCP!"
  post (2026-09-29) frames built-in MCP as a deliberate core commitment that will keep evolving, not as provisional; the stable contract is the tool name, which is also the codemode identifier.
- Spike finding (measured via `createManagerWithConfig`): a forwarded `mcp` request with `matchValues: ["danger"]` resolves `allow` through the synthesized baseline `mcp_status` despite `danger: deny`, because `buildInputForSurface("mcp", v)` returns `{}`.
  It is pre-existing for proxied calls; this plan folds the fix in (step 8) because routing Pi tools onto `mcp` would extend it to them.
- Tidy-First assessor: accepted the `buildConfigRules` extraction; took the optional route on `path-values` (doc comment, no rename) because ADR 0002's title and ADR 0008 pin the name; declined sharing `pushMcpToolPermissionTargets`, because its `startsWith(server_)` shortcut must not apply to Pi names.

#### Deferred tidyings

- `src/access-intent/access-intent.ts` — the `path-values` resolved-intent kind now also carries precomputed `mcp` values; a rename to `values` touches ADR 0002/0008 and about 30 sites, tracked under #1014.

#### Phase handoff

The operator wants the next improvement phase for `pi-permission-system` to take over the MCP surface, after #1001's narrow fix ships (operator decision: sequence A, fix first, then phase).
Candidate cause: the `mcp` surface is the one subsystem no phase has touched since the fork's bootstrap, and it models a single client's input shape instead of an MCP call identity.
The package decides once at the boundary for paths (`AccessPath`) and shells (`ShellInvocation`); MCP has two derivations of one identity (proxy input guessing, Pi name parsing) sharing no type.
Seed issue: #1014 (ADR, then phase), gathering #946 (proxy as a registered reader), #952's MCP half (`readOnlyHint`/`destructiveHint` annotations as declared direction), #1002 (first-prompt exposure), forwarded-candidate fidelity, the legacy-key relocation's removal date, and the `path-values` rename.
Design direction discussed with the operator: an `McpCall { server, tool, verb }` value object built at the boundary, Pi's built-in MCP as the primary reader, the proxy as one registered reader, and rules naming server/tool independent of a client's spelling.

## Stage: Implementation — TDD (2026-10-02T20:11:54Z)

### Session summary

Implemented all nine TDD steps: `buildConfigRules` extraction, the `mcp-tool` kind, project `.pi/mcp.json` server names, `createPiMcpToolTargets`, routing Pi MCP tools onto the `mcp` surface (breaking), copying top-level `mcp__` keys onto `mcp` with a port notice, exposure agreement, forwarded/service `mcp` targets evaluated as-is, and docs plus a migration guide.
The `pi-permission-system` suite went from 5139 to 5204 tests (+65).

### Observations

- Deviation: an approve-for-session answer on a Pi MCP tool records its exact full name on `mcp` (new `suggestExactSessionPattern`), because the proxy target heuristic (`suggestMcpPattern`) would have widened `danger_srv_wipe` to `danger_*`.
- Deviation: an `agentDir`-built manager now reads the global `mcp.json` from that `agentDir`, not the ambient `getAgentDir()`.
- Deviation: `ResolverForService.resolve` widened to accept `PathValuesAccessIntent`, so the service can hand a value-bearing `mcp` query to the resolver as-is.
- The plan wrote step 5's header as `fix!(pkg):`; the grammar requires `fix(pkg)!:`, which is what was committed.
- The plan's killing mutation for "first instead of longest" server survived the first longest-prefix test (`a` never prefixes `a_b__x`); the test was rewritten to `["a", "a--b"]` on `mcp__a__b__x`, which kills it.
- The manager-level key-order tests cannot discriminate in-place vs appended relocation: the schema emits well-known keys such as `mcp` ahead of free-form ones, so file key order never decided; the `normalize` unit tests carry that pin.
- `before-agent-start.test.ts` and `forwarded-request-server.test.ts` (named in the plan) mock the layer under change, so the exposure and forwarding pins live in `permission-manager-unified.test.ts` instead.
- Pre-completion reviewer round 1: FAIL.
  Moving every `mcp__` key dropped a deny on a non-Pi tool named `mcp__foo` (still resolving on its own surface).
  Fixed by copying instead of moving, and only for keys that can name a Pi MCP tool; folded into the relocation commit via autosquash.
  Its WARN (top-level wildcards like `*__wipe` no longer reach Pi tools) is documented in the migration guide.
- Pre-completion reviewer round 2 (delta): PASS.
