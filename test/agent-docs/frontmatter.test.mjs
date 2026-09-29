import { describe, expect, it } from "vitest";

import { frontmatterDescription } from "../../scripts/agent-docs/frontmatter.mjs";

function skill(frontmatter) {
  return `---\n${frontmatter}\n---\n\n# Body\n\nThe body is loaded on demand and must not count.\n`;
}

describe("frontmatterDescription", () => {
  it("returns every line of a literal (|) block until the next top-level key", () => {
    const md = skill(
      "name: testing\ndescription: |\n  Vitest mock patterns, TDD planning rules,\n  and general test strategy.\nother: value",
    );
    expect(frontmatterDescription(md)).toBe(
      "Vitest mock patterns, TDD planning rules,\nand general test strategy.",
    );
  });

  it("returns every line of a folded (>-) block until the closing fence", () => {
    const md = skill(
      "name: lifecycle\ndescription: >-\n  Reference for the turn model.\n  Use when designing timing.",
    );
    expect(frontmatterDescription(md)).toBe(
      "Reference for the turn model.\nUse when designing timing.",
    );
  });

  it("returns a single-line description", () => {
    const md = skill("name: x\ndescription: One line, no block.");
    expect(frontmatterDescription(md)).toBe("One line, no block.");
  });

  it("returns an empty string when there is no description key", () => {
    expect(frontmatterDescription(skill("name: x"))).toBe("");
  });

  it("returns an empty string when there is no frontmatter at all", () => {
    expect(frontmatterDescription("# Just a body\n\nwords words\n")).toBe("");
  });
});
