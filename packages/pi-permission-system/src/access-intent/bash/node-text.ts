import type { TSNode } from "./parser";
import { resolvePlainVariableExpansion } from "./shell-variable-expansion";

/**
 * Node types whose text content is never a command argument, so no path
 * candidate is ever read from it.
 *
 * This governs the subtree's *text*, not whether it is visited at all: an
 * interpolating `heredoc_body` is also an execution host, so it is still
 * descended for the commands it runs while its prose stays out of the path
 * surface (#741). See `EXECUTION_HOST_TYPES` in `nested-execution.ts`.
 */
export const SKIP_SUBTREE_TYPES = new Set([
  "heredoc_body",
  "heredoc_end",
  "comment",
]);

/**
 * Node types that represent argument values in the AST
 * (word, concatenation, single-quoted string, double-quoted string).
 */
export const ARG_NODE_TYPES = new Set([
  "word",
  "concatenation",
  "string",
  "raw_string",
]);

/**
 * One argument as the program receives it, and whether that is knowable.
 *
 * A capability proof must read the value after quote removal, since `'-o'` and
 * `-o` reach `sort` identically, and must know when the value is computed,
 * since a word only the shell decides can spell any option at all.
 */
export interface ArgWord {
  /** The string the shell passes after quote removal ({@link resolveNodeText}). */
  readonly value: string;
  /**
   * Whether `value` may differ from what the program receives: a part only
   * running the command decides ({@link hasComputedPart}), or a spelling the
   * shell rewrites before the program sees it — an escape, a glob, a brace
   * expansion, an ANSI-C string — which {@link resolveNodeText} passes through as written.
   */
  readonly computed: boolean;
}

/** Read an argument node into the word the program receives. */
export function readArgWord(node: TSNode): ArgWord {
  return {
    value: resolveNodeText(node),
    computed: hasComputedPart(node) || !isSpelledExactly(node),
  };
}

/**
 * Whether {@link resolveNodeText} returns exactly the string the shell passes.
 *
 * Answers `false` for any node type it does not know, which is the
 * fail-closed direction for a caller proving what a word cannot be.
 */
function isSpelledExactly(node: TSNode): boolean {
  switch (node.type) {
    case "raw_string":
      return true;
    case "word":
      return !SHELL_REWRITTEN_CHARACTERS.test(node.text);
    case "string_content":
      return !node.text.includes("\\");
    case "simple_expansion":
    case "expansion":
      return resolvePlainVariableExpansion(node) !== null;
    case "string":
      return childrenSpelledExactly(node);
    case "concatenation":
      // The grammar splits `{-i,-n}` into plain words, so the expansion is
      // visible only across the whole concatenation's text.
      return !BRACE_EXPANSION.test(node.text) && childrenSpelledExactly(node);
    default:
      return false;
  }
}

/** A `"` delimiter is spelled exactly; every named child must be too. */
function childrenSpelledExactly(node: TSNode): boolean {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child || child.type === '"') continue;
    if (!isSpelledExactly(child)) return false;
  }
  return true;
}

/** An escape, or a glob the shell may expand into other words. */
const SHELL_REWRITTEN_CHARACTERS = /[\\*?[]/;

/**
 * A brace the shell expands: one holding a `,` or a `..` range.
 *
 * An empty `{}` is left alone by bash, which is why `find -exec … {} +` keeps
 * its placeholder as written.
 */
const BRACE_EXPANSION = /\{[^}]*(,|\.\.)[^}]*\}/;

/**
 * Whether an argument node's value is decided at run time: it contains a
 * command or process substitution, an arithmetic expansion, or a variable
 * expansion {@link resolvePlainVariableExpansion} cannot resolve.
 *
 * The complement of what {@link resolveNodeText} can spell exactly. A plain
 * `$HOME` / `$PWD` reference resolves, so `"$HOME/out"` is not computed; any
 * other expansion falls back to its own source text there, which names a file
 * that is not the one the shell will touch (ADR 0009's computed-path residual).
 * A single-quoted `'$x'` is a literal.
 */
export function hasComputedPart(node: TSNode): boolean {
  if (COMPUTED_NODE_TYPES.has(node.type)) return true;
  if (VARIABLE_EXPANSION_TYPES.has(node.type)) {
    return resolvePlainVariableExpansion(node) === null;
  }
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && hasComputedPart(child)) return true;
  }
  return false;
}

/** Node types whose value only running the command can produce. */
const COMPUTED_NODE_TYPES: ReadonlySet<string> = new Set([
  "command_substitution",
  "process_substitution",
  "arithmetic_expansion",
]);

/** Variable references, computed unless they resolve as a plain reference. */
const VARIABLE_EXPANSION_TYPES: ReadonlySet<string> = new Set([
  "simple_expansion",
  "expansion",
]);

/**
 * Resolve the "shell value" of an argument node — the string the shell
 * would pass to the command after quote removal.
 *
 * - `word`          → `.text` (already unquoted)
 * - `raw_string`    → strip surrounding single quotes
 * - `string`        → strip surrounding double quotes, concatenate children text
 * - `concatenation` → concatenate resolved children
 * - expansions      → the resolved value of a plain `$HOME`/`$PWD` reference,
 *   else `.text` (see `shell-variable-expansion.ts`)
 * - other           → `.text` as fallback
 */
export function resolveNodeText(node: TSNode): string {
  switch (node.type) {
    case "word":
      return node.text;
    case "raw_string": {
      // Strip surrounding single quotes: 'content' → content
      const t = node.text;
      if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
        return t.slice(1, -1);
      }
      return t;
    }
    case "string": {
      // Double-quoted string: concatenate the resolved text of inner children,
      // skipping the quote-delimiter nodes (literal `"`).
      let result = "";
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;
        // Skip the literal `"` delimiters
        if (child.type === '"') continue;
        result += resolveNodeText(child);
      }
      return result;
    }
    case "string_content":
      return node.text;
    case "simple_expansion":
    case "expansion":
      return resolvePlainVariableExpansion(node) ?? node.text;
    case "concatenation": {
      let result = "";
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;
        result += resolveNodeText(child);
      }
      return result;
    }
    default:
      return node.text;
  }
}
