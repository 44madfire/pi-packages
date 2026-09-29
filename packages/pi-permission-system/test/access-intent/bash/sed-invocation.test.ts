import { describe, expect, it } from "vitest";
import type { ArgWord } from "#src/access-intent/bash/node-text";
import { sedWithdrawsReadClaim } from "#src/access-intent/bash/sed-invocation";

/** Arguments the source spells exactly. */
function literal(...values: string[]): ArgWord[] {
  return values.map((value) => ({ value, computed: false }));
}

describe("sedWithdrawsReadClaim", () => {
  describe("a print-only invocation", () => {
    it.each([
      [["-n", "1,80p", "f.md"]],
      [["-n", "-e", "1p", "-e", "$p", "f.md"]],
      [["-ne", "5q", "f.md"]],
      [["-nE", "10,20p", "f.md"]],
      [["--quiet", "10,20p", "f.md"]],
      [["--expression=3p", "f.md"]],
      [["--expression", "3p", "f.md"]],
      [["1d;$d", "f.md"]],
      [["-n", "0~4p", "f.md"]],
      [["-n", "5,+3p", "f.md"]],
      [["-n", "5,~4p", "f.md"]],
      [["-n", "$!N;P;D", "f.md"]],
      [["-n", "l 40", "f.md"]],
      [["-n", "=", "f.md"]],
      [["", "f.md"]],
      [["-n", "1p", "--", "-n"]],
      [["-n", "1p", "-"]],
    ])("keeps the claim for sed %j", (args) => {
      expect(sedWithdrawsReadClaim(literal(...args))).toBe(false);
    });

    it("keeps the claim across a multi-line script", () => {
      expect(sedWithdrawsReadClaim(literal("-n", "1p\n$p", "f.md"))).toBe(
        false,
      );
    });
  });

  describe("an option outside the allowlist", () => {
    it.each([
      [["-i", "s/a/b/", "f"]],
      [["-i.bak", "1d", "f"]],
      [["-i", "", "1d", "f"]],
      [["-ni", "1p", "f"]],
      [["-I", "", "1d", "f"]],
      [["--in-place", "1d", "f"]],
      [["--in-place=.bak", "1d", "f"]],
      [["--in", "1d", "f"]],
      [["--qui", "1p", "f"]],
      [["-f", "script.sed", "f"]],
      [["--file=script.sed", "f"]],
      [["-l", "5", "1p", "f"]],
      [["--version"]],
      [["-n", "1p", "f", "-i"]],
    ])("withdraws the claim for sed %j", (args) => {
      expect(sedWithdrawsReadClaim(literal(...args))).toBe(true);
    });

    it("withdraws the claim when an -e follows a positional", () => {
      // GNU reads the -e as a script and `p` as a file; BSD reads `p` as the
      // script and the rest as files. The two disagree about the script.
      expect(sedWithdrawsReadClaim(literal("p", "-e", "q", "f"))).toBe(true);
    });

    it("withdraws the claim when -e has no script to take", () => {
      expect(sedWithdrawsReadClaim(literal("-n", "-e"))).toBe(true);
    });

    it("withdraws the claim when there is no script at all", () => {
      expect(sedWithdrawsReadClaim(literal("-n"))).toBe(true);
    });
  });

  describe("a computed argument", () => {
    it("withdraws the claim for a computed script", () => {
      expect(
        sedWithdrawsReadClaim([
          { value: "-n", computed: false },
          { value: "$range", computed: true },
          { value: "f.md", computed: false },
        ]),
      ).toBe(true);
    });

    it("withdraws the claim for a computed file, which could spell -i", () => {
      expect(
        sedWithdrawsReadClaim([
          { value: "-n", computed: false },
          { value: "1p", computed: false },
          { value: "$f", computed: true },
        ]),
      ).toBe(true);
    });
  });

  describe("a script command outside the grammar", () => {
    it.each([
      "w out",
      "1w out",
      "W out",
      "r other",
      "R other",
      "e rm -rf x",
      "v",
      "a text",
      "1i text",
      "c text",
      "p;w out",
      "1,2",
      "1pw",
      "}",
    ])("withdraws the claim for the script %j", (script) => {
      expect(sedWithdrawsReadClaim(literal("-n", script, "f.md"))).toBe(true);
    });

    it("withdraws the claim for a command glued to the next one", () => {
      // sed rejects `pd` as extra characters after a command, so the proof
      // must not read it as two commands sed never runs.
      expect(sedWithdrawsReadClaim(literal("-n", "pd", "f.md"))).toBe(true);
    });
  });
});
