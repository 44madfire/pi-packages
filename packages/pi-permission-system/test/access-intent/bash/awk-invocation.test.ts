import { describe, expect, it } from "vitest";
import { awkWithdrawsReadClaim } from "#src/access-intent/bash/awk-invocation";
import { literalArgWords as literal } from "#test/helpers/arg-words";

describe("awkWithdrawsReadClaim", () => {
  describe("a program that only reads", () => {
    it.each([
      [["{print $1}", "data"]],
      [["-F:", "{print $2}", "data"]],
      [["-F", ":", "{print $2}", "data"]],
      [["-v", "n=3", "NR==n", "data"]],
      [["-vn=3", "NR==n", "data"]],
      [["/```mermaid/,/```/", "f.md"]],
      [["BEGIN{f=0} /^```/{f=!f; next} f", "f.md"]],
      [["NR<=10", "f.md"]],
      [["{ n++ } END { print n }", "a", "b"]],
      [["--", "{print}", "data"]],
      [["{print}", "-"]],
      [["{print}", "x=1", "data"]],
      [["{print}"]],
    ])("keeps the claim for awk %j", (args) => {
      expect(awkWithdrawsReadClaim(literal(...args))).toBe(false);
    });
  });

  describe("a program that can write a file or run a command", () => {
    it.each([
      ['{print > "out"}'],
      ["{print >> FILENAME}"],
      ['{printf "%s", $0 > "/dev/stderr"}'],
      ['{print | "sh"}'],
      ['"date" | getline d'],
      ['{print |& "coproc"}'],
      ['BEGIN{system("rm x")}'],
      ['@include "lib.awk"'],
      ["NR>=100"],
    ])("withdraws the claim for the program %j", (program) => {
      expect(awkWithdrawsReadClaim(literal(program, "data"))).toBe(true);
    });
  });

  describe("an option outside the allowlist", () => {
    it.each([
      [["-f", "prog.awk", "data"]],
      [["-i", "inplace", "{print}", "data"]],
      [["-e", "{print}", "data"]],
      [["--source", "{print}", "data"]],
      [["--file=prog.awk", "data"]],
      [["--field-separator", ":", "{print}", "data"]],
      [["-W", "version"]],
      [["--version"]],
      [["-F"]],
      [["{print}", "data", "-f"]],
    ])("withdraws the claim for awk %j", (args) => {
      expect(awkWithdrawsReadClaim(literal(...args))).toBe(true);
    });

    it("withdraws the claim when there is no program", () => {
      expect(awkWithdrawsReadClaim(literal("-F:"))).toBe(true);
    });
  });

  describe("a computed argument", () => {
    it("withdraws the claim for a computed program", () => {
      expect(
        awkWithdrawsReadClaim([
          { value: "$prog", computed: true },
          { value: "data", computed: false },
        ]),
      ).toBe(true);
    });

    it("withdraws the claim for a computed file", () => {
      expect(
        awkWithdrawsReadClaim([
          { value: "{print}", computed: false },
          { value: "$f", computed: true },
        ]),
      ).toBe(true);
    });
  });
});
