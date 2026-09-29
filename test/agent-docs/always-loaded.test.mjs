import { describe, expect, it } from "vitest";

import { alwaysLoadedWords } from "../../scripts/agent-docs/always-loaded.mjs";

describe("alwaysLoadedWords", () => {
  it("sums AGENTS.md and every skill description, reporting each part", () => {
    expect(
      alwaysLoadedWords({
        agentsMd: "one two three",
        skillDescriptions: ["four five", "six", ""],
      }),
    ).toEqual({ agentsMd: 3, descriptions: 3, total: 6 });
  });

  it("reports zeros for an empty corpus", () => {
    expect(alwaysLoadedWords({ agentsMd: "", skillDescriptions: [] })).toEqual({
      agentsMd: 0,
      descriptions: 0,
      total: 0,
    });
  });
});
