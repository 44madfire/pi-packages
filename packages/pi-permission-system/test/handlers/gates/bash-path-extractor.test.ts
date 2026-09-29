import { afterEach, describe, expect, test, vi } from "vitest";

// Mock node:os so tilde-expansion is deterministic across platforms.
vi.mock("node:os", () => {
  const homedir = vi.fn(() => "/mock/home");
  return {
    homedir,
    default: { homedir },
  };
});

// Mock node:fs with an identity realpathSync so canonicalizePath
// (used by BashProgram.externalPaths) leaves test paths unchanged and
// existing expected-value literals remain accurate across platforms.
vi.mock("node:fs", () => ({
  realpathSync: (p: string) => p,
  default: { realpathSync: (p: string) => p },
}));

import { extractExternalPathsFromBashCommand as extractWithNormalizer } from "#src/handlers/gates/bash-path-extractor";
import { pathFlavorForPlatform, win32PathFlavor } from "#src/path/path-flavor";
import { PathNormalizer } from "#src/path/path-normalizer";
import { renderPolicyDenial } from "#src/presentation/agent-renderer";
import type { ExternalPathDisclosure } from "#src/presentation/path-ask-payload";
import { buildBashExternalDirectoryAskPayload } from "#src/presentation/path-ask-payload";

afterEach(() => {
  vi.restoreAllMocks();
});

// The production facade now takes a PathNormalizer (platform + cwd baked in);
// this wrapper preserves the (command, cwd) call shape the suite uses
// throughout so the projection-correctness assertions stay unchanged.
function extractExternalPathsFromBashCommand(
  command: string,
  cwd: string,
): Promise<string[]> {
  return extractWithNormalizer(
    command,
    new PathNormalizer(pathFlavorForPlatform(process.platform), cwd),
  );
}

