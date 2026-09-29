import { describe, expect, test } from "vitest";

import { renderPolicyDenial } from "#src/presentation/agent-renderer";
import type { ExternalPathDisclosure } from "#src/presentation/path-ask-payload";
import { buildBashExternalDirectoryAskPayload } from "#src/presentation/path-ask-payload";

describe("the bash external-directory ask payload", () => {
  /** The payload the gate emits for a command that reached outside the tree. */
  function buildAsk(facts: {
    command: string;
    externalPaths: ExternalPathDisclosure[];
    cwd: string;
    agentName?: string;
  }) {
    return buildBashExternalDirectoryAskPayload({
      ...facts,
      agentName: facts.agentName ?? null,
      toolName: "bash",
      surface: "external_directory",
    });
  }

  test("carries the command, the boundary, and the path it reached", () => {
    const payload = buildAsk({
      command: "cat /etc/hosts",
      externalPaths: [{ path: "/etc/hosts" }],
      cwd: "/projects/my-app",
    });

    expect(payload.request.value).toBe("cat /etc/hosts");
    expect(payload.evidence).toEqual([
      { label: "working directory", text: "/projects/my-app", detail: null },
      { label: "external path", text: "/etc/hosts", detail: null },
    ]);
  });

  test("names the requesting agent when one is known", () => {
    expect(
      buildAsk({
        command: "cat /etc/hosts",
        externalPaths: [{ path: "/etc/hosts" }],
        cwd: "/projects/my-app",
        agentName: "my-agent",
      }).request.requester.agentName,
    ).toBe("my-agent");
  });

  test("lists every external path the command reached", () => {
    expect(
      buildAsk({
        command: "diff /etc/hosts /var/log/syslog",
        externalPaths: [{ path: "/etc/hosts" }, { path: "/var/log/syslog" }],
        cwd: "/projects/my-app",
      }).evidence,
    ).toEqual([
      { label: "working directory", text: "/projects/my-app", detail: null },
      { label: "external path", text: "/etc/hosts", detail: null },
      { label: "external path", text: "/var/log/syslog", detail: null },
    ]);
  });

  test("binds a resolved target to the path it belongs to", () => {
    expect(
      buildAsk({
        command: "cat demo-symlink-passwd /etc/hosts",
        externalPaths: [
          { path: "demo-symlink-passwd", resolvedPath: "/etc/passwd" },
          { path: "/etc/hosts" },
        ],
        cwd: "/projects/my-app",
      }).evidence,
    ).toEqual([
      { label: "working directory", text: "/projects/my-app", detail: null },
      {
        label: "external path",
        text: "demo-symlink-passwd",
        detail: "/etc/passwd",
      },
      { label: "external path", text: "/etc/hosts", detail: null },
    ]);
  });
});

describe("the bash external-directory denial the agent sees", () => {
  test("names the escaping paths and the boundary, never the command", () => {
    const result = renderPolicyDenial(
      buildBashExternalDirectoryAskPayload({
        command: "cat /etc/hosts",
        externalPaths: [{ path: "/etc/hosts" }],
        cwd: "/projects/my-app",
        agentName: null,
        toolName: "bash",
        surface: "external_directory",
        matchedPattern: "*",
      }),
      null,
    );
    expect(result).toBe(
      "[pi-permission-system] Denied by policy: 'external_directory' for tool 'bash' for path '/etc/hosts' (rule '*'): outside working directory '/projects/my-app'.",
    );
  });
});
