import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock node:fs so realpathSync (used by canonicalizePath) is controllable.
// Default is identity so all existing lexical tests are unaffected.
// Every other fs binding passes through to the real module, so filesystem-
// backed helpers (lstatSync, mkdtempSync, symlinkSync, …) stay usable here.
const realpathSync = vi.hoisted(() =>
  vi.fn<(path: string) => string>((p) => p),
);
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    realpathSync,
    default: { ...actual, realpathSync },
  };
});

import { BashProgram } from "#src/access-intent/bash/program";
import { pathFlavorForPlatform, win32PathFlavor } from "#src/path/path-flavor";
import { PathNormalizer } from "#src/path/path-normalizer";
import { createTmpFixture } from "#test/helpers/tmp-fixture";

describe("BashProgram", () => {
  describe("externalAccesses", () => {
    const cwd = "/projects/my-app";
    const normalizer = new PathNormalizer(
      pathFlavorForPlatform(process.platform),
      cwd,
    );

    beforeEach(() => {
      realpathSync.mockReset();
      realpathSync.mockImplementation((p: string) => p);
    });

    it("returns absolute paths resolving outside cwd", async () => {
      const program = await BashProgram.parse("cat /etc/hosts", normalizer);
      // Subset matcher: the path is normalized before comparison.
      expect(
        program.externalAccesses().map(({ path }) => path.value()),
      ).toContain("/etc/hosts");
    });

    describe("the rest of a heredoc's line", () => {
      it("projects a tail redirect's target with its operator's effect", async () => {
        const program = await BashProgram.parse(
          "cat <<EOF > /tmp/o\nb\nEOF",
          normalizer,
        );
        expect(
          program
            .externalAccesses()
            .map(({ path, effect }) => ({ path: path.value(), effect })),
        ).toEqual([
          { path: "/tmp/o", effect: { effect: "write", source: "syntax" } },
        ]);
      });

      it("folds a current-shell cd in a list after a piped tail", async () => {
        // The grammar nests `true && cd /outside && …` inside the pipe; bash
        // runs the `cd` in the current shell, as the `< in` spelling groups it.
        const program = await BashProgram.parse(
          "cat <<EOF | true && cd /outside && cat ../secret\nb\nEOF",
          normalizer,
        );
        // Unfolded, `../secret` would resolve against the cwd instead:
        // `/projects/secret`.
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/outside", "/secret"]);
      });
    });

    describe("the words after a heredoc", () => {
      it("projects a word as the command's own operand", async () => {
        const program = await BashProgram.parse(
          "cat <<EOF ~/x/in\nb\nEOF",
          normalizer,
        );
        expect(
          program
            .externalAccesses()
            .map(({ path, effect }) => ({ path: path.value(), effect })),
        ).toEqual([
          {
            path: join(homedir(), "x/in"),
            effect: { effect: "read", source: "core" },
          },
        ]);
      });
    });

    describe("a redirect's target is projected by its role (#609)", () => {
      /** Each external access's display path and attributed effect. */
      async function externalsOf(command: string) {
        const program = await BashProgram.parse(command, normalizer);
        return program.externalAccesses().map(({ path, effect }) => ({
          path: path.value(),
          effect: effect.effect,
        }));
      }

      it("flags a bare output target after a non-literal cd", async () => {
        expect(await externalsOf('cd "$D" && echo hi > out.txt')).toEqual([
          { path: join(cwd, "out.txt"), effect: "write" },
        ]);
      });

      it("flags a bare input target after a non-literal cd", async () => {
        expect(await externalsOf('cd "$D" && sort < in.txt')).toEqual([
          { path: join(cwd, "in.txt"), effect: "read" },
        ]);
      });

      it("leaves a bare target inside a known working directory alone", async () => {
        expect(await externalsOf("echo hi > out.txt")).toEqual([]);
      });
    });

    describe("operands a statement names directly (#839)", () => {
      it("flags a for loop's absolute word-list operand", async () => {
        const program = await BashProgram.parse(
          "for f in /etc/shadow; do cat $f; done",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/shadow"]);
      });

      it("flags a for loop's home-relative word-list operand", async () => {
        // The issue's motivating repro: the body carries only `$f`, so the word
        // list is the sole place the literal appears.
        const program = await BashProgram.parse(
          "for f in ~/other/secret; do cat $f; done",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "other/secret")]);
      });

      it("flags an absolute case subject", async () => {
        const program = await BashProgram.parse(
          "case /etc/shadow in a) echo b;; esac",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/shadow"]);
      });

      it("leaves an in-cwd word-list operand off the external slice", async () => {
        const program = await BashProgram.parse(
          "for f in src/main.ts; do echo; done",
          normalizer,
        );
        expect(program.externalAccesses()).toEqual([]);
      });
    });

    describe("operands of a command hosted in a quoted argument (#945)", () => {
      it("flags the operand of a substitution in a consumed flag argument", async () => {
        const program = await BashProgram.parse(
          'sed -e "$(cat /etc/shadow)" f.txt',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/shadow"]);
      });

      it("flags the operand of a substitution in a generic command's argument", async () => {
        const program = await BashProgram.parse(
          'echo "$(cat /etc/shadow)"',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/shadow"]);
      });
    });

    describe("glob-bearing path tokens (#821)", () => {
      it.each([
        ["a bracket glob", "cat /etc/[p]asswd", "/etc/[p]asswd"],
        [
          "a bracket glob inside a directory name",
          "ls /et[c]/pa*",
          "/et[c]/pa*",
        ],
        ["a dot-star glob", "rm -rf /tmp/tmp.*", "/tmp/tmp.*"],
      ])("projects %s outside the tree", async (_label, command, expected) => {
        const program = await BashProgram.parse(command, normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([expected]);
      });
    });

    describe("flag spellings of a pattern-first command (#823)", () => {
      it.each([
        ["a spaced numeric flag argument", "grep -A 3 pattern /etc/passwd"],
        ["an expansion flag argument", "grep -A $N pattern /etc/passwd"],
        ["an =-embedded pattern flag", "grep --regexp=harmless /etc/passwd"],
        ["a glued short pattern flag", "grep -eharmless /etc/passwd"],
        ["a GNU in-place edit", "sed -i 's/a/b/' /etc/passwd"],
      ])("projects the file operand behind %s", async (_label, command) => {
        const program = await BashProgram.parse(command, normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/passwd"]);
      });

      it("does not project a pattern flag's own value", async () => {
        const program = await BashProgram.parse(
          "grep --regexp=/etc/passwd file.txt",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });
    });

    describe("operands of nested commands hosted in a redirect (#741)", () => {
      it.each([
        ["a redirect destination", "echo hi > $(cat /etc/shadow)"],
        ["an appending destination", "echo hi >> $(cat /etc/shadow)"],
        ["an input process substitution", "cat < <(cat /etc/shadow)"],
        ["a concatenated destination", "echo hi > ${DIR}/$(cat /etc/shadow)"],
      ])("projects an operand hosted in %s", async (_label, command) => {
        const program = await BashProgram.parse(command, normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/etc/shadow");
      });

      it("still projects a plain redirect destination", async () => {
        const program = await BashProgram.parse(
          "echo hi > /etc/passwd",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/etc/passwd");
      });
    });

    describe("bare tokens escaping the tree via symlink (#645)", () => {
      const tmp = createTmpFixture();
      let root: string;
      let probeNormalizer: PathNormalizer;
      // Canonical temp dir: on macOS the tmpdir is itself a symlink, so a
      // lexical path would disagree with every canonical form under assertion.
      let canonicalDir: (prefix: string) => string;

      beforeEach(async () => {
        const actual =
          await vi.importActual<typeof import("node:fs")>("node:fs");
        realpathSync.mockImplementation(actual.realpathSync);
        canonicalDir = (prefix) => actual.realpathSync(tmp.dir(prefix));
        root = canonicalDir("pi-perm-ext-cwd-");
        probeNormalizer = new PathNormalizer(
          pathFlavorForPlatform(process.platform),
          root,
        );
      });

      afterEach(() => {
        tmp.cleanup();
      });

      it("flags an in-project bare symlink whose target is outside cwd", async () => {
        // The issue's headline repro:
        //   printf 'test' > /tmp/pi-permission-test-secret
        //   ln -s /tmp/pi-permission-test-secret outside-link
        //   cat outside-link
        const outsideRoot = canonicalDir("pi-perm-ext-target-");
        const secret = tmp.file(outsideRoot, "pi-permission-test-secret", "s");
        tmp.symlink(root, "outside-link", secret);

        const program = await BashProgram.parse(
          "cat outside-link",
          probeNormalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.boundaryValue()),
        ).toContain(secret);
      });

      it("does not flag a bare token resolving inside cwd", async () => {
        tmp.file(root, "inside.txt", "x");
        const program = await BashProgram.parse(
          "cat inside.txt",
          probeNormalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not flag a bare word naming nothing", async () => {
        const program = await BashProgram.parse("git status", probeNormalizer);
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("flags a bare symlink to an outside directory", async () => {
        const outsideRoot = canonicalDir("pi-perm-ext-dir-");
        tmp.symlink(root, "vault", outsideRoot);
        const program = await BashProgram.parse("ls vault", probeNormalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.boundaryValue()),
        ).toContain(outsideRoot);
      });

      it("flags a symlink whose name carries an in-segment ..", async () => {
        const outsideRoot = canonicalDir("pi-perm-ext-range-");
        const secret = tmp.file(outsideRoot, "secret", "s");
        tmp.symlink(root, "v1..v2", secret);
        const program = await BashProgram.parse("cat v1..v2", probeNormalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.boundaryValue()),
        ).toEqual([secret]);
      });
    });

    it("flags a path embedded in a long option (#645)", async () => {
      // The issue's second repro: `grep --file=…` under an allowing `grep *`
      // rule. The flag token is rejected by the shape prelude, so the value is
      // split out at collection and classified on its own.
      const program = await BashProgram.parse(
        "grep --file=/tmp/pi-permission-patterns target",
        normalizer,
      );
      expect(
        program.externalAccesses().map(({ path }) => path.value()),
      ).toContain("/tmp/pi-permission-patterns");
    });

    it("excludes paths within cwd", async () => {
      const program = await BashProgram.parse("cat src/index.ts", normalizer);
      expect(program.externalAccesses()).toHaveLength(0);
    });

    describe("win32 projection (injected platform, no vi.mock node:path)", () => {
      const winNormalizer = new PathNormalizer(
        win32PathFlavor,
        "C:\\Projects\\App",
      );

      it("expands $HOME before any platform-specific token handling", async () => {
        // Expansion happens at collection, upstream of the flavor, so the
        // token the projection carries is the expanded path on every host.
        const program = await BashProgram.parse('ls "$HOME/x"', winNormalizer);
        expect(program.pathRuleCandidates().map(({ token }) => token)).toEqual([
          `${homedir()}/x`,
        ]);
      });

      it("keeps a non-mount POSIX absolute literal (Git Bash semantics)", async () => {
        // On win32, Pi core runs Git Bash: /etc is an MSYS install-root path,
        // not C:\etc, so it is matched and displayed as typed (#533).
        const program = await BashProgram.parse(
          "cat /etc/hosts",
          winNormalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc/hosts"]);
      });

      it("keeps a non-mount POSIX absolute as a literal rule candidate", async () => {
        const program = await BashProgram.parse("cat /tmp/foo", winNormalizer);
        const candidate = program.pathRuleCandidates()[0];
        expect(candidate.path.matchValues()).toEqual(["/tmp/foo"]);
      });

      it("folds a drive-mount cd so a following traversal resolves under it", async () => {
        // cd /c/Other → base C:\Other; ../x resolves to C:\x (not C:\c\x).
        // The cd argument itself is also collected and translated (c:\other).
        const program = await BashProgram.parse(
          "cd /c/Other && cat ../x",
          winNormalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["c:\\other", "c:\\x"]);
      });

      it("degrades a non-mount POSIX absolute cd to a conservative unknown base", async () => {
        // Git Bash's /tmp is install-dependent, so `cd /tmp` makes the base
        // unresolvable; a following traversal is flagged conservatively against
        // cwd for display, and /tmp itself is a literal external path (#533).
        const program = await BashProgram.parse(
          "cd /tmp && cat ../x",
          winNormalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/tmp", "c:\\projects\\x"]);
      });

      it("flags a ..-traversal escaping cwd under win32 rules", async () => {
        const program = await BashProgram.parse(
          "cat ../sibling/x",
          winNormalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["c:\\projects\\sibling\\x"]);
      });

      it("folds a current-shell cd so an in-cwd ..-traversal is not flagged", async () => {
        const program = await BashProgram.parse(
          "cd sub && cat ../x",
          winNormalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("recognizes a backslash-relative token as a path rule candidate (#520)", async () => {
        const program = await BashProgram.parse("cat dir\\file", winNormalizer);
        const candidate = program.pathRuleCandidates()[0];
        expect(candidate.token).toBe("dir\\file");
      });

      it("resolves a backslash-relative token to the same win32 aliases its forward-slash equivalent matches (#520)", async () => {
        const backslashProgram = await BashProgram.parse(
          "cat dir\\file",
          winNormalizer,
        );
        const forwardSlashProgram = await BashProgram.parse(
          "cat dir/file",
          winNormalizer,
        );
        const backslashAliases = backslashProgram
          .pathRuleCandidates()[0]
          .path.matchValues();
        // The backslash token resolves to the canonical win32 path plus its
        // win32-normalized relative alias.
        expect(backslashAliases).toEqual([
          "c:\\projects\\app\\dir\\file",
          "dir\\file",
        ]);
        // The forward-slash equivalent carries the same aliases plus a redundant
        // raw "dir/file" that folds to "dir\file" under win32 separator folding,
        // so every path rule matches both forms identically (#520).
        const forwardSlashAliases = forwardSlashProgram
          .pathRuleCandidates()[0]
          .path.matchValues();
        for (const alias of backslashAliases) {
          expect(forwardSlashAliases).toContain(alias);
        }
      });
    });

    describe("posix backslash-relative tokens stay bare (#520)", () => {
      it("does not treat a backslash-relative token as a path rule candidate on posix", async () => {
        const program = await BashProgram.parse("cat dir\\file", normalizer);
        expect(program.pathRuleCandidates()).toHaveLength(0);
      });
    });

    describe("resolved shell expansions (#694)", () => {
      it("flags $HOME/… whose target does not exist", async () => {
        // The token expands to an absolute path before classification, so the
        // strict gate accepts it by shape — no longer dependent on the #645
        // existence probe rescuing it.
        const program = await BashProgram.parse(
          'touch "$HOME/pi-permission-system-repro-new"',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "pi-permission-system-repro-new")]);
      });

      it("flags a bare ${HOME}", async () => {
        const program = await BashProgram.parse('ls "${HOME}"', normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([homedir()]);
      });

      it("flags ${HOME}/…", async () => {
        const program = await BashProgram.parse(
          'ls "${HOME}/somewhere"',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "somewhere")]);
      });

      it("flags a $HOME redirect destination", async () => {
        const program = await BashProgram.parse(
          "echo hi > $HOME/out.txt",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "out.txt")]);
      });

      it("yields exactly one entry for an existing $HOME target", async () => {
        // Previously the existence probe promoted this token; now the strict
        // shape gate accepts it. It must not be collected through both.
        const program = await BashProgram.parse('ls "$HOME"', normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([homedir()]);
      });

      it("gives $HOME/… and its literal spelling the same projection", async () => {
        const expanded = await BashProgram.parse(
          `ls "${join(homedir(), "docs")}"`,
          normalizer,
        );
        const spelled = await BashProgram.parse('ls "$HOME/docs"', normalizer);
        expect(
          spelled.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(expanded.externalAccesses().map(({ path }) => path.value()));
      });

      it("resolves $HOME/… independently of an unknown effective base", async () => {
        const program = await BashProgram.parse(
          'cd "$DIR" && cat "$HOME/.ssh/id_rsa"',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), ".ssh/id_rsa")]);
      });

      it("resolves $PWD against the cd-folded base", async () => {
        // `/etc` is flagged by the `cd` argument token itself, as it is for any
        // absolute `cd` target; `$PWD/passwd` contributes the second entry.
        const program = await BashProgram.parse(
          'cd /etc && ls "$PWD/passwd"',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual(["/etc", "/etc/passwd"]);
      });

      it("does not flag a $PWD token that stays inside the working directory", async () => {
        const program = await BashProgram.parse('ls "$PWD/src"', normalizer);
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not resolve an expansion carrying an operator", async () => {
        const program = await BashProgram.parse(
          'ls "${HOME:-/tmp}/x"',
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not resolve a variable through an assignment (accepted residual)", async () => {
        // ADR 0009 keeps assignment-then-reference an accepted residual; this
        // pins the declined behavior so a future change is a deliberate one.
        const program = await BashProgram.parse(
          'CURRENT="$HOME"; ls "$CURRENT"',
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });
    });

    describe("effective working directory projection", () => {
      it("folds a sequence of current-shell cd commands", async () => {
        // cd a → cwd/a, cd b → cwd/a/b; ../c resolves to cwd/a/c (inside).
        const program = await BashProgram.parse(
          "cd a && cd b && cat ../c",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("catches an escape masked by a later cd that the single-base model missed", async () => {
        // Effective dir after `cd nested/deep && cd ..` is cwd/nested, so
        // ../../etc/passwd escapes to /projects/etc/passwd.
        const program = await BashProgram.parse(
          "cd nested/deep && cd .. && cat ../../etc/passwd",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/etc/passwd");
      });

      it("folds a cd that is not the first command", async () => {
        // The single-base model ignored a cd that was not first; now `cd a`
        // folds, so ../b resolves to cwd/b (inside) and is not flagged.
        const program = await BashProgram.parse(
          "mkdir d && cd a && cat ../b",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("folds a cd whose target follows its redirect", async () => {
        const program = await BashProgram.parse(
          "cd 2>/dev/null a && cat ../b",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("folds a cd whose redirect precedes its target", async () => {
        // The redirect is not cd's operand; `a` is. ../b resolves to cwd/b.
        const program = await BashProgram.parse(
          "2>/dev/null cd a && cat ../b",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not fold a backgrounded cd", async () => {
        // `cd a &` runs in a subshell, so it must not update the running
        // directory; ../b resolves against cwd and escapes.
        const program = await BashProgram.parse("cd a & cat ../b", normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/b");
      });

      it("does not fold a cd inside a pipeline", async () => {
        // Pipeline members run in subshells; the cd must not leak.
        const program = await BashProgram.parse(
          "cd nested | cat ../b",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/b");
      });

      it("folds a cd inside a subshell for paths within that subshell", async () => {
        // Inside the subshell the effective dir is cwd/sub, so ../x → cwd/x.
        const program = await BashProgram.parse(
          "( cd sub && cat ../x )",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not leak a subshell cd to following commands", async () => {
        // The subshell cd resets on exit, so ../y resolves against cwd.
        const program = await BashProgram.parse(
          "( cd sub ) && cat ../y",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/y");
      });

      it("persists a cd inside a brace group to later commands in the group", async () => {
        // Brace groups run in the current shell, so cd sub persists to cat ../x.
        const program = await BashProgram.parse(
          "{ cd sub; cat ../x; }",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("persists a brace-group cd to following sibling commands", async () => {
        const program = await BashProgram.parse(
          "{ cd sub; } && cat ../x",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("conservatively flags a relative path inside a command substitution", async () => {
        // Interior cd folding inside substitutions is deferred: the interior
        // inherits the enclosing base (cwd), so ../r is flagged rather than
        // resolved against cwd/q. Conservative — never misses an escape.
        const program = await BashProgram.parse(
          "echo $(cd q && cat ../r)",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/r");
      });

      it("flags relative paths conservatively after a non-literal cd", async () => {
        // cd "$DIR" makes the effective dir unknowable; ../x could be anywhere,
        // so it is flagged (least-privilege).
        const program = await BashProgram.parse(
          'cd "$DIR" && cat ../x',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/x");
      });

      it("flags even a within-cwd relative path after a non-literal cd", async () => {
        // Conservative cost: src/../within.txt resolves inside cwd but is still
        // flagged because the effective dir is unknown.
        const program = await BashProgram.parse(
          'cd "$DIR" && cat src/../within.txt',
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/my-app/within.txt");
      });

      it("does not flag a revision range after a non-literal cd", async () => {
        // `..` inside a segment traverses nothing, so only the cd target is
        // external.
        const program = await BashProgram.parse(
          "cd ~/x && git log HEAD..origin/main",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "x")]);
      });

      it("flags a whole-segment traversal inside a longer token after a non-literal cd", async () => {
        const program = await BashProgram.parse(
          "cd ~/x && cat a/../../b",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toEqual([join(homedir(), "x"), "/projects/b"]);
      });

      it("still resolves an absolute path normally after a non-literal cd", async () => {
        // Absolute paths are base-independent; one inside cwd is not flagged
        // even when the effective dir is unknown.
        const program = await BashProgram.parse(
          'cd "$DIR" && cat /projects/my-app/x.txt',
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("treats `cd -` as an unknown effective directory", async () => {
        const program = await BashProgram.parse("cd - && cat ../x", normalizer);
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/x");
      });

      it("recovers a known base when a later cd is absolute", async () => {
        // cd "$DIR" → unknown, then cd /projects/my-app/src → known again, so
        // ../x resolves to cwd and is not flagged.
        const program = await BashProgram.parse(
          'cd "$DIR" && cd /projects/my-app/src && cat ../x',
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("folds a leading current-shell cd across a redirect-then-pipe", async () => {
        // tree-sitter-bash groups `cd a && pnpm x 2>&1 | tail` as
        // `(cd a && pnpm x 2>&1) | tail`, burying the current-shell `cd a`
        // inside a `pipeline` node. Bash precedence (`|` binds tighter than
        // `&&`) makes `cd a` current-shell, so the fold must persist past the
        // pipeline: ../b resolves against cwd/a (inside), not cwd (#454).
        const program = await BashProgram.parse(
          "cd a && pnpm x 2>&1 | tail ; cat ../b",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("folds it too when the redirect carries the command's words", async () => {
        // The correction hands `x` back to `pnpm`, leaving the first stage a
        // plain list, which folds its leading `cd a` the same way.
        const program = await BashProgram.parse(
          "cd a && pnpm 2>&1 x | tail ; cat ../b",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("persists the fold past a redirect-then-pipe to a later cd", async () => {
        // The issue reproduction: the fold from `cd a/b` survives the
        // redirect-then-pipe, so the trailing `cd .. && cd ..` lands back at
        // cwd instead of escaping one level above.
        const program = await BashProgram.parse(
          "cd a/b && pnpm x 2>&1 | tail ; cd .. && cd ..",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });

      it("does not fold the terminal piped command of the first stage", async () => {
        // Fail-closed: `cd b` is the terminal command of the first stage, i.e.
        // the real pipe stage (a subshell), so it must NOT fold. With the
        // correct base cwd/a, ../../x escapes to /projects/x. If `cd b` were
        // wrongly folded, the base would be cwd/a/b and ../../x would stay
        // inside — a fail-open regression this test pins.
        const program = await BashProgram.parse(
          "cd a && cd b 2>&1 | tail ; cat ../../x",
          normalizer,
        );
        expect(
          program.externalAccesses().map(({ path }) => path.value()),
        ).toContain("/projects/x");
      });

      it("resolves a downstream pipe stage against the folded base", async () => {
        // The stage after the `|` runs in a subshell that inherits the folded
        // cwd/a, so ../foo resolves inside cwd rather than escaping against the
        // pre-cd base.
        const program = await BashProgram.parse(
          "cd a && pnpm x 2>&1 | cat ../foo",
          normalizer,
        );
        expect(program.externalAccesses()).toHaveLength(0);
      });
    });

    it("flags an absolute in-cwd path that resolves externally via a symlink, returning the typed form", async () => {
      // The strict classifier only processes absolute tokens, so the escape
      // surface is `cat /cwd/link/hosts` (absolute) where `link -> /etc`.
      // The boundary decision still uses the canonical form (so the path is
      // flagged), but the returned value is the typed/lexical form so config
      // patterns match the path as the user wrote it (#418).
      realpathSync.mockImplementation((p: string) => {
        if (p === "/projects/my-app/link/hosts") return "/etc/hosts";
        return p;
      });
      const program = await BashProgram.parse(
        "cat /projects/my-app/link/hosts",
        normalizer,
      );
      const external = program
        .externalAccesses()
        .map(({ path }) => path.value());
      expect(external).toContain("/projects/my-app/link/hosts");
      expect(external).not.toContain("/etc/hosts");
    });

    it("does not flag a token that resolves within a symlinked cwd", async () => {
      // Simulates /tmp -> /private/tmp on macOS; cwd is the canonical form.
      const symlinkCwd = "/private/tmp";
      realpathSync.mockImplementation((p: string) => {
        if (p === "/tmp") return "/private/tmp";
        if (p.startsWith("/tmp/")) return `/private/tmp${p.slice(4)}`;
        return p;
      });
      const program = await BashProgram.parse(
        "cat /tmp/workspace/file.ts",
        new PathNormalizer(pathFlavorForPlatform(process.platform), symlinkCwd),
      );
      expect(program.externalAccesses()).toHaveLength(0);
    });
  });
});