describe("extractExternalPathsFromBashCommand", () => {
  const cwd = "/projects/my-app";

  describe("leading cd prefix", () => {
    test("regression: cd to subdir with relative path traversing back into cwd is not flagged", async () => {
      // Real-world command that triggered a false-positive external-directory
      // prompt. The relative path .pi/../../../.pi/skills/... resolves inside
      // cwd when resolved from the cd target, but outside cwd when resolved
      // from cwd itself.
      const result = await extractExternalPathsFromBashCommand(
        'cd /projects/my-app/packages/sub && grep -n "pattern" .pi/../../../.pi/skills/pkg/SKILL.md',
        cwd,
      );
      expect(result).toHaveLength(0);
    });

    test("cd to subdir: still flags genuinely external paths after cd", async () => {
      const result = await extractExternalPathsFromBashCommand(
        "cd /projects/my-app/packages/sub && cat /etc/hosts",
        cwd,
      );
      expect(result).toContain("/etc/hosts");
    });

    test("cd to subdir: relative path that stays inside cwd is not flagged", async () => {
      const result = await extractExternalPathsFromBashCommand(
        "cd /projects/my-app/src && cat ../README.md",
        cwd,
      );
      expect(result).toHaveLength(0);
    });

    test("cd to external dir: subsequent paths resolve against the (external) effective directory", async () => {
      // The effective directory is tracked faithfully: `cd /tmp` makes /tmp the
      // base, so the cd target itself is flagged AND ../etc/hosts resolves to
      // /etc/hosts (both outside cwd).
      const result = await extractExternalPathsFromBashCommand(
        "cd /tmp && cat ../etc/hosts",
        cwd,
      );
      expect(result).toContain("/tmp");
      expect(result).toContain("/etc/hosts");
    });

    test("cd with relative target: resolves inside cwd", async () => {
      const result = await extractExternalPathsFromBashCommand(
        'cd packages/sub && grep -n "x" .pi/../../../.pi/skills/pkg/SKILL.md',
        cwd,
      );
      expect(result).toHaveLength(0);
    });

    test("no cd prefix: ../ path that escapes cwd is flagged", async () => {
      // Without the cd prefix, the path resolves against cwd and escapes.
      const result = await extractExternalPathsFromBashCommand(
        'grep -n "pattern" .pi/../../../.pi/skills/pkg/SKILL.md',
        cwd,
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test("sequential fold: a cd that is not the first command still updates the base", async () => {
      // The current-shell `cd` folds even though it is not the first command;
      // ../../outside.txt resolves against /projects/my-app/src → /projects/outside.txt.
      const result = await extractExternalPathsFromBashCommand(
        "echo hello && cd /projects/my-app/src && cat ../../outside.txt",
        cwd,
      );
      expect(result).toContain("/projects/outside.txt");
    });

    test("cd with semicolon separator", async () => {
      const result = await extractExternalPathsFromBashCommand(
        "cd /projects/my-app/src ; cat ../README.md",
        cwd,
      );
      expect(result).toHaveLength(0);
    });
  });
});

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

describe("Windows drive-letter paths (win32 semantics)", () => {
  const windowsCwd = "C:/projects/app";

  async function extractWin32(command: string): Promise<string[]> {
    return extractWithNormalizer(
      command,
      new PathNormalizer(win32PathFlavor, windowsCwd),
    );
  }

  test("forward-slash drive path outside CWD is flagged", async () => {
    const result = await extractWin32("cat C:/Windows/win.ini");
    expect(result).not.toHaveLength(0);
  });

  test("different drive letter outside CWD is flagged", async () => {
    const result = await extractWin32("cat D:/secrets/password.txt");
    expect(result).not.toHaveLength(0);
  });

  test("drive path inside CWD is not flagged (known base)", async () => {
    const result = await extractWin32("cat C:/projects/app/inside.txt");
    expect(result).toHaveLength(0);
  });

  test("drive path inside CWD is not flagged after non-literal cd (unknown base)", async () => {
    // Before the isRelativeCandidate conversion, the hand-rolled startsWith("/")
    // check treats C:/ as relative on win32, so the unknown-base conservative
    // branch fires and over-flags an inside-CWD drive path.
    // After the conversion (!normalizer.isAbsolute), C:/ is absolute on win32
    // and routes to the resolved branch with its inside-CWD check.
    const result = await extractWin32(
      'cd "$D" && cat C:/projects/app/inside.txt',
    );
    expect(result).toHaveLength(0);
  });
});

describe("Git Bash POSIX device paths (win32 semantics)", () => {
  const windowsCwd = "C:/projects/app";

  async function extractWin32(command: string): Promise<string[]> {
    return extractWithNormalizer(
      command,
      new PathNormalizer(win32PathFlavor, windowsCwd),
    );
  }

  test("a /dev/null redirect target is not flagged", async () => {
    const result = await extractWin32("echo hi > /dev/null");
    expect(result).toHaveLength(0);
  });

  test("all four safe device paths are excluded", async () => {
    const result = await extractWin32(
      "cat /dev/stdin /dev/stdout /dev/stderr /dev/null",
    );
    expect(result).toHaveLength(0);
  });
});

describe("Git Bash MSYS drive mounts (win32 semantics)", () => {
  const windowsCwd = "C:/projects/app";

  async function extractWin32(command: string): Promise<string[]> {
    return extractWithNormalizer(
      command,
      new PathNormalizer(win32PathFlavor, windowsCwd),
    );
  }

  test("an in-cwd drive mount is not flagged", async () => {
    const result = await extractWin32("cat /c/projects/app/inside.txt");
    expect(result).toHaveLength(0);
  });

  test("an out-of-cwd drive mount is flagged as its translated Windows path", async () => {
    const result = await extractWin32("cat /c/Other/secret.txt");
    expect(result).toEqual(["c:\\other\\secret.txt"]);
  });

  test("a different-drive mount is flagged as its translated Windows path", async () => {
    const result = await extractWin32("cat /d/secrets/pw.txt");
    expect(result).toEqual(["d:\\secrets\\pw.txt"]);
  });
});

describe("Git Bash POSIX absolute paths (win32 semantics)", () => {
  const windowsCwd = "C:/projects/app";

  async function extractWin32(command: string): Promise<string[]> {
    return extractWithNormalizer(
      command,
      new PathNormalizer(win32PathFlavor, windowsCwd),
    );
  }

  test("a /tmp path is flagged as typed, not fabricated into C:\\tmp", async () => {
    const result = await extractWin32("ls /tmp");
    expect(result).toEqual(["/tmp"]);
  });

  test("a /usr path is flagged as typed", async () => {
    const result = await extractWin32("cat /usr/bin/tool");
    expect(result).toEqual(["/usr/bin/tool"]);
  });

  test("distinct literal-only POSIX absolutes are not deduplicated together", async () => {
    const result = await extractWin32("cat /tmp/a /tmp/b");
    expect(result).toEqual(["/tmp/a", "/tmp/b"]);
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
