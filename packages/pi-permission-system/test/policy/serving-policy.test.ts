import { describe, expect, test } from "vitest";
import type { ForwardedAccessIntent } from "#src/authority/permission-forwarding";
import { PermissionResolver } from "#src/policy/permission-resolver";
import { ResolverServingPolicy } from "#src/policy/serving-policy";
import { SessionRules } from "#src/session/session-rules";
import type { PermissionCheckResult } from "#src/types";
import { makeForwardedAccessIntent } from "#test/helpers/forwarding-fixtures";
import { createManagerWithConfig } from "#test/helpers/manager-harness";

describe("ResolverServingPolicy over real recorded authority", () => {
  // The serving composition index.ts constructs, over a filesystem-backed
  // PermissionManager: the surface-family fold is what keeps a parent's
  // recorded `path` deny answering a child's bare-surface request. Resolving
  // an emptied bare surface would fall through to the universal default and
  // escalate a hard deny into an approvable prompt (#712, #806).
  function servingPolicyOver(permission: Record<string, unknown>): {
    resolve: (intent: ForwardedAccessIntent) => PermissionCheckResult;
    cleanup: () => void;
  } {
    const { manager, cleanup } = createManagerWithConfig(permission);
    const policy = new ResolverServingPolicy(
      new PermissionResolver(manager, new SessionRules()),
    );
    return { resolve: (intent) => policy.resolve(intent), cleanup };
  }

  /**
   * The child-fixed match set a real child sends for `/secrets/id_rsa`: an
   * out-of-cwd absolute path has no cwd-relative alias, so `matchValues()`
   * yields the one entry.
   */
  const secretMatchValues = ["/secrets/id_rsa"];

  test("hard-denies a bare-surface child request the parent's bare path config denies", () => {
    const policy = servingPolicyOver({
      "*": "allow",
      path: { "/secrets/*": "deny" },
    });
    try {
      const result = policy.resolve(
        makeForwardedAccessIntent({
          surface: "path",
          matchValues: secretMatchValues,
          boundaryValue: "/secrets/id_rsa",
        }),
      );
      expect(result.state).toBe("deny");
      expect(result.matchedPattern).toBe("/secrets/*");
    } finally {
      policy.cleanup();
    }
  });

  test("hard-denies when only one direction of the parent's config denies", () => {
    const policy = servingPolicyOver({
      "*": "allow",
      path_write: { "/secrets/*": "deny" },
    });
    try {
      const result = policy.resolve(
        makeForwardedAccessIntent({
          surface: "path",
          matchValues: secretMatchValues,
          boundaryValue: "/secrets/id_rsa",
        }),
      );
      expect(result.state).toBe("deny");
      expect(result.toolName).toBe("path_write");
    } finally {
      policy.cleanup();
    }
  });

  test("answers a child that already named a direction on that surface alone", () => {
    const policy = servingPolicyOver({
      "*": "allow",
      external_directory: { "*": "ask" },
      external_directory_read: { "/dev-root/*": "allow" },
    });
    try {
      const forRead = policy.resolve(
        makeForwardedAccessIntent({
          surface: "external_directory_read",
          matchValues: ["/dev-root/x"],
          boundaryValue: "/dev-root/x",
        }),
      );
      expect(forRead.state).toBe("allow");

      const forWrite = policy.resolve(
        makeForwardedAccessIntent({
          surface: "external_directory_write",
          matchValues: ["/dev-root/x"],
          boundaryValue: "/dev-root/x",
        }),
      );
      expect(forWrite.state).toBe("ask");
    } finally {
      policy.cleanup();
    }
  });

  test("hard-denies a directional child request the parent's bare path config denies (#807)", () => {
    // Since #807 a child's bash gate can prove a direction, so `path_read` is
    // the first surface a *bash* child sends. The parent's config names only
    // the bare family, and the deny must still reach it — here through
    // load-time sugar expansion rather than through the resolver's fold, which
    // a directional request bypasses entirely.
    const policy = servingPolicyOver({
      "*": "allow",
      path: { "/secrets/*": "deny" },
    });
    try {
      const result = policy.resolve(
        makeForwardedAccessIntent({
          surface: "path_read",
          matchValues: secretMatchValues,
          boundaryValue: "/secrets/id_rsa",
        }),
      );
      expect(result.state).toBe("deny");
      expect(result.matchedPattern).toBe("/secrets/*");
    } finally {
      policy.cleanup();
    }
  });

  test("leaves an unmatched path request without a pattern, so no gate fires (#58)", () => {
    const policy = servingPolicyOver({ "*": "allow", read: "allow" });
    try {
      const result = policy.resolve(
        makeForwardedAccessIntent({
          surface: "path",
          matchValues: ["/some/file.ts"],
          boundaryValue: "/some/file.ts",
        }),
      );
      expect(result.matchedPattern).toBeUndefined();
    } finally {
      policy.cleanup();
    }
  });
});
