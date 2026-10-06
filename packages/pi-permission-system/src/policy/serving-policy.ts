import { buildResolvedIntentFromMatchValues } from "#src/access-intent/input-normalizer";
import type { ServingPolicy } from "#src/authority/forwarded-request-server";
import type { ForwardedAccessIntent } from "#src/authority/permission-forwarding";
import type { PermissionCheckResult } from "#src/types";
import type { PermissionResolver } from "./permission-resolver";

/**
 * The serving node's recorded authority over a forwarded request: the
 * child-fixed facts (ADR 0008) resolved against this node's composed ruleset,
 * agent-scoped to the requester (`principal.agentName`, §3), with the floor the
 * child raised honored.
 *
 * The `matchValues` are used as the child fixed them, never re-derived through
 * this session's `PathNormalizer`/cwd. The resolver's surface-family fold is
 * what keeps a parent's bare `path` deny answering a child's request, which is
 * why this goes through `resolve` rather than the manager directly (#712, #806).
 */
export class ResolverServingPolicy implements ServingPolicy {
  constructor(
    private readonly resolver: Pick<PermissionResolver, "resolve">,
    private readonly isYoloEnabled: () => boolean,
  ) {}

  resolve(intent: ForwardedAccessIntent): PermissionCheckResult {
    const check = this.resolver.resolve(
      buildResolvedIntentFromMatchValues(
        intent.surface,
        intent.matchValues,
        intent.principal.agentName,
      ),
    );
    return honorChildFloor(check, intent.floor, this.isYoloEnabled());
  }
}

/**
 * Clamp this node's `allow` with the floor the child raised, as the child's
 * own gate clamped its own (#1029).
 *
 * Only the child's parse knows a bash unit was a wrapper or failed to parse,
 * so without this a permissive serving rule answers exactly the ask the floor
 * exists to raise. The floor leaves three answers standing, each for the
 * reason it stands locally: a `deny` or `ask` decides before any floor is
 * consulted; a session grant names a command the user already approved, which
 * the local gate honors through its session fast path; and yolo approves every
 * synthetic ask, keeping the floor's sentinel as the reported pattern.
 */
function honorChildFloor(
  check: PermissionCheckResult,
  floor: string | undefined,
  yoloEnabled: boolean,
): PermissionCheckResult {
  if (
    floor === undefined ||
    check.state !== "allow" ||
    check.source === "session"
  ) {
    return check;
  }
  return yoloEnabled
    ? { ...check, origin: "yolo", matchedPattern: floor }
    : { ...check, state: "ask", matchedPattern: floor };
}
