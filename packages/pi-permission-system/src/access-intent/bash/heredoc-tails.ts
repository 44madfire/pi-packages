import {
  childrenOf,
  rewriteStatements,
  rewrittenNode,
  type Source,
  sourceOf,
} from "./parse-view";
import type { TSNode } from "./parser";

/**
 * `tree-sitter-bash`'s parse with the rest of each heredoc's line moved out of
 * the heredoc, to where the grammar puts it when the heredoc is written as a
 * plain input redirect.
 *
 * The grammar (0.25.1) lets a `heredoc_redirect` carry whatever follows its
 * delimiter on the same line: further redirects (`cat <<EOF > /tmp/o`), a
 * `| …` statement, or an `&& …` / `|| …` statement. They parse as children of
 * the heredoc, which every walker reads only for the substitutions it hosts, so
 * `cat <<EOF | rm -rf /tmp/x` would enumerate as `cat` alone and
 * `cat <<EOF > /tmp/o` would project no path (#979).
 *
 * The corrected tree is the grammar's own parse of the same line with `< in` in
 * place of `<<EOF`: a redirect becomes a sibling after the heredoc, and a
 * `| …` or `&& …` statement is joined to the redirected statement the way the
 * grammar joins it to `cat < in`. That reproduces the grammar's groupings
 * rather than bash's where the two differ (a redirect on a list's last command
 * hangs off the whole list), because every walker is already built to read
 * those groupings.
 *
 * Words after the delimiter (`git <<EOF push --force`) stay in the heredoc:
 * `reattachRedirectArguments` hands them to the command, exactly as it does for
 * the words after a file redirect's target. The heredoc keeps its body, which
 * is written after the rest of the line, so it ends after the nodes moved out
 * of it.
 *
 * Returns `root` itself when no heredoc carries such a tail.
 */
export function hoistHeredocTails(root: TSNode): TSNode {
  return rewriteStatements(root, hoistStatement);
}

/**
 * `statement` with its heredoc's tail moved out, or `undefined` when no
 * heredoc among `children` carries one.
 */
function hoistStatement(
  statement: TSNode,
  children: readonly TSNode[],
): TSNode | undefined {
  const heredocIndex = children.findIndex(
    (child) => child.type === "heredoc_redirect" && tailOf(child) !== undefined,
  );
  const heredoc = children.at(heredocIndex);
  const tail = heredoc && tailOf(heredoc);
  if (!tail) return undefined;

  const after = children.slice(heredocIndex + 1);
  // A statement tail runs to the end of the line, so nothing of the statement
  // can follow it; anything that does is a shape this correction does not know.
  if (tail.joined && after.some((child) => child.isNamed)) return undefined;

  const source = sourceOf(statement);
  const redirected = rewrittenNode(
    statement,
    [
      ...children.slice(0, heredocIndex),
      rewrittenNode(
        heredoc,
        tail.kept,
        heredoc.startIndex,
        heredoc.endIndex,
        source,
      ),
      ...tail.redirects,
      ...after,
    ],
    statement.startIndex,
    statement.endIndex,
    source,
  );
  if (!tail.joined) return redirected;
  return join(redirected, tail.joined.operator, tail.joined.statement, source);
}

/** What a heredoc carries after its delimiter, split by where each part goes. */
interface HeredocTail {
  /** The heredoc's own children: operator, delimiter, any words, and body. */
  readonly kept: readonly TSNode[];
  /** Redirects written after the delimiter. */
  readonly redirects: readonly TSNode[];
  /** A `| …`, `|& …`, `&& …`, or `|| …` statement after them, if any. */
  readonly joined?: {
    readonly operator: TSNode;
    readonly statement: TSNode;
  };
}

/**
 * `heredoc`'s tail, or `undefined` when it carries neither a redirect nor a
 * statement after its delimiter.
 *
 * The grammar spells a `| …` tail as one `pipeline` child holding the operator
 * and the statement, and an `&& …` / `|| …` tail as the operator token and the
 * statement as two children of the heredoc itself.
 */
function tailOf(heredoc: TSNode): HeredocTail | undefined {
  const kept: TSNode[] = [];
  const redirects: TSNode[] = [];
  let operator: TSNode | undefined;
  let statement: TSNode | undefined;
  for (const child of childrenOf(heredoc)) {
    if (TAIL_REDIRECT_TYPES.has(child.type)) {
      redirects.push(child);
    } else if (child.type === "pipeline") {
      const [pipe] = childrenOf(child);
      operator = pipe;
      statement = childrenOf(child).find((node) => node.isNamed);
    } else if (LIST_OPERATORS.has(child.type) && !child.isNamed) {
      operator = child;
    } else if (operator && !statement && child.isNamed) {
      statement = child;
    } else {
      kept.push(child);
    }
  }
  if (operator && !statement) return undefined;
  const joined = operator && statement ? { operator, statement } : undefined;
  if (redirects.length === 0 && !joined) return undefined;
  return joined ? { kept, redirects, joined } : { kept, redirects };
}

/** The redirects a heredoc can carry after its delimiter. */
const TAIL_REDIRECT_TYPES: ReadonlySet<string> = new Set([
  "file_redirect",
  "herestring_redirect",
]);

/** The operators that join an `&& …` / `|| …` tail. */
const LIST_OPERATORS: ReadonlySet<string> = new Set(["&&", "||"]);

/** The operators that join a `| …` tail. */
const PIPE_OPERATORS: ReadonlySet<string> = new Set(["|", "|&"]);

/**
 * `redirected` joined to `statement` by `operator`, grouped as the grammar
 * groups `cat < in <operator> <statement>`.
 *
 * The grammar hangs a redirect off everything before it, so a joined
 * `redirected_statement` keeps its redirects outermost. A `list` is
 * left-associative and binds looser than a pipe, so the join reaches its first
 * element. A pipe tail onto a pipeline extends that pipeline. Anything else
 * becomes the operator's own two-element node.
 *
 * Each rebuilt node spans from `redirected`'s start to the furthest end beneath
 * it, which is the heredoc's, since its body is written after the tail.
 */
function join(
  redirected: TSNode,
  operator: TSNode,
  statement: TSNode,
  source: Source,
): TSNode {
  const isPipe = PIPE_OPERATORS.has(operator.type);
  const children = childrenOf(statement);
  const end = Math.max(redirected.endIndex, statement.endIndex);
  const rebuild = (type: Pick<TSNode, "type" | "isNamed">, kids: TSNode[]) =>
    rewrittenNode(type, kids, redirected.startIndex, end, source);

  if (statement.type === "redirected_statement" || statement.type === "list") {
    const first = children.findIndex((child) => child.isNamed);
    return rebuild(
      statement,
      children.with(first, join(redirected, operator, children[first], source)),
    );
  }
  if (isPipe && statement.type === "pipeline") {
    return rebuild(statement, [redirected, operator, ...children]);
  }
  return rebuild({ type: isPipe ? "pipeline" : "list", isNamed: true }, [
    redirected,
    operator,
    statement,
  ]);
}
